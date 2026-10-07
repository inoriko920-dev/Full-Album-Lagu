import { describe, expect, it } from "vitest";
import type { ProjectRecoveryStore } from "../../src/core/application/ports/project-recovery-store";
import {
  PROJECT_COMMAND_ORIGINS,
  ProjectCommandEngine,
  type ProjectCommand,
  type ProjectCommandOrigin,
} from "../../src/core/application/services/project-command-engine";
import { ProjectRecoveryService } from "../../src/core/application/services/project-recovery-service";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import {
  createTrackReorderCommand,
  createTrackSetEnabledCommand,
} from "../../src/core/application/services/project-track-commands";
import type { RecoverySnapshot } from "../../src/core/contracts/project-recovery";
import { projectAlbumTimeline } from "../../src/core/domain/album-timeline";
import {
  createEmptyProject,
  type ProjectDocument,
} from "../../src/core/domain/project-document";

function renameCommand(
  name: string,
  origin: ProjectCommandOrigin,
  expected?: { revision?: number; stateToken?: string },
): ProjectCommand {
  return {
    kind: "project.rename",
    label: `Rename ${name}`,
    origin,
    ...(expected?.revision === undefined
      ? {}
      : { expectedBaseRevision: expected.revision }),
    ...(expected?.stateToken === undefined
      ? {}
      : { expectedStateToken: expected.stateToken }),
    apply: (project) => ({ ...project, name }),
  };
}

function largeProject(count = 128): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "history-hardening-large",
    name: "Large History Album",
    revision: 0,
    mediaAssets: Array.from({ length: count }, (_, index) => ({
      id: `asset-${index}`,
      kind: "audio" as const,
      required: true,
      sourcePath: `D:/Large Album/Track ${index}.wav`,
      fileName: `Track ${index}.wav`,
      sizeBytes: 10_000 + index,
      availability: "ready" as const,
      metadata: { durationMs: 1000 },
    })),
    tracks: Array.from({ length: count }, (_, index) => ({
      id: `track-${index}`,
      title: `Track ${index}`,
      sourcePath: `D:/Large Album/Track ${index}.wav`,
      audioAssetId: `asset-${index}`,
    })),
  };
}

class MemoryRecoveryStore implements ProjectRecoveryStore {
  private readonly snapshots = new Map<string, RecoverySnapshot>();

  async save(projectId: string, snapshot: RecoverySnapshot): Promise<void> {
    this.snapshots.set(projectId, structuredClone(snapshot));
  }

  async load(projectId: string): Promise<RecoverySnapshot | null> {
    const snapshot = this.snapshots.get(projectId);
    return snapshot === undefined ? null : structuredClone(snapshot);
  }

  async remove(projectId: string): Promise<boolean> {
    return this.snapshots.delete(projectId);
  }
}

describe("T11-W03-05 unified history hardening", () => {
  it.each(PROJECT_COMMAND_ORIGINS)(
    "treats %s as the same official single-command history contract",
    (origin) => {
      const engine = new ProjectCommandEngine(
        createEmptyProject(`origin-single-${origin}`),
      );

      expect(engine.execute(renameCommand(`Album ${origin}`, origin)).status).toBe(
        "applied",
      );
      expect(engine.historyEntries()).toEqual([
        expect.objectContaining({
          kind: "project.rename",
          origin,
          beforeStateToken: "state-0",
          afterStateToken: "state-1",
        }),
      ]);
    },
  );

  it.each(PROJECT_COMMAND_ORIGINS)(
    "treats %s batches atomically as one history node",
    (origin) => {
      const engine = new ProjectCommandEngine(
        createEmptyProject(`origin-batch-${origin}`),
      );
      const before = engine.snapshot();

      const result = engine.executeBatch({
        kind: "album.batch",
        label: `Batch ${origin}`,
        origin,
        expectedBaseRevision: before.project.revision,
        expectedStateToken: before.stateToken,
        commands: [
          renameCommand("Tahap A", origin, {
            revision: before.project.revision,
            stateToken: before.stateToken,
          }),
          renameCommand("Tahap B", origin, {
            revision: before.project.revision,
            stateToken: before.stateToken,
          }),
        ],
      });

      expect(result.status).toBe("applied");
      expect(engine.snapshot()).toMatchObject({
        project: { name: "Tahap B", revision: 1 },
        undoDepth: 1,
        redoDepth: 0,
      });
      expect(engine.historyEntries()).toEqual([
        expect.objectContaining({ kind: "album.batch", origin }),
      ]);

      expect(engine.undo().status).toBe("applied");
      expect(engine.snapshot()).toMatchObject({
        project: { name: "Proyek Baru", revision: 2 },
        stateToken: "state-0",
      });
    },
  );

  it("rejects runtime-invalid origins for single commands and batches without history", () => {
    const engine = new ProjectCommandEngine(
      createEmptyProject("invalid-origin-runtime"),
    );

    const invalidCommand = {
      ...renameCommand("Tidak Boleh", "manual"),
      origin: "plugin-bypass",
    } as unknown as ProjectCommand;

    expect(engine.execute(invalidCommand)).toEqual({
      status: "rejected",
      code: "INVALID_COMMAND",
    });

    expect(
      engine.executeBatch({
        kind: "invalid.batch",
        label: "Invalid origin batch",
        origin: "plugin-bypass" as ProjectCommandOrigin,
        commands: [
          {
            ...renameCommand("Tidak Boleh Batch", "manual"),
            origin: "plugin-bypass" as ProjectCommandOrigin,
          },
        ],
      }),
    ).toEqual({
      status: "rejected",
      code: "INVALID_COMMAND",
    });

    expect(engine.snapshot()).toMatchObject({
      project: { name: "Proyek Baru", revision: 0 },
      undoDepth: 0,
      redoDepth: 0,
    });
  });

  it("rolls back the whole batch when a later child is stale or fails", () => {
    const staleEngine = new ProjectCommandEngine(
      createEmptyProject("batch-stale"),
    );
    const staleBefore = staleEngine.snapshot();

    expect(
      staleEngine.executeBatch({
        kind: "album.batch",
        label: "Stale child",
        origin: "template",
        commands: [
          renameCommand("Temporary", "template"),
          renameCommand("Stale", "template", {
            revision: staleBefore.project.revision + 1,
            stateToken: staleBefore.stateToken,
          }),
        ],
      }),
    ).toEqual({
      status: "rejected",
      code: "STALE_REVISION",
      failedCommandIndex: 1,
    });
    expect(staleEngine.snapshot()).toMatchObject({
      project: { name: "Proyek Baru", revision: 0 },
      stateToken: "state-0",
      undoDepth: 0,
    });

    const failedEngine = new ProjectCommandEngine(
      createEmptyProject("batch-failed"),
    );
    expect(
      failedEngine.executeBatch({
        kind: "album.batch",
        label: "Failed child",
        origin: "ai",
        commands: [
          renameCommand("Temporary", "ai"),
          {
            kind: "project.fail",
            label: "Failure",
            origin: "ai",
            apply: () => {
              throw new Error("sensitive C:/private/internal/path");
            },
          },
        ],
      }),
    ).toEqual({
      status: "rejected",
      code: "COMMAND_FAILED",
      failedCommandIndex: 1,
    });
    expect(failedEngine.snapshot()).toMatchObject({
      project: { name: "Proyek Baru", revision: 0 },
      stateToken: "state-0",
      undoDepth: 0,
    });
  });

  it("keeps a net-zero batch as a no-op with no revision/history noise", () => {
    const engine = new ProjectCommandEngine(
      createEmptyProject("batch-net-zero"),
    );
    const originalName = engine.snapshot().project.name;

    expect(
      engine.executeBatch({
        kind: "album.batch",
        label: "Net zero",
        origin: "auto-susun",
        commands: [
          renameCommand("Temporary", "auto-susun"),
          renameCommand(originalName, "auto-susun"),
        ],
      }),
    ).toEqual({ status: "noop" });

    expect(engine.snapshot()).toMatchObject({
      project: { name: originalName, revision: 0 },
      stateToken: "state-0",
      undoDepth: 0,
      redoDepth: 0,
    });
  });

  it("keeps an asynchronously saved logical checkpoint clean only at that token", () => {
    const session = new ProjectSessionHistory(
      createEmptyProject("late-save-checkpoint"),
    );

    expect(
      session.execute(renameCommand("Saved A", "manual")).status,
    ).toBe("applied");
    const saveCheckpoint = session.snapshot();

    expect(
      session.execute(renameCommand("Newer B", "manual")).status,
    ).toBe("applied");

    session.markSavedCheckpoint(
      saveCheckpoint.stateToken,
      saveCheckpoint.project.revision,
    );

    expect(session.snapshot()).toMatchObject({
      project: { name: "Newer B", revision: 2 },
      savedRevision: 1,
      savedStateToken: saveCheckpoint.stateToken,
      dirty: true,
    });

    expect(session.undo().status).toBe("applied");
    expect(session.snapshot()).toMatchObject({
      project: { name: "Saved A", revision: 3 },
      stateToken: saveCheckpoint.stateToken,
      savedStateToken: saveCheckpoint.stateToken,
      dirty: false,
      canRedo: true,
    });

    expect(session.redo().status).toBe("applied");
    expect(session.snapshot()).toMatchObject({
      project: { name: "Newer B", revision: 4 },
      dirty: true,
    });
  });

  it("invalidates Redo after a divergent branch without falsely matching the saved checkpoint", () => {
    const session = new ProjectSessionHistory(
      createEmptyProject("divergent-saved-checkpoint"),
    );

    session.execute(renameCommand("Saved", "manual"));
    session.markSaved();
    session.execute(renameCommand("Unsaved", "manual"));
    session.undo();

    expect(session.snapshot()).toMatchObject({
      project: { name: "Saved" },
      dirty: false,
      canRedo: true,
    });

    session.execute(renameCommand("Divergent", "manual"));

    expect(session.snapshot()).toMatchObject({
      project: { name: "Divergent", revision: 4 },
      dirty: true,
      canRedo: false,
      redoDepth: 0,
    });
    expect(session.redo()).toEqual({ status: "unavailable" });
  });

  it("uses the late-save checkpoint revision for dirty autosave and skips again after Undo-to-saved", async () => {
    const session = new ProjectSessionHistory(
      createEmptyProject("autosave-checkpoint"),
    );
    session.execute(renameCommand("Primary Saved", "manual"));
    const savedCheckpoint = session.snapshot();
    session.execute(renameCommand("Dirty Draft", "manual"));
    session.markSavedCheckpoint(
      savedCheckpoint.stateToken,
      savedCheckpoint.project.revision,
    );

    const store = new MemoryRecoveryStore();
    const recovery = new ProjectRecoveryService(
      store,
      () => new Date("2026-10-07T14:30:00.000Z"),
    );

    const dirty = session.snapshot();
    expect(dirty.dirty).toBe(true);
    expect(
      await recovery.autosave(dirty.project, dirty.savedRevision),
    ).toMatchObject({
      status: "saved",
      generation: 1,
      projectRevision: dirty.project.revision,
    });
    expect(await recovery.inspect(savedCheckpoint.project)).toMatchObject({
      status: "available",
      project: { name: "Dirty Draft" },
    });

    session.undo();
    const clean = session.snapshot();
    expect(clean.dirty).toBe(false);
    expect(
      await recovery.autosave(clean.project, clean.savedRevision),
    ).toEqual({
      status: "skipped",
      reason: "clean",
    });
  });

  it("keeps 128-track batch history and timeline deterministic through 60 Undo/Redo cycles", () => {
    const session = new ProjectSessionHistory(largeProject());

    for (let index = 0; index < 60; index += 1) {
      const before = session.snapshot();
      const trackId = `track-${index}`;

      expect(
        session.executeBatch({
          kind: "album.track-batch",
          label: `Batch track ${index}`,
          origin: "auto-susun",
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
          commands: [
            createTrackSetEnabledCommand({
              trackId,
              enabled: false,
              origin: "auto-susun",
              expectedBaseRevision: before.project.revision,
              expectedStateToken: before.stateToken,
            }),
            createTrackReorderCommand({
              trackId,
              toIndex: 0,
              origin: "auto-susun",
              expectedBaseRevision: before.project.revision,
              expectedStateToken: before.stateToken,
            }),
          ],
        }).status,
      ).toBe("applied");
    }

    const changed = session.snapshot();
    expect(changed).toMatchObject({
      project: { revision: 60 },
      undoDepth: 60,
      redoDepth: 0,
    });
    expect(changed.project.tracks).toHaveLength(128);
    expect(projectAlbumTimeline(changed.project)).toMatchObject({
      complete: true,
      enabledTrackCount: 68,
      totalDurationMs: 68_000,
    });

    const changedOrder = changed.project.tracks.map((track) => track.id);

    for (let index = 0; index < 60; index += 1) {
      expect(session.undo().status).toBe("applied");
    }

    const restored = session.snapshot();
    expect(restored).toMatchObject({
      project: { revision: 120 },
      stateToken: "state-0",
      undoDepth: 0,
      redoDepth: 60,
      dirty: false,
    });
    expect(restored.project.tracks.map((track) => track.id)).toEqual(
      Array.from({ length: 128 }, (_, index) => `track-${index}`),
    );
    expect(projectAlbumTimeline(restored.project)).toMatchObject({
      complete: true,
      enabledTrackCount: 128,
      totalDurationMs: 128_000,
    });

    for (let index = 0; index < 60; index += 1) {
      expect(session.redo().status).toBe("applied");
    }

    const redone = session.snapshot();
    expect(redone).toMatchObject({
      project: { revision: 180 },
      undoDepth: 60,
      redoDepth: 0,
      dirty: true,
    });
    expect(redone.project.tracks.map((track) => track.id)).toEqual(changedOrder);
    expect(projectAlbumTimeline(redone.project)).toMatchObject({
      complete: true,
      enabledTrackCount: 68,
      totalDurationMs: 68_000,
    });
  });
});
