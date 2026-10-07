import { describe, expect, it } from "vitest";
import {
  createImportAndBindArtworkBatch,
  createSetAlbumArtworkCommand,
  createSetTrackArtworkCommand,
} from "../../src/core/application/services/project-artwork-commands";
import { ProjectCommandEngine } from "../../src/core/application/services/project-command-engine";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { resolveTrackPresentation } from "../../src/core/domain/track-presentation";

function makeProject(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "artwork-command-project",
    name: "Artwork Commands",
    revision: 0,
    albumPresentation: { defaultArtworkAssetId: "image-default" },
    tracks: [
      {
        id: "track-1",
        title: "Track 1",
        sourcePath: "D:/Album/01.mp3",
        binding: {
          titleOverride: "Manual Title",
          artworkAssetId: "image-track",
        },
      },
    ],
    mediaAssets: [
      {
        id: "image-default",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/default.png",
        fileName: "default.png",
        sizeBytes: 100,
        availability: "ready",
      },
      {
        id: "image-track",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/track.jpg",
        fileName: "track.jpg",
        sizeBytes: 101,
        availability: "ready",
      },
      {
        id: "audio-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/01.mp3",
        fileName: "01.mp3",
        sizeBytes: 102,
        availability: "ready",
        metadata: { durationMs: 1000 },
      },
    ],
  };
}

describe("artwork binding commands", () => {
  it("keeps per-track artwork above album default and clearing restores fallback", () => {
    const engine = new ProjectCommandEngine(makeProject());
    expect(
      resolveTrackPresentation(engine.snapshot().project, "track-1").artwork,
    ).toEqual({
      assetId: "image-track",
      provenance: "manual-override",
    });

    expect(
      engine.execute(
        createSetTrackArtworkCommand({
          trackId: "track-1",
        }),
      ).status,
    ).toBe("applied");

    const cleared = engine.snapshot().project;
    expect(cleared.tracks[0]?.binding).toEqual({
      titleOverride: "Manual Title",
    });
    expect(resolveTrackPresentation(cleared, "track-1").artwork).toEqual({
      assetId: "image-default",
      provenance: "album-default",
    });

    expect(engine.execute(createSetAlbumArtworkCommand({})).status).toBe(
      "applied",
    );
    expect(
      resolveTrackPresentation(engine.snapshot().project, "track-1").artwork,
    ).toEqual({ provenance: "placeholder" });
  });

  it("rejects non-image and unknown artwork references without history noise", () => {
    const engine = new ProjectCommandEngine(makeProject());
    expect(
      engine.execute(createSetAlbumArtworkCommand({ assetId: "audio-1" })),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(
      engine.execute(
        createSetTrackArtworkCommand({
          trackId: "track-1",
          assetId: "missing-image",
        }),
      ),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(engine.snapshot()).toMatchObject({
      project: { revision: 0 },
      undoDepth: 0,
      redoDepth: 0,
    });
  });

  it("imports and binds artwork as one atomic manual history step", () => {
    const session = new ProjectSessionHistory(makeProject());
    const before = session.snapshot();
    const result = session.executeBatch(
      createImportAndBindArtworkBatch({
        asset: {
          id: "image-new",
          kind: "image",
          required: false,
          sourcePath: "D:/Album/new.webp",
          fileName: "new.webp",
          sizeBytes: 222,
          availability: "ready",
        },
        target: { kind: "track", trackId: "track-1" },
        expectedBaseRevision: before.project.revision,
        expectedStateToken: before.stateToken,
      }),
    );
    expect(result).toMatchObject({
      status: "applied",
      entry: { kind: "artwork.import-bind", origin: "manual" },
    });

    const imported = session.snapshot();
    expect(imported).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
      redoDepth: 0,
      dirty: true,
    });
    expect(
      imported.project.mediaAssets?.find((asset) => asset.id === "image-new"),
    ).toMatchObject({
      kind: "image",
      required: false,
      availability: "ready",
    });
    expect(imported.project.tracks[0]?.binding).toMatchObject({
      titleOverride: "Manual Title",
      artworkAssetId: "image-new",
    });

    expect(session.undo().status).toBe("applied");
    expect(session.snapshot()).toMatchObject({
      project: { revision: 2 },
      stateToken: before.stateToken,
      undoDepth: 0,
      redoDepth: 1,
      dirty: false,
    });
    expect(
      session.snapshot().project.mediaAssets?.some(
        (asset) => asset.id === "image-new",
      ),
    ).toBe(false);
    expect(session.snapshot().project.tracks[0]?.binding).toMatchObject({
      artworkAssetId: "image-track",
      titleOverride: "Manual Title",
    });

    expect(session.redo().status).toBe("applied");
    expect(session.snapshot()).toMatchObject({
      project: { revision: 3 },
      undoDepth: 1,
      redoDepth: 0,
      dirty: true,
    });
    expect(session.snapshot().project.tracks[0]?.binding).toMatchObject({
      artworkAssetId: "image-new",
    });
  });

  it("rejects malformed imported artwork atomically", () => {
    const session = new ProjectSessionHistory(makeProject());
    const before = session.snapshot();
    expect(
      session.executeBatch(
        createImportAndBindArtworkBatch({
          asset: {
            id: "bad-image",
            kind: "image",
            required: true,
            sourcePath: "D:/Album/bad.png",
            fileName: "bad.png",
            sizeBytes: 1,
            availability: "ready",
          },
          target: { kind: "album-default" },
        }),
      ),
    ).toEqual({
      status: "rejected",
      code: "COMMAND_FAILED",
      failedCommandIndex: 0,
    });
    expect(session.snapshot()).toEqual(before);
  });
});
