import { ipcRenderer, webUtils } from "electron";
import { PLAYBACK_POWER_CHANNEL } from "../core/contracts/playback-power";
import {
  PREVIEW_AUDIO_ISSUE_CHANNEL,
  previewAudioIssueRequestSchema,
  previewAudioIssueResultSchema,
} from "../core/contracts/preview-audio-ipc";
import {
  ARTWORK_PICK_AND_BIND_CHANNEL,
  artworkImportRequestSchema,
  artworkImportResultSchema,
} from "../core/contracts/artwork-intake";
import {
  FOUNDATION_INFO_CHANNEL,
  foundationInfoSchema,
} from "../core/contracts/foundation-info";
import type { LfaBridge } from "../core/contracts/lfa-bridge";
import {
  MEDIA_DISCOVER_DROPPED_CHANNEL,
  MEDIA_DISCOVERY_CANCEL_CHANNEL,
  MEDIA_DISCOVERY_STATUS_CHANNEL,
  MEDIA_PICK_AUDIO_FILES_CHANNEL,
  MEDIA_PICK_FOLDER_CHANNEL,
  mediaDiscoveryCancelRequestSchema,
  mediaDiscoveryCancelResultSchema,
  mediaDiscoveryPathRequestSchema,
  mediaDiscoveryStartResultSchema,
  mediaDiscoveryStatusRequestSchema,
  mediaDiscoveryStatusResultSchema,
} from "../core/contracts/media-discovery";
import {
  MEDIA_INTAKE_CANCEL_CHANNEL,
  MEDIA_INTAKE_START_CHANNEL,
  MEDIA_INTAKE_STATUS_CHANNEL,
  mediaIntakeCancelRequestSchema,
  mediaIntakeCancelResultSchema,
  mediaIntakeStartRequestSchema,
  mediaIntakeStartResultSchema,
  mediaIntakeStatusRequestSchema,
  mediaIntakeStatusResultSchema,
} from "../core/contracts/media-intake-batch";
import {
  MEDIA_MISSING_SCAN_CHANNEL,
  MEDIA_RELINK_FOLDER_CHANNEL,
  MEDIA_RELINK_SINGLE_CHANNEL,
  folderRelinkOperationResultSchema,
  folderRelinkRequestSchema,
  missingMediaScanRequestSchema,
  missingMediaScanResultSchema,
  singleRelinkOperationResultSchema,
  singleRelinkRequestSchema,
} from "../core/contracts/media-relink";
import {
  PROJECT_AUTOSAVE_CHANNEL,
  PROJECT_RECOVERY_ACCEPT_CHANNEL,
  PROJECT_RECOVERY_DISCARD_CHANNEL,
  PROJECT_RECOVERY_STATUS_CHANNEL,
  autosaveRecoveryRequestSchema,
  autosaveRecoveryResultSchema,
  recoveryAcceptRequestSchema,
  recoveryAcceptResultSchema,
  recoveryDiscardRequestSchema,
  recoveryDiscardResultSchema,
  recoveryStatusRequestSchema,
  recoveryStatusResultSchema,
} from "../core/contracts/project-recovery";
import {
  PROJECT_OPEN_CHANNEL,
  PROJECT_SAVE_AS_CHANNEL,
  PROJECT_SAVE_CHANNEL,
  PROJECT_STARTUP_CHANNEL,
  openProjectResultSchema,
  saveProjectRequestSchema,
  saveProjectResultSchema,
  startupProjectResultSchema,
} from "../core/contracts/project-persistence";

import {
  TEMPLATE_LIST_CHANNEL,
  TEMPLATE_LOAD_CHANNEL,
  TEMPLATE_SAVE_CHANNEL,
  templateListResultSchema,
  templateLoadRequestSchema,
  templateLoadResultSchema,
  templateSaveRequestSchema,
  templateSaveResultSchema,
} from "../core/contracts/template-ipc";

export const lfaBridge: LfaBridge = {
  onPlaybackPowerChange(listener) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      state: unknown,
    ): void => {
      if (state === "suspend" || state === "resume") listener(state);
    };
    ipcRenderer.on(PLAYBACK_POWER_CHANNEL, handler);
    return () => ipcRenderer.removeListener(PLAYBACK_POWER_CHANNEL, handler);
  },
  async requestAudioPreview(request) {
    const validated = previewAudioIssueRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      PREVIEW_AUDIO_ISSUE_CHANNEL,
      validated,
    );
    return previewAudioIssueResultSchema.parse(response);
  },
  async listTemplates() {
    const payload: unknown = await ipcRenderer.invoke(TEMPLATE_LIST_CHANNEL);
    return templateListResultSchema.parse(payload);
  },
  async loadTemplate(templateId) {
    const validated = templateLoadRequestSchema.parse({ templateId });
    const payload: unknown = await ipcRenderer.invoke(
      TEMPLATE_LOAD_CHANNEL,
      validated,
    );
    return templateLoadResultSchema.parse(payload);
  },
  async saveTemplate(template) {
    const validated = templateSaveRequestSchema.parse({ template });
    const payload: unknown = await ipcRenderer.invoke(
      TEMPLATE_SAVE_CHANNEL,
      validated,
    );
    return templateSaveResultSchema.parse(payload);
  },
  async getFoundationInfo() {
    const payload: unknown = await ipcRenderer.invoke(FOUNDATION_INFO_CHANNEL);
    return foundationInfoSchema.parse(payload);
  },

  async importArtwork(request) {
    const validatedRequest = artworkImportRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      ARTWORK_PICK_AND_BIND_CHANNEL,
      validatedRequest,
    );
    return artworkImportResultSchema.parse(payload);
  },

  async pickAudioFiles() {
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_PICK_AUDIO_FILES_CHANNEL,
    );
    return mediaDiscoveryStartResultSchema.parse(payload);
  },

  async pickMediaFolder() {
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_PICK_FOLDER_CHANNEL,
    );
    return mediaDiscoveryStartResultSchema.parse(payload);
  },

  async discoverDroppedMedia(files) {
    try {
      const paths = files
        .map((file) => webUtils.getPathForFile(file))
        .filter((path) => path.length > 0);

      if (paths.length === 0) {
        return mediaDiscoveryStartResultSchema.parse({
          status: "error",
          code: "MEDIA_DISCOVERY_FAILED",
          message: "Dropped files could not be resolved safely.",
        });
      }

      const request = mediaDiscoveryPathRequestSchema.parse({ paths });
      const payload: unknown = await ipcRenderer.invoke(
        MEDIA_DISCOVER_DROPPED_CHANNEL,
        request,
      );
      return mediaDiscoveryStartResultSchema.parse(payload);
    } catch {
      return mediaDiscoveryStartResultSchema.parse({
        status: "error",
        code: "MEDIA_DISCOVERY_FAILED",
        message: "Dropped files could not be resolved safely.",
      });
    }
  },

  async getMediaDiscoveryStatus(batchId) {
    const request = mediaDiscoveryStatusRequestSchema.parse({ batchId });
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_DISCOVERY_STATUS_CHANNEL,
      request,
    );
    return mediaDiscoveryStatusResultSchema.parse(payload);
  },

  async cancelMediaDiscovery(batchId) {
    const request = mediaDiscoveryCancelRequestSchema.parse({ batchId });
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_DISCOVERY_CANCEL_CHANNEL,
      request,
    );
    return mediaDiscoveryCancelResultSchema.parse(payload);
  },

  async startMediaIntake(request) {
    const validatedRequest = mediaIntakeStartRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_INTAKE_START_CHANNEL,
      validatedRequest,
    );
    return mediaIntakeStartResultSchema.parse(payload);
  },

  async getMediaIntakeStatus(batchId) {
    const request = mediaIntakeStatusRequestSchema.parse({ batchId });
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_INTAKE_STATUS_CHANNEL,
      request,
    );
    return mediaIntakeStatusResultSchema.parse(payload);
  },

  async cancelMediaIntake(batchId) {
    const request = mediaIntakeCancelRequestSchema.parse({ batchId });
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_INTAKE_CANCEL_CHANNEL,
      request,
    );
    return mediaIntakeCancelResultSchema.parse(payload);
  },

  async scanMissingMedia(request) {
    const validatedRequest = missingMediaScanRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_MISSING_SCAN_CHANNEL,
      validatedRequest,
    );
    return missingMediaScanResultSchema.parse(payload);
  },

  async relinkMediaAsset(request) {
    const validatedRequest = singleRelinkRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_RELINK_SINGLE_CHANNEL,
      validatedRequest,
    );
    return singleRelinkOperationResultSchema.parse(payload);
  },

  async relinkMissingMediaFolder(request) {
    const validatedRequest = folderRelinkRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      MEDIA_RELINK_FOLDER_CHANNEL,
      validatedRequest,
    );
    return folderRelinkOperationResultSchema.parse(payload);
  },

  async saveProject(request) {
    const validatedRequest = saveProjectRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      PROJECT_SAVE_CHANNEL,
      validatedRequest,
    );
    return saveProjectResultSchema.parse(payload);
  },

  async saveProjectAs(request) {
    const validatedRequest = saveProjectRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      PROJECT_SAVE_AS_CHANNEL,
      validatedRequest,
    );
    return saveProjectResultSchema.parse(payload);
  },

  async openProject() {
    const payload: unknown = await ipcRenderer.invoke(PROJECT_OPEN_CHANNEL);
    return openProjectResultSchema.parse(payload);
  },

  async getStartupProject() {
    const payload: unknown = await ipcRenderer.invoke(PROJECT_STARTUP_CHANNEL);
    return startupProjectResultSchema.parse(payload);
  },

  async autosaveProject(request) {
    const validatedRequest = autosaveRecoveryRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      PROJECT_AUTOSAVE_CHANNEL,
      validatedRequest,
    );
    return autosaveRecoveryResultSchema.parse(payload);
  },

  async getRecoveryStatus(request) {
    const validatedRequest = recoveryStatusRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      PROJECT_RECOVERY_STATUS_CHANNEL,
      validatedRequest,
    );
    return recoveryStatusResultSchema.parse(payload);
  },

  async acceptRecovery(request) {
    const validatedRequest = recoveryAcceptRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      PROJECT_RECOVERY_ACCEPT_CHANNEL,
      validatedRequest,
    );
    return recoveryAcceptResultSchema.parse(payload);
  },

  async discardRecovery(request) {
    const validatedRequest = recoveryDiscardRequestSchema.parse(request);
    const payload: unknown = await ipcRenderer.invoke(
      PROJECT_RECOVERY_DISCARD_CHANNEL,
      validatedRequest,
    );
    return recoveryDiscardResultSchema.parse(payload);
  },
};
