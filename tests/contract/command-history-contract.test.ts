import { describe, expect, it } from "vitest";
import {
  PROJECT_COMMAND_ORIGINS,
  ProjectCommandEngine,
  type ProjectCommandOrigin,
} from "../../src/core/application/services/project-command-engine";
import { createEmptyProject } from "../../src/core/domain/project-document";

describe("command history contract", () => {
  it("keeps all planned mutation origins on one exported contract", () => {
    expect(PROJECT_COMMAND_ORIGINS).toEqual([
      "manual",
      "template",
      "auto-susun",
      "ai",
    ]);
  });

  it.each(PROJECT_COMMAND_ORIGINS)(
    "accepts %s through the same CommandEngine path",
    (origin: ProjectCommandOrigin) => {
      const engine = new ProjectCommandEngine(
        createEmptyProject(`origin-${origin}`),
      );

      const result = engine.execute({
        kind: "project.rename",
        label: `Rename from ${origin}`,
        origin,
        apply: (project) => ({
          ...project,
          name: `Album ${origin}`,
        }),
      });

      expect(result.status).toBe("applied");
      expect(engine.historyEntries()).toHaveLength(1);
      expect(engine.historyEntries()[0]?.origin).toBe(origin);
      expect(engine.snapshot().project.revision).toBe(1);
    },
  );
});
