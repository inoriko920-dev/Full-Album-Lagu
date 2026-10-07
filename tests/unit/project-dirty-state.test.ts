import { describe, expect, it } from "vitest";
import { isProjectDirty } from "../../src/core/application/services/project-dirty-state";

describe("project dirty state", () => {
  it("becomes dirty when the live revision differs from the last saved revision", () => {
    expect(isProjectDirty(4, 4)).toBe(false);
    expect(isProjectDirty(5, 4)).toBe(true);
  });

  it("returns clean again after a successful save advances the saved revision", () => {
    const mutatedRevision = 8;
    expect(isProjectDirty(mutatedRevision, 7)).toBe(true);
    expect(isProjectDirty(mutatedRevision, 8)).toBe(false);
  });

  it("rejects invalid revision values", () => {
    expect(() => isProjectDirty(-1, 0)).toThrow(
      "Project revisions must be non-negative integers.",
    );
    expect(() => isProjectDirty(1.5, 1)).toThrow(
      "Project revisions must be non-negative integers.",
    );
  });
});
