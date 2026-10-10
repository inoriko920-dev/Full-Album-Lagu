import { describe, expect, it } from "vitest";
import {
  createSetBoundaryTransitionCommand,
  isEditableBoundaryPair,
} from "../../src/core/application/services/project-boundary-commands";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../src/core/domain/project-document";
import { resolveAlbumBoundaryVisualFrame } from "../../src/core/domain/album-boundary-visual";
import type { VisualBoundaryTransition } from "../../src/core/domain/visual-scene-schema";

const setting: VisualBoundaryTransition = {
  fromTrackId: "track-0",
  toTrackId: "track-1",
  preset: "premium-album-change",
  durationMs: 800,
  easing: "ease-out",
  artworkHandoff: "during-transition",
  titleHandoff: "at-boundary",
};
function fixture(count = 2): ProjectDocument {
  return projectDocumentSchema.parse({
    schemaVersion: 1,
    projectId: "w11-07-t06",
    name: "Test album",
    revision: 0,
    tracks: Array.from({ length: count }, (_, i) => ({
      id: `track-${i}`,
      title: `Song ${i}`,
      sourcePath: `song-${i}.wav`,
      audioAssetId: `asset-${i}`,
    })),
    mediaAssets: Array.from({ length: count }, (_, i) => ({
      id: `asset-${i}`,
      kind: "audio",
      required: true,
      sourcePath: `song-${i}.wav`,
      fileName: `song-${i}.wav`,
      sizeBytes: 1024,
      availability: "ready",
      metadata: { durationMs: 1000 },
    })),
  });
}
describe("W11-07 T06 official boundary CommandEngine/history", () => {
  it("adds a canonical adjacent boundary in one undo entry, then undo/redoes safely", () => {
    const session = new ProjectSessionHistory(fixture());
    const before = session.snapshot();
    expect(
      session.execute(
        createSetBoundaryTransitionCommand({
          fromTrackId: "track-0",
          toTrackId: "track-1",
          transition: setting,
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        }),
      ).status,
    ).toBe("applied");
    expect(session.snapshot()).toMatchObject({ dirty: true, undoDepth: 1 });
    expect(session.snapshot().project.boundaryTransitions).toEqual([setting]);
    expect(
      resolveAlbumBoundaryVisualFrame(session.snapshot().project, 1200),
    ).toMatchObject({
      status: "active",
      fromTrackId: "track-0",
      toTrackId: "track-1",
      preset: "premium-album-change",
    });
    expect(session.undo().status).toBe("applied");
    expect(session.snapshot().project).not.toHaveProperty(
      "boundaryTransitions",
    );
    expect(session.snapshot().dirty).toBe(false);
    expect(session.redo().status).toBe("applied");
    expect(session.snapshot().project.boundaryTransitions).toEqual([setting]);
    expect(session.snapshot().project.tracks).toEqual(before.project.tracks);
  });

  it("edits only the selected directed pair and supports removal with save/reopen", () => {
    const session = new ProjectSessionHistory(fixture(3));
    session.execute(
      createSetBoundaryTransitionCommand({
        fromTrackId: "track-0",
        toTrackId: "track-1",
        transition: setting,
      }),
    );
    const other = { ...setting, fromTrackId: "track-1", toTrackId: "track-2" };
    session.execute(
      createSetBoundaryTransitionCommand({
        fromTrackId: "track-1",
        toTrackId: "track-2",
        transition: other,
      }),
    );
    const updated = {
      ...setting,
      preset: "slide" as const,
      durationMs: 600,
      easing: "ease-in-out" as const,
    };
    session.execute(
      createSetBoundaryTransitionCommand({
        fromTrackId: "track-0",
        toTrackId: "track-1",
        transition: updated,
      }),
    );
    expect(session.snapshot().project.boundaryTransitions).toEqual([
      other,
      updated,
    ]);
    const parsed = projectDocumentSchema.parse(
      JSON.parse(JSON.stringify(session.snapshot().project)),
    );
    expect(parsed.boundaryTransitions).toEqual([other, updated]);
    session.execute(
      createSetBoundaryTransitionCommand({
        fromTrackId: "track-0",
        toTrackId: "track-1",
      }),
    );
    expect(session.snapshot().project.boundaryTransitions).toEqual([other]);
    session.undo();
    expect(session.snapshot().project.boundaryTransitions).toEqual([
      other,
      updated,
    ]);
  });

  it("preserves clean history for deleting a non-existent boundary", () => {
    const session = new ProjectSessionHistory(fixture());
    const before = session.snapshot();
    expect(
      session.execute(
        createSetBoundaryTransitionCommand({
          fromTrackId: "track-0",
          toTrackId: "track-1",
        }),
      ).status,
    ).toBe("noop");
    expect(session.snapshot()).toEqual(before);
  });

  it("rejects stale revision/state token, bad pair and malformed preset without edits", () => {
    const session = new ProjectSessionHistory(fixture());
    const before = session.snapshot();
    expect(
      session.execute(
        createSetBoundaryTransitionCommand({
          fromTrackId: "track-0",
          toTrackId: "track-1",
          transition: setting,
          expectedBaseRevision: 99,
        }),
      ),
    ).toEqual({ status: "rejected", code: "STALE_REVISION" });
    expect(
      session.execute(
        createSetBoundaryTransitionCommand({
          fromTrackId: "track-0",
          toTrackId: "track-1",
          transition: setting,
          expectedBaseRevision: 0,
          expectedStateToken: "old-state",
        }),
      ),
    ).toEqual({ status: "rejected", code: "STALE_STATE_TOKEN" });
    expect(() =>
      createSetBoundaryTransitionCommand({
        fromTrackId: "track-1",
        toTrackId: "track-0",
        transition: setting,
      }),
    ).toThrow();
    expect(() =>
      createSetBoundaryTransitionCommand({
        fromTrackId: "track-0",
        toTrackId: "track-1",
        transition: {
          ...setting,
          preset: "unauthorized" as typeof setting.preset,
        },
      }),
    ).toThrow();
    expect(session.snapshot()).toEqual(before);
  });

  it("blocks ghost boundary after disable/reorder, and missing audio", () => {
    const p = fixture(3);
    for (const changed of [
      { ...p, tracks: [p.tracks[1], p.tracks[0], p.tracks[2]] },
      {
        ...p,
        tracks: p.tracks.map((x) =>
          x.id === "track-1" ? { ...x, enabled: false } : x,
        ),
      },
      {
        ...p,
        mediaAssets: p.mediaAssets!.map((x) =>
          x.id === "asset-0"
            ? {
                ...x,
                availability: "missing" as const,
                errorCode: "MEDIA_NOT_FOUND" as const,
              }
            : x,
        ),
      },
    ]) {
      const parsed = projectDocumentSchema.parse(changed);
      const session = new ProjectSessionHistory(parsed);
      expect(isEditableBoundaryPair(parsed, "track-0", "track-1")).toBe(false);
      expect(
        session.execute(
          createSetBoundaryTransitionCommand({
            fromTrackId: "track-0",
            toTrackId: "track-1",
            transition: setting,
          }),
        ),
      ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
      expect(session.snapshot().project.boundaryTransitions).toBeUndefined();
    }
  });

  it("holds original boundary IDs and preset even if caller mutates the input after creation", () => {
    const session = new ProjectSessionHistory(fixture(3));
    const transition = { ...setting };
    const input = {
      fromTrackId: "track-0",
      toTrackId: "track-1",
      transition,
    };
    const command = createSetBoundaryTransitionCommand(input);
    // A later caller mutation redirects the old implementation's adjacency
    // guard and filter to track-1 -> track-2, despite its captured payload.
    input.fromTrackId = "track-1";
    input.toTrackId = "track-2";
    transition.preset = "slide";
    const result = session.execute(command);
    expect(result.status).toBe("applied");
    expect(session.snapshot().project.boundaryTransitions).toEqual([setting]);
    expect(session.snapshot().project.boundaryTransitions?.[0]).toMatchObject({
      fromTrackId: "track-0",
      toTrackId: "track-1",
      preset: "premium-album-change",
    });
    expect(session.undo().status).toBe("applied");
    expect(session.snapshot().project.boundaryTransitions).toBeUndefined();
    expect(session.redo().status).toBe("applied");
    expect(session.snapshot().project.boundaryTransitions).toEqual([setting]);
  });

  it("removes only the captured boundary even if a reused caller object changes target IDs", () => {
    const session = new ProjectSessionHistory(fixture(3));
    const other = { ...setting, fromTrackId: "track-1", toTrackId: "track-2" };
    expect(session.execute(createSetBoundaryTransitionCommand({
      fromTrackId: "track-0",
      toTrackId: "track-1",
      transition: setting,
    })).status).toBe("applied");
    expect(session.execute(createSetBoundaryTransitionCommand({
      fromTrackId: "track-1",
      toTrackId: "track-2",
      transition: other,
    })).status).toBe("applied");

    const input = { fromTrackId: "track-0", toTrackId: "track-1" };
    const removal = createSetBoundaryTransitionCommand(input);
    input.fromTrackId = "track-1";
    input.toTrackId = "track-2";
    expect(session.execute(removal).status).toBe("applied");
    expect(session.snapshot().project.boundaryTransitions).toEqual([other]);
    expect(session.undo().status).toBe("applied");
    expect(session.snapshot().project.boundaryTransitions).toEqual([setting, other]);
    expect(session.redo().status).toBe("applied");
    expect(session.snapshot().project.boundaryTransitions).toEqual([other]);
  });

  it("tests all 127 boundaries in a 128-song album without timing drift", () => {
    const session = new ProjectSessionHistory(fixture(128));
    for (let i = 0; i < 127; i++) {
      const transition = {
        ...setting,
        fromTrackId: `track-${i}`,
        toTrackId: `track-${i + 1}`,
      };
      expect(
        session.execute(
          createSetBoundaryTransitionCommand({
            fromTrackId: transition.fromTrackId,
            toTrackId: transition.toTrackId,
            transition,
          }),
        ).status,
      ).toBe("applied");
    }
    expect(session.snapshot().project.boundaryTransitions).toHaveLength(127);
    const project = session.snapshot().project;
    expect(resolveAlbumBoundaryVisualFrame(project, 127000)).toMatchObject({
      status: "active",
      fromTrackId: "track-126",
      toTrackId: "track-127",
    });
    for (let i = 0; i < 4; i++)
      expect(resolveAlbumBoundaryVisualFrame(project, 127500)).toEqual(
        resolveAlbumBoundaryVisualFrame(project, 127500),
      );
    expect(project.tracks).toEqual(fixture(128).tracks);
  });
});
