import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { MediaProbePort } from "../../src/core/application/ports/media-probe-port";
import { ArtworkIntakeService } from "../../src/core/application/services/artwork-intake-service";
import { MediaRelinkService } from "../../src/core/application/services/media-relink-service";
import { MissingMediaService } from "../../src/core/application/services/missing-media-service";
import { createEmptyProject } from "../../src/core/domain/project-document";
import { NodeArtworkProbePort } from "../../src/main/infrastructure/media/node-artwork-probe-port";
import { NodeMediaDiscoveryPort } from "../../src/main/infrastructure/media/node-media-discovery-port";
import { NodeMediaSourcePort } from "../../src/main/infrastructure/media/node-media-source-port";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

function pngBytes(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
}

describe("artwork intake + optional missing/relink filesystem flow", () => {
  it("keeps source unchanged, stays nonblocking when missing, and relinks the same asset", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa artwork Ω "));
    cleanupPaths.push(root);
    const originalDir = join(root, "Original");
    const replacementDir = join(root, "Moved");
    await mkdir(originalDir, { recursive: true });
    await mkdir(replacementDir, { recursive: true });

    const originalPath = join(originalDir, "cover Ω.png");
    const replacementPath = join(replacementDir, "cover Ω.png");
    const bytes = pngBytes();
    await writeFile(originalPath, bytes);
    const bytesBefore = await readFile(originalPath);
    const statBefore = await stat(originalPath);

    const intake = new ArtworkIntakeService(
      new NodeMediaSourcePort(),
      new NodeArtworkProbePort(),
      () => "artwork-cover",
    );
    const imported = await intake.importAndBind(
      createEmptyProject("artwork-fs"),
      { kind: "album-default" },
      originalPath,
    );
    expect(imported.status).toBe("imported");
    if (imported.status !== "imported") throw new Error("Expected imported.");

    expect(await readFile(originalPath)).toEqual(bytesBefore);
    const statAfterImport = await stat(originalPath);
    expect(statAfterImport.size).toBe(statBefore.size);
    expect(statAfterImport.mtimeMs).toBe(statBefore.mtimeMs);
    expect(imported.project.mediaAssets?.[0]).toMatchObject({
      id: "artwork-cover",
      kind: "image",
      required: false,
      availability: "ready",
    });

    await rename(originalPath, replacementPath);
    const scanned = await new MissingMediaService(
      new NodeMediaSourcePort(),
    ).scan(imported.project);
    expect(scanned.items).toEqual([
      {
        assetId: "artwork-cover",
        fileName: "cover Ω.png",
        kind: "image",
        required: false,
        availability: "missing",
        code: "MEDIA_NOT_FOUND",
      },
    ]);
    expect(scanned.readiness).toEqual({ ready: true, blockers: [] });
    expect(scanned.project.albumPresentation?.defaultArtworkAssetId).toBe(
      "artwork-cover",
    );

    const audioProbe: MediaProbePort = {
      async probe() {
        throw new Error("Image relink must not invoke the audio probe.");
      },
    };
    const outcome = await new MediaRelinkService(
      new NodeMediaSourcePort(),
      new NodeMediaDiscoveryPort(),
      audioProbe,
    ).relinkSingle(scanned.project, "artwork-cover", replacementPath);

    expect(outcome.result).toEqual({
      status: "relinked",
      assetId: "artwork-cover",
      fileName: "cover Ω.png",
    });
    expect(outcome.project).toMatchObject({
      revision: 2,
      albumPresentation: { defaultArtworkAssetId: "artwork-cover" },
    });
    expect(outcome.project?.mediaAssets?.[0]).toMatchObject({
      id: "artwork-cover",
      required: false,
      availability: "ready",
    });
    expect(await readFile(replacementPath)).toEqual(bytes);
  });

  it("rejects a corrupt PNG signature before project mutation", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa artwork corrupt "));
    cleanupPaths.push(root);
    const invalidPath = join(root, "fake.png");
    await writeFile(invalidPath, Buffer.from("not a png", "utf8"));

    const intake = new ArtworkIntakeService(
      new NodeMediaSourcePort(),
      new NodeArtworkProbePort(),
      () => "never-used",
    );
    const project = createEmptyProject("artwork-corrupt");
    const result = await intake.importAndBind(
      project,
      { kind: "album-default" },
      invalidPath,
    );
    expect(result).toMatchObject({
      status: "error",
      code: "MEDIA_CORRUPT",
    });
    expect(project).toEqual(createEmptyProject("artwork-corrupt"));
  });
});
