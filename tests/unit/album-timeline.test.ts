import { describe, expect, it } from "vitest";
import {
  isProjectTrackEnabled,
  projectAlbumTimeline,
  resolveAlbumPlaybackPosition,
} from "../../src/core/domain/album-timeline";
import type { ProjectDocument } from "../../src/core/domain/project-document";

function makeProject(
  durations: Array<number | undefined>,
  disabledIndexes: readonly number[] = [],
): ProjectDocument {
  const disabled = new Set(disabledIndexes);

  return {
    schemaVersion: 1,
    projectId: "timeline-project",
    name: "Timeline Test",
    revision: 0,
    mediaAssets: durations.map((durationMs, index) => ({
      id: `asset-${index}`,
      kind: "audio" as const,
      required: true,
      sourcePath: `D:/Album/${index + 1}.mp3`,
      fileName: `${index + 1}.mp3`,
      sizeBytes: 1000 + index,
      ...(durationMs === undefined
        ? {
            availability: "invalid" as const,
            errorCode: "MEDIA_DURATION_UNAVAILABLE" as const,
          }
        : {
            availability: "ready" as const,
            metadata: {
              durationMs,
            },
          }),
    })),
    tracks: durations.map((_, index) => ({
      id: `track-${index}`,
      title: `Track ${index + 1}`,
      sourcePath: `D:/Album/${index + 1}.mp3`,
      audioAssetId: `asset-${index}`,
      ...(disabled.has(index) ? { enabled: false } : {}),
    })),
  };
}

describe("album timeline projection", () => {
  it("treats a legacy track with no enabled field as enabled", () => {
    const project = makeProject([1000]);
    const track = project.tracks[0];

    expect(track).toBeDefined();
    expect(track === undefined ? false : isProjectTrackEnabled(track)).toBe(
      true,
    );
  });

  it("derives cumulative boundaries from canonical track order and skips disabled tracks", () => {
    const projection = projectAlbumTimeline(
      makeProject([1000, 2000, 3000], [1]),
    );

    expect(projection.complete).toBe(true);
    expect(projection.enabledTrackCount).toBe(2);
    expect(projection.totalDurationMs).toBe(4000);
    expect(projection.knownPrefixDurationMs).toBe(4000);
    expect(projection.unresolvedDurationTrackIds).toEqual([]);

    expect(projection.items[0]).toMatchObject({
      trackId: "track-0",
      status: "resolved",
      effectiveIndex: 0,
      startMs: 0,
      endMs: 1000,
      durationMs: 1000,
    });
    expect(projection.items[1]).toEqual({
      trackId: "track-1",
      sourceIndex: 1,
      title: "Track 2",
      enabled: false,
      status: "disabled",
    });
    expect(projection.items[2]).toMatchObject({
      trackId: "track-2",
      status: "resolved",
      effectiveIndex: 1,
      startMs: 1000,
      endMs: 4000,
      durationMs: 3000,
    });
  });

  it("marks timing unresolved from the first enabled track without a usable duration", () => {
    const projection = projectAlbumTimeline(
      makeProject([1000, undefined, 3000]),
    );

    expect(projection.complete).toBe(false);
    expect(projection.totalDurationMs).toBeUndefined();
    expect(projection.knownPrefixDurationMs).toBe(1000);
    expect(projection.unresolvedDurationTrackIds).toEqual(["track-1"]);

    expect(projection.items[1]).toMatchObject({
      status: "unresolved",
      effectiveIndex: 1,
      startMs: 1000,
      unresolvedReason: "duration-unavailable",
    });
    expect(projection.items[1]).not.toHaveProperty("endMs");

    expect(projection.items[2]).toMatchObject({
      status: "unresolved",
      effectiveIndex: 2,
      durationMs: 3000,
      unresolvedReason: "prior-duration-unresolved",
    });
    expect(projection.items[2]).not.toHaveProperty("startMs");
    expect(projection.items[2]).not.toHaveProperty("endMs");
  });

  it("projects more than 100 tracks in deterministic O(n) order", () => {
    const projection = projectAlbumTimeline(
      makeProject(Array.from({ length: 105 }, () => 1000)),
    );

    expect(projection.complete).toBe(true);
    expect(projection.items).toHaveLength(105);
    expect(projection.enabledTrackCount).toBe(105);
    expect(projection.totalDurationMs).toBe(105000);
    expect(projection.items[104]).toMatchObject({
      trackId: "track-104",
      startMs: 104000,
      endMs: 105000,
    });
  });

  it("returns a complete zero-duration album when there are no enabled tracks", () => {
    const projection = projectAlbumTimeline(makeProject([1000, 2000], [0, 1]));

    expect(projection.complete).toBe(true);
    expect(projection.enabledTrackCount).toBe(0);
    expect(projection.totalDurationMs).toBe(0);
    expect(projection.knownPrefixDurationMs).toBe(0);
  });
});

describe("W11-06 playback position — pure canonical album clock", () => {
  it("maps exact enabled-track boundaries and never selects a disabled track", () => {
    const project = makeProject([1000, 2000, 3000], [1]);

    expect(resolveAlbumPlaybackPosition(project, 0)).toMatchObject({
      status: "resolved",
      trackId: "track-0",
      audioAssetId: "asset-0",
      startMs: 0,
      endMs: 1000,
      localTimeMs: 0,
      effectiveIndex: 0,
    });
    expect(resolveAlbumPlaybackPosition(project, 999.5)).toMatchObject({
      status: "resolved",
      trackId: "track-0",
      localTimeMs: 999.5,
    });
    expect(resolveAlbumPlaybackPosition(project, 1000)).toMatchObject({
      status: "resolved",
      trackId: "track-2",
      startMs: 1000,
      endMs: 4000,
      localTimeMs: 0,
      effectiveIndex: 1,
    });
    expect(resolveAlbumPlaybackPosition(project, 3999)).toMatchObject({
      status: "resolved",
      trackId: "track-2",
      localTimeMs: 2999,
    });
  });

  it("returns finished at exact album end and rejects out-of-range time", () => {
    const project = makeProject([1000, 2000]);
    expect(resolveAlbumPlaybackPosition(project, 3000)).toEqual({
      status: "finished",
      albumTimeMs: 3000,
    });
    expect(resolveAlbumPlaybackPosition(project, 3000.1)).toEqual({
      status: "blocked",
      reason: "position-out-of-range",
    });
  });

  it("rejects invalid timestamps and an album with zero enabled tracks", () => {
    const project = makeProject([1000]);
    for (const time of [Number.NaN, Infinity, -Infinity, -1]) {
      expect(resolveAlbumPlaybackPosition(project, time)).toEqual({
        status: "blocked",
        reason: "invalid-position",
      });
    }
    expect(resolveAlbumPlaybackPosition(makeProject([1000], [0]), 0)).toEqual({
      status: "blocked",
      reason: "no-enabled-track",
    });
  });

  it("blocks at the first unknown enabled duration and all later positions", () => {
    const project = makeProject([1000, undefined, 3000]);
    expect(resolveAlbumPlaybackPosition(project, 999)).toMatchObject({
      status: "resolved",
      trackId: "track-0",
    });
    for (const time of [1000, 1001, 4000]) {
      expect(resolveAlbumPlaybackPosition(project, time)).toEqual({
        status: "blocked",
        reason: "duration-unavailable",
      });
    }
  });

  it("refuses non-ready media even if its duration is known", () => {
    const project = makeProject([1000]);
    const asset = project.mediaAssets?.[0];
    expect(asset).toBeDefined();
    if (asset === undefined) throw new Error("missing fixture asset");
    asset.availability = "missing";
    asset.errorCode = "MEDIA_NOT_FOUND";

    expect(resolveAlbumPlaybackPosition(project, 100)).toEqual({
      status: "blocked",
      reason: "audio-unavailable",
      trackId: "track-0",
    });
  });

  it("stays deterministic over 128 tracks without modifying project state", () => {
    const project = makeProject(Array.from({ length: 128 }, () => 1000));
    const original = structuredClone(project);

    expect(resolveAlbumPlaybackPosition(project, 127500)).toMatchObject({
      status: "resolved",
      trackId: "track-127",
      audioAssetId: "asset-127",
      effectiveIndex: 127,
      localTimeMs: 500,
    });
    expect(resolveAlbumPlaybackPosition(project, 128000)).toMatchObject({
      status: "finished",
    });
    expect(project).toEqual(original);
  });
});
