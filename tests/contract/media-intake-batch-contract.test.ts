import { describe, expect, it } from "vitest";
import {
  MEDIA_INTAKE_CANCEL_CHANNEL,
  MEDIA_INTAKE_START_CHANNEL,
  MEDIA_INTAKE_STATUS_CHANNEL,
  mediaIntakeStartRequestSchema,
  mediaIntakeStatusResultSchema,
} from "../../src/core/contracts/media-intake-batch";
import { createEmptyProject } from "../../src/core/domain/project-document";

describe("media intake batch contract", () => {
  it("uses explicit allowlisted channels", () => {
    expect(MEDIA_INTAKE_START_CHANNEL).toBe("media:start-intake");
    expect(MEDIA_INTAKE_STATUS_CHANNEL).toBe("media:get-intake-status");
    expect(MEDIA_INTAKE_CANCEL_CHANNEL).toBe("media:cancel-intake");
  });

  it("accepts schema-v1 project input without a version bump", () => {
    const project = createEmptyProject("project-contract");
    expect(
      mediaIntakeStartRequestSchema.parse({
        discoveryBatchId: "discovery-1",
        project,
      }),
    ).toEqual({
      discoveryBatchId: "discovery-1",
      project,
    });
  });

  it("keeps public item summaries path-free while allowing project source references", () => {
    const project = {
      schemaVersion: 1 as const,
      projectId: "project-completed",
      name: "Album",
      revision: 1,
      tracks: [
        {
          id: "track-1",
          title: "Song",
          sourcePath: "D:/Album/Song.mp3",
          audioAssetId: "asset-1",
        },
      ],
      mediaAssets: [
        {
          id: "asset-1",
          kind: "audio" as const,
          required: true,
          sourcePath: "D:/Album/Song.mp3",
          fileName: "Song.mp3",
          sizeBytes: 10,
          availability: "ready" as const,
          metadata: { durationMs: 1000 },
        },
      ],
    };

    const result = mediaIntakeStatusResultSchema.parse({
      status: "completed",
      batchId: "intake-1",
      progress: {
        discovered: 1,
        processed: 1,
        accepted: 1,
        rejected: 0,
      },
      summary: {
        discovered: 1,
        accepted: 1,
        rejected: 0,
        cancelled: 0,
        items: [
          {
            assetId: "asset-1",
            fileName: "Song.mp3",
            kind: "audio",
            status: "ready",
          },
        ],
      },
      project,
    });

    expect(result.status).toBe("completed");
    if (result.status !== "completed") throw new Error("Expected completed.");
    expect(JSON.stringify(result.summary)).not.toContain("D:/Album");
    expect(
      mediaIntakeStatusResultSchema.safeParse({
        ...result,
        summary: {
          ...result.summary,
          items: [
            {
              ...result.summary.items[0],
              sourcePath: "D:/Album/Song.mp3",
            },
          ],
        },
      }).success,
    ).toBe(false);
    expect(result.project.tracks[0]?.sourcePath).toBe(
      "D:/Album/Song.mp3",
    );
  });
});
