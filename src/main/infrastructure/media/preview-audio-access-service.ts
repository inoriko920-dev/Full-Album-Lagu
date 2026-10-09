import { randomBytes } from "node:crypto";
import type { MediaSourceDescriptor } from "../../../core/application/ports/media-source-port";
import { NodePreviewAudioLeaseStore } from "./node-preview-audio-lease-store";
import { PREVIEW_AUDIO_SCHEME } from "./preview-audio-protocol";

export interface TrustedIntakeLookup {
  getTrustedAudioSource(
    batchId: string,
    projectId: string,
    assetId: string,
  ): MediaSourceDescriptor | null;
  retainTrustedAudioBatch?(batchId: string, projectId: string): boolean;
  releaseTrustedAudioBatch?(batchId: string): void;
}

interface BoundIntake {
  readonly ownerWebContentsId: number;
  readonly projectId: string;
  readonly batchId: string;
}

export interface PreviewAudioIssueRequest {
  readonly ownerWebContentsId: number;
  readonly batchId: string;
  readonly projectId: string;
  readonly assetId: string;
}

/**
 * Trust transitions happen only in Electron main:
 * OS picker -> main discovery -> main intake -> probed-ready asset -> token.
 *
 * Renderer-supplied paths, dropped paths, recovered ProjectDocument assets,
 * and batches from another window cannot mint a preview audio lease.
 */
export class PreviewAudioAccessService {
  private readonly selected = new Map<string, number>();
  private readonly intake = new Map<string, BoundIntake>();
  private readonly relink = new Map<
    string,
    { bound: BoundIntake; sources: Map<string, MediaSourceDescriptor> }
  >();
  private readonly activeProjects = new Map<number, string>();
  // A new same-project intake can preserve its old batch provenance while
  // invalidating all grants issued before that intake. An epoch also fences
  // grants that are still waiting for async filesystem verification.
  private readonly grantEpoch = new Map<number, number>();

  constructor(
    private readonly store: NodePreviewAudioLeaseStore,
    private readonly sources: TrustedIntakeLookup,
  ) {}

  trustPickerDiscovery(
    ownerWebContentsId: number,
    discoveryBatchId: string,
  ): void {
    this.selected.set(discoveryBatchId, ownerWebContentsId);
  }

  bindIntake(
    ownerWebContentsId: number,
    discoveryBatchId: string,
    batchId: string,
    projectId: string,
  ): boolean {
    if (this.selected.get(discoveryBatchId) !== ownerWebContentsId) {
      return false;
    }
    if (this.sources.retainTrustedAudioBatch?.(batchId, projectId) === false) {
      return false;
    }

    this.selected.delete(discoveryBatchId);
    if (this.activeProjects.get(ownerWebContentsId) === projectId) {
      // Preserve same-project batch provenance, but invalidate old streams
      // AND asynchronous grants still in flight before this new picker.
      this.invalidateGrants(ownerWebContentsId);
    } else {
      // Different project or a stale window loses ALL prior authority.
      this.revokeWindow(ownerWebContentsId);
    }
    this.intake.set(batchId, { ownerWebContentsId, projectId, batchId });
    this.activeProjects.set(ownerWebContentsId, projectId);
    return true;
  }

  /**
   * Called ONLY by Electron main after an OS-picked file/folder was inspected
   * and probed by MediaRelinkService. It authorizes ONLY the relinked asset IDs,
   * not any untouched or saved ProjectDocument sourcePath.
   */
  trustRelinkedSources(
    ownerWebContentsId: number,
    projectId: string,
    entries: readonly { assetId: string; source: MediaSourceDescriptor }[],
  ): string | null {
    this.revokeWindow(ownerWebContentsId);
    if (!projectId || entries.length === 0) return null;
    const sources = new Map<string, MediaSourceDescriptor>();
    for (const entry of entries) {
      if (entry.assetId && entry.source.sourcePath) {
        sources.set(entry.assetId, { ...entry.source });
      }
    }
    if (sources.size === 0) return null;
    const batchId = `relink-${randomBytes(20).toString("hex")}`;
    const bound = { ownerWebContentsId, projectId, batchId };
    this.relink.set(batchId, { bound, sources });
    this.activeProjects.set(ownerWebContentsId, projectId);
    return batchId;
  }

  context(ownerWebContentsId: number): {
    projectId: string;
    ownerWebContentsId: number;
  } | null {
    const projectId = this.activeProjects.get(ownerWebContentsId);
    return projectId === undefined ? null : { projectId, ownerWebContentsId };
  }

  private invalidateGrants(ownerWebContentsId: number): void {
    this.grantEpoch.set(
      ownerWebContentsId,
      (this.grantEpoch.get(ownerWebContentsId) ?? 0) + 1,
    );
    this.store.revokeWindow(ownerWebContentsId);
  }

  async issue(request: PreviewAudioIssueRequest): Promise<string | null> {
    const trustedImport = this.intake.get(request.batchId);
    const trustedRelink = this.relink.get(request.batchId);
    const bound = trustedImport ?? trustedRelink?.bound;
    if (
      bound === undefined ||
      bound.ownerWebContentsId !== request.ownerWebContentsId ||
      bound.projectId !== request.projectId ||
      this.activeProjects.get(request.ownerWebContentsId) !== request.projectId
    ) {
      return null;
    }

    const epoch = this.grantEpoch.get(request.ownerWebContentsId) ?? 0;
    const source =
      trustedImport === undefined
        ? (trustedRelink?.sources.get(request.assetId) ?? null)
        : this.sources.getTrustedAudioSource(
            request.batchId,
            request.projectId,
            request.assetId,
          );
    if (source === null) return null;

    try {
      const token = await this.store.issueTrustedGrant({
        projectId: request.projectId,
        assetId: request.assetId,
        ownerWebContentsId: request.ownerWebContentsId,
        sourcePath: source.sourcePath,
      });

      // A slow filesystem probe must never resurrect a revoked project.
      if (
        (trustedImport !== undefined
          ? this.intake.get(request.batchId) !== bound
          : this.relink.get(request.batchId) !== trustedRelink) ||
        this.activeProjects.get(request.ownerWebContentsId) !==
          request.projectId ||
        (this.grantEpoch.get(request.ownerWebContentsId) ?? 0) !== epoch
      ) {
        this.store.revoke(token);
        return null;
      }

      return `${PREVIEW_AUDIO_SCHEME}://media/${token}`;
    } catch {
      return null;
    }
  }

  revokeWindow(ownerWebContentsId: number): void {
    this.invalidateGrants(ownerWebContentsId);
    this.activeProjects.delete(ownerWebContentsId);
    for (const [batchId, owner] of this.selected) {
      if (owner === ownerWebContentsId) this.selected.delete(batchId);
    }
    for (const [batchId, bound] of this.intake) {
      if (bound.ownerWebContentsId === ownerWebContentsId) {
        this.intake.delete(batchId);
        this.sources.releaseTrustedAudioBatch?.(batchId);
      }
    }
    for (const [batchId, entry] of this.relink) {
      if (entry.bound.ownerWebContentsId === ownerWebContentsId) {
        this.relink.delete(batchId);
      }
    }
    // All old bound-intake identities are gone; don't retain an epoch entry
    // for a BrowserWindow that may never exist again.
    this.grantEpoch.delete(ownerWebContentsId);
  }

  close(): void {
    this.store.close();
    this.selected.clear();
    this.intake.clear();
    this.relink.clear();
    this.activeProjects.clear();
    this.grantEpoch.clear();
  }
}
