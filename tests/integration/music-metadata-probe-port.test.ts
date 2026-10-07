import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MusicMetadataProbePort } from "../../src/main/infrastructure/media/music-metadata-probe-port";
import { SYNTHETIC_AUDIO_FIXTURES } from "../fixtures/synthetic-audio-fixtures";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("MusicMetadataProbePort real parser integration", () => {
  it("probes synthetic MP3/WAV/FLAC/M4A/AAC with usable duration", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa-probe Ω "));
    cleanupPaths.push(root);

    const specs = [
      ["tagged.mp3", SYNTHETIC_AUDIO_FIXTURES.mp3],
      ["sample.wav", SYNTHETIC_AUDIO_FIXTURES.wav],
      ["sample.flac", SYNTHETIC_AUDIO_FIXTURES.flac],
      ["sample.m4a", SYNTHETIC_AUDIO_FIXTURES.m4a],
      ["sample.aac", SYNTHETIC_AUDIO_FIXTURES.aac],
    ] as const;

    const port = new MusicMetadataProbePort();

    for (const [fileName, base64] of specs) {
      const sourcePath = join(root, fileName);
      const bytes = Buffer.from(base64, "base64");
      await writeFile(sourcePath, bytes);

      const before = await stat(sourcePath);
      const beforeBytes = await readFile(sourcePath);
      const result = await port.probe({
        sourcePath,
        fileName,
        sizeBytes: bytes.length,
      });
      const after = await stat(sourcePath);
      const afterBytes = await readFile(sourcePath);

      expect(result.status, fileName).toBe("ready");
      if (result.status !== "ready") {
        throw new Error(`Expected ready fixture: ${fileName}`);
      }
      expect(result.metadata.durationMs, fileName).toBeGreaterThan(0);
      expect(afterBytes).toEqual(beforeBytes);
      expect(after.size).toBe(before.size);
      expect(after.mtimeMs).toBe(before.mtimeMs);
    }
  });

  it("extracts common MP3 tags and classifies corrupt/unsupported inputs", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa-probe-tags "));
    cleanupPaths.push(root);
    const port = new MusicMetadataProbePort();

    const taggedPath = join(root, "07 Tagged.mp3");
    const taggedBytes = Buffer.from(SYNTHETIC_AUDIO_FIXTURES.mp3, "base64");
    await writeFile(taggedPath, taggedBytes);

    const tagged = await port.probe({
      sourcePath: taggedPath,
      fileName: "07 Tagged.mp3",
      sizeBytes: taggedBytes.length,
    });

    expect(tagged.status).toBe("ready");
    if (tagged.status !== "ready") throw new Error("Expected tagged MP3.");
    expect(tagged.metadata).toMatchObject({
      title: "Tagged Track",
      artist: "Fixture Artist",
      album: "Fixture Album",
      trackNumber: 7,
      year: 2026,
    });

    const corruptPath = join(root, "08 Corrupt.mp3");
    await writeFile(corruptPath, "this is not an mp3", "utf8");
    await expect(
      port.probe({
        sourcePath: corruptPath,
        fileName: "08 Corrupt.mp3",
        sizeBytes: 18,
      }),
    ).resolves.toMatchObject({
      status: "invalid",
      code: "MEDIA_CORRUPT",
    });

    const unsupportedPath = join(root, "notes.txt");
    await writeFile(unsupportedPath, "notes", "utf8");
    await expect(
      port.probe({
        sourcePath: unsupportedPath,
        fileName: "notes.txt",
        sizeBytes: 5,
      }),
    ).resolves.toMatchObject({
      status: "unsupported",
      code: "MEDIA_UNSUPPORTED",
    });
  });
});
