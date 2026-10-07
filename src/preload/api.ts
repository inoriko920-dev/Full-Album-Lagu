import { ipcRenderer } from "electron";
import {
  FOUNDATION_INFO_CHANNEL,
  foundationInfoSchema,
} from "../core/contracts/foundation-info";
import type { LfaBridge } from "../core/contracts/lfa-bridge";
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
