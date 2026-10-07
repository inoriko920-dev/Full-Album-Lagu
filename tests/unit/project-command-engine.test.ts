import { describe, expect, it } from "vitest";
import {
  ProjectCommandEngine,
  type ProjectCommand,
  type ProjectCommandOrigin,
} from "../../src/core/application/services/project-command-engine";
import { createEmptyProject } from "../../src/core/domain/project-document";

function renameCommand(
  name: string,
  origin: ProjectCommandOrigin = "manual",
  expected?: { revision?: number; stateToken?: string },
): ProjectCommand {
  return {
    kind: "project.rename",
    label: `Ubah nama menjadi ${name}`,
    origin,
    ...(expected?.revision === undefined
      ? {}
      : { expectedBaseRevision: expected.revision }),
    ...(expected?.stateToken === undefined
      ? {}
      : { expectedStateToken: expected.stateToken }),
    apply: (project) => ({
      ...project,
      name,
    }),
  };
}

describe("ProjectCommandEngine", () => {
  it("publishes one semantic command as one history entry and one revision", () => {
    const engine = new ProjectCommandEngine(createEmptyProject("command-1"));
    const before = engine.snapshot();

    const result = engine.execute(
      renameCommand("Album A", "manual", {
        revision: before.project.revision,
        stateToken: before.stateToken,
      }),
    );

    expect(result.status).toBe("applied");
    expect(engine.snapshot()).toMatchObject({
      project: {
        name: "Album A",
        revision: 1,
      },
      stateToken: "state-1",
      canUndo: true,
      canRedo: false,
      undoDepth: 1,
      redoDepth: 0,
    });
    expect(engine.historyEntries()).toHaveLength(1);
    expect(engine.historyEntries()[0]).toMatchObject({
      kind: "project.rename",
      origin: "manual",
      beforeStateToken: "state-0",
      afterStateToken: "state-1",
    });
  });

  it("does not create history or revision noise for a semantic no-op", () => {
    const engine = new ProjectCommandEngine(createEmptyProject("command-2"));

    const result = engine.execute({
      kind: "project.noop",
      label: "Tidak mengubah proyek",
      origin: "manual",
      apply: (project) => ({
        ...project,
        revision: 999,
      }),
    });

    expect(result).toEqual({ status: "noop" });
    expect(engine.snapshot().project.revision).toBe(0);
    expect(engine.snapshot().stateToken).toBe("state-0");
    expect(engine.historyEntries()).toEqual([]);
  });

  it("rejects stale revision and stale state-token expectations without mutation", () => {
    const engine = new ProjectCommandEngine(createEmptyProject("command-3"));

    expect(
      engine.execute(
        renameCommand("Stale Revision", "manual", { revision: 9 }),
      ),
    ).toEqual({ status: "rejected", code: "STALE_REVISION" });

    expect(
      engine.execute(
        renameCommand("Stale Token", "manual", {
          revision: 0,
          stateToken: "state-old",
        }),
      ),
    ).toEqual({ status: "rejected", code: "STALE_STATE_TOKEN" });

    expect(engine.snapshot().project).toMatchObject({
      name: "Proyek Baru",
      revision: 0,
    });
    expect(engine.historyEntries()).toEqual([]);
  });

  it("undoes and redoes semantic states while revision stays monotonic", () => {
    const engine = new ProjectCommandEngine(createEmptyProject("command-4"));

    engine.execute(renameCommand("Album A"));
    engine.execute(renameCommand("Album B"));

    expect(engine.snapshot()).toMatchObject({
      project: { name: "Album B", revision: 2 },
      stateToken: "state-2",
    });

    const undo = engine.undo();
    expect(undo.status).toBe("applied");
    expect(engine.snapshot()).toMatchObject({
      project: { name: "Album A", revision: 3 },
      stateToken: "state-1",
      canUndo: true,
      canRedo: true,
    });

    const redo = engine.redo();
    expect(redo.status).toBe("applied");
    expect(engine.snapshot()).toMatchObject({
      project: { name: "Album B", revision: 4 },
      stateToken: "state-2",
      canUndo: true,
      canRedo: false,
    });
  });

  it("truncates the redo branch after a divergent command", () => {
    const engine = new ProjectCommandEngine(createEmptyProject("command-5"));

    engine.execute(renameCommand("Album A"));
    engine.execute(renameCommand("Album B"));
    engine.undo();

    expect(engine.snapshot().canRedo).toBe(true);

    engine.execute(renameCommand("Album C"));

    expect(engine.snapshot()).toMatchObject({
      project: { name: "Album C", revision: 4 },
      canRedo: false,
      redoDepth: 0,
    });
    expect(engine.redo()).toEqual({ status: "unavailable" });
  });

  it("publishes a successful batch atomically as one revision and one Undo step", () => {
    const engine = new ProjectCommandEngine(createEmptyProject("command-6"));
    const snapshot = engine.snapshot();

    const result = engine.executeBatch({
      kind: "album.batch",
      label: "Batch album",
      origin: "ai",
      expectedBaseRevision: snapshot.project.revision,
      expectedStateToken: snapshot.stateToken,
      commands: [
        renameCommand("AI Draft A", "ai", {
          revision: snapshot.project.revision,
          stateToken: snapshot.stateToken,
        }),
        renameCommand("AI Draft B", "ai", {
          revision: snapshot.project.revision,
          stateToken: snapshot.stateToken,
        }),
      ],
    });

    expect(result.status).toBe("applied");
    expect(engine.snapshot()).toMatchObject({
      project: { name: "AI Draft B", revision: 1 },
      undoDepth: 1,
      redoDepth: 0,
    });
    expect(engine.historyEntries()[0]).toMatchObject({
      kind: "album.batch",
      origin: "ai",
    });

    engine.undo();
    expect(engine.snapshot()).toMatchObject({
      project: { name: "Proyek Baru", revision: 2 },
      stateToken: "state-0",
    });
  });

  it("rolls a failed batch back completely with no partial publication", () => {
    const engine = new ProjectCommandEngine(createEmptyProject("command-7"));

    const result = engine.executeBatch({
      kind: "album.batch",
      label: "Batch gagal",
      origin: "manual",
      commands: [
        renameCommand("Should Not Publish"),
        {
          kind: "project.fail",
          label: "Gagal",
          origin: "manual",
          apply: () => {
            throw new Error("internal failure with D:/secret/path");
          },
        },
      ],
    });

    expect(result).toEqual({
      status: "rejected",
      code: "COMMAND_FAILED",
      failedCommandIndex: 1,
    });
    expect(engine.snapshot()).toMatchObject({
      project: { name: "Proyek Baru", revision: 0 },
      stateToken: "state-0",
      undoDepth: 0,
      redoDepth: 0,
    });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("D:/");
  });

  it("rejects mixed-origin commands inside one batch", () => {
    const engine = new ProjectCommandEngine(createEmptyProject("command-8"));

    const result = engine.executeBatch({
      kind: "album.batch",
      label: "Mixed origin",
      origin: "template",
      commands: [renameCommand("Manual Child", "manual")],
    });

    expect(result).toEqual({
      status: "rejected",
      code: "INVALID_COMMAND",
      failedCommandIndex: 0,
    });
  });

  it("bounds in-memory history without affecting current state", () => {
    const engine = new ProjectCommandEngine(createEmptyProject("command-9"), {
      maxEntries: 2,
    });

    engine.execute(renameCommand("Album A"));
    engine.execute(renameCommand("Album B"));
    engine.execute(renameCommand("Album C"));

    expect(engine.snapshot()).toMatchObject({
      project: { name: "Album C", revision: 3 },
      undoDepth: 2,
    });
    expect(engine.historyEntries().map((entry) => entry.id)).toEqual([
      "history-2",
      "history-3",
    ]);
  });
});
