import { describe, expect, it } from "vitest";
import {
  FOUNDATION_INFO_CHANNEL,
  foundationInfoSchema
} from "../../src/core/contracts/foundation-info";

describe("foundation IPC contract", () => {
  it("uses one explicit allowlisted channel", () => {
    expect(FOUNDATION_INFO_CHANNEL).toBe("foundation:get-info");
  });

  it("rejects a payload outside the foundation phase", () => {
    expect(foundationInfoSchema.safeParse({ platform: "win32", arch: "x64", phase: "product" }).success).toBe(false);
  });
});
