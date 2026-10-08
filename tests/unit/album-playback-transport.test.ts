import { describe, expect, it } from "vitest";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { AlbumPlaybackTransport } from "../../src/core/application/services/album-playback-transport";

function project(
  durations: number[],
  disabled: readonly number[] = [],
  projectId = "album",
): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId,
    name: "Test Album",
    revision: 0,
    mediaAssets: durations.map((durationMs, i) => ({
      id: `asset-${i}`,
      kind: "audio" as const,
      required: true,
      sourcePath: `D:/Audio/${i}.mp3`,
      fileName: `${i}.mp3`,
      sizeBytes: 256,
      availability: "ready" as const,
      metadata: { durationMs },
    })),
    tracks: durations.map((_, i) => ({
      id: `track-${i}`,
      title: `Track ${i}`,
      sourcePath: `D:/Audio/${i}.mp3`,
      audioAssetId: `asset-${i}`,
      ...(disabled.includes(i) ? { enabled: false } : {}),
    })),
  };
}

describe("W11-06 T03 ephemeral album transport", () => {
  it("loads a first track, requires matching completion, and tracks audio clock", () => {
    const controller = new AlbumPlaybackTransport(project([1000, 2000]));
    const effect = controller.play();
    expect(effect).toMatchObject({
      kind: "load",
      assetId: "asset-0",
      localTimeMs: 0,
      autoPlay: true,
    });
    if (effect?.kind !== "load") throw new Error("expected first load");
    expect(controller.play()).toBeNull();
    expect(controller.onLoaded(effect.generation - 1)).toBeNull();
    expect(controller.onLoaded(effect.generation)).toEqual({
      kind: "resume",
      generation: effect.generation,
    });
    expect(controller.reportAudioClock(effect.generation, 350)).toBe(true);
    expect(controller.snapshot).toMatchObject({
      phase: "playing",
      albumTimeMs: 350,
      localTimeMs: 350,
      activeTrackId: "track-0",
    });
  });

  it("skips disabled track on ended and ignores duplicate stale ended", () => {
    const controller = new AlbumPlaybackTransport(
      project([1000, 2000, 3000], [1]),
    );
    const first = controller.play();
    if (first?.kind !== "load") throw new Error("expected first load");
    controller.onLoaded(first.generation);
    const next = controller.onEnded(first.generation);
    expect(next).toMatchObject({
      kind: "load",
      trackId: "track-2",
      localTimeMs: 0,
      autoPlay: true,
    });
    expect(controller.onEnded(first.generation)).toBeNull();
  });

  it("blocks stale load completion and clock after stop or project replacement", () => {
    const controller = new AlbumPlaybackTransport(project([1000]));
    const loading = controller.play();
    if (loading?.kind !== "load") throw new Error("expected load");
    controller.stop();
    expect(controller.onLoaded(loading.generation)).toBeNull();
    expect(controller.reportAudioClock(loading.generation, 200)).toBe(false);

    controller.switchProject(project([2000], [], "other-album"));
    expect(controller.snapshot).toMatchObject({
      projectId: "other-album",
      albumTimeMs: 0,
      activeTrackId: null,
      phase: "ready",
    });
  });

  it("seeks across a track boundary while preserving the paused state", () => {
    const controller = new AlbumPlaybackTransport(project([1000, 2000]));
    const loaded = controller.seek(1250);
    expect(loaded).toMatchObject({
      kind: "load",
      trackId: "track-1",
      localTimeMs: 250,
      autoPlay: false,
    });
    if (loaded.kind !== "load") throw new Error("expected seek load");
    expect(controller.onLoaded(loaded.generation)).toMatchObject({
      kind: "pause",
    });
    expect(controller.snapshot.phase).toBe("paused");
  });

  it("pauses playback and resumes from the real audio-derived clock", () => {
    const controller = new AlbumPlaybackTransport(project([5000]));
    const first = controller.play();
    if (first?.kind !== "load") throw new Error("expected load");
    controller.onLoaded(first.generation);
    controller.reportAudioClock(first.generation, 1350);
    const paused = controller.pause();
    expect(paused?.kind).toBe("pause");
    expect(controller.reportAudioClock(first.generation, 1900)).toBe(false);
    expect(controller.play()?.kind).toBe("resume");
    expect(controller.snapshot.albumTimeMs).toBe(1350);
  });

  it("finishes precisely at album end and can restart", () => {
    const controller = new AlbumPlaybackTransport(project([1000]));
    const first = controller.play();
    if (first?.kind !== "load") throw new Error("expected load");
    controller.onLoaded(first.generation);
    expect(controller.onEnded(first.generation)?.kind).toBe("stop");
    expect(controller.snapshot.phase).toBe("finished");
    expect(controller.play()).toMatchObject({
      kind: "load",
      localTimeMs: 0,
      autoPlay: true,
    });
  });

  it("stops a failed decode, ignores stale callbacks and retries with a fresh generation", () => {
    const controller = new AlbumPlaybackTransport(project([5000]));
    const first = controller.play();
    if (first?.kind !== "load") throw new Error("expected load");
    expect(controller.onMediaError(first.generation - 1)).toBeNull();

    const stop = controller.onMediaError(first.generation);
    expect(stop).toEqual({ kind: "stop", generation: first.generation + 1 });
    expect(controller.snapshot.phase).toBe("error");
    expect(controller.onLoaded(first.generation)).toBeNull();
    expect(controller.reportAudioClock(first.generation, 1000)).toBe(false);
    expect(controller.onEnded(first.generation)).toBeNull();

    const retry = controller.play();
    expect(retry).toMatchObject({
      kind: "load",
      trackId: "track-0",
      autoPlay: true,
    });
    if (retry?.kind !== "load") throw new Error("expected retry load");
    expect(retry.generation).toBe(first.generation + 2);
    expect(controller.onMediaError(first.generation)).toBeNull();
    expect(controller.onLoaded(retry.generation)?.kind).toBe("resume");
    expect(controller.snapshot.phase).toBe("playing");
  });

  it("handles a current paused decoder error but rejects errors after stop or project switch", () => {
    const controller = new AlbumPlaybackTransport(project([4000]));
    const first = controller.play();
    if (first?.kind !== "load") throw new Error("expected load");
    controller.onLoaded(first.generation);
    const pause = controller.pause();
    if (pause === null) throw new Error("expected pause");
    expect(controller.onMediaError(first.generation)).toBeNull();
    expect(controller.onMediaError(pause.generation)?.kind).toBe("stop");
    expect(controller.snapshot.phase).toBe("error");

    const attempt = controller.play();
    if (attempt?.kind !== "load") throw new Error("expected recovery load");
    controller.switchProject(project([4000], [], "next-project"));
    expect(controller.onMediaError(attempt.generation)).toBeNull();
    expect(controller.snapshot.phase).toBe("ready");
    expect(controller.snapshot.projectId).toBe("next-project");
    controller.stop();
    expect(controller.onMediaError(controller.snapshot.generation)).toBeNull();
  });

  it("survives 128-track rapid navigation with disabled tracks and no dirty project", () => {
    const durations = Array.from({ length: 128 }, () => 1000);
    const input = project(durations, [12, 68]);
    const original = structuredClone(input);
    const controller = new AlbumPlaybackTransport(input);

    const first = controller.play();
    if (first?.kind !== "load") throw new Error("Missing first track");
    for (let index = 0; index < 64; index += 1) {
      const effect = controller.seek(index * 1000);
      expect(effect.kind).toBe("load");
    }
    expect(controller.onLoaded(first.generation)).toBeNull();

    const last = controller.seek(125500);
    expect(last).toMatchObject({
      kind: "load",
      trackId: "track-127",
      localTimeMs: 500,
      autoPlay: true,
    });
    if (last.kind !== "load") throw new Error("Missing last track");
    expect(controller.onLoaded(last.generation)).toMatchObject({
      kind: "resume",
    });
    expect(controller.snapshot.activeTrackId).toBe("track-127");
    expect(controller.reportAudioClock(last.generation, 750)).toBe(true);
    expect(controller.snapshot.albumTimeMs).toBe(125750);

    expect(controller.onEnded(last.generation)).toMatchObject({
      kind: "stop",
    });
    expect(controller.snapshot.phase).toBe("finished");
    expect(controller.onEnded(last.generation)).toBeNull();
    expect(input).toEqual(original);
  });

  it("never mutates the input project or its revision/track order", () => {
    const input = project([3000, 4000]);
    const before = structuredClone(input);
    const controller = new AlbumPlaybackTransport(input);
    controller.play();
    controller.pause();
    controller.seek(3150);
    controller.stop();
    expect(input).toEqual(before);
  });
});
