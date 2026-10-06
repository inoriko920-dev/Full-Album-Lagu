import type { FoundationInfo } from "./foundation-info";

export interface LfaBridge {
  getFoundationInfo(): Promise<FoundationInfo>;
}
