import { describe, expect, it } from "vitest";
import {
  PROJECT_SAVE_CHANNEL,
  PROJECT_STARTUP_CHANNEL,
  saveProjectRequestSchema,
  saveProjectResultSchema,
  startupProjectResultSchema,
} from "../../src/core/contracts/project-persistence";

describe("project persistence IPC contract", () => {
  it("uses explicit allowlisted project channels", () => {
    expect(PROJECT_SAVE_CHANNEL).toBe("project:save");
    expect(PROJECT_STARTUP_CHANNEL).toBe("project:get-startup");
  });

  it("validates a save request", () => {
    expect(
      saveProjectRequestSchema.safeParse({
        project: {
          schemaVersion: 1,
          projectId: "project-1",
          name: "Proyek Baru",
          revision: 0,
          tracks: [],
        },
      }).success,
    ).toBe(true);
  });

  it("requires a public location state on successful save", () => {
    expect(
      saveProjectResultSchema.safeParse({
        status: "saved",
        projectRevision: 0,
        location: { kind: "known-path" },
      }).success,
    ).toBe(true);
  });

  it("keeps save cancellation explicit", () => {
    expect(saveProjectResultSchema.parse({ status: "cancelled" })).toEqual({
      status: "cancelled",
    });
  });

  it("validates a loaded startup project with known-path state", () => {
    expect(
      startupProjectResultSchema.safeParse({
        status: "loaded",
        project: {
          schemaVersion: 1,
          projectId: "project-1",
          name: "Proyek Baru",
          revision: 0,
          tracks: [],
        },
        location: { kind: "known-path" },
      }).success,
    ).toBe(true);
  });
});
