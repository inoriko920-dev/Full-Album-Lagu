import { describe, expect, it } from "vitest";
import type { MediaProbePort } from "../../src/core/application/ports/media-probe-port";
import type { MediaSourceDescriptor } from "../../src/core/application/ports/media-source-port";
import {
  MediaIntakeService,
  compareAudioImportOrder,
  extractFilenameOrderNumber,
  type MediaDiscoverySourceProvider,
} from "../../src/core/application/services/media-intake-service";
import type { MediaDiscoveryStatusResult } from "../../src/core/contracts/media-discovery";
import type { MediaIntakeStatusResult } from "../../src/core/contracts/media-intake-batch";
import { createEmptyProject } from "../../src/core/domain/project-document";

function source(index: number, fileName: string): MediaSourceDescriptor {
  return {
    sourcePath: `C:/Album/${fileName}`,
    fileName,
    sizeBytes: 1000 + index,
  };
}

class FakeDiscovery implements MediaDiscoverySourceProvider {
  constructor(
    private readonly sources: MediaSourceDescriptor[],
    private readonly batchId = "discovery-1",
  ) {}

  getStatus(batchId: string): MediaDiscoveryStatusResult {
    if (batchId !== this.batchId) {
      return {
        status: "error",
        batchId,
        code: "MEDIA_DISCOVERY_FAILED",
        message: "not found",
      };
    }

    return {
      status: "completed",
      batchId,
      summary: {
        rootsSelected: 1,
        directoriesVisited: 0,
        filesDiscovered: this.sources.length,
        duplicatesSkipped: 0,
        issues: [],
        items: this.sources.map((item, index) => ({
          discoveryId: `${batchId}:item:${String(index + 1).padStart(6, "0")}`,
          fileName: item.fileName,
          sizeBytes: item.sizeBytes,
        })),
      },
    };
  }

  getDiscoveredSources(batchId: string) {
    if (batchId !== this.batchId) return [];
    return this.sources.map((item, index) => ({
      discoveryId: `${batchId}:item:${String(index + 1).padStart(6, "0")}`,
      source: item,
    }));
  }
}

async function waitForTerminal(
  service: MediaIntakeService,
  batchId: string,
): Promise<MediaIntakeStatusResult> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const status = service.getStatus(batchId);
    if (status.status !== "probing" && status.status !== "committing") {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error("Timed out waiting for media intake.");
}

function sequentialIds(prefix = "id") {
  let index = 0;
  return () => `${prefix}-${++index}`;
}

describe("audio import ordering", () => {
  it("extracts leading and Track-prefixed numeric filename tokens", () => {
    expect(extractFilenameOrderNumber("01 - Intro.mp3")).toBe(1);
    expect(extractFilenameOrderNumber("Track 007 Finale.flac")).toBe(7);
    expect(extractFilenameOrderNumber("No Number.wav")).toBeUndefined();
  });

  it("uses metadata track number, then filename number, filename and stable identity", () => {
    const values = [
      {
        fileName: "01 Filename.mp3",
        sourceIdentity: "C:/b/01 Filename.mp3",
        importOrdinal: 0,
        metadataTrackNumber: 5,
      },
      {
        fileName: "02 Filename.mp3",
        sourceIdentity: "C:/a/02 Filename.mp3",
        importOrdinal: 1,
      },
      {
        fileName: "Zulu.mp3",
        sourceIdentity: "C:/a/Zulu.mp3",
        importOrdinal: 2,
      },
      {
        fileName: "Alpha.mp3",
        sourceIdentity: "C:/a/Alpha.mp3",
        importOrdinal: 3,
      },
    ];

    values.sort(compareAudioImportOrder);

    expect(values.map((value) => value.fileName)).toEqual([
      "02 Filename.mp3",
      "01 Filename.mp3",
      "Alpha.mp3",
      "Zulu.mp3",
    ]);
  });
});

describe("MediaIntakeService", () => {
  it("keeps 120-track ordering deterministic despite out-of-order probe completion", async () => {
    const sources = Array.from({ length: 120 }, (_, offset) => {
      const number = 120 - offset;
      return source(
        offset,
        `${String(number).padStart(3, "0")} Song ${number}.mp3`,
      );
    });

    let active = 0;
    let maxActive = 0;
    const probe: MediaProbePort = {
      async probe(item) {
        active += 1;
        maxActive = Math.max(maxActive, active);
        const number = Number.parseInt(item.fileName.slice(0, 3), 10);
        await new Promise((resolve) => setTimeout(resolve, (number % 7) + 1));
        active -= 1;
        return {
          status: "ready",
          metadata: { durationMs: 1000 },
        };
      },
    };

    const service = new MediaIntakeService(
      new FakeDiscovery(sources),
      probe,
      sequentialIds("stable"),
      4,
    );
    const batchId = service.start(
      "discovery-1",
      createEmptyProject("project-120"),
    ).batchId;

    const result = await waitForTerminal(service, batchId);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") throw new Error("Expected completed.");

    expect(maxActive).toBeLessThanOrEqual(4);
    expect(maxActive).toBeGreaterThan(1);
    expect(result.progress).toEqual({
      discovered: 120,
      processed: 120,
      accepted: 120,
      rejected: 0,
    });
    expect(result.project.tracks).toHaveLength(120);
    expect(result.project.tracks.map((track) => track.title)).toEqual(
      Array.from(
        { length: 120 },
        (_, index) => `${String(index + 1).padStart(3, "0")} Song ${index + 1}`,
      ),
    );
  });

  it("commits ready and invalid supported audio but rejects unsupported files", async () => {
    const sources = [
      source(0, "03 Good.mp3"),
      source(1, "02 Broken.mp3"),
      source(2, "readme.txt"),
      source(3, "01 Tagged.mp3"),
    ];

    const probe: MediaProbePort = {
      async probe(item) {
        if (item.fileName === "readme.txt") {
          return {
            status: "unsupported",
            code: "MEDIA_UNSUPPORTED",
            message: "unsupported",
          };
        }
        if (item.fileName === "02 Broken.mp3") {
          return {
            status: "invalid",
            code: "MEDIA_CORRUPT",
            message: "corrupt",
          };
        }
        if (item.fileName === "01 Tagged.mp3") {
          return {
            status: "ready",
            metadata: {
              durationMs: 2000,
              title: "Metadata Title",
              trackNumber: 4,
            },
          };
        }
        return {
          status: "ready",
          metadata: { durationMs: 3000 },
        };
      },
    };

    const project = createEmptyProject("project-mixed");
    const service = new MediaIntakeService(
      new FakeDiscovery(sources),
      probe,
      sequentialIds("mixed"),
      4,
    );
    const batchId = service.start("discovery-1", project).batchId;
    const result = await waitForTerminal(service, batchId);

    expect(result.status).toBe("completed");
    if (result.status !== "completed") throw new Error("Expected completed.");

    expect(result.summary).toMatchObject({
      discovered: 4,
      accepted: 2,
      rejected: 2,
      cancelled: 0,
    });
    expect(result.project.schemaVersion).toBe(1);
    expect(result.project.revision).toBe(1);
    expect(result.project.mediaAssets).toHaveLength(3);
    expect(result.project.tracks).toHaveLength(3);
    expect(result.project.tracks.map((track) => track.title)).toEqual([
      "02 Broken",
      "03 Good",
      "Metadata Title",
    ]);

    const invalid = result.project.mediaAssets?.find(
      (asset) => asset.fileName === "02 Broken.mp3",
    );
    expect(invalid).toMatchObject({
      availability: "invalid",
      errorCode: "MEDIA_CORRUPT",
      required: true,
      kind: "audio",
    });
    expect(
      result.project.mediaAssets?.some(
        (asset) => asset.fileName === "readme.txt",
      ),
    ).toBe(false);
  });

  it("uses filename fallback title when tags are missing", async () => {
    const service = new MediaIntakeService(
      new FakeDiscovery([source(0, "01 Tanpa Metadata.flac")]),
      {
        async probe() {
          return {
            status: "ready",
            metadata: { durationMs: 1500 },
          };
        },
      },
      sequentialIds("fallback"),
    );

    const result = await waitForTerminal(
      service,
      service.start("discovery-1", createEmptyProject("project-fallback"))
        .batchId,
    );
    expect(result.status).toBe("completed");
    if (result.status !== "completed") throw new Error("Expected completed.");
    expect(result.project.tracks[0]?.title).toBe("01 Tanpa Metadata");
  });

  it("cancels during probing without committing a partial project", async () => {
    const sources = Array.from({ length: 30 }, (_, index) =>
      source(index, `${String(index + 1).padStart(2, "0")} Slow.mp3`),
    );
    const service = new MediaIntakeService(
      new FakeDiscovery(sources),
      {
        async probe() {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return {
            status: "ready",
            metadata: { durationMs: 1000 },
          };
        },
      },
      sequentialIds("cancel"),
      4,
    );

    const batchId = service.start(
      "discovery-1",
      createEmptyProject("project-cancel"),
    ).batchId;
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(service.cancel(batchId)).toEqual({
      status: "cancel-requested",
      batchId,
    });

    const result = await waitForTerminal(service, batchId);
    expect(result.status).toBe("cancelled");
    if (result.status !== "cancelled") throw new Error("Expected cancelled.");
    expect(result.code).toBe("MEDIA_IMPORT_CANCELLED");
    expect(result.summary.cancelled).toBeGreaterThan(0);
    expect("project" in result).toBe(false);
  });
  it("keeps main-picker-authorized ready sources after 25 imports but releases on revoke", async () => {
    const track = source(0, "01 Album.mp3");
    const service = new MediaIntakeService(
      new FakeDiscovery([track]),
      {
        async probe() {
          return { status: "ready", metadata: { durationMs: 1000 } };
        },
      },
      sequentialIds("many"),
    );
    let project = createEmptyProject("project-many");
    let firstBatchId = "";
    let firstAssetId = "";
    let untrustedBatchId = "";
    for (let index = 0; index < 25; index += 1) {
      const batchId = service.start("discovery-1", project).batchId;
      if (index === 0) firstBatchId = batchId;
      if (index === 1) untrustedBatchId = batchId;
      if (index !== 1) {
        expect(
          service.retainTrustedAudioBatch(batchId, project.projectId),
        ).toBe(true);
      }
      const result = await waitForTerminal(service, batchId);
      expect(result.status).toBe("completed");
      if (result.status !== "completed") throw new Error("Not completed");
      project = result.project;
      if (index === 0) firstAssetId = project.mediaAssets?.[0]?.id ?? "";
    }
    expect(service.getStatus(firstBatchId).status).toBe("error");
    expect(
      service.getTrustedAudioSource(firstBatchId, "project-many", firstAssetId),
    ).toEqual(track);
    expect(
      service.getTrustedAudioSource(firstBatchId, "another-project", firstAssetId),
    ).toBeNull();
    expect(
      service.getTrustedAudioSource(untrustedBatchId, "project-many", "many-4"),
    ).toBeNull();
    service.releaseTrustedAudioBatch(firstBatchId);
    expect(
      service.getTrustedAudioSource(firstBatchId, "project-many", firstAssetId),
    ).toBeNull();
  });

  it("only grants main-verified, ready audio assets after a completed import", async () => {
    const good = source(0, "01 Good.mp3");
    const invalid = source(1, "02 Invalid.mp3");
    const service = new MediaIntakeService(
      new FakeDiscovery([good, invalid]),
      {
        async probe(item) {
          if (item.fileName === invalid.fileName) {
            return {
              status: "invalid",
              code: "MEDIA_CORRUPT",
              message: "not playable",
            };
          }
          return { status: "ready", metadata: { durationMs: 2000 } };
        },
      },
      sequentialIds("lease"),
    );
    const batchId = service.start(
      "discovery-1",
      createEmptyProject("main-project"),
    ).batchId;

    expect(
      service.getTrustedAudioSource(batchId, "main-project", "lease-2"),
    ).toBeNull();

    const result = await waitForTerminal(service, batchId);
    expect(result.status).toBe("completed");
    if (result.status !== "completed") throw new Error("Expected completed.");

    const goodAsset = result.project.mediaAssets?.find(
      (asset) => asset.fileName === good.fileName,
    );
    const badAsset = result.project.mediaAssets?.find(
      (asset) => asset.fileName === invalid.fileName,
    );
    expect(goodAsset).toBeDefined();
    expect(badAsset).toBeDefined();
    if (goodAsset === undefined || badAsset === undefined) {
      throw new Error("Missing asset fixture");
    }

    expect(
      service.getTrustedAudioSource(batchId, "main-project", goodAsset.id),
    ).toEqual(good);
    expect(
      service.getTrustedAudioSource(batchId, "wrong-project", goodAsset.id),
    ).toBeNull();
    expect(
      service.getTrustedAudioSource(
        "unknown-batch",
        "main-project",
        goodAsset.id,
      ),
    ).toBeNull();
    expect(
      service.getTrustedAudioSource(batchId, "main-project", badAsset.id),
    ).toBeNull();

    const returned = service.getTrustedAudioSource(
      batchId,
      "main-project",
      goodAsset.id,
    );
    expect(returned).not.toBeNull();
    if (returned === null) throw new Error("Expected trusted source");
    returned.sourcePath = "Z:/forged-source.mp3";
    expect(
      service.getTrustedAudioSource(batchId, "main-project", goodAsset.id),
    ).toEqual(good);
  });
});
