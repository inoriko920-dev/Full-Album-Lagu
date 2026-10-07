import { lstat, readdir, realpath, stat } from "node:fs/promises";
import { basename, join, normalize, resolve } from "node:path";
import type {
  MediaDiscoveryEntry,
  MediaDiscoveryPort,
} from "../../../core/application/ports/media-discovery-port";

function stableCompare(left: string, right: string): number {
  const leftFolded = left.toLocaleLowerCase("en-US");
  const rightFolded = right.toLocaleLowerCase("en-US");

  if (leftFolded < rightFolded) return -1;
  if (leftFolded > rightFolded) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function identityKey(canonicalPath: string): string {
  const normalized = normalize(canonicalPath).replaceAll("\\", "/");
  return process.platform === "win32"
    ? normalized.toLocaleLowerCase("en-US")
    : normalized;
}

function safeName(sourcePath: string): string {
  const name = basename(sourcePath).trim();
  return name || "media";
}

export class NodeMediaDiscoveryPort implements MediaDiscoveryPort {
  async inspectPath(sourcePath: string): Promise<MediaDiscoveryEntry> {
    const resolved = resolve(sourcePath);

    try {
      const linkInfo = await lstat(resolved);
      if (linkInfo.isSymbolicLink()) {
        return {
          kind: "other",
          identityKey: identityKey(resolved),
          fileName: safeName(resolved),
        };
      }

      const canonicalPath = await realpath(resolved);
      const info = await stat(canonicalPath);
      const key = identityKey(canonicalPath);

      if (info.isFile()) {
        return {
          kind: "file",
          identityKey: key,
          source: {
            sourcePath: canonicalPath,
            fileName: safeName(canonicalPath),
            sizeBytes: info.size,
          },
        };
      }

      if (info.isDirectory()) {
        return {
          kind: "directory",
          identityKey: key,
          sourcePath: canonicalPath,
          fileName: safeName(canonicalPath),
        };
      }

      return {
        kind: "other",
        identityKey: key,
        fileName: safeName(canonicalPath),
      };
    } catch {
      return {
        kind: "unreadable",
        fileName: safeName(resolved),
        message: "A selected media path could not be read.",
      };
    }
  }

  async listDirectory(directoryPath: string): Promise<string[]> {
    const entries = await readdir(directoryPath, { withFileTypes: true });

    return entries
      .filter((entry) => !entry.isSymbolicLink())
      .map((entry) => join(directoryPath, entry.name))
      .sort((left, right) => stableCompare(left, right));
  }
}
