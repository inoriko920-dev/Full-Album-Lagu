import { describe, expect, it } from "vitest";
import { LiveSpectrumRuntime } from "../../src/renderer/playback/live-spectrum-runtime";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import type { PreviewAudioIssueResult } from "../../src/core/contracts/preview-audio-ipc";
import {
  HtmlMediaPlaybackDriver,
  type MediaElementPort,
  type PreviewAudioRequester,
} from "../../src/renderer/playback/html-media-playback-driver";

function project(projectId = "project-1"): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId,
    name: "Test",
    revision: 0,
    mediaAssets: [1000, 2000].map((durationMs, index) => ({
      id: `asset-${index}`,
      kind: "audio" as const,
      required: true,
      sourcePath: `C:/Untrusted/${index}.mp3`,
      fileName: `${index}.mp3`,
      sizeBytes: 100,
      availability: "ready" as const,
      metadata: { durationMs },
    })),
    tracks: [0, 1].map((index) => ({
      id: `track-${index}`,
      title: `Track ${index}`,
      sourcePath: `C:/Untrusted/${index}.mp3`,
      audioAssetId: `asset-${index}`,
    })),
  };
}

class FakeMedia implements MediaElementPort {
  src = "";
  crossOrigin: string | null = null;
  currentTime = 0;
  volume = 1;
  playCount = 0;
  pauseCount = 0;
  loadCount = 0;
  failPlay = false;
  private readonly listeners = new Map<string, Set<EventListener>>();

  async play(): Promise<void> {
    this.playCount += 1;
    if (this.failPlay) throw new Error("Decoder could not start");
  }

  pause(): void {
    this.pauseCount += 1;
  }

  load(): void {
    this.loadCount += 1;
  }

  removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }

  addEventListener(type: string, listener: EventListener): void {
    const handlers = this.listeners.get(type) ?? new Set<EventListener>();
    handlers.add(listener);
    this.listeners.set(type, handlers);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }

  /** Track active subscriptions without depending on browser GC timing. */
  listenerCount(): number {
    return Array.from(this.listeners.values()).reduce(
      (count, listeners) => count + listeners.size,
      0,
    );
  }
}

const trusted = { projectId: "project-1", batchId: "main-picked-intake-1" };
const granted = {
  status: "granted",
  url: "lfa-preview://media/" + "a".repeat(64),
} as const satisfies PreviewAudioIssueResult;

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("T11-W06-03 main-token HTML audio driver (without UI)", () => {
  it("plays, pauses, resumes and uses media clock without project mutation", async () => {
    const source = project();
    const unchanged = structuredClone(source);
    const files: FakeMedia[] = [];
    const calls: Array<{ batchId: string; assetId: string }> = [];
    const issue: PreviewAudioRequester = async (request) => {
      calls.push(request);
      return granted;
    };
    const driver = new HtmlMediaPlaybackDriver(source, trusted, issue, () => {
      const audio = new FakeMedia();
      files.push(audio);
      return audio;
    });

    driver.play();
    expect(driver.snapshot.phase).toBe("loading");
    await flush();
    const first = files[0];
    if (first === undefined) throw new Error("Audio was not created.");
    expect(first.src).toBe(granted.url);
    expect(calls).toEqual([
      {
        batchId: trusted.batchId,
        projectId: trusted.projectId,
        assetId: "asset-0",
      },
    ]);
    first.emit("loadedmetadata");
    await flush();
    expect(driver.snapshot.phase).toBe("playing");
    expect(first.playCount).toBe(1);
    first.currentTime = 0.45;
    first.emit("timeupdate");
    expect(driver.snapshot.albumTimeMs).toBe(450);

    driver.pause();
    expect(driver.snapshot.phase).toBe("paused");
    const pausedTime = driver.snapshot.albumTimeMs;
    first.currentTime = 0.9;
    first.emit("timeupdate");
    expect(driver.snapshot.albumTimeMs).toBe(pausedTime);
    driver.play();
    await flush();
    expect(first.playCount).toBe(2);
    expect(source).toEqual(unchanged);
    driver.close();
    expect(first.src).toBe("");
  });

  it("uses the trusted per-asset batch after multiple imports and never falls back for unknown assets", async () => {
    const requests: Array<{ batchId: string; assetId: string }> = [];
    const media: FakeMedia[] = [];
    const session = new HtmlMediaPlaybackDriver(
      project(),
      {
        projectId: "project-1",
        batchId: "latest-batch",
        batchByAssetId: {
          "asset-0": "first-batch",
          "asset-1": "second-batch",
        },
      },
      async (request) => {
        requests.push({
          batchId: request.batchId,
          assetId: request.assetId,
        });
        return granted;
      },
      () => {
        const audio = new FakeMedia();
        media.push(audio);
        return audio;
      },
    );

    session.play();
    await flush();
    expect(requests).toEqual([{ batchId: "first-batch", assetId: "asset-0" }]);
    media[0]?.emit("loadedmetadata");
    await flush();
    media[0]?.emit("ended");
    await flush();
    expect(requests).toEqual([
      { batchId: "first-batch", assetId: "asset-0" },
      { batchId: "second-batch", assetId: "asset-1" },
    ]);
    session.close();

    const denied: string[] = [];
    const blocked = new HtmlMediaPlaybackDriver(
      project(),
      {
        projectId: "project-1",
        batchId: "latest-batch",
        batchByAssetId: { "asset-1": "second-batch" },
      },
      async (request) => {
        denied.push(request.assetId);
        return granted;
      },
      () => new FakeMedia(),
    );
    blocked.play();
    await flush();
    expect(blocked.snapshot.phase).toBe("error");
    expect(denied).toEqual([]);
    blocked.close();
  });

  it("never attaches late token from the old project after a switch", async () => {
    let resolve!: (value: PreviewAudioIssueResult) => void;
    const deferred = new Promise<PreviewAudioIssueResult>((finish) => {
      resolve = finish;
    });
    const created: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      () => deferred,
      () => {
        const audio = new FakeMedia();
        created.push(audio);
        return audio;
      },
    );
    driver.play();
    driver.switchProject(project("project-2"), null);
    resolve(granted);
    await flush();
    expect(created).toHaveLength(0);
    expect(driver.snapshot.projectId).toBe("project-2");
    expect(driver.snapshot.phase).toBe("ready");
    driver.play();
    expect(driver.snapshot.phase).toBe("error");
  });

  it("rejects an untrusted recovered project without a main-issued batch", () => {
    const driver = new HtmlMediaPlaybackDriver(
      project("reopened"),
      null,
      async () => granted,
      () => new FakeMedia(),
    );
    driver.play();
    expect(driver.snapshot.phase).toBe("error");
    expect(driver.snapshot.activeTrackId).toBe("track-0");
    driver.close();
  });

  it("skips disabled sources with a single active audio element", async () => {
    const files: FakeMedia[] = [];
    const source = project();
    source.tracks[1]!.enabled = false;
    const driver = new HtmlMediaPlaybackDriver(
      source,
      trusted,
      async () => granted,
      () => {
        const audio = new FakeMedia();
        files.push(audio);
        return audio;
      },
    );
    driver.play();
    await flush();
    files[0]!.emit("loadedmetadata");
    await flush();
    files[0]!.emit("ended");
    await flush();
    expect(driver.snapshot.phase).toBe("finished");
    expect(files[0]?.src).toBe("");
    expect(files).toHaveLength(1);
  });

  it("loads next track on ended and ignores stale previous media events", async () => {
    const files: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      async () => granted,
      () => {
        const audio = new FakeMedia();
        files.push(audio);
        return audio;
      },
    );
    driver.play();
    await flush();
    const first = files[0]!;
    first.emit("loadedmetadata");
    await flush();
    first.emit("ended");
    await flush();
    expect(driver.snapshot.activeTrackId).toBe("track-1");
    const second = files[1]!;
    expect(first.src).toBe("");
    first.emit("loadedmetadata");
    first.emit("error");
    expect(driver.snapshot.phase).toBe("loading");
    second.emit("loadedmetadata");
    await flush();
    expect(driver.snapshot.phase).toBe("playing");
    expect(first.playCount).toBe(1);
    expect(second.playCount).toBe(1);
    driver.close();
    expect(second.src).toBe("");
  });

  it("turns a denied token and a failed audio play into controlled errors", async () => {
    const denied = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      async () => ({ status: "blocked" }),
      () => new FakeMedia(),
    );
    denied.play();
    await flush();
    expect(denied.snapshot.phase).toBe("error");

    const failure = new FakeMedia();
    failure.failPlay = true;
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      async () => granted,
      () => failure,
    );
    driver.play();
    await flush();
    failure.emit("loadedmetadata");
    await flush();
    expect(driver.snapshot.phase).toBe("error");
    expect(failure.src).toBe("");
  });

  it("rejects file and network URLs even if a grant caller returns granted", async () => {
    const created: FakeMedia[] = [];
    for (const unsafe of [
      "file:///C:/secret.mp3",
      "https://example.test/track.mp3",
      "lfa-preview://media/short-token",
    ]) {
      const driver = new HtmlMediaPlaybackDriver(
        project(),
        trusted,
        async () => ({ status: "granted", url: unsafe }),
        () => {
          const audio = new FakeMedia();
          created.push(audio);
          return audio;
        },
      );
      driver.play();
      await flush();
      expect(driver.snapshot.phase).toBe("error");
      driver.close();
    }
    expect(created).toHaveLength(0);
  });

  it("revokeMedia stops a playing source and denies replay until main reauthorizes it", async () => {
    const media: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      async () => granted,
      () => {
        const audio = new FakeMedia();
        media.push(audio);
        return audio;
      },
    );
    driver.play();
    await flush();
    media[0]!.emit("loadedmetadata");
    await flush();
    expect(driver.snapshot.phase).toBe("playing");

    driver.revokeMedia();
    expect(driver.snapshot.phase).toBe("ready");
    expect(media[0]!.src).toBe("");
    media[0]!.emit("ended");
    media[0]!.emit("error");
    expect(driver.snapshot.phase).toBe("ready");

    driver.play();
    expect(driver.snapshot.phase).toBe("error");
    expect(media).toHaveLength(1);
    driver.switchProject(project(), trusted);
    driver.play();
    await flush();
    expect(media).toHaveLength(2);
    driver.close();
  });

  it("seeks across tracks and handles Next/Previous without stale-source audio", async () => {
    const media: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      async () => granted,
      () => {
        const audio = new FakeMedia();
        media.push(audio);
        return audio;
      },
    );

    driver.play();
    await flush();
    const original = media[0]!;
    original.emit("loadedmetadata");
    await flush();

    driver.seek(1200);
    await flush();
    expect(original.src).toBe("");
    const second = media[1]!;
    second.emit("loadedmetadata");
    await flush();
    expect(second.currentTime).toBeCloseTo(0.2);
    expect(driver.snapshot).toMatchObject({
      activeTrackId: "track-1",
      albumTimeMs: 1200,
    });

    driver.previous();
    await flush();
    expect(second.src).toBe("");
    const previous = media[2]!;
    previous.emit("loadedmetadata");
    await flush();
    expect(driver.snapshot.activeTrackId).toBe("track-0");

    driver.next();
    await flush();
    const next = media[3]!;
    previous.emit("ended");
    second.emit("error");
    original.emit("timeupdate");
    expect(driver.snapshot).toMatchObject({
      activeTrackId: "track-1",
      phase: "loading",
    });
    next.emit("loadedmetadata");
    await flush();
    expect(driver.snapshot.phase).toBe("playing");
    driver.stop();
    expect(next.src).toBe("");
    expect(driver.snapshot.phase).toBe("ready");
    driver.close();
  });

  it("refreshes a paused expiring lease before resuming after 45 seconds", async () => {
    let timeMs = 1000;
    const audio: FakeMedia[] = [];
    const requests: string[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      async (request) => {
        requests.push(request.assetId);
        return granted;
      },
      () => {
        const item = new FakeMedia();
        audio.push(item);
        return item;
      },
      () => undefined,
      () => timeMs,
    );
    driver.play();
    await flush();
    audio[0]!.emit("loadedmetadata");
    await flush();
    audio[0]!.currentTime = 0.35;
    audio[0]!.emit("timeupdate");
    driver.pause();
    expect(driver.snapshot.albumTimeMs).toBe(350);
    timeMs += 46_000;
    driver.play();
    await flush();

    expect(requests).toEqual(["asset-0", "asset-0"]);
    expect(audio).toHaveLength(2);
    expect(audio[0]!.src).toBe("");
    audio[0]!.emit("ended");
    audio[0]!.emit("error");
    expect(driver.snapshot.phase).toBe("loading");
    audio[1]!.emit("loadedmetadata");
    await flush();
    expect(audio[1]!.currentTime).toBeCloseTo(0.35);
    expect(driver.snapshot.phase).toBe("playing");
    expect(audio[1]!.playCount).toBe(1);
    driver.close();
  });

  it("Suspend revokes live audio and Resume cannot auto-play an expired grant", async () => {
    const audio: FakeMedia[] = [];
    const lifecycle: { callback?: (state: "suspend" | "resume") => void } = {};
    let unsubscribed = 0;
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      async () => granted,
      () => {
        const element = new FakeMedia();
        audio.push(element);
        return element;
      },
      () => undefined,
      Date.now,
      (handler) => {
        lifecycle.callback = handler;
        return () => {
          unsubscribed += 1;
          delete lifecycle.callback;
        };
      },
    );
    driver.play();
    await flush();
    audio[0]!.emit("loadedmetadata");
    await flush();
    expect(driver.snapshot.phase).toBe("playing");
    lifecycle.callback?.("suspend");
    expect(driver.snapshot.phase).toBe("ready");
    expect(audio[0]!.src).toBe("");
    audio[0]!.emit("ended");
    lifecycle.callback?.("resume");
    expect(driver.snapshot.phase).toBe("ready");
    driver.play();
    expect(driver.snapshot.phase).toBe("error");
    expect(audio).toHaveLength(1);
    driver.switchProject(project(), trusted);
    driver.play();
    await flush();
    expect(audio).toHaveLength(2);
    driver.close();
    expect(unsubscribed).toBe(1);
    expect(lifecycle.callback).toBeUndefined();
  });

  it("Suspend invalidates in-flight IPC grants and stale load callbacks", async () => {
    let resolve!: (result: PreviewAudioIssueResult) => void;
    const pending = new Promise<PreviewAudioIssueResult>((done) => {
      resolve = done;
    });
    const audio: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      () => pending,
      () => {
        const element = new FakeMedia();
        audio.push(element);
        return element;
      },
    );
    driver.play();
    expect(driver.snapshot.phase).toBe("loading");
    driver.onSystemPower("suspend");
    resolve(granted);
    await flush();
    expect(driver.snapshot.phase).toBe("ready");
    expect(audio).toHaveLength(0);
    driver.onSystemPower("resume");
    driver.play();
    expect(driver.snapshot.phase).toBe("error");
    driver.close();
  });

  it("discards late URL response after Stop and does not resurrect sound", async () => {
    let resolve!: (value: PreviewAudioIssueResult) => void;
    const deferred = new Promise<PreviewAudioIssueResult>((finish) => {
      resolve = finish;
    });
    const created: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      () => deferred,
      () => {
        const audio = new FakeMedia();
        created.push(audio);
        return audio;
      },
    );
    driver.play();
    driver.stop();
    resolve(granted);
    await flush();
    expect(created).toHaveLength(0);
    expect(driver.snapshot.phase).toBe("ready");
    expect(driver.snapshot.albumTimeMs).toBe(0);
    driver.close();
  });

  it("samples the SAME current media with genuine FFT and zeroes after pause/seek/close", async () => {
    const media: FakeMedia[] = [];
    const graphSources: unknown[] = [];
    let disconnected = 0;
    let closed = 0;
    const bins = new Uint8Array(1024);
    bins[20] = 235;
    const runtime = new LiveSpectrumRuntime(() => {
      const analyser = {
        fftSize: 0,
        smoothingTimeConstant: 0,
        frequencyBinCount: 1024,
        getByteFrequencyData(target: Uint8Array) {
          target.set(bins);
        },
        connect() {},
        disconnect() {
          disconnected += 1;
        },
      };
      return {
        destination: {},
        createAnalyser: () => analyser,
        createMediaElementSource(element: unknown) {
          graphSources.push(element);
          return {
            connect() {},
            disconnect() {
              disconnected += 1;
            },
          };
        },
        async resume() {},
        async close() {
          closed += 1;
        },
      } as unknown as AudioContext;
    });
    const spectrumEvents: number[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      async () => granted,
      () => {
        const audio = new FakeMedia();
        media.push(audio);
        return audio;
      },
      () => undefined,
      Date.now,
      undefined,
      runtime,
      (value) => {
        spectrumEvents.push(Math.max(...value.barLevels));
      },
    );
    driver.play();
    await flush();
    expect(graphSources).toEqual([media[0]]);
    expect(media[0]!.crossOrigin).toBe("anonymous");
    media[0]!.emit("loadedmetadata");
    await flush();
    media[0]!.currentTime = 0.2;
    media[0]!.emit("timeupdate");
    expect(driver.sampleSpectrum()).toMatchObject({ active: true });
    expect(Math.max(...driver.sampleSpectrum()!.barLevels)).toBeGreaterThan(
      0.7,
    );

    driver.pause();
    expect(driver.sampleSpectrum()).toMatchObject({ active: false });
    expect(Math.max(...driver.sampleSpectrum()!.barLevels)).toBe(0);
    driver.seek(1200);
    await flush();
    expect(graphSources).toEqual([media[0], media[1]]);
    expect(disconnected).toBeGreaterThanOrEqual(2);
    media[0]!.emit("timeupdate");
    media[0]!.emit("ended");
    expect(driver.snapshot.phase).toBe("loading");
    expect(Math.max(...driver.sampleSpectrum()!.barLevels)).toBe(0);
    driver.close();
    expect(Math.max(...driver.sampleSpectrum()!.barLevels)).toBe(0);
    expect(closed).toBeGreaterThanOrEqual(2);
    expect(spectrumEvents.some((value) => value > 0.7)).toBe(true);
    expect(spectrumEvents.at(-1)).toBe(0);
  });

  it("allows sound playback when AudioContext cannot be created (no fake bars)", async () => {
    const audio = new FakeMedia();
    const runtime = new LiveSpectrumRuntime(() => {
      throw new Error("No usable device");
    });
    const driver = new HtmlMediaPlaybackDriver(
      project(),
      trusted,
      async () => granted,
      () => audio,
      () => undefined,
      Date.now,
      undefined,
      runtime,
    );
    driver.play();
    await flush();
    audio.emit("loadedmetadata");
    await flush();
    expect(driver.snapshot.phase).toBe("playing");
    expect(audio.playCount).toBe(1);
    expect(driver.sampleSpectrum()?.active).toBe(false);
    expect(Math.max(...driver.sampleSpectrum()!.barLevels)).toBe(0);
    driver.close();
  });

  it("keeps volume ephemeral across track handoffs and rejects invalid levels", async () => {
    const original = project();
    const before = structuredClone(original);
    const files: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      original,
      trusted,
      async () => granted,
      () => {
        const audio = new FakeMedia();
        files.push(audio);
        return audio;
      },
    );

    expect(driver.setVolume(Number.NaN)).toBe(false);
    expect(driver.setVolume(-1)).toBe(false);
    expect(driver.setVolume(2)).toBe(false);
    expect(driver.setVolume(0)).toBe(true);
    driver.play();
    await flush();
    expect(files[0]?.volume).toBe(0);
    driver.next();
    await flush();
    expect(files[1]?.volume).toBe(0);
    expect(driver.setVolume(1)).toBe(true);
    expect(files[1]?.volume).toBe(1);
    expect(original).toEqual(before);
    driver.close();
    expect(driver.setVolume(0)).toBe(false);
  });

  it("T06: 100 restarts release audio elements and listeners", async () => {
    const source = project();
    const before = structuredClone(source);
    const elements: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      source,
      trusted,
      async () => granted,
      () => {
        const element = new FakeMedia();
        elements.push(element);
        return element;
      },
    );

    let previousGeneration = driver.snapshot.generation;
    for (let cycle = 0; cycle < 100; cycle += 1) {
      driver.play();
      await flush();
      const element = elements[cycle];
      if (element === undefined) throw new Error("Cycle did not create audio");
      expect(elements).toHaveLength(cycle + 1);
      expect(element.listenerCount()).toBe(4);
      expect(driver.snapshot.phase).toBe("loading");

      element.emit("loadedmetadata");
      await flush();
      expect(driver.snapshot.phase).toBe("playing");
      expect(element.playCount).toBe(1);
      element.currentTime = 0.2;
      element.emit("timeupdate");
      expect(driver.snapshot.albumTimeMs).toBe(200);

      driver.stop();
      expect(driver.snapshot.phase).toBe("ready");
      expect(driver.snapshot.albumTimeMs).toBe(0);
      expect(driver.snapshot.generation).toBeGreaterThan(previousGeneration);
      previousGeneration = driver.snapshot.generation;
      expect(element.src).toBe("");
      expect(element.listenerCount()).toBe(0);
      expect(element.pauseCount).toBeGreaterThanOrEqual(1);

      // The old media can still deliver queued browser events.
      element.emit("ended");
      element.emit("error");
      element.emit("loadedmetadata");
      element.emit("timeupdate");
      expect(driver.snapshot.phase).toBe("ready");
      expect(driver.snapshot.generation).toBe(previousGeneration);
    }

    expect(elements).toHaveLength(100);
    expect(elements.every((element) => element.listenerCount() === 0)).toBe(
      true,
    );
    expect(source).toEqual(before);
    driver.close();
    driver.play();
    expect(elements).toHaveLength(100);
  });

  it("T06: 100 stale main grants cannot create ghost audio", async () => {
    const source = project();
    const before = structuredClone(source);
    const pending: Array<(reply: PreviewAudioIssueResult) => void> = [];
    const elements: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      source,
      trusted,
      () =>
        new Promise<PreviewAudioIssueResult>((resolve) => {
          pending.push(resolve);
        }),
      () => {
        const audio = new FakeMedia();
        elements.push(audio);
        return audio;
      },
    );

    for (let cycle = 0; cycle < 100; cycle += 1) {
      driver.play();
      expect(driver.snapshot.phase).toBe("loading");
      driver.stop();
      expect(driver.snapshot.phase).toBe("ready");
    }
    expect(pending).toHaveLength(100);
    expect(elements).toHaveLength(0);
    for (const resolve of pending) resolve(granted);
    await flush();
    expect(elements).toHaveLength(0);
    expect(driver.snapshot.phase).toBe("ready");
    expect(driver.snapshot.albumTimeMs).toBe(0);
    expect(source).toEqual(before);
    driver.close();
  });
  it("T06: 128-track rapid seeks release stale audio and preserve project", async () => {
    const original = project();
    const firstAsset = original.mediaAssets?.[0];
    if (!firstAsset) throw new Error("Missing audio fixture");
    const source: ProjectDocument = {
      ...original,
      mediaAssets: Array.from({ length: 128 }, (_, index) => ({
        ...firstAsset,
        id: `asset-${index}`,
        fileName: `${index}.wav`,
        metadata: { durationMs: 1000 },
      })),
      tracks: Array.from({ length: 128 }, (_, index) => ({
        id: `track-${index}`,
        title: `Song ${index}`,
        audioAssetId: `asset-${index}`,
        sourcePath: `C:/Untrusted/${index}.wav`,
        ...(index === 7 || index === 33 || index === 96
          ? { enabled: false }
          : {}),
      })),
    };
    const pristine = structuredClone(source);
    const media: FakeMedia[] = [];
    const driver = new HtmlMediaPlaybackDriver(
      source,
      trusted,
      async () => granted,
      () => {
        const element = new FakeMedia();
        media.push(element);
        return element;
      },
    );

    driver.play();
    await flush();
    media[0]?.emit("loadedmetadata");
    await flush();
    expect(driver.snapshot.phase).toBe("playing");

    const enabled = Array.from({ length: 128 }, (_, index) => index).filter(
      (index) => index !== 7 && index !== 33 && index !== 96,
    );
    for (const [step, index] of enabled.entries()) {
      driver.seek(step * 1000 + 250);
      await flush();
      const current = media[step + 1];
      if (!current) throw new Error("No media for rapid seek step");
      expect(driver.snapshot.activeTrackId).toBe(`track-${index}`);
      expect(current.listenerCount()).toBe(4);
      current.emit("loadedmetadata");
      await flush();
      expect(driver.snapshot.phase).toBe("playing");
      expect(driver.snapshot.albumTimeMs).toBe(step * 1000 + 250);
      if (step > 0) {
        const stale = media[step - 1];
        stale?.emit("ended");
        stale?.emit("error");
        expect(stale?.listenerCount()).toBe(0);
        expect(driver.snapshot.activeTrackId).toBe(`track-${index}`);
      }
    }
    driver.stop();
    expect(driver.snapshot.phase).toBe("ready");
    expect(media).toHaveLength(enabled.length + 1);
    expect(media.every((element) => element.src === "")).toBe(true);
    expect(media.every((element) => element.listenerCount() === 0)).toBe(true);
    expect(source).toEqual(pristine);
    driver.close();
  });

});
