import { describe, expect, it } from "vitest";
import { mediaAssetReferenceSchema } from "../../src/core/domain/media-asset";
import {
  createEmptyProject,
  projectDocumentSchema,
} from "../../src/core/domain/project-document";
import { getProjectMediaReadiness } from "../../src/core/domain/media-readiness";

describe("media domain and project compatibility", () => {
  it("keeps the W11-01 schema-v1 project shape valid and unchanged", () => {
    const legacyProject = {
      schemaVersion: 1,
      projectId: "legacy-project",
      name: "Legacy",
      revision: 4,
      tracks: [
        {
          id: "track-1",
          title: "Track Satu",
          sourcePath: "D:/Album Lama/01 Track.mp3",
          legacyExtension: "preserved",
        },
      ],
      futureProjectField: { preserved: true },
    };

    expect(projectDocumentSchema.parse(legacyProject)).toEqual(legacyProject);
  });

  it("keeps createEmptyProject backward compatible without forcing media fields", () => {
    expect(createEmptyProject("empty-media-project")).toEqual({
      schemaVersion: 1,
      projectId: "empty-media-project",
      name: "Proyek Baru",
      revision: 0,
      tracks: [],
    });
  });

  it("accepts additive mediaAssets and audioAssetId on schema v1", () => {
    const project = projectDocumentSchema.parse({
      schemaVersion: 1,
      projectId: "media-project",
      name: "Album",
      revision: 1,
      mediaAssets: [
        {
          id: "asset-audio-1",
          kind: "audio",
          required: true,
          sourcePath: "D:/Album/01 Intro.mp3",
          fileName: "01 Intro.mp3",
          sizeBytes: 12345,
          availability: "ready",
          metadata: {
            durationMs: 125000,
            title: "Intro",
            trackNumber: 1,
          },
        },
      ],
      tracks: [
        {
          id: "track-1",
          title: "Intro",
          sourcePath: "D:/Album/01 Intro.mp3",
          audioAssetId: "asset-audio-1",
        },
      ],
    });

    expect(project.schemaVersion).toBe(1);
    expect(project.mediaAssets?.[0]?.id).toBe("asset-audio-1");
    expect(project.tracks[0]?.audioAssetId).toBe("asset-audio-1");
  });

  it("requires ready audio to have a positive duration", () => {
    expect(
      mediaAssetReferenceSchema.safeParse({
        id: "asset-audio-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/01 Intro.mp3",
        fileName: "01 Intro.mp3",
        sizeBytes: 12345,
        availability: "ready",
        metadata: { title: "Intro" },
      }).success,
    ).toBe(false);
  });

  it("requires unavailable media to carry an explicit matching issue", () => {
    expect(
      mediaAssetReferenceSchema.safeParse({
        id: "asset-missing",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/missing.mp3",
        fileName: "missing.mp3",
        sizeBytes: 0,
        availability: "missing",
      }).success,
    ).toBe(false);

    expect(
      mediaAssetReferenceSchema.safeParse({
        id: "asset-unsupported",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/file.bin",
        fileName: "file.bin",
        sizeBytes: 50,
        availability: "unsupported",
        errorCode: "MEDIA_CORRUPT",
      }).success,
    ).toBe(false);
  });

  it("blocks required unavailable media but not optional missing visuals", () => {
    const project = projectDocumentSchema.parse({
      schemaVersion: 1,
      projectId: "readiness-project",
      name: "Readiness",
      revision: 2,
      tracks: [],
      mediaAssets: [
        {
          id: "required-audio",
          kind: "audio",
          required: true,
          sourcePath: "D:/Album/missing.mp3",
          fileName: "missing.mp3",
          sizeBytes: 0,
          availability: "missing",
          errorCode: "MEDIA_NOT_FOUND",
        },
        {
          id: "optional-cover",
          kind: "image",
          required: false,
          sourcePath: "D:/Album/cover.png",
          fileName: "cover.png",
          sizeBytes: 0,
          availability: "missing",
          errorCode: "MEDIA_NOT_FOUND",
        },
      ],
    });

    expect(getProjectMediaReadiness(project)).toEqual({
      ready: false,
      blockers: [
        {
          assetId: "required-audio",
          fileName: "missing.mp3",
          kind: "audio",
          code: "REQUIRED_MEDIA_MISSING",
        },
      ],
    });
  });

  it("rejects an audioAssetId that does not resolve to an audio media asset", () => {
    expect(
      projectDocumentSchema.safeParse({
        schemaVersion: 1,
        projectId: "bad-link",
        name: "Bad Link",
        revision: 1,
        mediaAssets: [
          {
            id: "image-1",
            kind: "image",
            required: false,
            sourcePath: "D:/Album/cover.png",
            fileName: "cover.png",
            sizeBytes: 100,
            availability: "ready",
          },
        ],
        tracks: [
          {
            id: "track-1",
            title: "Track",
            sourcePath: "D:/Album/track.mp3",
            audioAssetId: "image-1",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
