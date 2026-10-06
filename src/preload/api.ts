import { ipcRenderer } from "electron";
import {
  FOUNDATION_INFO_CHANNEL,
  foundationInfoSchema,
} from "../core/contracts/foundation-info";
import type { LfaBridge } from "../core/contracts/lfa-bridge";
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
};
