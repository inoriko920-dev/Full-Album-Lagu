import { extname } from "node:path";
import type {
  MediaDiscoveryPort,
} from "../ports/media-discovery-port";
import type {
  MediaProbePort,
} from "../ports/media-probe-port";
import type {
  MediaSourceDescriptor,
  MediaSourcePort,
} from "../ports/media-source-port";
import type {
  AudioMediaMetadata,
  MediaAssetReference,
  MediaKind,
} from "../../domain/media-asset";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";
import type {
  MediaRelinkResult,
  RelinkCandidateSummary,
} from "../../contracts/media-intake";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".bmp",
  ".gif",
  ".tif",
  ".tiff",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".mkv",
  ".webm",
  ".avi",
  ".m4v",
]);

interface ValidatedReplacement {
  source: MediaSourceDescriptor;
  metadata?: AudioMediaMetadata & { durationMs: number };
}

interface ReplacementPatch extends ValidatedReplacement {
  assetId: string;
}

interface FolderCandidate {
  source: MediaSourceDescriptor;
  identityKey: string;
}

interface ScoredCandidate extends ValidatedReplacement {
  score: number;
}

export interface SingleRelinkOutcome {
  result: MediaRelinkResult;
  project?: ProjectDocument;
}

export interface FolderRelinkOutcome {
  project: ProjectDocument;
  results: MediaRelinkResult[];
}

function normalized(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function extensionMatchesKind(fileName: string, kind: MediaKind): boolean {
  const extension = extname(fileName).toLocaleLowerCase("en-US");
  if (kind === "image") return IMAGE_EXTENSIONS.has(extension);
  if (kind === "video") return VIDEO_EXTENSIONS.has(extension);
  return true;
}

function durationMatches(
  expectedDurationMs: number | undefined,
  actualDurationMs: number | undefined,
): boolean {
  if (
    expectedDurationMs === undefined ||
    actualDurationMs === undefined ||
    expectedDurationMs <= 0 ||
    actualDurationMs <= 0
  ) {
    return false;
  }

  const tolerance = Math.max(1000, Math.round(expectedDurationMs * 0.01));
  return Math.abs(expectedDurationMs - actualDurationMs) <= tolerance;
}

function candidateSummary(candidate: ScoredCandidate): RelinkCandidateSummary {
  const durationMs = candidate.metadata?.durationMs;
  return {
    fileName: candidate.source.fileName,
    sizeBytes: candidate.source.sizeBytes,
    ...(durationMs === undefined ? {} : { durationMs }),
  };
}

function replaceAsset(
  asset: MediaAssetReference,
  replacement: ValidatedReplacement,
): MediaAssetReference {
  const {
    errorCode: _oldError,
    fingerprint: _oldFingerprint,
    metadata: _oldMetadata,
    ...base
  } = asset;

  return {
    ...base,
    sourcePath: replacement.source.sourcePath,
    fileName: replacement.source.fileName,
    sizeBytes: replacement.source.sizeBytes,
    availability: "ready",
    ...(asset.kind === "audio" && replacement.metadata !== undefined
      ? { metadata: replacement.metadata }
      : {}),
  };
}

function applyPatches(
  project: ProjectDocument,
  patches: readonly ReplacementPatch[],
): ProjectDocument {
  if (patches.length === 0) return project;

  const patchesByAssetId = new Map(
    patches.map((patch) => [patch.assetId, patch]),
  );

  const mediaAssets = (project.mediaAssets ?? []).map((asset) => {
    const patch = patchesByAssetId.get(asset.id);
    return patch === undefined ? asset : replaceAsset(asset, patch);
  });

  const tracks = project.tracks.map((track) => {
    if (
      track.audioAssetId === undefined ||
      !patchesByAssetId.has(track.audioAssetId)
    ) {
      return track;
    }

    const patch = patchesByAssetId.get(track.audioAssetId);
    if (patch === undefined) return track;

    return {
      ...track,
      sourcePath: patch.source.sourcePath,
    };
  });

  return projectDocumentSchema.parse({
    ...project,
    revision: project.revision + 1,
    tracks,
    mediaAssets,
  });
}

export class MediaRelinkService {
  constructor(
    private readonly sourcePort: MediaSourcePort,
    private readonly discoveryPort: MediaDiscoveryPort,
    private readonly probePort: MediaProbePort,
  ) {}

  async relinkSingle(
    projectInput: ProjectDocument,
    assetId: string,
    replacementPath: string,
  ): Promise<SingleRelinkOutcome> {
    const project = projectDocumentSchema.parse(projectInput);
    const asset = project.mediaAssets?.find((item) => item.id === assetId);
    if (asset === undefined) {
      return {
        result: {
          status: "error",
          code: "RELINK_FAILED",
          assetId,
          message: "Media asset tidak ditemukan di proyek.",
        },
      };
    }

    const inspection = await this.sourcePort.inspect(replacementPath);
    if (inspection.status !== "found") {
      return {
        result: {
          status: "error",
          code: "RELINK_FAILED",
          assetId,
          message:
            inspection.status === "missing"
              ? "File pengganti tidak ditemukan."
              : "File pengganti tidak dapat dibaca.",
        },
      };
    }

    const validated = await this.validateReplacement(asset, inspection.source);
    if (validated === undefined) {
      return {
        result: {
          status: "error",
          code: "RELINK_FAILED",
          assetId,
          message: "File pengganti tidak valid untuk media ini.",
        },
      };
    }

    const nextProject = applyPatches(project, [
      {
        assetId,
        ...validated,
      },
    ]);

    return {
      result: {
        status: "relinked",
        assetId,
        fileName: validated.source.fileName,
      },
      project: nextProject,
    };
  }

  async relinkFolder(
    projectInput: ProjectDocument,
    folderPath: string,
  ): Promise<FolderRelinkOutcome> {
    const project = projectDocumentSchema.parse(projectInput);
    const candidates = await this.enumerateFolder(folderPath);
    const missingAssets = (project.mediaAssets ?? []).filter(
      (asset) => asset.availability === "missing",
    );

    const patches: ReplacementPatch[] = [];
    const results: MediaRelinkResult[] = [];

    for (const asset of missingAssets) {
      const exactNameCandidates = candidates.filter(
        (candidate) =>
          normalized(candidate.source.fileName) === normalized(asset.fileName),
      );

      const scored: ScoredCandidate[] = [];
      for (const candidate of exactNameCandidates) {
        const validated = await this.validateReplacement(
          asset,
          candidate.source,
        );
        if (validated === undefined) continue;

        let score = 100;
        if (candidate.source.sizeBytes === asset.sizeBytes) score += 40;
        if (
          asset.kind === "audio" &&
          durationMatches(
            asset.metadata?.durationMs,
            validated.metadata?.durationMs,
          )
        ) {
          score += 20;
        }

        if (score >= 120) {
          scored.push({
            ...validated,
            score,
          });
        }
      }

      if (scored.length === 0) {
        results.push({
          status: "no-match",
          code: "RELINK_NO_MATCH",
          assetId: asset.id,
        });
        continue;
      }

      scored.sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        return compareText(
          normalized(left.source.sourcePath),
          normalized(right.source.sourcePath),
        );
      });

      const highestScore = scored[0]?.score;
      const best = scored.filter((candidate) => candidate.score === highestScore);

      if (best.length !== 1) {
        results.push({
          status: "ambiguous",
          code: "RELINK_AMBIGUOUS",
          assetId: asset.id,
          candidates: best.map(candidateSummary),
        });
        continue;
      }

      const winner = best[0];
      if (winner === undefined) {
        results.push({
          status: "no-match",
          code: "RELINK_NO_MATCH",
          assetId: asset.id,
        });
        continue;
      }

      patches.push({
        assetId: asset.id,
        source: winner.source,
        ...(winner.metadata === undefined ? {} : { metadata: winner.metadata }),
      });
      results.push({
        status: "relinked",
        assetId: asset.id,
        fileName: winner.source.fileName,
      });
    }

    return {
      project: applyPatches(project, patches),
      results,
    };
  }

  private async validateReplacement(
    asset: MediaAssetReference,
    source: MediaSourceDescriptor,
  ): Promise<ValidatedReplacement | undefined> {
    if (!extensionMatchesKind(source.fileName, asset.kind)) {
      return undefined;
    }

    if (asset.kind !== "audio") {
      return { source };
    }

    const probe = await this.probePort.probe(source);
    if (probe.status !== "ready") return undefined;

    return {
      source,
      metadata: probe.metadata,
    };
  }

  private async enumerateFolder(folderPath: string): Promise<FolderCandidate[]> {
    const root = await this.discoveryPort.inspectPath(folderPath);
    if (root.kind !== "directory") {
      throw new Error("Relink folder is not a readable directory.");
    }

    const queue = [root.sourcePath];
    const seenDirectories = new Set([root.identityKey]);
    const seenFiles = new Set<string>();
    const files: FolderCandidate[] = [];

    while (queue.length > 0) {
      const directory = queue.shift();
      if (directory === undefined) break;

      const children = await this.discoveryPort.listDirectory(directory);
      for (const childPath of children) {
        const entry = await this.discoveryPort.inspectPath(childPath);
        if (entry.kind === "file") {
          if (seenFiles.has(entry.identityKey)) continue;
          seenFiles.add(entry.identityKey);
          files.push({
            identityKey: entry.identityKey,
            source: entry.source,
          });
          continue;
        }

        if (entry.kind === "directory") {
          if (seenDirectories.has(entry.identityKey)) continue;
          seenDirectories.add(entry.identityKey);
          queue.push(entry.sourcePath);
        }
      }

      queue.sort((left, right) =>
        compareText(normalized(left), normalized(right)),
      );
    }

    files.sort((left, right) =>
      compareText(
        normalized(left.source.sourcePath),
        normalized(right.source.sourcePath),
      ),
    );

    return files;
  }
}
