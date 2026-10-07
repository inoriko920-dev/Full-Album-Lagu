import { describe, expect, it } from "vitest";
import {
  createAutoArrangeCommandBatch,
  createAutoArrangePlan,
} from "../../src/core/application/services/auto-arrange";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import { createTrackSetEnabledCommand } from "../../src/core/application/services/project-track-commands";
import type { ProjectDocument } from "../../src/core/domain/project-document";

function makeProject(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "auto-susun-project",
    name: "Album Auto Susun",
    revision: 0,
    albumPresentation: {
      defaultArtworkAssetId: "image-default",
    },
    mediaAssets: [
      {
        id: "asset-a",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/03 Alpha.mp3",
        fileName: "03 Alpha.mp3",
        sizeBytes: 1001,
        availability: "ready",
        metadata: { durationMs: 1000 },
      },
      {
        id: "asset-b",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/02 Beta.mp3",
        fileName: "02 Beta.mp3",
        sizeBytes: 1002,
        availability: "ready",
        metadata: { durationMs: 1000 },
      },
      {
        id: "asset-c",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/99 Zulu.mp3",
        fileName: "99 Zulu.mp3",
        sizeBytes: 1003,
        availability: "ready",
        metadata: { durationMs: 1000, trackNumber: 1 },
      },
      {
        id: "asset-d",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/Zulu Song.mp3",
        fileName: "Zulu Song.mp3",
        sizeBytes: 1004,
        availability: "ready",
        metadata: { durationMs: 1000 },
      },
      {
        id: "asset-e",
        kind: "audio",
        required: false,
        sourcePath: "D:/Album/20 Echo.mp3",
        fileName: "20 Echo.mp3",
        sizeBytes: 1005,
        availability: "ready",
        metadata: { durationMs: 1000, trackNumber: 2 },
      },
      {
        id: "image-default",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/default.webp",
        fileName: "default.webp",
        sizeBytes: 500,
        availability: "ready",
      },
      {
        id: "image-track",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/track.jpg",
        fileName: "track.jpg",
        sizeBytes: 501,
        availability: "ready",
      },
    ],
    tracks: [
      {
        id: "track-e",
        title: "Echo",
        sourcePath: "D:/Album/20 Echo.mp3",
        audioAssetId: "asset-e",
        enabled: false,
      },
      {
        id: "track-d",
        title: "Zulu Song",
        sourcePath: "D:/Album/Zulu Song.mp3",
        audioAssetId: "asset-d",
      },
      {
        id: "track-a",
        title: "Alpha",
        sourcePath: "D:/Album/03 Alpha.mp3",
        audioAssetId: "asset-a",
      },
      {
        id: "track-c",
        title: "Zulu Metadata",
        sourcePath: "D:/Album/99 Zulu.mp3",
        audioAssetId: "asset-c",
        binding: {
          titleOverride: "Manual C",
          artistOverride: "Manual Artist",
          albumOverride: "Manual Album",
          yearOverride: 2026,
          artworkAssetId: "image-track",
        },
      },
      {
        id: "track-b",
        title: "Beta",
        sourcePath: "D:/Album/02 Beta.mp3",
        audioAssetId: "asset-b",
      },
    ],
  };
}

function planFor(session: ProjectSessionHistory) {
  const snapshot = session.snapshot();
  return createAutoArrangePlan(snapshot.project, snapshot.stateToken);
}

describe("deterministic Auto Susun planner + CommandBatch", () => {
  it("orders by metadata track number, filename number, normalized name and stable original index", () => {
    const project = makeProject();
    const plan = createAutoArrangePlan(project, "state-0");

    expect(plan.orderedTrackIds).toEqual([
      "track-c",
      "track-e",
      "track-b",
      "track-a",
      "track-d",
    ]);
    expect(plan.changed).toBe(true);

    const reversedAssets = {
      ...project,
      mediaAssets: [...(project.mediaAssets ?? [])].reverse(),
    };
    expect(
      createAutoArrangePlan(reversedAssets, "state-0").orderedTrackIds,
    ).toEqual(plan.orderedTrackIds);

    const tieProject: ProjectDocument = {
      schemaVersion: 1,
      projectId: "stable-tie",
      name: "Stable Tie",
      revision: 0,
      mediaAssets: [
        {
          id: "tie-z",
          kind: "audio",
          required: true,
          sourcePath: "D:/Tie/Same!!.mp3",
          fileName: "Same!!.mp3",
          sizeBytes: 1,
          availability: "ready",
          metadata: { durationMs: 1000 },
        },
        {
          id: "tie-a",
          kind: "audio",
          required: true,
          sourcePath: "D:/Tie/same.mp3",
          fileName: "same.mp3",
          sizeBytes: 2,
          availability: "ready",
          metadata: { durationMs: 1000 },
        },
      ],
      tracks: [
        {
          id: "track-z",
          title: "Same",
          sourcePath: "D:/Tie/Same!!.mp3",
          audioAssetId: "tie-z",
        },
        {
          id: "track-a",
          title: "Same",
          sourcePath: "D:/Tie/same.mp3",
          audioAssetId: "tie-a",
        },
      ],
    };

    expect(
      createAutoArrangePlan(tieProject, "state-0").orderedTrackIds,
    ).toEqual(["track-z", "track-a"]);
  });

  it("applies as one auto-susun history step while preserving track identity, disabled state and manual bindings", () => {
    const session = new ProjectSessionHistory(makeProject());
    const before = session.snapshot();
    const beforeTracks = new Map(
      before.project.tracks.map((track) => [track.id, structuredClone(track)]),
    );
    const beforeMedia = structuredClone(before.project.mediaAssets);

    const result = session.executeBatch(
      createAutoArrangeCommandBatch(
        createAutoArrangePlan(before.project, before.stateToken),
      ),
    );

    expect(result).toMatchObject({
      status: "applied",
      entry: {
        kind: "album.auto-susun",
        origin: "auto-susun",
      },
    });

    const arranged = session.snapshot();
    expect(arranged.project.tracks.map((track) => track.id)).toEqual([
      "track-c",
      "track-e",
      "track-b",
      "track-a",
      "track-d",
    ]);
    expect(arranged).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
      redoDepth: 0,
      dirty: true,
    });
    expect(arranged.project.mediaAssets).toEqual(beforeMedia);

    for (const track of arranged.project.tracks) {
      expect(track).toEqual(beforeTracks.get(track.id));
    }

    expect(session.undo().status).toBe("applied");
    expect(session.snapshot().project.tracks.map((track) => track.id)).toEqual(
      before.project.tracks.map((track) => track.id),
    );

    expect(session.redo().status).toBe("applied");
    expect(session.snapshot().project.tracks.map((track) => track.id)).toEqual([
      "track-c",
      "track-e",
      "track-b",
      "track-a",
      "track-d",
    ]);
  });

  it("becomes an idempotent no-op when the unchanged arranged state is planned again", () => {
    const session = new ProjectSessionHistory(makeProject());

    expect(
      session.executeBatch(createAutoArrangeCommandBatch(planFor(session)))
        .status,
    ).toBe("applied");

    const arranged = session.snapshot();
    const repeatedPlan = createAutoArrangePlan(
      arranged.project,
      arranged.stateToken,
    );
    expect(repeatedPlan.changed).toBe(false);

    expect(
      session.executeBatch(createAutoArrangeCommandBatch(repeatedPlan)),
    ).toEqual({ status: "noop" });

    expect(session.snapshot()).toMatchObject({
      project: { revision: 1 },
      stateToken: arranged.stateToken,
      undoDepth: 1,
      redoDepth: 0,
    });
  });

  it("rejects stale revision and stale state-token plans without partial publication", () => {
    const session = new ProjectSessionHistory(makeProject());
    const originalPlan = planFor(session);

    expect(
      session.execute(
        createTrackSetEnabledCommand({
          trackId: "track-d",
          enabled: false,
        }),
      ).status,
    ).toBe("applied");

    const afterManualChange = session.snapshot();
    expect(
      session.executeBatch(createAutoArrangeCommandBatch(originalPlan)),
    ).toEqual({
      status: "rejected",
      code: "STALE_REVISION",
    });
    expect(session.snapshot()).toEqual(afterManualChange);

    const fresh = planFor(session);
    const wrongTokenPlan = {
      ...fresh,
      baseStateToken: "state-stale",
    };

    expect(
      session.executeBatch(createAutoArrangeCommandBatch(wrongTokenPlan)),
    ).toEqual({
      status: "rejected",
      code: "STALE_STATE_TOKEN",
    });
    expect(session.snapshot()).toEqual(afterManualChange);
  });

  it("rejects a plan for another project atomically with no history or revision noise", () => {
    const session = new ProjectSessionHistory(makeProject());
    const before = session.snapshot();
    const plan = planFor(session);

    const result = session.executeBatch(
      createAutoArrangeCommandBatch({
        ...plan,
        projectId: "different-project",
      }),
    );

    expect(result).toEqual({
      status: "rejected",
      code: "COMMAND_FAILED",
      failedCommandIndex: 0,
    });
    expect(session.snapshot()).toEqual(before);
  });

  it("keeps 128-track planning/apply/Undo/Redo deterministic in one history step", () => {
    const count = 128;
    const project: ProjectDocument = {
      schemaVersion: 1,
      projectId: "auto-susun-128",
      name: "Auto Susun 128",
      revision: 0,
      mediaAssets: Array.from({ length: count }, (_, index) => ({
        id: `asset-${index}`,
        kind: "audio" as const,
        required: index % 11 !== 0,
        sourcePath: `D:/Stress/${String((index * 37) % count).padStart(
          3,
          "0",
        )} Track ${index}.mp3`,
        fileName: `${String((index * 37) % count).padStart(
          3,
          "0",
        )} Track ${index}.mp3`,
        sizeBytes: 10_000 + index,
        availability: "ready" as const,
        metadata: {
          durationMs: 1000 + index,
          ...(index % 3 === 0 ? { trackNumber: ((index * 13) % 50) + 1 } : {}),
        },
      })),
      tracks: Array.from({ length: count }, (_, index) => ({
        id: `track-${index}`,
        title: `Track ${index}`,
        sourcePath: `D:/Stress/${String((index * 37) % count).padStart(
          3,
          "0",
        )} Track ${index}.mp3`,
        audioAssetId: `asset-${index}`,
        ...(index % 11 === 0 ? { enabled: false } : {}),
        ...(index % 17 === 0
          ? { binding: { titleOverride: `Manual ${index}` } }
          : {}),
      })),
    };

    const session = new ProjectSessionHistory(project);
    const before = session.snapshot();
    const planA = createAutoArrangePlan(before.project, before.stateToken);
    const planB = createAutoArrangePlan(before.project, before.stateToken);

    expect(planA).toEqual(planB);
    expect(planA.orderedTrackIds).toHaveLength(128);

    expect(
      session.executeBatch(createAutoArrangeCommandBatch(planA)).status,
    ).toBe("applied");

    const arranged = session.snapshot();
    expect(arranged).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
      redoDepth: 0,
    });
    expect(arranged.project.tracks).toHaveLength(128);

    const beforeById = new Map(
      before.project.tracks.map((track) => [track.id, track]),
    );
    for (const track of arranged.project.tracks) {
      expect(track).toEqual(beforeById.get(track.id));
    }

    const arrangedOrder = arranged.project.tracks.map((track) => track.id);

    expect(session.undo().status).toBe("applied");
    expect(session.snapshot()).toMatchObject({
      project: { revision: 2 },
      stateToken: "state-0",
      undoDepth: 0,
      redoDepth: 1,
      dirty: false,
    });
    expect(session.snapshot().project.tracks.map((track) => track.id)).toEqual(
      before.project.tracks.map((track) => track.id),
    );

    expect(session.redo().status).toBe("applied");
    expect(session.snapshot()).toMatchObject({
      project: { revision: 3 },
      undoDepth: 1,
      redoDepth: 0,
      dirty: true,
    });
    expect(session.snapshot().project.tracks.map((track) => track.id)).toEqual(
      arrangedOrder,
    );
  });
});
