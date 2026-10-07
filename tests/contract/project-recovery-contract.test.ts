import { describe, expect, it } from "vitest";
import {
  PROJECT_AUTOSAVE_CHANNEL,
  PROJECT_RECOVERY_ACCEPT_CHANNEL,
  PROJECT_RECOVERY_DISCARD_CHANNEL,
  PROJECT_RECOVERY_STATUS_CHANNEL,
  autosaveRecoveryRequestSchema,
  recoverySnapshotSchema,
  recoveryStatusResultSchema,
} from "../../src/core/contracts/project-recovery";

describe("project recovery IPC contract", () => {
  it("uses narrow allowlisted recovery channels", () => {
    expect(PROJECT_AUTOSAVE_CHANNEL).toBe("project:autosave-recovery");
    expect(PROJECT_RECOVERY_STATUS_CHANNEL).toBe("project:get-recovery-status");
    expect(PROJECT_RECOVERY_ACCEPT_CHANNEL).toBe("project:accept-recovery");
    expect(PROJECT_RECOVERY_DISCARD_CHANNEL).toBe("project:discard-recovery");
  });

  it("keeps the recovery artifact schema separate from the primary project schema", () => {
    const snapshot = recoverySnapshotSchema.parse({
      recoverySchemaVersion: 1,
      generation: 2,
      capturedAt: "2026-10-07T03:00:00.000Z",
      savedRevision: 4,
      project: {
        schemaVersion: 1,
        projectId: "project-recovery",
        name: "Recovery",
        revision: 5,
        tracks: [],
      },
    });

    expect(snapshot.recoverySchemaVersion).toBe(1);
    expect(snapshot.project.revision).toBe(5);
  });

  it("rejects an impossible autosave baseline newer than the project", () => {
    expect(
      autosaveRecoveryRequestSchema.safeParse({
        savedRevision: 3,
        project: {
          schemaVersion: 1,
          projectId: "project-recovery",
          name: "Recovery",
          revision: 2,
          tracks: [],
        },
      }).success,
    ).toBe(false);
  });

  it("exposes recovery availability without any filesystem path", () => {
    const result = recoveryStatusResultSchema.parse({
      status: "available",
      generation: 3,
      project: {
        schemaVersion: 1,
        projectId: "project-recovery",
        name: "Recovery",
        revision: 7,
        tracks: [],
      },
    });

    expect(result.status).toBe("available");
    expect(result).not.toHaveProperty("path");
  });
});
