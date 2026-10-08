import { describe, expect, it } from "vitest";
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
  currentTime = 0;
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
});
