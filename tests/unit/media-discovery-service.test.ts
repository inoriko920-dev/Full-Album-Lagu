import { describe, expect, it } from "vitest";
import type {
  MediaDiscoveryEntry,
  MediaDiscoveryPort,
} from "../../src/core/application/ports/media-discovery-port";
import { MediaDiscoveryService } from "../../src/core/application/services/media-discovery-service";
import type { MediaDiscoveryStatusResult } from "../../src/core/contracts/media-discovery";

async function waitForTerminal(
  service: MediaDiscoveryService,
  batchId: string,
): Promise<MediaDiscoveryStatusResult> {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const status = service.getStatus(batchId);
    if (status.status !== "discovering") return status;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error("Timed out waiting for media discovery.");
}

class SlowDiscoveryPort implements MediaDiscoveryPort {
  active = 0;
  maxActive = 0;

  constructor(
    private readonly delayMs: number,
    private readonly children: string[] = [],
  ) {}

  async inspectPath(sourcePath: string): Promise<MediaDiscoveryEntry> {
    this.active += 1;
    this.maxActive = Math.max(this.maxActive, this.active);
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    this.active -= 1;

    if (sourcePath === "/root") {
      return {
        kind: "directory",
        identityKey: "/root",
        sourcePath: "/root",
        fileName: "root",
      };
    }

    return {
      kind: "file",
      identityKey: sourcePath,
      source: {
        sourcePath,
        fileName: sourcePath.split("/").at(-1) ?? "file.mp3",
        sizeBytes: 1,
      },
    };
  }

  async listDirectory(): Promise<string[]> {
    return [...this.children];
  }
}

describe("MediaDiscoveryService queue", () => {
  it("never exceeds configured concurrency", async () => {
    const paths = Array.from(
      { length: 40 },
      (_, index) => `/file-${index}.mp3`,
    );
    const port = new SlowDiscoveryPort(2);
    const service = new MediaDiscoveryService(port, () => "bounded", 4);

    const result = await waitForTerminal(service, service.start(paths).batchId);

    expect(result.status).toBe("completed");
    expect(port.maxActive).toBeLessThanOrEqual(4);
    expect(port.maxActive).toBeGreaterThan(1);
  });

  it("cancels a running recursive batch and preserves partial sanitized summary", async () => {
    const children = Array.from(
      { length: 100 },
      (_, index) => `/root/file-${String(index).padStart(3, "0")}.mp3`,
    );
    const port = new SlowDiscoveryPort(10, children);
    const service = new MediaDiscoveryService(port, () => "cancelled", 4);

    const { batchId } = service.start(["/root"]);
    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(service.cancel(batchId)).toEqual({
      status: "cancel-requested",
      batchId,
    });

    const result = await waitForTerminal(service, batchId);
    expect(result.status).toBe("cancelled");
    if (result.status !== "cancelled") {
      throw new Error("Expected cancelled discovery.");
    }

    expect(result.code).toBe("MEDIA_IMPORT_CANCELLED");
    expect(JSON.stringify(result)).not.toContain("/root/");
    expect(service.cancel(batchId)).toEqual({
      status: "not-running",
      batchId,
    });
  });
});
