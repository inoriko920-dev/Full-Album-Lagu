import {
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MediaDiscoveryService } from "../../src/core/application/services/media-discovery-service";
import type { MediaDiscoveryStatusResult } from "../../src/core/contracts/media-discovery";
import { NodeMediaDiscoveryPort } from "../../src/main/infrastructure/media/node-media-discovery-port";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function waitForTerminal(
  service: MediaDiscoveryService,
  batchId: string,
): Promise<MediaDiscoveryStatusResult> {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const status = service.getStatus(batchId);
    if (status.status !== "discovering") return status;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Timed out waiting for media discovery.");
}

describe("MediaDiscoveryService + NodeMediaDiscoveryPort", () => {
  it("discovers 100+ files recursively with spaces and Unicode deterministically", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa media Ω "));
    cleanupPaths.push(root);
    const nested = join(root, "Folder Dengan Spasi Ω", "Nested");
    await mkdir(nested, { recursive: true });

    const expectedNames: string[] = [];
    for (let index = 1; index <= 120; index += 1) {
      const name = `${String(index).padStart(3, "0")} Lagu Ω ${index}.mp3`;
      const target = index % 2 === 0 ? join(root, name) : join(nested, name);
      await writeFile(target, `audio-${index}`, "utf8");
      expectedNames.push(name);
    }

    const service = new MediaDiscoveryService(
      new NodeMediaDiscoveryPort(),
      () => "batch-100",
      4,
    );

    const { batchId } = service.start([root]);
    const result = await waitForTerminal(service, batchId);

    expect(result.status).toBe("completed");
    if (result.status !== "completed") {
      throw new Error("Expected completed discovery.");
    }

    expect(result.summary.filesDiscovered).toBe(120);
    expect(result.summary.items).toHaveLength(120);
    expect(result.summary.issues).toEqual([]);
    expect(new Set(result.summary.items.map((item) => item.fileName))).toEqual(
      new Set(expectedNames),
    );
    expect(JSON.stringify(result)).not.toContain(root);

    const second = new MediaDiscoveryService(
      new NodeMediaDiscoveryPort(),
      () => "batch-100-second",
      4,
    );
    const secondResult = await waitForTerminal(
      second,
      second.start([root]).batchId,
    );

    expect(secondResult.status).toBe("completed");
    if (secondResult.status !== "completed") {
      throw new Error("Expected second completed discovery.");
    }

    expect(secondResult.summary.items.map((item) => item.fileName)).toEqual(
      result.summary.items.map((item) => item.fileName),
    );
  });

  it("deduplicates the same canonical file selected directly and through its folder", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa duplicate "));
    cleanupPaths.push(root);
    const file = join(root, "01 Duplicate.mp3");
    await writeFile(file, "same-source", "utf8");

    const service = new MediaDiscoveryService(
      new NodeMediaDiscoveryPort(),
      () => "batch-dedupe",
      4,
    );

    const result = await waitForTerminal(
      service,
      service.start([file, root, file]).batchId,
    );

    expect(result.status).toBe("completed");
    if (result.status !== "completed") {
      throw new Error("Expected completed discovery.");
    }

    expect(result.summary.filesDiscovered).toBe(1);
    expect(result.summary.duplicatesSkipped).toBeGreaterThanOrEqual(2);
    expect(result.summary.items[0]?.fileName).toBe("01 Duplicate.mp3");
  });

  it("discovers 20+ files without modifying source bytes or mtime", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa nondestructive "));
    cleanupPaths.push(root);

    for (let index = 1; index <= 24; index += 1) {
      await writeFile(
        join(root, `${String(index).padStart(2, "0")} Track.mp3`),
        `source-${index}`,
        "utf8",
      );
    }

    const watched = join(root, "01 Track.mp3");
    const bytesBefore = await readFile(watched);
    const statBefore = await stat(watched);

    const service = new MediaDiscoveryService(
      new NodeMediaDiscoveryPort(),
      () => "batch-24",
      4,
    );
    const result = await waitForTerminal(
      service,
      service.start([root]).batchId,
    );

    expect(result.status).toBe("completed");
    if (result.status !== "completed") {
      throw new Error("Expected completed discovery.");
    }
    expect(result.summary.filesDiscovered).toBe(24);

    const bytesAfter = await readFile(watched);
    const statAfter = await stat(watched);
    expect(bytesAfter).toEqual(bytesBefore);
    expect(statAfter.size).toBe(statBefore.size);
    expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);
  });

  it("keeps raw source paths internal to the service", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa internal source "));
    cleanupPaths.push(root);
    const file = join(root, "Internal Ω.mp3");
    await writeFile(file, "source", "utf8");

    const service = new MediaDiscoveryService(
      new NodeMediaDiscoveryPort(),
      () => "batch-internal",
      2,
    );
    const batchId = service.start([file]).batchId;
    const publicResult = await waitForTerminal(service, batchId);
    const internalSources = service.getDiscoveredSources(batchId);

    expect(publicResult.status).toBe("completed");
    expect(JSON.stringify(publicResult)).not.toContain(root);
    expect(internalSources).toHaveLength(1);
    expect(internalSources[0]?.source.sourcePath).toContain("Internal Ω.mp3");
  });
});
