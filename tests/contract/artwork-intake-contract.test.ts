import { describe, expect, it } from "vitest";
import {
  ARTWORK_PICK_AND_BIND_CHANNEL,
  artworkImportRequestSchema,
  artworkImportResultSchema,
} from "../../src/core/contracts/artwork-intake";
import { createEmptyProject } from "../../src/core/domain/project-document";

describe("artwork intake contract", () => {
  it("uses one explicit main-owned artwork channel", () => {
    expect(ARTWORK_PICK_AND_BIND_CHANNEL).toBe("artwork:pick-and-bind");
  });

  it("accepts album-default and track binding targets", () => {
    const project = createEmptyProject("artwork-contract");
    expect(
      artworkImportRequestSchema.parse({
        project,
        target: { kind: "album-default" },
      }).target,
    ).toEqual({ kind: "album-default" });
    expect(
      artworkImportRequestSchema.parse({
        project,
        target: { kind: "track", trackId: "track-1" },
      }).target,
    ).toEqual({ kind: "track", trackId: "track-1" });
  });

  it("supports explicit selection cancellation", () => {
    expect(
      artworkImportResultSchema.parse({
        status: "cancelled",
        code: "MEDIA_SELECTION_CANCELLED",
      }),
    ).toEqual({
      status: "cancelled",
      code: "MEDIA_SELECTION_CANCELLED",
    });
  });

  it("keeps the imported-asset summary path-free", () => {
    const project = createEmptyProject("artwork-result");
    const result = artworkImportResultSchema.parse({
      status: "imported",
      project: {
        ...project,
        revision: 1,
        albumPresentation: { defaultArtworkAssetId: "image-1" },
        mediaAssets: [
          {
            id: "image-1",
            kind: "image",
            required: false,
            sourcePath: "D:/Private/cover.png",
            fileName: "cover.png",
            sizeBytes: 100,
            availability: "ready",
          },
        ],
      },
      asset: { assetId: "image-1", fileName: "cover.png" },
    });
    expect(result.asset).toEqual({
      assetId: "image-1",
      fileName: "cover.png",
    });
    expect(
      artworkImportResultSchema.safeParse({
        ...result,
        asset: {
          ...result.asset,
          sourcePath: "D:/Private/cover.png",
        },
      }).success,
    ).toBe(false);
  });
});
