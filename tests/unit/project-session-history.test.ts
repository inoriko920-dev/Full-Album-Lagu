import { describe, expect, it } from "vitest";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import {
  createEmptyProject,
  projectDocumentSchema,
  type ProjectDocument,
} from "../../src/core/domain/project-document";

function renameProject(
  session: ProjectSessionHistory,
  name: string,
): void {
  const before = session.snapshot();
  const result = session.execute({
    kind: "project.rename",
    label: `Rename to ${name}`,
    origin: "manual",
    expectedBaseRevision: before.project.revision,
    expectedStateToken: before.stateToken,
    apply: (project) => ({ ...project, name }),
  });
  expect(result.status).toBe("applied");
}

function projectWithReadyAudio(): ProjectDocument {
  return projectDocumentSchema.parse({
    schemaVersion: 1,
    projectId: "session-media",
    name: "Album Media",
    revision: 4,
    tracks: [
      {
        id: "track-1",
        title: "Opening",
        sourcePath: "D:/Album/Opening.mp3",
        audioAssetId: "asset-1",
      },
    ],
    mediaAssets: [
      {
        id: "asset-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/Opening.mp3",
        fileName: "Opening.mp3",
        sizeBytes: 1000,
        availability: "ready",
        metadata: { durationMs: 5000 },
      },
    ],
  });
}

describe("ProjectSessionHistory", () => {
  it("returns clean when Undo reaches the saved logical checkpoint and dirty again after Redo", () => {
    const session = new ProjectSessionHistory(createEmptyProject("checkpoint"));

    renameProject(session, "Saved Name");
    session.markSaved();

    expect(session.snapshot()).toMatchObject({
      project: { name: "Saved Name", revision: 1 },
      dirty: false,
      savedRevision: 1,
      stateToken: "state-1",
      savedStateToken: "state-1",
    });

    renameProject(session, "Unsaved Name");
    expect(session.snapshot()).toMatchObject({
      project: { name: "Unsaved Name", revision: 2 },
      dirty: true,
    });

    session.undo();
    expect(session.snapshot()).toMatchObject({
      project: { name: "Saved Name", revision: 3 },
      dirty: false,
      savedRevision: 1,
      stateToken: "state-1",
      savedStateToken: "state-1",
      canRedo: true,
    });

    session.redo();
    expect(session.snapshot()).toMatchObject({
      project: { name: "Unsaved Name", revision: 4 },
      dirty: true,
      stateToken: "state-2",
    });
  });

  it("keeps accepted recovery dirty while preserving the primary saved revision", () => {
    const session = new ProjectSessionHistory(createEmptyProject("recovery"));
    renameProject(session, "Primary Saved");
    session.markSaved();

    const recovered = projectDocumentSchema.parse({
      ...session.snapshot().project,
      revision: 3,
      name: "Recovered Draft",
    });

    session.resetDirty(recovered, 1);

    expect(session.snapshot()).toMatchObject({
      project: { name: "Recovered Draft", revision: 3 },
      dirty: true,
      savedRevision: 1,
      savedStateToken: null,
      undoDepth: 0,
      redoDepth: 0,
    });

    session.markSaved();
    expect(session.snapshot()).toMatchObject({
      dirty: false,
      savedRevision: 3,
      stateToken: "state-0",
      savedStateToken: "state-0",
    });
  });

  it("clears prior history when Open or New resets to a clean project", () => {
    const session = new ProjectSessionHistory(createEmptyProject("old"));
    renameProject(session, "Old Dirty");

    session.resetClean(createEmptyProject("opened"));

    expect(session.snapshot()).toMatchObject({
      project: { projectId: "opened", name: "Proyek Baru", revision: 0 },
      dirty: false,
      stateToken: "state-0",
      savedStateToken: "state-0",
      undoDepth: 0,
      redoDepth: 0,
    });
    expect(session.undo()).toEqual({ status: "unavailable" });

    renameProject(session, "Opened Edited");
    session.resetClean(createEmptyProject("new-project"));

    expect(session.snapshot()).toMatchObject({
      project: { projectId: "new-project", revision: 0 },
      dirty: false,
      undoDepth: 0,
      redoDepth: 0,
    });
  });

  it("applies passive missing-media reconciliation without dirty/history noise", () => {
    const session = new ProjectSessionHistory(projectWithReadyAudio());
    const before = session.snapshot();

    const reconciled = projectDocumentSchema.parse({
      ...before.project,
      mediaAssets: before.project.mediaAssets?.map((asset) => ({
        ...asset,
        availability: "missing" as const,
        errorCode: "MEDIA_NOT_FOUND" as const,
      })),
    });

    expect(session.reconcileSystemProject(reconciled)).toEqual({
      status: "applied",
    });

    expect(session.snapshot()).toMatchObject({
      project: { revision: 4 },
      stateToken: before.stateToken,
      savedStateToken: before.savedStateToken,
      savedRevision: 4,
      dirty: false,
      undoDepth: 0,
      redoDepth: 0,
    });
    expect(session.snapshot().project.mediaAssets?.[0]).toMatchObject({
      availability: "missing",
      errorCode: "MEDIA_NOT_FOUND",
    });
  });

  it("migrates media import and relink into the shared history path", () => {
    const session = new ProjectSessionHistory(createEmptyProject("media-history"));

    const imported = projectDocumentSchema.parse({
      ...session.snapshot().project,
      revision: 1,
      tracks: [
        {
          id: "track-1",
          title: "Song 1",
          sourcePath: "D:/Old/Song 1.mp3",
          audioAssetId: "asset-1",
        },
      ],
      mediaAssets: [
        {
          id: "asset-1",
          kind: "audio",
          required: true,
          sourcePath: "D:/Old/Song 1.mp3",
          fileName: "Song 1.mp3",
          sizeBytes: 1200,
          availability: "ready",
          metadata: { durationMs: 8000 },
        },
      ],
    });

    expect(
      session.commitExternalProject({
        kind: "media.import",
        label: "Impor media",
        project: imported,
      }).status,
    ).toBe("applied");

    expect(session.snapshot()).toMatchObject({
      project: { revision: 1 },
      dirty: true,
      undoDepth: 1,
    });

    session.markSaved();

    const current = session.snapshot().project;
    const relinked = projectDocumentSchema.parse({
      ...current,
      revision: current.revision + 1,
      tracks: current.tracks.map((track) => ({
        ...track,
        sourcePath: "E:/Moved/Song 1.mp3",
      })),
      mediaAssets: current.mediaAssets?.map((asset) => ({
        ...asset,
        sourcePath: "E:/Moved/Song 1.mp3",
      })),
    });

    expect(
      session.commitExternalProject({
        kind: "media.relink.single",
        label: "Relink media",
        project: relinked,
      }).status,
    ).toBe("applied");

    expect(session.snapshot()).toMatchObject({
      project: { revision: 2 },
      dirty: true,
      undoDepth: 2,
    });

    session.undo();
    expect(session.snapshot()).toMatchObject({
      project: { revision: 3 },
      dirty: false,
    });
    expect(session.snapshot().project.mediaAssets?.[0]?.sourcePath).toBe(
      "D:/Old/Song 1.mp3",
    );
  });

  it("preserves a passive reconciliation on the current semantic state across Undo/Redo", () => {
    const session = new ProjectSessionHistory(projectWithReadyAudio());
    renameProject(session, "Renamed");

    const current = session.snapshot().project;
    const missing = projectDocumentSchema.parse({
      ...current,
      mediaAssets: current.mediaAssets?.map((asset) => ({
        ...asset,
        availability: "missing" as const,
        errorCode: "MEDIA_NOT_FOUND" as const,
      })),
    });

    session.reconcileSystemProject(missing);
    session.undo();
    session.redo();

    expect(session.snapshot().project.mediaAssets?.[0]).toMatchObject({
      availability: "missing",
      errorCode: "MEDIA_NOT_FOUND",
    });
  });
});
