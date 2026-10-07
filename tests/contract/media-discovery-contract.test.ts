import { describe, expect, it } from "vitest";
import {
  MEDIA_DISCOVER_DROPPED_CHANNEL,
  MEDIA_DISCOVERY_CANCEL_CHANNEL,
  MEDIA_DISCOVERY_STATUS_CHANNEL,
  MEDIA_PICK_AUDIO_FILES_CHANNEL,
  MEDIA_PICK_FOLDER_CHANNEL,
  mediaDiscoveryCancelResultSchema,
  mediaDiscoveryItemSchema,
  mediaDiscoveryStartResultSchema,
  mediaDiscoveryStatusResultSchema,
} from "../../src/core/contracts/media-discovery";

describe("media discovery public contract", () => {
  it("uses explicit allowlisted channels", () => {
    expect(MEDIA_PICK_AUDIO_FILES_CHANNEL).toBe("media:pick-audio-files");
    expect(MEDIA_PICK_FOLDER_CHANNEL).toBe("media:pick-folder");
    expect(MEDIA_DISCOVER_DROPPED_CHANNEL).toBe("media:discover-dropped");
    expect(MEDIA_DISCOVERY_STATUS_CHANNEL).toBe("media:get-discovery-status");
    expect(MEDIA_DISCOVERY_CANCEL_CHANNEL).toBe("media:cancel-discovery");
  });

  it("keeps discovery items path-free", () => {
    const item = {
      discoveryId: "batch-1:item:000001",
      fileName: "01 Intro Ω.mp3",
      sizeBytes: 1234,
    };

    expect(mediaDiscoveryItemSchema.parse(item)).toEqual(item);
    expect(
      mediaDiscoveryItemSchema.safeParse({
        ...item,
        sourcePath: "D:/Private Album/01 Intro Ω.mp3",
      }).success,
    ).toBe(false);
  });

  it("keeps completed summaries path-free and coherent", () => {
    const result = mediaDiscoveryStatusResultSchema.parse({
      status: "completed",
      batchId: "batch-1",
      summary: {
        rootsSelected: 2,
        directoriesVisited: 1,
        filesDiscovered: 2,
        duplicatesSkipped: 1,
        issues: [],
        items: [
          {
            discoveryId: "batch-1:item:000001",
            fileName: "01 Intro.mp3",
            sizeBytes: 10,
          },
          {
            discoveryId: "batch-1:item:000002",
            fileName: "02 Song.mp3",
            sizeBytes: 20,
          },
        ],
      },
    });

    expect(JSON.stringify(result)).not.toContain("D:/");
    expect(JSON.stringify(result)).not.toContain("sourcePath");
  });

  it("supports explicit selection cancel and running cancel", () => {
    expect(
      mediaDiscoveryStartResultSchema.parse({
        status: "cancelled",
        code: "MEDIA_SELECTION_CANCELLED",
      }),
    ).toEqual({
      status: "cancelled",
      code: "MEDIA_SELECTION_CANCELLED",
    });

    expect(
      mediaDiscoveryCancelResultSchema.parse({
        status: "cancel-requested",
        batchId: "batch-1",
      }),
    ).toEqual({
      status: "cancel-requested",
      batchId: "batch-1",
    });
  });

  it("rejects inconsistent completed file totals", () => {
    expect(
      mediaDiscoveryStatusResultSchema.safeParse({
        status: "completed",
        batchId: "batch-1",
        summary: {
          rootsSelected: 1,
          directoriesVisited: 0,
          filesDiscovered: 2,
          duplicatesSkipped: 0,
          issues: [],
          items: [
            {
              discoveryId: "batch-1:item:000001",
              fileName: "one.mp3",
              sizeBytes: 1,
            },
          ],
        },
      }).success,
    ).toBe(false);
  });
});
