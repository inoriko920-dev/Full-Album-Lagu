import { ipcRenderer, webUtils } from "electron";
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

export const lfaBridge: LfaBridge = {
  async getFoundationInfo() {
    const payload: unknown = await ipcRenderer.invoke(FOUNDATION_INFO_CHANNEL);
    return foundationInfoSchema.parse(payload);
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
