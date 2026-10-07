import type { MediaDiscoveryPort } from "../ports/media-discovery-port";
import type { MediaSourceDescriptor } from "../ports/media-source-port";
import type {
  MediaDiscoveryCancelResult,
  MediaDiscoveryIssue,
  MediaDiscoveryProgress,
  MediaDiscoveryStatusResult,
  MediaDiscoverySummary,
} from "../../contracts/media-discovery";

interface DiscoveryWorkItem {
  sourcePath: string;
  isRoot: boolean;
}

interface DiscoveredSource {
  discoveryId: string;
  identityKey: string;
  source: MediaSourceDescriptor;
}

export interface DiscoveredMediaSource {
  discoveryId: string;
  source: MediaSourceDescriptor;
}

type BatchTerminalStatus = "completed" | "cancelled" | "error";

interface BatchState {
  batchId: string;
  controller: AbortController;
  rootsSelected: number;
  status: "discovering" | BatchTerminalStatus;
  progress: MediaDiscoveryProgress;
  issues: MediaDiscoveryIssue[];
  sources: DiscoveredSource[];
  seenFiles: Set<string>;
  seenDirectories: Set<string>;
  errorMessage?: string;
}

class MediaDiscoveryCancelledError extends Error {
  constructor() {
    super("Media discovery was cancelled.");
    this.name = "MediaDiscoveryCancelledError";
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

async function mapBounded<T, R>(
  values: readonly T[],
  concurrency: number,
  signal: AbortSignal,
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  if (values.length === 0) return [];

  const results = new Array<R>(values.length);
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (true) {
      if (signal.aborted) throw new MediaDiscoveryCancelledError();
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;

      const result = await worker(values[index] as T);
      if (signal.aborted) throw new MediaDiscoveryCancelledError();
      results[index] = result;
    }
  };

  const workerCount = Math.min(concurrency, values.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}

export class MediaDiscoveryService {
  private readonly batches = new Map<string, BatchState>();

  constructor(
    private readonly port: MediaDiscoveryPort,
    private readonly batchIdFactory: () => string,
    private readonly concurrency = 4,
  ) {
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) {
      throw new Error("Media discovery concurrency must be between 1 and 32.");
    }
  }

  start(sourcePaths: readonly string[]): { batchId: string } {
    const paths = sourcePaths.filter((path) => path.length > 0);
    if (paths.length === 0) {
      throw new Error("At least one media source path is required.");
    }

    this.pruneTerminalBatches();

    const batchId = this.batchIdFactory();
    if (!batchId || this.batches.has(batchId)) {
      throw new Error("Media discovery batch ID must be unique.");
    }

    const state: BatchState = {
      batchId,
      controller: new AbortController(),
      rootsSelected: paths.length,
      status: "discovering",
      progress: {
        rootsTotal: paths.length,
        rootsProcessed: 0,
        directoriesVisited: 0,
        filesDiscovered: 0,
        duplicatesSkipped: 0,
        pendingEntries: paths.length,
      },
      issues: [],
      sources: [],
      seenFiles: new Set<string>(),
      seenDirectories: new Set<string>(),
    };

    this.batches.set(batchId, state);
    void this.runBatch(state, paths);

    return { batchId };
  }

  cancel(batchId: string): MediaDiscoveryCancelResult {
    const state = this.batches.get(batchId);
    if (!state || state.status !== "discovering") {
      return { status: "not-running", batchId };
    }

    state.controller.abort();
    return { status: "cancel-requested", batchId };
  }

  getStatus(batchId: string): MediaDiscoveryStatusResult {
    const state = this.batches.get(batchId);
    if (!state) {
      return {
        status: "error",
        batchId,
        code: "MEDIA_DISCOVERY_FAILED",
        message: "Media discovery batch was not found.",
      };
    }

    if (state.status === "discovering") {
      return {
        status: "discovering",
        batchId,
        progress: { ...state.progress },
      };
    }

    const summary = this.toSummary(state);

    if (state.status === "completed") {
      return { status: "completed", batchId, summary };
    }

    if (state.status === "cancelled") {
      return {
        status: "cancelled",
        batchId,
        code: "MEDIA_IMPORT_CANCELLED",
        summary,
      };
    }

    return {
      status: "error",
      batchId,
      code: "MEDIA_DISCOVERY_FAILED",
      message: state.errorMessage ?? "Media discovery failed.",
      summary,
    };
  }

  getDiscoveredSources(batchId: string): readonly DiscoveredMediaSource[] {
    const state = this.batches.get(batchId);
    if (!state) return [];

    return state.sources.map(({ discoveryId, source }) => ({
      discoveryId,
      source: { ...source },
    }));
  }

  private async runBatch(
    state: BatchState,
    sourcePaths: readonly string[],
  ): Promise<void> {
    try {
      let frontier: DiscoveryWorkItem[] = sourcePaths
        .map((sourcePath) => ({ sourcePath, isRoot: true }))
        .sort((left, right) => compareText(left.sourcePath, right.sourcePath));

      while (frontier.length > 0) {
        this.throwIfCancelled(state);
        state.progress.pendingEntries = frontier.length;

        const current = [...frontier].sort((left, right) =>
          compareText(left.sourcePath, right.sourcePath),
        );

        const inspected = await mapBounded(
          current,
          this.concurrency,
          state.controller.signal,
          async (item) => ({
            item,
            entry: await this.port.inspectPath(item.sourcePath),
          }),
        );

        const directoriesToRead: {
          sourcePath: string;
          identityKey: string;
        }[] = [];

        for (const { item, entry } of inspected) {
          this.throwIfCancelled(state);
          if (item.isRoot) state.progress.rootsProcessed += 1;

          if (entry.kind === "unreadable") {
            state.issues.push({
              fileName: entry.fileName,
              code: "MEDIA_DISCOVERY_FAILED",
              message: entry.message,
            });
            continue;
          }

          if (entry.kind === "other") continue;

          if (entry.kind === "file") {
            if (state.seenFiles.has(entry.identityKey)) {
              state.progress.duplicatesSkipped += 1;
              continue;
            }

            state.seenFiles.add(entry.identityKey);
            const discoveryId = `${state.batchId}:item:${String(
              state.sources.length + 1,
            ).padStart(6, "0")}`;
            state.sources.push({
              discoveryId,
              identityKey: entry.identityKey,
              source: entry.source,
            });
            state.progress.filesDiscovered = state.sources.length;
            continue;
          }

          if (state.seenDirectories.has(entry.identityKey)) {
            state.progress.duplicatesSkipped += 1;
            continue;
          }

          state.seenDirectories.add(entry.identityKey);
          state.progress.directoriesVisited += 1;
          directoriesToRead.push({
            sourcePath: entry.sourcePath,
            identityKey: entry.identityKey,
          });
        }

        const childGroups = await mapBounded(
          directoriesToRead,
          this.concurrency,
          state.controller.signal,
          async (directory) => {
            try {
              return await this.port.listDirectory(directory.sourcePath);
            } catch {
              state.issues.push({
                fileName: "folder",
                code: "MEDIA_DISCOVERY_FAILED",
                message: "A selected folder could not be read.",
              });
              return [];
            }
          },
        );

        const childPaths = childGroups.flat().sort(compareText);
        frontier = childPaths.map((sourcePath) => ({
          sourcePath,
          isRoot: false,
        }));
      }

      state.progress.pendingEntries = 0;
      state.status = "completed";
    } catch (error) {
      state.progress.pendingEntries = 0;

      if (
        error instanceof MediaDiscoveryCancelledError ||
        state.controller.signal.aborted
      ) {
        state.status = "cancelled";
        return;
      }

      state.status = "error";
      state.errorMessage = "Media discovery failed safely.";
    }
  }

  private throwIfCancelled(state: BatchState): void {
    if (state.controller.signal.aborted) {
      throw new MediaDiscoveryCancelledError();
    }
  }

  private toSummary(state: BatchState): MediaDiscoverySummary {
    return {
      rootsSelected: state.rootsSelected,
      directoriesVisited: state.progress.directoriesVisited,
      filesDiscovered: state.sources.length,
      duplicatesSkipped: state.progress.duplicatesSkipped,
      issues: state.issues.map((issue) => ({ ...issue })),
      items: state.sources.map(({ discoveryId, source }) => ({
        discoveryId,
        fileName: source.fileName,
        sizeBytes: source.sizeBytes,
      })),
    };
  }

  private pruneTerminalBatches(): void {
    const terminal = [...this.batches.values()].filter(
      (batch) => batch.status !== "discovering",
    );

    if (terminal.length < 20) return;

    for (const batch of terminal.slice(0, terminal.length - 19)) {
      this.batches.delete(batch.batchId);
    }
  }
}
