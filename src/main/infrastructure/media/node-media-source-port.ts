import { lstat, realpath, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type {
  MediaSourceInspection,
  MediaSourcePort,
} from "../../../core/application/ports/media-source-port";

function safeName(sourcePath: string): string {
  const name = basename(sourcePath).trim();
  return name || "media";
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

export class NodeMediaSourcePort implements MediaSourcePort {
  async inspect(sourcePath: string): Promise<MediaSourceInspection> {
    const resolved = resolve(sourcePath);

    try {
      const linkInfo = await lstat(resolved);
      if (linkInfo.isSymbolicLink()) {
        return {
          status: "unreadable",
          message: "Media reference is not a regular file.",
        };
      }

      const canonicalPath = await realpath(resolved);
      const info = await stat(canonicalPath);
      if (!info.isFile()) {
        return {
          status: "unreadable",
          message: "Media reference is not a regular file.",
        };
      }

      return {
        status: "found",
        source: {
          sourcePath: canonicalPath,
          fileName: safeName(canonicalPath),
          sizeBytes: info.size,
        },
      };
    } catch (error) {
      if (nodeErrorCode(error) === "ENOENT") {
        return { status: "missing" };
      }

      return {
        status: "unreadable",
        message: "Media reference could not be read.",
      };
    }
  }
}
