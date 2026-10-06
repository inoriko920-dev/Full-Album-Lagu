import { describe, expect, it } from "vitest";
import { ProjectPathSession } from "../../src/core/application/services/project-path-session";

describe("ProjectPathSession", () => {
  it("starts unsaved and owns the current path only after an explicit update", () => {
    const session = new ProjectPathSession();

    expect(session.getState()).toEqual({ kind: "unsaved" });
    expect(session.getCurrentPath()).toBeNull();

    session.setKnownPath("D:/Album Project/Proyek Ω.lfa.json");

    expect(session.getState()).toEqual({
      kind: "known-path",
      path: "D:/Album Project/Proyek Ω.lfa.json",
    });
    expect(session.getCurrentPath()).toBe("D:/Album Project/Proyek Ω.lfa.json");
  });

  it("rejects empty paths and can return to the unsaved state", () => {
    const session = new ProjectPathSession();

    expect(() => session.setKnownPath("   ")).toThrow(
      "Project path must not be empty.",
    );

    session.setKnownPath("C:/Project.lfa.json");
    session.clear();

    expect(session.getState()).toEqual({ kind: "unsaved" });
    expect(session.getCurrentPath()).toBeNull();
  });
});
