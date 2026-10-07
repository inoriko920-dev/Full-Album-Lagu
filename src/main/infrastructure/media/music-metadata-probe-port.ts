import { extname } from "node:path";
import { parseFile, type IAudioMetadata, type IOptions } from "music-metadata";
import type {
  AudioMediaMetadata,
  MediaIssueCode,
} from "../../../core/domain/media-asset";
import type {
  MediaProbePort,
  MediaProbeResult,
} from "../../../core/application/ports/media-probe-port";
import type { MediaSourceDescriptor } from "../../../core/application/ports/media-source-port";

export const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".wma",
  ".aiff",
  ".aif",
]);

export type MusicMetadataParser = (
  filePath: string,
  options?: IOptions,
) => Promise<IAudioMetadata>;

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function positiveInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

function validYear(value: unknown): number | undefined {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1000 ||
    value > 9999
  ) {
    return undefined;
  }
  return value;
}

function nodeErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}

function invalidResult(
  code: Exclude<MediaIssueCode, "MEDIA_NOT_FOUND" | "MEDIA_UNSUPPORTED">,
  message: string,
): MediaProbeResult {
  return {
    status: "invalid",
    code,
    message,
  };
}

export class MusicMetadataProbePort implements MediaProbePort {
  constructor(private readonly parser: MusicMetadataParser = parseFile) {}

  async probe(source: MediaSourceDescriptor): Promise<MediaProbeResult> {
    const extension = extname(source.fileName).toLocaleLowerCase("en-US");
    if (!SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
      return {
        status: "unsupported",
        code: "MEDIA_UNSUPPORTED",
        message: "Jenis file audio tidak didukung.",
      };
    }

    let parsed: IAudioMetadata;
    try {
      parsed = await this.parser(source.sourcePath, {
        duration: true,
        skipCovers: true,
      });
    } catch (error) {
      const code = nodeErrorCode(error);
      if (
        code === "EACCES" ||
        code === "EPERM" ||
        code === "ENOENT" ||
        code === "EBUSY" ||
        code === "EISDIR"
      ) {
        return invalidResult(
          "MEDIA_UNREADABLE",
          "File audio tidak dapat dibaca.",
        );
      }

      return invalidResult(
        "MEDIA_CORRUPT",
        "File audio rusak atau struktur medianya tidak valid.",
      );
    }

    if (parsed.format.hasAudio === false) {
      return {
        status: "unsupported",
        code: "MEDIA_UNSUPPORTED",
        message: "File tidak berisi track audio yang didukung.",
      };
    }

    const container = cleanString(parsed.format.container, 100);
    const codec = cleanString(parsed.format.codec, 100);
    if (container === undefined && codec === undefined) {
      return invalidResult(
        "MEDIA_CORRUPT",
        "File audio rusak atau struktur medianya tidak valid.",
      );
    }

    const durationSeconds = parsed.format.duration;
    if (
      typeof durationSeconds !== "number" ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      return invalidResult(
        "MEDIA_DURATION_UNAVAILABLE",
        "Durasi audio tidak dapat ditentukan.",
      );
    }

    const durationMs = Math.max(1, Math.round(durationSeconds * 1000));
    const metadata: AudioMediaMetadata & { durationMs: number } = {
      durationMs,
    };

    const title = cleanString(parsed.common.title, 500);
    const artist = cleanString(parsed.common.artist, 500);
    const album = cleanString(parsed.common.album, 500);
    const trackNumber = positiveInteger(parsed.common.track?.no);
    const year = validYear(parsed.common.year);

    if (title !== undefined) metadata.title = title;
    if (artist !== undefined) metadata.artist = artist;
    if (album !== undefined) metadata.album = album;
    if (trackNumber !== undefined) metadata.trackNumber = trackNumber;
    if (year !== undefined) metadata.year = year;
    if (container !== undefined) metadata.container = container;
    if (codec !== undefined) metadata.codec = codec;

    return {
      status: "ready",
      metadata,
    };
  }
}
