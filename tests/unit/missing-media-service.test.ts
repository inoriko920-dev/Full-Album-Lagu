import { describe, expect, it } from "vitest";
import type { MediaSourcePort } from "../../src/core/application/ports/media-source-port";
import { MissingMediaService } from "../../src/core/application/services/missing-media-service";
import { getProjectMediaReadiness } from "../../src/core/domain/media-readiness";
import type { ProjectDocument } from "../../src/core/domain/project-document";

function project(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "missing-project",
    name: "Missing Test",
    revision: 3,
    tracks: [
      {
        id: "track-audio",
        title: "Audio",
        sourcePath: "C:/album/audio.mp3",
        audioAssetId: "audio-required",
      },
    ],
    mediaAssets: [
      {
        id: "audio-required",
        kind: "audio",
        required: true,
        sourcePath: "C:/album/audio.mp3",
        fileName: "audio.mp3",
        sizeBytes: 100,
        availability: "ready",
        metadata: { durationMs: 5000 },
      },
      {
        id: "visual-optional",
        kind: "image",
        required: false,
        sourcePath: "C:/album/cover.png",
        fileName: "cover.png",
        sizeBytes: 200,
        availability: "ready",
      },
    ],
  };
}

describe("MissingMediaService", () => {
  it("distinguishes required audio from optional missing visual readiness", async () => {
    const port: MediaSourcePort = {
      async inspect(sourcePath) {
        if (sourcePath.endsWith("audio.mp3")) return { status: "missing" };
        return { status: "missing" };
      },
    };

    const result = await new MissingMediaService(port, 2).scan(project());

    expect(result.project.revision).toBe(3);
    expect(result.items).toEqual([
      {
        assetId: "audio-required",
        fileName: "audio.mp3",
        kind: "audio",
        required: true,
        availability: "missing",
        code: "MEDIA_NOT_FOUND",
      },
      {
        assetId: "visual-optional",
        fileName: "cover.png",
        kind: "image",
        required: false,
        availability: "missing",
        code: "MEDIA_NOT_FOUND",
      },
    ]);
    expect(result.readiness).toEqual({
      ready: false,
      blockers: [
        {
          assetId: "audio-required",
          fileName: "audio.mp3",
          kind: "audio",
          code: "REQUIRED_MEDIA_MISSING",
        },
      ],
    });
    expect(getProjectMediaReadiness(result.project)).toEqual(result.readiness);
  });

  it("restores a previously missing audio reference when its source returns", async () => {
    const input = project();
    input.mediaAssets = input.mediaAssets?.map((asset) =>
      asset.id === "audio-required"
        ? {
            ...asset,
            availability: "missing" as const,
            errorCode: "MEDIA_NOT_FOUND" as const,
          }
        : asset,
    );

    const port: MediaSourcePort = {
      async inspect(sourcePath) {
        if (sourcePath.endsWith("audio.mp3")) {
          return {
            status: "found",
            source: {
              sourcePath,
              fileName: "audio.mp3",
              sizeBytes: 100,
            },
          };
        }
        return { status: "missing" };
      },
    };

    const result = await new MissingMediaService(port).scan(input);
    expect(
      result.project.mediaAssets?.find((asset) => asset.id === "audio-required"),
    ).toMatchObject({
      availability: "ready",
      metadata: { durationMs: 5000 },
    });
  });
});
