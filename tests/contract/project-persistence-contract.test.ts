import { describe, expect, it } from "vitest";
import {
  PROJECT_OPEN_CHANNEL,
  PROJECT_SAVE_AS_CHANNEL,
  PROJECT_SAVE_CHANNEL,
  PROJECT_STARTUP_CHANNEL,
  openProjectResultSchema,
  saveProjectRequestSchema,
  saveProjectResultSchema,
  startupProjectResultSchema,
} from "../../src/core/contracts/project-persistence";

describe("project persistence IPC contract", () => {
  it("uses explicit allowlisted project channels", () => {
    expect(PROJECT_SAVE_CHANNEL).toBe("project:save");
    expect(PROJECT_SAVE_AS_CHANNEL).toBe("project:save-as");
    expect(PROJECT_OPEN_CHANNEL).toBe("project:open");
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

  it("validates an opened project without exposing its filesystem path", () => {
    const parsed = openProjectResultSchema.parse({
      status: "opened",
      project: {
        schemaVersion: 1,
        projectId: "project-opened",
        name: "Dibuka",
        revision: 3,
        tracks: [],
      },
      location: { kind: "known-path" },
    });

    expect(parsed.status).toBe("opened");
    expect(parsed).not.toHaveProperty("path");
  });

  it("keeps open cancellation explicit", () => {
    expect(openProjectResultSchema.parse({ status: "cancelled" })).toEqual({
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
