import type { MediaSourceDescriptor } from "../../../core/application/ports/media-source-port";
import { NodePreviewAudioLeaseStore } from "./node-preview-audio-lease-store";
import { PREVIEW_AUDIO_SCHEME } from "./preview-audio-protocol";

export interface TrustedIntakeLookup {
  getTrustedAudioSource(
    batchId: string,
    projectId: string,
    assetId: string,
  ): MediaSourceDescriptor | null;
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
  private readonly activeProjects = new Map<number, string>();

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

    this.selected.delete(discoveryBatchId);
    this.revokeWindow(ownerWebContentsId);
    this.intake.set(batchId, { ownerWebContentsId, projectId, batchId });
    this.activeProjects.set(ownerWebContentsId, projectId);
    return true;
  }

  context(ownerWebContentsId: number): {
    projectId: string;
    ownerWebContentsId: number;
  } | null {
    const projectId = this.activeProjects.get(ownerWebContentsId);
    return projectId === undefined ? null : { projectId, ownerWebContentsId };
  }

  async issue(request: PreviewAudioIssueRequest): Promise<string | null> {
    const bound = this.intake.get(request.batchId);
    if (
      bound === undefined ||
      bound.ownerWebContentsId !== request.ownerWebContentsId ||
      bound.projectId !== request.projectId ||
      this.activeProjects.get(request.ownerWebContentsId) !== request.projectId
    ) {
      return null;
    }

    const source = this.sources.getTrustedAudioSource(
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
        this.intake.get(request.batchId) !== bound ||
        this.activeProjects.get(request.ownerWebContentsId) !==
          request.projectId
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
    this.store.revokeWindow(ownerWebContentsId);
    this.activeProjects.delete(ownerWebContentsId);
    for (const [batchId, owner] of this.selected) {
      if (owner === ownerWebContentsId) this.selected.delete(batchId);
    }
    for (const [batchId, bound] of this.intake) {
      if (bound.ownerWebContentsId === ownerWebContentsId) {
        this.intake.delete(batchId);
      }
    }
  }

  close(): void {
    this.store.close();
    this.selected.clear();
    this.intake.clear();
    this.activeProjects.clear();
  }
}
