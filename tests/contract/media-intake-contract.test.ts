import { describe, expect, it } from "vitest";
import {
  mediaBatchProgressSchema,
  mediaBatchResultSchema,
  mediaItemReportSchema,
  mediaPublicErrorCodeSchema,
  mediaRelinkResultSchema,
} from "../../src/core/contracts/media-intake";

describe("media intake public contracts", () => {
  it("exposes the planned media and relink error taxonomy", () => {
    const codes = [
      "MEDIA_SELECTION_CANCELLED",
      "MEDIA_DISCOVERY_FAILED",
      "MEDIA_NOT_FOUND",
      "MEDIA_UNREADABLE",
      "MEDIA_UNSUPPORTED",
      "MEDIA_CORRUPT",
      "MEDIA_DURATION_UNAVAILABLE",
      "MEDIA_PROBE_FAILED",
      "MEDIA_IMPORT_CANCELLED",
      "RELINK_CANCELLED",
      "RELINK_NO_MATCH",
      "RELINK_AMBIGUOUS",
      "RELINK_FAILED",
    ];

    for (const code of codes) {
      expect(mediaPublicErrorCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it("keeps public item reports path-free and rejects raw source paths", () => {
    const report = {
      assetId: "asset-1",
      fileName: "01 Intro.mp3",
      kind: "audio",
      status: "ready",
    };

    expect(mediaItemReportSchema.parse(report)).toEqual(report);
    expect(
      mediaItemReportSchema.safeParse({
        ...report,
        sourcePath: "D:/Private/Album/01 Intro.mp3",
      }).success,
    ).toBe(false);
  });

  it("validates coherent progressive batch counts", () => {
    expect(
      mediaBatchProgressSchema.safeParse({
        discovered: 100,
        processed: 40,
        accepted: 35,
        rejected: 5,
      }).success,
    ).toBe(true);

    expect(
      mediaBatchProgressSchema.safeParse({
        discovered: 10,
        processed: 11,
        accepted: 10,
        rejected: 1,
      }).success,
    ).toBe(false);
  });

  it("supports an explicit cancelled batch with a sanitized item summary", () => {
    const result = mediaBatchResultSchema.parse({
      status: "cancelled",
      code: "MEDIA_IMPORT_CANCELLED",
      summary: {
        discovered: 20,
        accepted: 8,
        rejected: 1,
        cancelled: 11,
        items: [
          {
            assetId: "asset-1",
            fileName: "01 Intro.mp3",
            kind: "audio",
            status: "ready",
          },
        ],
      },
    });

    expect(result.status).toBe("cancelled");
    expect(JSON.stringify(result)).not.toContain("D:/");
  });

  it("keeps ambiguous relink candidates sanitized and explicit", () => {
    const result = mediaRelinkResultSchema.parse({
      status: "ambiguous",
      code: "RELINK_AMBIGUOUS",
      assetId: "asset-5",
      candidates: [
        { fileName: "05 Song.mp3", sizeBytes: 1000, durationMs: 180000 },
        { fileName: "05 Song.mp3", sizeBytes: 1000, durationMs: 180100 },
      ],
    });

    expect(result.status).toBe("ambiguous");
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]).not.toHaveProperty("sourcePath");
  });
});
