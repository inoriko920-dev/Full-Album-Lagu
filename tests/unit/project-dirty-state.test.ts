import { describe, expect, it } from "vitest";
import { isProjectDirty } from "../../src/core/application/services/project-dirty-state";

describe("project dirty state", () => {
  it("is clean when the live logical state token matches the saved checkpoint", () => {
    expect(isProjectDirty("state-4", "state-4")).toBe(false);
    expect(isProjectDirty("state-5", "state-4")).toBe(true);
  });

  it("treats a missing saved checkpoint as dirty for recovered state", () => {
    expect(isProjectDirty("state-recovered", null)).toBe(true);
  });

  it("rejects empty logical state tokens", () => {
    expect(() => isProjectDirty("", "state-0")).toThrow(
      "Current project state token must be non-empty.",
    );
    expect(() => isProjectDirty("state-1", "   ")).toThrow(
      "Saved project state token must be non-empty when set.",
    );
  });
});
