import { describe, expect, it } from "vitest";
import {
  createClearTrackMetadataOverridesCommand,
  createSetTrackMetadataOverridesCommand,
} from "../../src/core/application/services/project-metadata-commands";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import {
  createTrackMetadataDraft,
  overridesFromTrackMetadataDraft,
  updateTrackMetadataDraft,
} from "../../src/core/application/services/track-metadata-draft";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { resolveSelectedTrackProjection } from "../../src/core/domain/selected-track-projection";
import { resolveTrackPresentation } from "../../src/core/domain/track-presentation";

function projectFixture(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "metadata-binding",
    name: "Project Album",
    revision: 0,
    tracks: [
      {
        id: "track-1",
        title: "Track Fallback",
        sourcePath: "D:/Album/01 Song.flac",
        audioAssetId: "audio-1",
        binding: {
          artworkAssetId: "image-1",
        },
      },
    ],
    mediaAssets: [
      {
        id: "audio-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/01 Song.flac",
        fileName: "01 Song.flac",
        sizeBytes: 1000,
        availability: "ready",
        metadata: {
          durationMs: 5000,
          title: "Metadata Title",
          artist: "Metadata Artist",
          album: "Metadata Album",
          year: 2024,
          trackNumber: 1,
        },
      },
      {
        id: "image-1",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/cover.png",
        fileName: "cover.png",
        sizeBytes: 200,
        availability: "ready",
      },
    ],
  };
}

describe("track metadata override integration", () => {
  it("applies manual metadata overrides through one history command with provenance", () => {
    const session = new ProjectSessionHistory(projectFixture());
    const before = session.snapshot();

    const result = session.execute(
      createSetTrackMetadataOverridesCommand({
        trackId: "track-1",
        overrides: {
          titleOverride: "  Manual Title  ",
          artistOverride: "Manual Artist",
          albumOverride: "Manual Album",
          yearOverride: 2026,
        },
        expectedBaseRevision: before.project.revision,
        expectedStateToken: before.stateToken,
      }),
    );

    expect(result).toMatchObject({
      status: "applied",
      entry: {
        kind: "metadata.set-overrides",
        origin: "manual",
      },
    });
    expect(session.snapshot()).toMatchObject({
      project: { revision: 1 },
      dirty: true,
      undoDepth: 1,
      redoDepth: 0,
    });
    expect(session.snapshot().project.tracks[0]?.binding).toEqual({
      artworkAssetId: "image-1",
      titleOverride: "Manual Title",
      artistOverride: "Manual Artist",
      albumOverride: "Manual Album",
      yearOverride: 2026,
    });

    const resolved = resolveTrackPresentation(
      session.snapshot().project,
      "track-1",
    );
    expect(resolved.title).toEqual({
      value: "Manual Title",
      provenance: "manual-override",
    });
    expect(resolved.artist).toEqual({
      value: "Manual Artist",
      provenance: "manual-override",
    });
    expect(resolved.album).toEqual({
      value: "Manual Album",
      provenance: "manual-override",
    });
    expect(resolved.year).toEqual({
      value: 2026,
      provenance: "manual-override",
    });
  });

  it("clears selected/all metadata overrides while preserving artwork and restoring fallback", () => {
    const session = new ProjectSessionHistory(projectFixture());
    expect(
      session.execute(
        createSetTrackMetadataOverridesCommand({
          trackId: "track-1",
          overrides: {
            titleOverride: "Manual Title",
            artistOverride: "Manual Artist",
            albumOverride: "Manual Album",
            yearOverride: 2026,
          },
        }),
      ).status,
    ).toBe("applied");

    expect(
      session.execute(
        createClearTrackMetadataOverridesCommand({
          trackId: "track-1",
          fields: ["titleOverride", "yearOverride"],
        }),
      ).status,
    ).toBe("applied");

    expect(session.snapshot().project.tracks[0]?.binding).toEqual({
      artworkAssetId: "image-1",
      artistOverride: "Manual Artist",
      albumOverride: "Manual Album",
    });
    expect(
      resolveTrackPresentation(session.snapshot().project, "track-1").title,
    ).toEqual({
      value: "Metadata Title",
      provenance: "audio-metadata",
    });
    expect(
      resolveTrackPresentation(session.snapshot().project, "track-1").year,
    ).toEqual({
      value: 2024,
      provenance: "audio-metadata",
    });

    expect(
      session.execute(
        createClearTrackMetadataOverridesCommand({
          trackId: "track-1",
        }),
      ).status,
    ).toBe("applied");
    expect(session.snapshot().project.tracks[0]?.binding).toEqual({
      artworkAssetId: "image-1",
    });
  });

  it("rejects invalid metadata commands without dirty/history noise", () => {
    const session = new ProjectSessionHistory(projectFixture());
    const before = session.snapshot();

    expect(
      session.execute(
        createSetTrackMetadataOverridesCommand({
          trackId: "track-1",
          overrides: { titleOverride: "   " },
        }),
      ),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(
      session.execute(
        createSetTrackMetadataOverridesCommand({
          trackId: "track-1",
          overrides: { yearOverride: 99 },
        }),
      ),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(
      session.execute(
        createClearTrackMetadataOverridesCommand({
          trackId: "missing-track",
        }),
      ),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });

    expect(session.snapshot()).toEqual(before);
  });

  it("keeps metadata draft edits session-only and preserves the logical saved checkpoint", () => {
    const session = new ProjectSessionHistory(projectFixture());
    const beforeDraft = session.snapshot();
    const initialDraft = createTrackMetadataDraft(
      beforeDraft.project,
      "track-1",
    );
    const editedDraft = updateTrackMetadataDraft(initialDraft, {
      title: "Draft Title",
      artist: "Draft Artist",
      year: "2026",
    });

    expect(editedDraft).toEqual({
      trackId: "track-1",
      title: "Draft Title",
      artist: "Draft Artist",
      album: "",
      year: "2026",
    });
    expect(session.snapshot()).toEqual(beforeDraft);

    const applied = session.execute(
      createSetTrackMetadataOverridesCommand({
        trackId: "track-1",
        overrides: overridesFromTrackMetadataDraft(editedDraft),
      }),
    );
    expect(applied.status).toBe("applied");
    session.markSaved();

    const saved = session.snapshot();
    expect(saved).toMatchObject({
      dirty: false,
      project: { revision: 1 },
      stateToken: "state-1",
      savedStateToken: "state-1",
      savedRevision: 1,
    });

    expect(
      session.execute(
        createClearTrackMetadataOverridesCommand({
          trackId: "track-1",
          fields: ["titleOverride"],
        }),
      ).status,
    ).toBe("applied");
    expect(session.snapshot().dirty).toBe(true);

    expect(session.undo().status).toBe("applied");
    expect(session.snapshot()).toMatchObject({
      dirty: false,
      project: { revision: 3 },
      stateToken: "state-1",
      savedStateToken: "state-1",
      savedRevision: 1,
    });

    expect(session.redo().status).toBe("applied");
    expect(session.snapshot()).toMatchObject({
      dirty: true,
      project: { revision: 4 },
    });
  });

  it("projects selected-track explicit values, resolved provenance and audio status without mutation", () => {
    const project = projectFixture();
    const before = structuredClone(project);

    const none = resolveSelectedTrackProjection(project, null);
    expect(none).toEqual({ status: "none" });

    const selected = resolveSelectedTrackProjection(project, "track-1");
    expect(selected).toMatchObject({
      status: "selected",
      trackId: "track-1",
      audioAssetId: "audio-1",
      audioStatus: "ready",
      explicitOverrides: {},
      presentation: {
        title: {
          value: "Metadata Title",
          provenance: "audio-metadata",
        },
        artist: {
          value: "Metadata Artist",
          provenance: "audio-metadata",
        },
      },
    });
    expect(project).toEqual(before);
    expect(resolveSelectedTrackProjection(project, "stale-track")).toEqual({
      status: "none",
    });
  });
});
