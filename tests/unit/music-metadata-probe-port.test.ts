import { describe, expect, it, vi } from "vitest";
import type { IAudioMetadata } from "music-metadata";
import {
  MusicMetadataProbePort,
  type MusicMetadataParser,
} from "../../src/main/infrastructure/media/music-metadata-probe-port";

const source = {
  sourcePath: "C:/Album/07 Tagged.mp3",
  fileName: "07 Tagged.mp3",
  sizeBytes: 1234,
};

function metadata(value: Partial<IAudioMetadata> = {}): IAudioMetadata {
  return {
    format: {
      duration: 1.25,
      container: "MPEG",
      codec: "MPEG 1 Layer 3",
      hasAudio: true,
    },
    common: {
      title: " Tagged Track ",
      artist: " Fixture Artist ",
      album: " Fixture Album ",
      track: { no: 7, of: 12 },
      disk: { no: null, of: null },
      movementIndex: { no: null, of: null },
      year: 2026,
    },
    native: {},
    quality: { warnings: [] },
    ...value,
  } as IAudioMetadata;
}

describe("MusicMetadataProbePort", () => {
  it("extracts duration/common tags and disables cover extraction", async () => {
    const parser = vi.fn<MusicMetadataParser>(async () => metadata());
    const port = new MusicMetadataProbePort(parser);

    const result = await port.probe(source);

    expect(result).toEqual({
      status: "ready",
      metadata: {
        durationMs: 1250,
        title: "Tagged Track",
        artist: "Fixture Artist",
        album: "Fixture Album",
        trackNumber: 7,
        year: 2026,
        container: "MPEG",
        codec: "MPEG 1 Layer 3",
      },
    });
    expect(parser).toHaveBeenCalledWith(source.sourcePath, {
      duration: true,
      skipCovers: true,
    });
  });

  it("rejects unsupported extensions before parsing", async () => {
    const parser = vi.fn<MusicMetadataParser>(async () => metadata());
    const port = new MusicMetadataProbePort(parser);

    const result = await port.probe({
      ...source,
      sourcePath: "C:/Album/readme.txt",
      fileName: "readme.txt",
    });

    expect(result).toMatchObject({
      status: "unsupported",
      code: "MEDIA_UNSUPPORTED",
    });
    expect(parser).not.toHaveBeenCalled();
  });

  it("classifies unreadable filesystem errors explicitly", async () => {
    const parser = vi.fn<MusicMetadataParser>(async () => {
      throw Object.assign(new Error("private path detail"), { code: "EACCES" });
    });
    const port = new MusicMetadataProbePort(parser);

    await expect(port.probe(source)).resolves.toEqual({
      status: "invalid",
      code: "MEDIA_UNREADABLE",
      message: "File audio tidak dapat dibaca.",
    });
  });

  it("classifies parser failures as corrupt without leaking parser details", async () => {
    const parser = vi.fn<MusicMetadataParser>(async () => {
      throw new Error("C:/secret/path.mp3 parser internals");
    });
    const port = new MusicMetadataProbePort(parser);

    const result = await port.probe(source);
    expect(result).toEqual({
      status: "invalid",
      code: "MEDIA_CORRUPT",
      message: "File audio rusak atau struktur medianya tidak valid.",
    });
    expect(JSON.stringify(result)).not.toContain("C:/secret");
  });

  it("requires a positive usable duration", async () => {
    const parser = vi.fn<MusicMetadataParser>(async () =>
      metadata({
        format: {
          container: "MPEG",
          codec: "MPEG 1 Layer 3",
          hasAudio: true,
          trackInfo: [],
          tagTypes: [],
        },
      }),
    );
    const port = new MusicMetadataProbePort(parser);

    await expect(port.probe(source)).resolves.toEqual({
      status: "invalid",
      code: "MEDIA_DURATION_UNAVAILABLE",
      message: "Durasi audio tidak dapat ditentukan.",
    });
  });
});
