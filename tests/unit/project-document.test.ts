import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  projectDocumentSchema,
} from "../../src/core/domain/project-document";

describe("project document", () => {
  it("creates a schema-v1 empty project", () => {
    const project = createEmptyProject("project-test-001");

    expect(project).toEqual({
      schemaVersion: 1,
      projectId: "project-test-001",
      name: "Proyek Baru",
      revision: 0,
      tracks: [],
    });
  });

  it("rejects an empty project name", () => {
    expect(
      projectDocumentSchema.safeParse({
        schemaVersion: 1,
        projectId: "project-test-001",
        name: "   ",
        revision: 0,
        tracks: [],
      }).success,
    ).toBe(false);
  });
});
