import type { MediaSourcePort } from "../ports/media-source-port";
import type {
  MediaAssetReference,
  MediaIssueCode,
} from "../../domain/media-asset";
import { getProjectMediaReadiness } from "../../domain/media-readiness";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";

export interface MissingMediaItem {
  assetId: string;
  fileName: string;
  kind: "audio" | "image" | "video";
  required: boolean;
  availability: "missing" | "invalid";
  code: MediaIssueCode;
}

export interface MissingMediaScanOutcome {
  project: ProjectDocument;
  items: MissingMediaItem[];
  readiness: ReturnType<typeof getProjectMediaReadiness>;
}

function withoutErrorCode(
  asset: MediaAssetReference,
): Omit<MediaAssetReference, "errorCode"> {
  const { errorCode: _ignored, ...rest } = asset;
  return rest;
}

function markFound(asset: MediaAssetReference): MediaAssetReference {
  if (
    asset.availability !== "missing" &&
    !(
      asset.availability === "invalid" &&
      asset.errorCode === "MEDIA_UNREADABLE"
    )
  ) {
    return asset;
  }

  if (
    asset.kind === "audio" &&
    (asset.metadata?.durationMs === undefined ||
      asset.metadata.durationMs <= 0)
  ) {
    return {
      ...asset,
      availability: "invalid",
      errorCode: "MEDIA_PROBE_FAILED",
    };
  }

  return {
    ...withoutErrorCode(asset),
    availability: "ready",
  };
}

function markMissing(asset: MediaAssetReference): MediaAssetReference {
  return {
    ...asset,
    availability: "missing",
    errorCode: "MEDIA_NOT_FOUND",
  };
}

function markUnreadable(asset: MediaAssetReference): MediaAssetReference {
  return {
    ...asset,
    availability: "invalid",
    errorCode: "MEDIA_UNREADABLE",
  };
}

async function mapBounded<T, R>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  if (values.length === 0) return [];

  const results = new Array<R>(values.length);
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      results[index] = await worker(values[index] as T);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => runWorker(),
    ),
  );

  return results;
}

export class MissingMediaService {
  constructor(
    private readonly sourcePort: MediaSourcePort,
    private readonly concurrency = 8,
  ) {
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) {
      throw new Error("Missing-media concurrency must be between 1 and 32.");
    }
  }

  async scan(projectInput: ProjectDocument): Promise<MissingMediaScanOutcome> {
    const project = projectDocumentSchema.parse(projectInput);
    const assets = project.mediaAssets ?? [];

    const nextAssets = await mapBounded(
      assets,
      this.concurrency,
      async (asset) => {
        const inspection = await this.sourcePort.inspect(asset.sourcePath);

        if (inspection.status === "missing") return markMissing(asset);
        if (inspection.status === "unreadable") return markUnreadable(asset);
        return markFound(asset);
      },
    );

    const scannedProject = projectDocumentSchema.parse({
      ...project,
      ...(project.mediaAssets === undefined
        ? {}
        : { mediaAssets: nextAssets }),
    });

    const items = nextAssets
      .filter(
        (
          asset,
        ): asset is MediaAssetReference & {
          availability: "missing" | "invalid";
          errorCode: MediaIssueCode;
        } =>
          (asset.availability === "missing" ||
            asset.availability === "invalid") &&
          asset.errorCode !== undefined,
      )
      .map<MissingMediaItem>((asset) => ({
        assetId: asset.id,
        fileName: asset.fileName,
        kind: asset.kind,
        required: asset.required,
        availability: asset.availability,
        code: asset.errorCode,
      }));

    return {
      project: scannedProject,
      items,
      readiness: getProjectMediaReadiness(scannedProject),
    };
  }
}
