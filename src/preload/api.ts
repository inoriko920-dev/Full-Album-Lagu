import { ipcRenderer } from "electron";
import {
  FOUNDATION_INFO_CHANNEL,
  foundationInfoSchema
} from "../core/contracts/foundation-info";
import type { LfaBridge } from "../core/contracts/lfa-bridge";

export const lfaBridge: LfaBridge = {
  async getFoundationInfo() {
    const payload: unknown = await ipcRenderer.invoke(FOUNDATION_INFO_CHANNEL);
    return foundationInfoSchema.parse(payload);
  }
};
