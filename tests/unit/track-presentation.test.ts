import { describe, expect, it } from "vitest";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { resolveTrackPresentation } from "../../src/core/domain/track-presentation";

function projectFixture(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "track-presentation-test",
    name: "Project Album",
    revision: 0,
    albumPresentation: {
      defaultArtworkAssetId: "image-default",
    },
    mediaAssets: [
      {
        id: "audio-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/07 Metadata Song.flac",
        fileName: "07 Metadata Song.flac",
        sizeBytes: 1000,
        availability: "ready",
        metadata: {
          durationMs: 1000,
          title: "Metadata Title",
          artist: "Metadata Artist",
          album: "Metadata Album",
          year: 2024,
          trackNumber: 7,
        },
      },
      {
        id: "audio-2",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/02 Filename Fallback.wav",
        fileName: "02 Filename Fallback.wav",
        sizeBytes: 1001,
        availability: "ready",
        metadata: {
          durationMs: 2000,
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
        availability: "missing",
        errorCode: "MEDIA_NOT_FOUND",
      },
    ],
    tracks: [
      {
        id: "track-1",
        title: "Track Title",
        sourcePath: "D:/Album/07 Metadata Song.flac",
        audioAssetId: "audio-1",
        binding: {
          titleOverride: "Manual Title",
          artistOverride: "Manual Artist",
          albumOverride: "Manual Album",
          yearOverride: 2026,
          artworkAssetId: "image-track",
        },
      },
      {
        id: "track-2",
        title: "   ",
        sourcePath: "D:/Album/02 Filename Fallback.wav",
        audioAssetId: "audio-2",
      },
    ],
  };
}

describe("resolved track presentation", () => {
  it("uses explicit overrides first and reports provenance", () => {
    const resolved = resolveTrackPresentation(projectFixture(), "track-1");

    expect(resolved).toEqual({
      trackId: "track-1",
      title: { value: "Manual Title", provenance: "manual-override" },
      artist: { value: "Manual Artist", provenance: "manual-override" },
      album: { value: "Manual Album", provenance: "manual-override" },
      year: { value: 2026, provenance: "manual-override" },
      trackNumber: { value: 7, provenance: "audio-metadata" },
      artwork: { assetId: "image-track", provenance: "manual-override" },
    });
  });

  it("falls back to audio metadata and album-default artwork", () => {
    const project = projectFixture();
    project.tracks[0] = {
      ...project.tracks[0]!,
      binding: undefined,
    };

    const resolved = resolveTrackPresentation(project, "track-1");

    expect(resolved).toEqual({
      trackId: "track-1",
      title: { value: "Metadata Title", provenance: "audio-metadata" },
      artist: { value: "Metadata Artist", provenance: "audio-metadata" },
      album: { value: "Metadata Album", provenance: "audio-metadata" },
      year: { value: 2024, provenance: "audio-metadata" },
      trackNumber: { value: 7, provenance: "audio-metadata" },
      artwork: { assetId: "image-default", provenance: "album-default" },
    });
  });

  it("uses filename/project/canonical-position/placeholder fallbacks deterministically", () => {
    const resolved = resolveTrackPresentation(projectFixture(), "track-2");

    expect(resolved).toEqual({
      trackId: "track-2",
      title: {
        value: "02 Filename Fallback",
        provenance: "filename-fallback",
      },
      artist: { value: "", provenance: "placeholder" },
      album: { value: "Project Album", provenance: "project-fallback" },
      year: { value: undefined, provenance: "placeholder" },
      trackNumber: { value: 2, provenance: "canonical-position" },
      artwork: { assetId: "image-default", provenance: "album-default" },
    });
  });

  it("uses track title before filename when metadata title is absent", () => {
    const project = projectFixture();
    project.tracks[1] = {
      ...project.tracks[1]!,
      title: "Track Fallback Title",
    };

    const resolved = resolveTrackPresentation(project, "track-2");

    expect(resolved.title).toEqual({
      value: "Track Fallback Title",
      provenance: "track-fallback",
    });
  });

  it("returns placeholder artwork when no track or album artwork is configured", () => {
    const project = projectFixture();
    project.albumPresentation = undefined;
    project.tracks[1] = {
      ...project.tracks[1]!,
      binding: undefined,
    };

    expect(resolveTrackPresentation(project, "track-2").artwork).toEqual({
      provenance: "placeholder",
    });
  });

  it("is pure and never persists derived display values", () => {
    const project = projectFixture();
    const before = JSON.stringify(project);

    const resolved = resolveTrackPresentation(project, "track-1");

    expect(resolved.title.value).toBe("Manual Title");
    expect(JSON.stringify(project)).toBe(before);
    expect(project).not.toHaveProperty("resolvedPresentation");
    expect(project.tracks[0]).not.toHaveProperty("resolvedPresentation");
  });

  it("rejects an unknown track ID", () => {
    expect(() =>
      resolveTrackPresentation(projectFixture(), "track-unknown"),
    ).toThrow("unknown track ID");
  });
});
