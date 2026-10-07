import { describe, expect, it } from "vitest";
import {
  MEDIA_MISSING_SCAN_CHANNEL,
  MEDIA_RELINK_FOLDER_CHANNEL,
  MEDIA_RELINK_SINGLE_CHANNEL,
  folderRelinkOperationResultSchema,
  missingMediaScanResultSchema,
} from "../../src/core/contracts/media-relink";

describe("missing-media and relink contracts", () => {
  it("uses explicit allowlisted channels", () => {
    expect(MEDIA_MISSING_SCAN_CHANNEL).toBe("media:scan-missing");
    expect(MEDIA_RELINK_SINGLE_CHANNEL).toBe("media:relink-single");
    expect(MEDIA_RELINK_FOLDER_CHANNEL).toBe("media:relink-folder");
  });

  it("keeps missing-media reports path-free", () => {
    const project = {
      schemaVersion: 1 as const,
      projectId: "p",
      name: "P",
      revision: 0,
      tracks: [],
      mediaAssets: [
        {
          id: "image-1",
          kind: "image" as const,
          required: false,
          sourcePath: "D:/Private/cover.png",
          fileName: "cover.png",
          sizeBytes: 10,
          availability: "missing" as const,
          errorCode: "MEDIA_NOT_FOUND" as const,
        },
      ],
    };
    const result = missingMediaScanResultSchema.parse({
      status: "scanned",
      project,
      items: [
        {
          assetId: "image-1",
          fileName: "cover.png",
          kind: "image",
          required: false,
          availability: "missing",
          code: "MEDIA_NOT_FOUND",
        },
      ],
      readiness: { ready: true, blockers: [] },
    });
    expect(JSON.stringify(result.items)).not.toContain("D:/Private");
  });

  it("rejects raw paths inside ambiguous candidate summaries", () => {
    expect(
      folderRelinkOperationResultSchema.safeParse({
        status: "completed",
        project: {
          schemaVersion: 1,
          projectId: "p",
          name: "P",
          revision: 0,
          tracks: [],
        },
        results: [
          {
            status: "ambiguous",
            code: "RELINK_AMBIGUOUS",
            assetId: "asset-1",
            candidates: [
              {
                fileName: "Track 5.mp3",
                sizeBytes: 100,
                durationMs: 5000,
                sourcePath: "D:/one/Track 5.mp3",
              },
              {
                fileName: "Track 5.mp3",
                sizeBytes: 100,
                durationMs: 5000,
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
