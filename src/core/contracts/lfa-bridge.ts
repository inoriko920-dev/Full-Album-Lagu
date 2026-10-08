import type {
  ArtworkImportRequest,
  ArtworkImportResult,
} from "./artwork-intake";
import type { FoundationInfo } from "./foundation-info";
import type {
  MediaDiscoveryCancelResult,
  MediaDiscoveryStartResult,
  MediaDiscoveryStatusResult,
} from "./media-discovery";
import type {
  MediaIntakeCancelResult,
  MediaIntakeStartRequest,
  MediaIntakeStartResult,
  MediaIntakeStatusResult,
} from "./media-intake-batch";
import type {
  FolderRelinkOperationResult,
  FolderRelinkRequest,
  MissingMediaScanRequest,
  MissingMediaScanResult,
  SingleRelinkOperationResult,
  SingleRelinkRequest,
} from "./media-relink";
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

import type { TemplateDocument } from "../domain/template-document";
import type { TemplateListResult, TemplateLoadResult, TemplateSaveResult } from "./template-ipc";

export interface LfaBridge {
  /** Optional for legacy test fixtures; Electron preload always exposes these. */
  listTemplates?(): Promise<TemplateListResult>;
  loadTemplate?(templateId: string): Promise<TemplateLoadResult>;
  saveTemplate?(template: TemplateDocument): Promise<TemplateSaveResult>;
  getFoundationInfo(): Promise<FoundationInfo>;
  importArtwork(request: ArtworkImportRequest): Promise<ArtworkImportResult>;
  pickAudioFiles(): Promise<MediaDiscoveryStartResult>;
  pickMediaFolder(): Promise<MediaDiscoveryStartResult>;
  discoverDroppedMedia(
    files: readonly File[],
  ): Promise<MediaDiscoveryStartResult>;
  getMediaDiscoveryStatus(batchId: string): Promise<MediaDiscoveryStatusResult>;
  cancelMediaDiscovery(batchId: string): Promise<MediaDiscoveryCancelResult>;
  startMediaIntake(
    request: MediaIntakeStartRequest,
  ): Promise<MediaIntakeStartResult>;
  getMediaIntakeStatus(batchId: string): Promise<MediaIntakeStatusResult>;
  cancelMediaIntake(batchId: string): Promise<MediaIntakeCancelResult>;
  scanMissingMedia(
    request: MissingMediaScanRequest,
  ): Promise<MissingMediaScanResult>;
  relinkMediaAsset(
    request: SingleRelinkRequest,
  ): Promise<SingleRelinkOperationResult>;
  relinkMissingMediaFolder(
    request: FolderRelinkRequest,
  ): Promise<FolderRelinkOperationResult>;
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
