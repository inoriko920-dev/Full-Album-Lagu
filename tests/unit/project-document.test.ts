import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  projectDocumentSchema,
} from "../../src/core/domain/project-document";

describe("project document", () => {
  it("creates a schema-v1 empty project", () => {
    const project = createEmptyProject("project-test-001");

    expect(project).toEqual({
      schemaVersion: 1,
      projectId: "project-test-001",
      name: "Proyek Baru",
      revision: 0,
      tracks: [],
    });
  });

  it("rejects an empty project name", () => {
    expect(
      projectDocumentSchema.safeParse({
        schemaVersion: 1,
        projectId: "project-test-001",
        name: "   ",
        revision: 0,
        tracks: [],
      }).success,
    ).toBe(false);
  });

  it("accepts additive binding fields with image artwork references", () => {
    const result = projectDocumentSchema.safeParse({
      schemaVersion: 1,
      projectId: "project-binding-valid",
      name: "Album Binding",
      revision: 0,
      albumPresentation: {
        defaultArtworkAssetId: "image-default",
      },
      mediaAssets: [
        {
          id: "audio-1",
          kind: "audio",
          required: true,
          sourcePath: "D:/Album/01 Song.wav",
          fileName: "01 Song.wav",
          sizeBytes: 1200,
          availability: "ready",
          metadata: { durationMs: 1000 },
        },
        {
          id: "image-default",
          kind: "image",
          required: false,
          sourcePath: "D:/Album/default.webp",
          fileName: "default.webp",
          sizeBytes: 500,
          availability: "missing",
          errorCode: "MEDIA_NOT_FOUND",
        },
        {
          id: "image-track",
          kind: "image",
          required: false,
          sourcePath: "D:/Album/track.jpg",
          fileName: "track.jpg",
          sizeBytes: 600,
          availability: "ready",
        },
      ],
      tracks: [
        {
          id: "track-1",
          title: "Song",
          sourcePath: "D:/Album/01 Song.wav",
          audioAssetId: "audio-1",
          binding: {
            titleOverride: "Manual Song",
            artistOverride: "Manual Artist",
            albumOverride: "Manual Album",
            yearOverride: 2026,
            artworkAssetId: "image-track",
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it.each([
    {
      label: "album default unknown",
      albumPresentation: { defaultArtworkAssetId: "unknown-image" },
      trackBinding: undefined,
    },
    {
      label: "track artwork unknown",
      albumPresentation: undefined,
      trackBinding: { artworkAssetId: "unknown-image" },
    },
  ])("rejects $label artwork references", ({ albumPresentation, trackBinding }) => {
    const result = projectDocumentSchema.safeParse({
      schemaVersion: 1,
      projectId: "project-binding-unknown",
      name: "Album Binding",
      revision: 0,
      ...(albumPresentation === undefined ? {} : { albumPresentation }),
      tracks: [
        {
          id: "track-1",
          title: "Song",
          sourcePath: "D:/Album/01 Song.wav",
          ...(trackBinding === undefined ? {} : { binding: trackBinding }),
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it.each([
    {
      label: "album default references audio",
      albumPresentation: { defaultArtworkAssetId: "audio-1" },
      trackBinding: undefined,
    },
    {
      label: "track artwork references audio",
      albumPresentation: undefined,
      trackBinding: { artworkAssetId: "audio-1" },
    },
  ])("rejects when $label", ({ albumPresentation, trackBinding }) => {
    const result = projectDocumentSchema.safeParse({
      schemaVersion: 1,
      projectId: "project-binding-audio-ref",
      name: "Album Binding",
      revision: 0,
      ...(albumPresentation === undefined ? {} : { albumPresentation }),
      mediaAssets: [
        {
          id: "audio-1",
          kind: "audio",
          required: true,
          sourcePath: "D:/Album/01 Song.wav",
          fileName: "01 Song.wav",
          sizeBytes: 1200,
          availability: "ready",
          metadata: { durationMs: 1000 },
        },
      ],
      tracks: [
        {
          id: "track-1",
          title: "Song",
          sourcePath: "D:/Album/01 Song.wav",
          audioAssetId: "audio-1",
          ...(trackBinding === undefined ? {} : { binding: trackBinding }),
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed binding override values", () => {
    const result = projectDocumentSchema.safeParse({
      schemaVersion: 1,
      projectId: "project-binding-invalid",
      name: "Album Binding",
      revision: 0,
      tracks: [
        {
          id: "track-1",
          title: "Song",
          sourcePath: "D:/Album/01 Song.wav",
          binding: {
            titleOverride: "   ",
            yearOverride: 99,
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

});
