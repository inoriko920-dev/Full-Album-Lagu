import { describe, expect, it } from "vitest";
import {
  applyAutoArrangePlan,
  createAutoArrangeCommandBatch,
  createAutoArrangePlan,
} from "../../src/core/application/services/auto-arrange-service";
import { ProjectCommandEngine } from "../../src/core/application/services/project-command-engine";
import { createTrackSetEnabledCommand } from "../../src/core/application/services/project-track-commands";
import type { ProjectDocument } from "../../src/core/domain/project-document";

function projectFixture(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "auto-susun-test",
    name: "Album Auto Susun",
    revision: 0,
    albumPresentation: {
      defaultArtworkAssetId: "image-default",
    },
    mediaAssets: [
      {
        id: "audio-a",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/99 Gamma.wav",
        fileName: "99 Gamma.wav",
        sizeBytes: 1001,
        availability: "ready",
        metadata: {
          durationMs: 1000,
          trackNumber: 3,
          artist: "Artist A",
        },
      },
      {
        id: "audio-b",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/01 First.wav",
        fileName: "01 First.wav",
        sizeBytes: 1002,
        availability: "ready",
        metadata: {
          durationMs: 1000,
        },
      },
      {
        id: "audio-c",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/77 Second.wav",
        fileName: "77 Second.wav",
        sizeBytes: 1003,
        availability: "ready",
        metadata: {
          durationMs: 1000,
          trackNumber: 2,
        },
      },
      {
        id: "audio-d",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/Beta Song.wav",
        fileName: "Beta Song.wav",
        sizeBytes: 1004,
        availability: "ready",
        metadata: {
          durationMs: 1000,
        },
      },
      {
        id: "audio-e",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/Alpha-Song.wav",
        fileName: "Alpha-Song.wav",
        sizeBytes: 1005,
        availability: "ready",
        metadata: {
          durationMs: 1000,
        },
      },
      {
        id: "image-default",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/default.webp",
        fileName: "default.webp",
        sizeBytes: 200,
        availability: "ready",
      },
      {
        id: "image-track",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/track.jpg",
        fileName: "track.jpg",
        sizeBytes: 201,
        availability: "ready",
      },
    ],
    tracks: [
      {
        id: "track-a",
        title: "Gamma",
        sourcePath: "D:/Album/99 Gamma.wav",
        audioAssetId: "audio-a",
        binding: {
          titleOverride: "Manual Gamma",
          artistOverride: "Manual Artist",
          artworkAssetId: "image-track",
        },
      },
      {
        id: "track-d",
        title: "Beta Song",
        sourcePath: "D:/Album/Beta Song.wav",
        audioAssetId: "audio-d",
        enabled: false,
      },
      {
        id: "track-c",
        title: "Second",
        sourcePath: "D:/Album/77 Second.wav",
        audioAssetId: "audio-c",
      },
      {
        id: "track-e",
        title: "Alpha Song",
        sourcePath: "D:/Album/Alpha-Song.wav",
        audioAssetId: "audio-e",
        binding: {
          albumOverride: "Manual Album",
          yearOverride: 2026,
        },
      },
      {
        id: "track-b",
        title: "First",
        sourcePath: "D:/Album/01 First.wav",
        audioAssetId: "audio-b",
      },
    ],
  };
}

function trackState(project: ProjectDocument): Map<string, unknown> {
  return new Map(
    project.tracks.map((track) => [
      track.id,
      {
        sourcePath: track.sourcePath,
        audioAssetId: track.audioAssetId,
        enabled: track.enabled,
        binding: track.binding,
      },
    ]),
  );
}

describe("deterministic Auto Susun planner", () => {
  it("orders by metadata/filename number, then normalized filename/title deterministically", () => {
    const project = projectFixture();
    const plan = createAutoArrangePlan(project, "state-0");

    expect(plan).toMatchObject({
      projectId: "auto-susun-test",
      baseRevision: 0,
      baseStateToken: "state-0",
      changed: true,
      orderedTrackIds: ["track-b", "track-c", "track-a", "track-e", "track-d"],
    });

    expect(
      plan.items.map((item) => ({
        trackId: item.trackId,
        fromIndex: item.fromIndex,
        toIndex: item.toIndex,
        enabled: item.enabled,
        numberSource: item.numberSource,
        orderNumber: item.orderNumber,
      })),
    ).toEqual([
      {
        trackId: "track-a",
        fromIndex: 0,
        toIndex: 2,
        enabled: true,
        numberSource: "audio-metadata",
        orderNumber: 3,
      },
      {
        trackId: "track-d",
        fromIndex: 1,
        toIndex: 4,
        enabled: false,
        numberSource: "none",
        orderNumber: undefined,
      },
      {
        trackId: "track-c",
        fromIndex: 2,
        toIndex: 1,
        enabled: true,
        numberSource: "audio-metadata",
        orderNumber: 2,
      },
      {
        trackId: "track-e",
        fromIndex: 3,
        toIndex: 3,
        enabled: true,
        numberSource: "none",
        orderNumber: undefined,
      },
      {
        trackId: "track-b",
        fromIndex: 4,
        toIndex: 0,
        enabled: true,
        numberSource: "filename",
        orderNumber: 1,
      },
    ]);
  });

  it("does not depend on media asset array completion order", () => {
    const left = projectFixture();
    const right = projectFixture();
    right.mediaAssets = [...(right.mediaAssets ?? [])].reverse();

    expect(createAutoArrangePlan(left, "state-x").orderedTrackIds).toEqual(
      createAutoArrangePlan(right, "state-x").orderedTrackIds,
    );
  });

  it("applies one Auto Susun batch as one revision/history/Undo step and preserves identities, disabled state and overrides", () => {
    const project = projectFixture();
    const beforeState = trackState(project);
    const engine = new ProjectCommandEngine(project);
    const before = engine.snapshot();
    const plan = createAutoArrangePlan(before.project, before.stateToken);

    const result = engine.executeBatch(createAutoArrangeCommandBatch(plan));

    expect(result.status).toBe("applied");
    expect(engine.snapshot()).toMatchObject({
      project: { revision: 1 },
      stateToken: "state-1",
      undoDepth: 1,
      redoDepth: 0,
    });
    expect(engine.snapshot().project.tracks.map((track) => track.id)).toEqual(
      plan.orderedTrackIds,
    );
    expect(engine.historyEntries()).toEqual([
      expect.objectContaining({
        kind: "album.auto-arrange",
        label: "Auto Susun Album",
        origin: "auto-susun",
      }),
    ]);

    for (const track of engine.snapshot().project.tracks) {
      expect({
        sourcePath: track.sourcePath,
        audioAssetId: track.audioAssetId,
        enabled: track.enabled,
        binding: track.binding,
      }).toEqual(beforeState.get(track.id));
    }

    expect(engine.undo().status).toBe("applied");
    expect(engine.snapshot()).toMatchObject({
      project: { revision: 2 },
      stateToken: "state-0",
      undoDepth: 0,
      redoDepth: 1,
    });
    expect(engine.snapshot().project.tracks.map((track) => track.id)).toEqual(
      project.tracks.map((track) => track.id),
    );

    expect(engine.redo().status).toBe("applied");
    expect(engine.snapshot()).toMatchObject({
      project: { revision: 3 },
      stateToken: "state-1",
      undoDepth: 1,
      redoDepth: 0,
    });
    expect(engine.snapshot().project.tracks.map((track) => track.id)).toEqual(
      plan.orderedTrackIds,
    );
  });

  it("is idempotent: planning/applying an already arranged project creates no revision or history noise", () => {
    const engine = new ProjectCommandEngine(projectFixture());
    const first = engine.snapshot();
    const firstPlan = createAutoArrangePlan(first.project, first.stateToken);

    expect(
      engine.executeBatch(createAutoArrangeCommandBatch(firstPlan)).status,
    ).toBe("applied");

    const arranged = engine.snapshot();
    const secondPlan = createAutoArrangePlan(
      arranged.project,
      arranged.stateToken,
    );

    expect(secondPlan.changed).toBe(false);
    expect(
      engine.executeBatch(createAutoArrangeCommandBatch(secondPlan)),
    ).toEqual({ status: "noop" });
    expect(engine.snapshot()).toMatchObject({
      project: { revision: 1 },
      stateToken: "state-1",
      undoDepth: 1,
      redoDepth: 0,
    });
  });

  it("rejects stale revision and stale state-token plans atomically", () => {
    const engine = new ProjectCommandEngine(projectFixture());
    const initial = engine.snapshot();
    const staleRevisionPlan = createAutoArrangePlan(
      initial.project,
      initial.stateToken,
    );

    expect(
      engine.execute(
        createTrackSetEnabledCommand({
          trackId: "track-d",
          enabled: true,
          expectedBaseRevision: initial.project.revision,
          expectedStateToken: initial.stateToken,
        }),
      ).status,
    ).toBe("applied");

    expect(
      engine.executeBatch(createAutoArrangeCommandBatch(staleRevisionPlan)),
    ).toEqual({ status: "rejected", code: "STALE_REVISION" });

    const current = engine.snapshot();
    const staleTokenPlan = createAutoArrangePlan(
      current.project,
      "state-stale",
    );
    expect(
      engine.executeBatch(createAutoArrangeCommandBatch(staleTokenPlan)),
    ).toEqual({ status: "rejected", code: "STALE_STATE_TOKEN" });

    expect(engine.snapshot()).toMatchObject({
      project: { revision: 1 },
      stateToken: current.stateToken,
      undoDepth: 1,
    });
  });

  it("rolls back an invalid/tampered plan with no partial publication", () => {
    const engine = new ProjectCommandEngine(projectFixture());
    const before = engine.snapshot();
    const plan = createAutoArrangePlan(before.project, before.stateToken);
    const invalidPlan = {
      ...plan,
      orderedTrackIds: [...plan.orderedTrackIds.slice(0, -1), "track-unknown"],
    };

    expect(
      engine.executeBatch(createAutoArrangeCommandBatch(invalidPlan)),
    ).toEqual({
      status: "rejected",
      code: "COMMAND_FAILED",
      failedCommandIndex: 0,
    });

    expect(engine.snapshot()).toMatchObject({
      project: { revision: 0 },
      stateToken: "state-0",
      undoDepth: 0,
      redoDepth: 0,
    });
    expect(engine.snapshot().project.tracks.map((track) => track.id)).toEqual(
      projectFixture().tracks.map((track) => track.id),
    );
  });

  it("clones the plan into the batch so later caller mutation cannot change the pending operation", () => {
    const engine = new ProjectCommandEngine(projectFixture());
    const before = engine.snapshot();
    const plan = createAutoArrangePlan(before.project, before.stateToken);
    const expected = [...plan.orderedTrackIds];
    const batch = createAutoArrangeCommandBatch(plan);

    plan.orderedTrackIds.reverse();

    expect(engine.executeBatch(batch).status).toBe("applied");
    expect(engine.snapshot().project.tracks.map((track) => track.id)).toEqual(
      expected,
    );
  });

  it("keeps direct plan application pure with respect to the input project", () => {
    const project = projectFixture();
    const before = JSON.stringify(project);
    const plan = createAutoArrangePlan(project, "state-0");
    const applied = applyAutoArrangePlan(project, plan);

    expect(applied.tracks.map((track) => track.id)).toEqual(
      plan.orderedTrackIds,
    );
    expect(JSON.stringify(project)).toBe(before);
  });

  it("handles 128 mixed tracks deterministically while preserving every track identity and manual binding", () => {
    const count = 128;
    const project: ProjectDocument = {
      schemaVersion: 1,
      projectId: "auto-susun-128",
      name: "Album 128",
      revision: 0,
      mediaAssets: Array.from({ length: count }, (_, index) => ({
        id: `asset-${index}`,
        kind: "audio" as const,
        required: index % 9 !== 0,
        sourcePath: `D:/Scale/${String(((index * 37) % count) + 1).padStart(3, "0")} Track ${index}.wav`,
        fileName: `${String(((index * 37) % count) + 1).padStart(3, "0")} Track ${index}.wav`,
        sizeBytes: 10000 + index,
        availability: "ready" as const,
        metadata: {
          durationMs: 1000,
          ...(index % 4 === 0
            ? { trackNumber: ((index * 13) % count) + 1 }
            : {}),
        },
      })),
      tracks: Array.from({ length: count }, (_, index) => ({
        id: `track-${index}`,
        title: `Track ${index}`,
        sourcePath: `D:/Scale/${String(((index * 37) % count) + 1).padStart(3, "0")} Track ${index}.wav`,
        audioAssetId: `asset-${index}`,
        ...(index % 9 === 0 ? { enabled: false } : {}),
        ...(index % 11 === 0
          ? {
              binding: {
                titleOverride: `Manual ${index}`,
                artistOverride: `Artist ${index}`,
              },
            }
          : {}),
      })),
    };

    const engine = new ProjectCommandEngine(project);
    const initial = engine.snapshot();
    const beforeState = trackState(initial.project);
    const planA = createAutoArrangePlan(initial.project, initial.stateToken);
    const planB = createAutoArrangePlan(
      structuredClone(initial.project),
      initial.stateToken,
    );

    expect(planA.orderedTrackIds).toHaveLength(count);
    expect(new Set(planA.orderedTrackIds)).toHaveSize(count);
    expect(planB).toEqual(planA);

    expect(
      engine.executeBatch(createAutoArrangeCommandBatch(planA)).status,
    ).toBe("applied");

    const arranged = engine.snapshot();
    expect(arranged).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
      redoDepth: 0,
    });
    expect(arranged.project.tracks).toHaveLength(count);
    expect(arranged.project.tracks.map((track) => track.id)).toEqual(
      planA.orderedTrackIds,
    );

    for (const track of arranged.project.tracks) {
      expect({
        sourcePath: track.sourcePath,
        audioAssetId: track.audioAssetId,
        enabled: track.enabled,
        binding: track.binding,
      }).toEqual(beforeState.get(track.id));
    }

    const repeat = createAutoArrangePlan(arranged.project, arranged.stateToken);
    expect(repeat.changed).toBe(false);
    expect(engine.executeBatch(createAutoArrangeCommandBatch(repeat))).toEqual({
      status: "noop",
    });

    expect(engine.undo().status).toBe("applied");
    expect(engine.snapshot().project.tracks.map((track) => track.id)).toEqual(
      project.tracks.map((track) => track.id),
    );
    expect(engine.redo().status).toBe("applied");
    expect(engine.snapshot().project.tracks.map((track) => track.id)).toEqual(
      planA.orderedTrackIds,
    );
  });
});
