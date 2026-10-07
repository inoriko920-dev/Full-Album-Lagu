import { describe, expect, it } from "vitest";
import {
  isProjectTrackEnabled,
  projectAlbumTimeline,
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
