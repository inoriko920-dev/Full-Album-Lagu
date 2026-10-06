import type { LfaBridge } from "../core/contracts/lfa-bridge";

declare global {
  interface Window {
    lfa: LfaBridge;
  }
}

export {};
