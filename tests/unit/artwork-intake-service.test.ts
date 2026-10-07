import { describe, expect, it } from "vitest";
import type {
  ArtworkProbePort,
  ArtworkProbeResult,
} from "../../src/core/application/ports/artwork-probe-port";
import type {
  MediaSourceInspection,
  MediaSourcePort,
} from "../../src/core/application/ports/media-source-port";
import { ArtworkIntakeService } from "../../src/core/application/services/artwork-intake-service";
import { createEmptyProject } from "../../src/core/domain/project-document";

function sourcePort(result: MediaSourceInspection): MediaSourcePort {
  return { async inspect() { return result; } };
}

function probePort(result: ArtworkProbeResult): ArtworkProbePort {
  return { async probe() { return result; } };
}

describe("ArtworkIntakeService", () => {
  it.each([
    ["cover.png", "png" as const],
    ["cover.jpg", "jpeg" as const],
    ["cover.jpeg", "jpeg" as const],
    ["cover.webp", "webp" as const],
  ])("imports supported %s artwork as optional media", async (fileName, format) => {
    const project = createEmptyProject("artwork-supported");
    const original = structuredClone(project);
    const service = new ArtworkIntakeService(
      sourcePort({
        status: "found",
        source: {
          sourcePath: `D:/Album/${fileName}`,
          fileName,
          sizeBytes: 120,
        },
      }),
      probePort({ status: "ready", format }),
      () => "image-1",
    );

    const result = await service.importAndBind(
      project,
      { kind: "album-default" },
      `D:/Album/${fileName}`,
    );
    expect(project).toEqual(original);
    expect(result.status).toBe("imported");
    if (result.status !== "imported") throw new Error("Expected imported.");
    expect(result.project).toMatchObject({
      revision: 1,
      albumPresentation: { defaultArtworkAssetId: "image-1" },
    });
    expect(result.project.mediaAssets?.[0]).toMatchObject({
      id: "image-1",
      kind: "image",
      required: false,
      availability: "ready",
      fileName,
    });
  });

  it("binds imported artwork to one track without changing unrelated manual fields", async () => {
    const project = {
      ...createEmptyProject("artwork-track"),
      tracks: [
        {
          id: "track-1",
          title: "One",
          sourcePath: "D:/Album/one.mp3",
          binding: { titleOverride: "Manual One" },
        },
      ],
    };
    const service = new ArtworkIntakeService(
      sourcePort({
        status: "found",
        source: {
          sourcePath: "D:/Album/track.png",
          fileName: "track.png",
          sizeBytes: 99,
        },
      }),
      probePort({ status: "ready", format: "png" }),
      () => "image-track",
    );
    const result = await service.importAndBind(
      project,
      { kind: "track", trackId: "track-1" },
      "D:/Album/track.png",
    );
    expect(result.status).toBe("imported");
    if (result.status !== "imported") throw new Error("Expected imported.");
    expect(result.project.tracks[0]?.binding).toEqual({
      titleOverride: "Manual One",
      artworkAssetId: "image-track",
    });
  });

  it.each([
    [
      "missing",
      { status: "missing" as const },
      { status: "ready" as const, format: "png" as const },
      "MEDIA_NOT_FOUND",
    ],
    [
      "unreadable",
      { status: "unreadable" as const, message: "no" },
      { status: "ready" as const, format: "png" as const },
      "MEDIA_UNREADABLE",
    ],
    [
      "unsupported",
      {
        status: "found" as const,
        source: {
          sourcePath: "D:/Album/cover.gif",
          fileName: "cover.gif",
          sizeBytes: 50,
        },
      },
      { status: "unsupported" as const, message: "no" },
      "MEDIA_UNSUPPORTED",
    ],
    [
      "corrupt",
      {
        status: "found" as const,
        source: {
          sourcePath: "D:/Album/cover.png",
          fileName: "cover.png",
          sizeBytes: 50,
        },
      },
      { status: "invalid" as const, message: "bad" },
      "MEDIA_CORRUPT",
    ],
  ])("fails %s artwork safely", async (_name, inspection, probe, code) => {
    const service = new ArtworkIntakeService(
      sourcePort(inspection),
      probePort(probe),
      () => "unused",
    );
    const result = await service.importAndBind(
      createEmptyProject("artwork-failure"),
      { kind: "album-default" },
      "D:/Album/cover.png",
    );
    expect(result).toMatchObject({ status: "error", code });
    expect("project" in result).toBe(false);
  });
});
