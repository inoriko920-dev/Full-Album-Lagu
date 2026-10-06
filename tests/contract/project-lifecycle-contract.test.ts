import { describe, expect, it } from "vitest";
import {
  projectLocationSchema,
  type ProjectLocation,
} from "../../src/core/contracts/project-lifecycle";

describe("project lifecycle contract", () => {
  it.each<ProjectLocation>([
    { kind: "unsaved" },
    { kind: "known-path" },
  ])("accepts public location state %#", (location) => {
    expect(projectLocationSchema.parse(location)).toEqual(location);
  });

  it("does not expose a filesystem path through the renderer contract", () => {
    expect(
      projectLocationSchema.safeParse({
        kind: "known-path",
        path: "C:/private/project.lfa.json",
      }).success,
    ).toBe(false);
  });
});
