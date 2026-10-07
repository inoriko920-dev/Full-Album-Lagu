import type { FoundationInfo } from "./foundation-info";
import type {
  MediaDiscoveryCancelResult,
  MediaDiscoveryStartResult,
  MediaDiscoveryStatusResult,
} from "./media-discovery";
import type {
  AutosaveRecoveryRequest,
  AutosaveRecoveryResult,
  RecoveryAcceptRequest,
  RecoveryAcceptResult,
  RecoveryDiscardRequest,
  RecoveryDiscardResult,
  RecoveryStatusRequest,
  RecoveryStatusResult,
} from "./project-recovery";
import type {
  OpenProjectResult,
  SaveProjectRequest,
  SaveProjectResult,
  StartupProjectResult,
} from "./project-persistence";

export interface LfaBridge {
  getFoundationInfo(): Promise<FoundationInfo>;
  pickAudioFiles(): Promise<MediaDiscoveryStartResult>;
  pickMediaFolder(): Promise<MediaDiscoveryStartResult>;
  discoverDroppedMedia(
    files: readonly File[],
  ): Promise<MediaDiscoveryStartResult>;
  getMediaDiscoveryStatus(
    batchId: string,
  ): Promise<MediaDiscoveryStatusResult>;
  cancelMediaDiscovery(batchId: string): Promise<MediaDiscoveryCancelResult>;
  saveProject(request: SaveProjectRequest): Promise<SaveProjectResult>;
  saveProjectAs(request: SaveProjectRequest): Promise<SaveProjectResult>;
  openProject(): Promise<OpenProjectResult>;
  getStartupProject(): Promise<StartupProjectResult>;
  autosaveProject(
    request: AutosaveRecoveryRequest,
  ): Promise<AutosaveRecoveryResult>;
  getRecoveryStatus(
    request: RecoveryStatusRequest,
  ): Promise<RecoveryStatusResult>;
  acceptRecovery(request: RecoveryAcceptRequest): Promise<RecoveryAcceptResult>;
  discardRecovery(
    request: RecoveryDiscardRequest,
  ): Promise<RecoveryDiscardResult>;
}
