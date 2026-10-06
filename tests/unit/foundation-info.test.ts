import { describe, expect, it } from "vitest";
import { foundationInfoSchema } from "../../src/core/contracts/foundation-info";

describe("foundationInfoSchema", () => {
  it("accepts the narrow foundation runtime contract", () => {
    expect(foundationInfoSchema.parse({ platform: "win32", arch: "x64", phase: "foundation" }))
      .toEqual({ platform: "win32", arch: "x64", phase: "foundation" });
  });
});
