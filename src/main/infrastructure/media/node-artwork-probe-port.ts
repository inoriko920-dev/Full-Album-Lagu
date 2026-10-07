import { open } from "node:fs/promises";
import type {
  ArtworkFormat,
  ArtworkProbePort,
  ArtworkProbeResult,
} from "../../../core/application/ports/artwork-probe-port";
import type { MediaSourceDescriptor } from "../../../core/application/ports/media-source-port";

function extensionOf(fileName: string): string {
  const match = /\.([^.]+)$/u.exec(fileName.trim());
  return match?.[1]?.toLocaleLowerCase("en-US") ?? "";
}

function expectedFormat(fileName: string): ArtworkFormat | undefined {
  const extension = extensionOf(fileName);
  if (extension === "png") return "png";
  if (extension === "jpg" || extension === "jpeg") return "jpeg";
  if (extension === "webp") return "webp";
  return undefined;
}

function detectedFormat(bytes: Uint8Array): ArtworkFormat | undefined {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return undefined;
}

export class NodeArtworkProbePort implements ArtworkProbePort {
  async probe(source: MediaSourceDescriptor): Promise<ArtworkProbeResult> {
    const expected = expectedFormat(source.fileName);
    if (expected === undefined) {
      return {
        status: "unsupported",
        message: "Artwork file extension is not supported.",
      };
    }

    try {
      const handle = await open(source.sourcePath, "r");
      try {
        const buffer = Buffer.alloc(16);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        const actual = detectedFormat(buffer.subarray(0, bytesRead));
        if (actual === undefined || actual !== expected) {
          return {
            status: "invalid",
            message: "Artwork file signature does not match its extension.",
          };
        }
        return { status: "ready", format: actual };
      } finally {
        await handle.close();
      }
    } catch {
      return {
        status: "unreadable",
        message: "Artwork file could not be inspected.",
      };
    }
  }
}
