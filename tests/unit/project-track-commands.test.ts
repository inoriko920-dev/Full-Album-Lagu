import { describe, expect, it } from "vitest";
import {
  createTrackReorderCommand,
  createTrackSetEnabledCommand,
} from "../../src/core/application/services/project-track-commands";
import { ProjectCommandEngine } from "../../src/core/application/services/project-command-engine";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import { projectAlbumTimeline } from "../../src/core/domain/album-timeline";
import { getProjectMediaReadiness } from "../../src/core/domain/media-readiness";
import type { ProjectDocument } from "../../src/core/domain/project-document";

function makeProject(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "track-command-project",
    name: "Album Track Commands",
    revision: 0,
    mediaAssets: [
      {
        id: "asset-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/01 Satu.mp3",
        fileName: "01 Satu.mp3",
        sizeBytes: 1001,
        availability: "ready",
        metadata: { durationMs: 1000 },
      },
      {
        id: "asset-2",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/02 Dua.mp3",
        fileName: "02 Dua.mp3",
        sizeBytes: 1002,
        availability: "ready",
        metadata: { durationMs: 2000 },
      },
      {
        id: "asset-3",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/03 Tiga.mp3",
        fileName: "03 Tiga.mp3",
        sizeBytes: 1003,
        availability: "ready",
        metadata: { durationMs: 3000 },
      },
    ],
    tracks: [
      {
        id: "track-1",
        title: "Satu",
        sourcePath: "D:/Album/01 Satu.mp3",
        audioAssetId: "asset-1",
      },
      {
        id: "track-2",
        title: "Dua",
        sourcePath: "D:/Album/02 Dua.mp3",
        audioAssetId: "asset-2",
      },
      {
        id: "track-3",
        title: "Tiga",
        sourcePath: "D:/Album/03 Tiga.mp3",
        audioAssetId: "asset-3",
      },
    ],
  };
}

function order(engine: ProjectCommandEngine): string[] {
  return engine.snapshot().project.tracks.map((track) => track.id);
}

describe("track application commands", () => {
  it("reorders last to first and recalculates cumulative boundaries deterministically", () => {
    const engine = new ProjectCommandEngine(makeProject());
    const before = engine.snapshot();

    const result = engine.execute(
      createTrackReorderCommand({
        trackId: "track-3",
        toIndex: 0,
        expectedBaseRevision: before.project.revision,
        expectedStateToken: before.stateToken,
      }),
    );

    expect(result.status).toBe("applied");
    expect(order(engine)).toEqual(["track-3", "track-1", "track-2"]);
    expect(engine.snapshot()).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
      redoDepth: 0,
    });

    const timeline = projectAlbumTimeline(engine.snapshot().project);
    expect(timeline.items.map((item) => ({
      trackId: item.trackId,
      startMs: item.startMs,
      endMs: item.endMs,
    }))).toEqual([
      { trackId: "track-3", startMs: 0, endMs: 3000 },
      { trackId: "track-1", startMs: 3000, endMs: 4000 },
      { trackId: "track-2", startMs: 4000, endMs: 6000 },
    ]);
    expect(timeline.totalDurationMs).toBe(6000);
  });

  it.each([
    {
      name: "first to last",
      trackId: "track-1",
      toIndex: 2,
      expected: ["track-2", "track-3", "track-1"],
    },
    {
      name: "middle to first",
      trackId: "track-2",
      toIndex: 0,
      expected: ["track-2", "track-1", "track-3"],
    },
    {
      name: "last to middle",
      trackId: "track-3",
      toIndex: 1,
      expected: ["track-1", "track-3", "track-2"],
    },
  ])("supports $name reorder with stable IDs and media links", ({ trackId, toIndex, expected }) => {
    const engine = new ProjectCommandEngine(makeProject());
    const beforeLinks = new Map(
      engine.snapshot().project.tracks.map((track) => [
        track.id,
        track.audioAssetId,
      ]),
    );

    expect(
      engine.execute(createTrackReorderCommand({ trackId, toIndex })).status,
    ).toBe("applied");

    expect(order(engine)).toEqual(expected);
    for (const track of engine.snapshot().project.tracks) {
      expect(track.audioAssetId).toBe(beforeLinks.get(track.id));
    }
  });

  it("disables and re-enables a track without deleting source identity and updates boundaries/readiness", () => {
    const project = makeProject();
    project.mediaAssets![1] = {
      ...project.mediaAssets![1]!,
      availability: "missing",
      errorCode: "MEDIA_NOT_FOUND",
    };
    const engine = new ProjectCommandEngine(project);

    expect(getProjectMediaReadiness(engine.snapshot().project).ready).toBe(false);

    expect(
      engine.execute(
        createTrackSetEnabledCommand({
          trackId: "track-2",
          enabled: false,
        }),
      ).status,
    ).toBe("applied");

    const disabled = engine.snapshot().project;
    expect(disabled.tracks[1]).toMatchObject({
      id: "track-2",
      enabled: false,
      audioAssetId: "asset-2",
      sourcePath: "D:/Album/02 Dua.mp3",
    });
    expect(disabled.mediaAssets?.find((asset) => asset.id === "asset-2")).toMatchObject({
      required: false,
      availability: "missing",
    });
    expect(getProjectMediaReadiness(disabled)).toEqual({
      ready: true,
      blockers: [],
    });
    expect(projectAlbumTimeline(disabled)).toMatchObject({
      enabledTrackCount: 2,
      totalDurationMs: 4000,
    });

    expect(
      engine.execute(
        createTrackSetEnabledCommand({
          trackId: "track-2",
          enabled: true,
        }),
      ).status,
    ).toBe("applied");

    const reenabled = engine.snapshot().project;
    expect(reenabled.mediaAssets?.find((asset) => asset.id === "asset-2")).toMatchObject({
      required: true,
      availability: "missing",
    });
    expect(getProjectMediaReadiness(reenabled)).toMatchObject({
      ready: false,
      blockers: [
        {
          assetId: "asset-2",
          code: "REQUIRED_MEDIA_MISSING",
        },
      ],
    });
    expect(projectAlbumTimeline(reenabled).totalDurationMs).toBeUndefined();
  });

  it("keeps a shared audio asset required while any referencing track remains enabled", () => {
    const project = makeProject();
    project.mediaAssets = [
      {
        id: "asset-shared",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/Shared.mp3",
        fileName: "Shared.mp3",
        sizeBytes: 5000,
        availability: "missing",
        errorCode: "MEDIA_NOT_FOUND",
      },
    ];
    project.tracks = [
      {
        id: "track-a",
        title: "A",
        sourcePath: "D:/Album/Shared.mp3",
        audioAssetId: "asset-shared",
      },
      {
        id: "track-b",
        title: "B",
        sourcePath: "D:/Album/Shared.mp3",
        audioAssetId: "asset-shared",
      },
    ];
    const engine = new ProjectCommandEngine(project);

    engine.execute(
      createTrackSetEnabledCommand({ trackId: "track-a", enabled: false }),
    );
    expect(engine.snapshot().project.mediaAssets?.[0]?.required).toBe(true);
    expect(getProjectMediaReadiness(engine.snapshot().project).ready).toBe(false);

    engine.execute(
      createTrackSetEnabledCommand({ trackId: "track-b", enabled: false }),
    );
    expect(engine.snapshot().project.mediaAssets?.[0]?.required).toBe(false);
    expect(getProjectMediaReadiness(engine.snapshot().project).ready).toBe(true);

    engine.execute(
      createTrackSetEnabledCommand({ trackId: "track-a", enabled: true }),
    );
    expect(engine.snapshot().project.mediaAssets?.[0]?.required).toBe(true);
    expect(getProjectMediaReadiness(engine.snapshot().project).ready).toBe(false);
  });

  it("rejects unknown tracks, invalid reorder targets, and invalid enabled payloads without history", () => {
    const engine = new ProjectCommandEngine(makeProject());

    expect(
      engine.execute(
        createTrackReorderCommand({ trackId: "missing", toIndex: 0 }),
      ),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(
      engine.execute(
        createTrackReorderCommand({ trackId: "track-1", toIndex: 99 }),
      ),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(
      engine.execute(
        createTrackSetEnabledCommand({
          trackId: "track-1",
          enabled: "yes" as unknown as boolean,
        }),
      ),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });

    expect(engine.snapshot()).toMatchObject({
      project: { revision: 0 },
      undoDepth: 0,
      redoDepth: 0,
    });
  });

  it("treats same-position reorder and unchanged enabled state as semantic no-ops", () => {
    const engine = new ProjectCommandEngine(makeProject());

    expect(
      engine.execute(
        createTrackReorderCommand({ trackId: "track-2", toIndex: 1 }),
      ),
    ).toEqual({ status: "noop" });
    expect(
      engine.execute(
        createTrackSetEnabledCommand({ trackId: "track-1", enabled: true }),
      ),
    ).toEqual({ status: "noop" });

    expect(engine.snapshot()).toMatchObject({
      project: { revision: 0 },
      undoDepth: 0,
    });
  });

  it("participates in the logical Save checkpoint and Undo-to-saved semantics", () => {
    const session = new ProjectSessionHistory(makeProject());

    session.execute(
      createTrackReorderCommand({ trackId: "track-3", toIndex: 0 }),
    );
    session.markSaved();
    expect(session.snapshot().dirty).toBe(false);

    session.execute(
      createTrackSetEnabledCommand({ trackId: "track-1", enabled: false }),
    );
    expect(session.snapshot().dirty).toBe(true);

    session.undo();
    expect(session.snapshot()).toMatchObject({
      dirty: false,
      savedRevision: 1,
      stateToken: "state-1",
      canRedo: true,
    });

    session.redo();
    expect(session.snapshot().dirty).toBe(true);
  });

  it("reorders more than 100 tracks deterministically with one command/history step", () => {
    const count = 105;
    const project: ProjectDocument = {
      schemaVersion: 1,
      projectId: "large-track-command",
      name: "Large Album",
      revision: 0,
      mediaAssets: Array.from({ length: count }, (_, index) => ({
        id: `asset-${index}`,
        kind: "audio" as const,
        required: true,
        sourcePath: `D:/Large/${index}.wav`,
        fileName: `${index}.wav`,
        sizeBytes: 1000 + index,
        availability: "ready" as const,
        metadata: { durationMs: 1000 },
      })),
      tracks: Array.from({ length: count }, (_, index) => ({
        id: `track-${index}`,
        title: `Track ${index}`,
        sourcePath: `D:/Large/${index}.wav`,
        audioAssetId: `asset-${index}`,
      })),
    };
    const engine = new ProjectCommandEngine(project);

    expect(
      engine.execute(
        createTrackReorderCommand({ trackId: "track-104", toIndex: 0 }),
      ).status,
    ).toBe("applied");

    const snapshot = engine.snapshot();
    expect(snapshot.project.tracks).toHaveLength(105);
    expect(snapshot.project.tracks[0]?.id).toBe("track-104");
    expect(snapshot.project.tracks[104]?.id).toBe("track-103");
    expect(snapshot).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
    });
    expect(projectAlbumTimeline(snapshot.project)).toMatchObject({
      complete: true,
      enabledTrackCount: 105,
      totalDurationMs: 105000,
    });
  });
});
