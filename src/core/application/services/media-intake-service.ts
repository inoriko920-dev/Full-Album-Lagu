import type {
  MediaProbePort,
  MediaProbeResult,
} from "../ports/media-probe-port";
import type { MediaSourceDescriptor } from "../ports/media-source-port";
import type { DiscoveredMediaSource } from "./media-discovery-service";
import type {
  MediaBatchProgress,
  MediaBatchSummary,
  MediaItemReport,
  MediaPublicErrorCode,
} from "../../contracts/media-intake";
import type {
  MediaIntakeCancelResult,
  MediaIntakeStatusResult,
} from "../../contracts/media-intake-batch";
import type {
  AudioMediaMetadata,
  MediaAssetReference,
} from "../../domain/media-asset";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";
import type { MediaDiscoveryStatusResult } from "../../contracts/media-discovery";

export interface MediaDiscoverySourceProvider {
  getStatus(batchId: string): MediaDiscoveryStatusResult;
  getDiscoveredSources(batchId: string): readonly DiscoveredMediaSource[];
}

export interface AudioImportOrderCandidate {
  fileName: string;
  sourceIdentity: string;
  importOrdinal: number;
  metadataTrackNumber?: number;
}

interface ProbedItem {
  discoveryId: string;
  source: MediaSourceDescriptor;
  probe: MediaProbeResult;
  importOrdinal: number;
}

type IntakeStatus =
  "probing" | "committing" | "completed" | "cancelled" | "error";

interface IntakeBatchState {
  batchId: string;
  controller: AbortController;
  status: IntakeStatus;
  baseProject: ProjectDocument;
  sources: DiscoveredMediaSource[];
  progress: MediaBatchProgress;
  probed: Array<ProbedItem | undefined>;
  completedProject?: ProjectDocument;
  completedSummary?: MediaBatchSummary;
  errorCode?: MediaPublicErrorCode;
  errorMessage?: string;
}

class MediaIntakeCancelledError extends Error {
  constructor() {
    super("Media intake was cancelled.");
    this.name = "MediaIntakeCancelledError";
  }
}

export class MediaIntakeStartError extends Error {
  constructor(
    readonly code: MediaPublicErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MediaIntakeStartError";
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizedText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function validTrackNumber(value: number | undefined): number | undefined {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value : undefined;
}

export function extractFilenameOrderNumber(
  fileName: string,
): number | undefined {
  const stem = fileName.replace(/\.[^.]+$/, "").trim();
  const direct = stem.match(/^0*(\d{1,4})(?=$|[\s._-])/);
  if (direct?.[1]) {
    const value = Number.parseInt(direct[1], 10);
    return value > 0 ? value : undefined;
  }

  const trackPrefix = stem.match(/^(?:track|trk)\s*0*(\d{1,4})(?=$|[\s._-])/i);
  if (trackPrefix?.[1]) {
    const value = Number.parseInt(trackPrefix[1], 10);
    return value > 0 ? value : undefined;
  }

  return undefined;
}

export function compareAudioImportOrder(
  left: AudioImportOrderCandidate,
  right: AudioImportOrderCandidate,
): number {
  const leftNumber =
    validTrackNumber(left.metadataTrackNumber) ??
    extractFilenameOrderNumber(left.fileName);
  const rightNumber =
    validTrackNumber(right.metadataTrackNumber) ??
    extractFilenameOrderNumber(right.fileName);

  if (leftNumber !== undefined || rightNumber !== undefined) {
    if (leftNumber === undefined) return 1;
    if (rightNumber === undefined) return -1;
    if (leftNumber !== rightNumber) return leftNumber - rightNumber;
  }

  const fileCompare = compareText(
    normalizedText(left.fileName),
    normalizedText(right.fileName),
  );
  if (fileCompare !== 0) return fileCompare;

  const identityCompare = compareText(
    normalizedText(left.sourceIdentity),
    normalizedText(right.sourceIdentity),
  );
  if (identityCompare !== 0) return identityCompare;

  return left.importOrdinal - right.importOrdinal;
}

function fallbackTrackTitle(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "").trim();
  return stem || fileName;
}

function toOrderCandidate(item: ProbedItem): AudioImportOrderCandidate {
  const candidate: AudioImportOrderCandidate = {
    fileName: item.source.fileName,
    sourceIdentity: item.source.sourcePath,
    importOrdinal: item.importOrdinal,
  };
  const trackNumber =
    item.probe.status === "ready" ? item.probe.metadata.trackNumber : undefined;
  if (trackNumber !== undefined) candidate.metadataTrackNumber = trackNumber;
  return candidate;
}

function reportForProbe(item: ProbedItem, assetId?: string): MediaItemReport {
  if (item.probe.status === "ready") {
    return {
      assetId,
      fileName: item.source.fileName,
      kind: "audio",
      status: "ready",
    };
  }

  if (item.probe.status === "unsupported") {
    return {
      fileName: item.source.fileName,
      kind: "audio",
      status: "unsupported",
      code: item.probe.code,
      message: item.probe.message,
    };
  }

  return {
    assetId,
    fileName: item.source.fileName,
    kind: "audio",
    status: "invalid",
    code: item.probe.code,
    message: item.probe.message,
  };
}

async function runBounded<T>(
  values: readonly T[],
  concurrency: number,
  signal: AbortSignal,
  worker: (value: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (true) {
      if (signal.aborted) throw new MediaIntakeCancelledError();
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;

      await worker(values[index] as T, index);
      if (signal.aborted) throw new MediaIntakeCancelledError();
    }
  };

  const workerCount = Math.min(concurrency, Math.max(1, values.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
}

export class MediaIntakeService {
  private readonly batches = new Map<string, IntakeBatchState>();

  constructor(
    private readonly discovery: MediaDiscoverySourceProvider,
    private readonly probePort: MediaProbePort,
    private readonly idFactory: () => string,
    private readonly concurrency = 4,
  ) {
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) {
      throw new Error("Media intake concurrency must be between 1 and 32.");
    }
  }

  start(
    discoveryBatchId: string,
    project: ProjectDocument,
  ): { batchId: string } {
    const discoveryStatus = this.discovery.getStatus(discoveryBatchId);
    if (discoveryStatus.status !== "completed") {
      throw new MediaIntakeStartError(
        "MEDIA_DISCOVERY_FAILED",
        "Media discovery must complete before audio probing starts.",
      );
    }

    const baseProject = projectDocumentSchema.parse(project);
    const sources = this.discovery
      .getDiscoveredSources(discoveryBatchId)
      .map(({ discoveryId, source }) => ({
        discoveryId,
        source: { ...source },
      }));

    this.pruneTerminalBatches();

    const batchId = this.idFactory();
    if (!batchId || this.batches.has(batchId)) {
      throw new MediaIntakeStartError(
        "MEDIA_PROBE_FAILED",
        "Media intake batch ID must be unique.",
      );
    }

    const state: IntakeBatchState = {
      batchId,
      controller: new AbortController(),
      status: "probing",
      baseProject,
      sources,
      progress: {
        discovered: sources.length,
        processed: 0,
        accepted: 0,
        rejected: 0,
      },
      probed: new Array<ProbedItem | undefined>(sources.length),
    };

    this.batches.set(batchId, state);
    void this.runBatch(state);

    return { batchId };
  }

  cancel(batchId: string): MediaIntakeCancelResult {
    const state = this.batches.get(batchId);
    if (
      !state ||
      (state.status !== "probing" && state.status !== "committing")
    ) {
      return { status: "not-running", batchId };
    }

    state.controller.abort();
    return { status: "cancel-requested", batchId };
  }

  getStatus(batchId: string): MediaIntakeStatusResult {
    const state = this.batches.get(batchId);
    if (!state) {
      return {
        status: "error",
        batchId,
        code: "MEDIA_PROBE_FAILED",
        message: "Media intake batch was not found.",
      };
    }

    if (state.status === "probing" || state.status === "committing") {
      return {
        status: state.status,
        batchId,
        progress: { ...state.progress },
      };
    }

    if (state.status === "completed") {
      return {
        status: "completed",
        batchId,
        progress: { ...state.progress },
        summary: state.completedSummary as MediaBatchSummary,
        project: state.completedProject as ProjectDocument,
      };
    }

    const summary = this.summaryFromCurrentProbes(state);

    if (state.status === "cancelled") {
      return {
        status: "cancelled",
        batchId,
        code: "MEDIA_IMPORT_CANCELLED",
        progress: { ...state.progress },
        summary,
      };
    }

    return {
      status: "error",
      batchId,
      code: state.errorCode ?? "MEDIA_PROBE_FAILED",
      message: state.errorMessage ?? "Media intake failed safely.",
      progress: { ...state.progress },
      summary,
    };
  }

  private async runBatch(state: IntakeBatchState): Promise<void> {
    try {
      await runBounded(
        state.sources,
        this.concurrency,
        state.controller.signal,
        async (entry, index) => {
          const probe = await this.probePort.probe(entry.source);
          if (state.controller.signal.aborted) {
            throw new MediaIntakeCancelledError();
          }

          const item: ProbedItem = {
            discoveryId: entry.discoveryId,
            source: { ...entry.source },
            probe,
            importOrdinal: index,
          };
          state.probed[index] = item;
          state.progress.processed += 1;

          if (probe.status === "ready") state.progress.accepted += 1;
          else state.progress.rejected += 1;
        },
      );

      this.throwIfCancelled(state);
      state.status = "committing";

      const { project, summary } = this.commitProbedItems(state);
      this.throwIfCancelled(state);

      state.completedProject = project;
      state.completedSummary = summary;
      state.status = "completed";
    } catch (error) {
      if (
        error instanceof MediaIntakeCancelledError ||
        state.controller.signal.aborted
      ) {
        state.status = "cancelled";
        return;
      }

      state.status = "error";
      state.errorCode = "MEDIA_PROBE_FAILED";
      state.errorMessage = "Media probing failed safely.";
    }
  }

  private commitProbedItems(state: IntakeBatchState): {
    project: ProjectDocument;
    summary: MediaBatchSummary;
  } {
    const sorted = state.probed
      .filter((item): item is ProbedItem => item !== undefined)
      .sort((left, right) =>
        compareAudioImportOrder(
          toOrderCandidate(left),
          toOrderCandidate(right),
        ),
      );

    const existingAssets = [...(state.baseProject.mediaAssets ?? [])];
    const existingTracks = [...state.baseProject.tracks];
    const assetIds = new Set(existingAssets.map((asset) => asset.id));
    const trackIds = new Set(existingTracks.map((track) => track.id));
    const reports: MediaItemReport[] = [];
    let committedCount = 0;

    for (const item of sorted) {
      if (item.probe.status === "unsupported") {
        reports.push(reportForProbe(item));
        continue;
      }

      const assetId = this.nextUniqueId(assetIds);
      const trackId = this.nextUniqueId(trackIds);
      assetIds.add(assetId);
      trackIds.add(trackId);

      let asset: MediaAssetReference;
      let title = fallbackTrackTitle(item.source.fileName);

      if (item.probe.status === "ready") {
        const metadata: AudioMediaMetadata & { durationMs: number } = {
          ...item.probe.metadata,
        };
        asset = {
          id: assetId,
          kind: "audio",
          required: true,
          sourcePath: item.source.sourcePath,
          fileName: item.source.fileName,
          sizeBytes: item.source.sizeBytes,
          availability: "ready",
          metadata,
        };
        title = metadata.title ?? title;
      } else {
        asset = {
          id: assetId,
          kind: "audio",
          required: true,
          sourcePath: item.source.sourcePath,
          fileName: item.source.fileName,
          sizeBytes: item.source.sizeBytes,
          availability: "invalid",
          errorCode: item.probe.code,
        };
      }

      existingAssets.push(asset);
      existingTracks.push({
        id: trackId,
        title,
        sourcePath: item.source.sourcePath,
        audioAssetId: assetId,
      });
      reports.push(reportForProbe(item, assetId));
      committedCount += 1;
    }

    const project = projectDocumentSchema.parse({
      ...state.baseProject,
      revision:
        committedCount > 0
          ? state.baseProject.revision + 1
          : state.baseProject.revision,
      tracks: existingTracks,
      ...(existingAssets.length > 0 ? { mediaAssets: existingAssets } : {}),
    });

    return {
      project,
      summary: {
        discovered: state.progress.discovered,
        accepted: state.progress.accepted,
        rejected: state.progress.rejected,
        cancelled: 0,
        items: reports,
      },
    };
  }

  private nextUniqueId(used: Set<string>): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = this.idFactory();
      if (candidate && !used.has(candidate)) return candidate;
    }

    throw new Error("Could not allocate a unique media identifier.");
  }

  private summaryFromCurrentProbes(state: IntakeBatchState): MediaBatchSummary {
    const items = state.probed
      .filter((item): item is ProbedItem => item !== undefined)
      .sort((left, right) =>
        compareAudioImportOrder(
          toOrderCandidate(left),
          toOrderCandidate(right),
        ),
      )
      .map((item) => reportForProbe(item));

    return {
      discovered: state.progress.discovered,
      accepted: state.progress.accepted,
      rejected: state.progress.rejected,
      cancelled: Math.max(
        0,
        state.progress.discovered - state.progress.processed,
      ),
      items,
    };
  }

  private throwIfCancelled(state: IntakeBatchState): void {
    if (state.controller.signal.aborted) {
      throw new MediaIntakeCancelledError();
    }
  }

  private pruneTerminalBatches(): void {
    const terminal = [...this.batches.values()].filter(
      (batch) => batch.status !== "probing" && batch.status !== "committing",
    );

    if (terminal.length < 20) return;

    for (const batch of terminal.slice(0, terminal.length - 19)) {
      this.batches.delete(batch.batchId);
    }
  }
}
