import { ipcMain } from "electron";
import { ProjectRecoveryStoreError } from "../../core/application/ports/project-recovery-store";
import { ProjectStoreError } from "../../core/application/ports/project-store";
import type { ProjectLifecycleService } from "../../core/application/services/project-lifecycle-service";
import { ProjectPathSession } from "../../core/application/services/project-path-session";
import type { LoadProjectUseCase } from "../../core/application/services/project-persistence";
import type { ProjectRecoveryService } from "../../core/application/services/project-recovery-service";
import {
  FOUNDATION_INFO_CHANNEL,
  foundationInfoSchema,
} from "../../core/contracts/foundation-info";
import {
  PROJECT_AUTOSAVE_CHANNEL,
  PROJECT_RECOVERY_ACCEPT_CHANNEL,
  PROJECT_RECOVERY_DISCARD_CHANNEL,
  PROJECT_RECOVERY_STATUS_CHANNEL,
  autosaveRecoveryRequestSchema,
  autosaveRecoveryResultSchema,
  recoveryAcceptRequestSchema,
  recoveryAcceptResultSchema,
  recoveryDiscardRequestSchema,
  recoveryDiscardResultSchema,
  recoveryStatusRequestSchema,
  recoveryStatusResultSchema,
} from "../../core/contracts/project-recovery";
import {
  PROJECT_OPEN_CHANNEL,
  PROJECT_SAVE_AS_CHANNEL,
  PROJECT_SAVE_CHANNEL,
  PROJECT_STARTUP_CHANNEL,
  openProjectResultSchema,
  saveProjectRequestSchema,
  saveProjectResultSchema,
  startupProjectResultSchema,
  type ProjectPersistenceErrorCode,
} from "../../core/contracts/project-persistence";

export interface ProjectIpcDependencies {
  lifecycle: ProjectLifecycleService;
  loadProject: LoadProjectUseCase;
  pathSession: ProjectPathSession;
  recoveryService: ProjectRecoveryService;
  startupProjectPath?: string;
}

function mapProjectError(
  error: unknown,
  fallbackCode: ProjectPersistenceErrorCode,
  fallbackMessage: string,
): {
  status: "error";
  code: ProjectPersistenceErrorCode;
  message: string;
} {
  if (error instanceof ProjectStoreError) {
    return {
      status: "error",
      code: error.code,
      message: error.message,
    };
  }

  return {
    status: "error",
    code: fallbackCode,
    message: fallbackMessage,
  };
}

function mapRecoveryError(
  error: unknown,
  fallbackCode: "RECOVERY_INVALID" | "AUTOSAVE_WRITE_FAILED",
  fallbackMessage: string,
): {
  status: "error";
  code: "RECOVERY_INVALID" | "AUTOSAVE_WRITE_FAILED";
  message: string;
} {
  if (error instanceof ProjectRecoveryStoreError) {
    return {
      status: "error",
      code: error.code,
      message: error.message,
    };
  }

  return {
    status: "error",
    code: fallbackCode,
    message: fallbackMessage,
  };
}

export function registerIpcHandlers(
  projectDependencies: ProjectIpcDependencies,
): void {
  ipcMain.handle(FOUNDATION_INFO_CHANNEL, () =>
    foundationInfoSchema.parse({
      platform: process.platform,
      arch: process.arch,
      phase: "foundation",
    }),
  );

  ipcMain.handle(PROJECT_SAVE_CHANNEL, async (_event, payload: unknown) => {
    const request = saveProjectRequestSchema.safeParse(payload);
    if (!request.success) {
      return saveProjectResultSchema.parse({
        status: "error",
        code: "PROJECT_INVALID",
        message: "Project data is invalid.",
      });
    }

    try {
      const outcome = await projectDependencies.lifecycle.save(
        request.data.project,
      );

      if (outcome.status === "cancelled") {
        return saveProjectResultSchema.parse({ status: "cancelled" });
      }

      return saveProjectResultSchema.parse({
        status: "saved",
        projectRevision: outcome.projectRevision,
        location: { kind: "known-path" },
      });
    } catch (error) {
      return saveProjectResultSchema.parse(
        mapProjectError(
          error,
          "PROJECT_WRITE_FAILED",
          "Project file could not be saved.",
        ),
      );
    }
  });

  ipcMain.handle(PROJECT_SAVE_AS_CHANNEL, async (_event, payload: unknown) => {
    const request = saveProjectRequestSchema.safeParse(payload);
    if (!request.success) {
      return saveProjectResultSchema.parse({
        status: "error",
        code: "PROJECT_INVALID",
        message: "Project data is invalid.",
      });
    }

    try {
      const outcome = await projectDependencies.lifecycle.saveAs(
        request.data.project,
      );

      if (outcome.status === "cancelled") {
        return saveProjectResultSchema.parse({ status: "cancelled" });
      }

      return saveProjectResultSchema.parse({
        status: "saved",
        projectRevision: outcome.projectRevision,
        location: { kind: "known-path" },
      });
    } catch (error) {
      return saveProjectResultSchema.parse(
        mapProjectError(
          error,
          "PROJECT_WRITE_FAILED",
          "Project file could not be saved.",
        ),
      );
    }
  });

  ipcMain.handle(PROJECT_OPEN_CHANNEL, async () => {
    try {
      const outcome = await projectDependencies.lifecycle.open();

      if (outcome.status === "cancelled") {
        return openProjectResultSchema.parse({ status: "cancelled" });
      }

      return openProjectResultSchema.parse({
        status: "opened",
        project: outcome.project,
        location: { kind: "known-path" },
      });
    } catch (error) {
      return openProjectResultSchema.parse(
        mapProjectError(
          error,
          "PROJECT_READ_FAILED",
          "Project file could not be opened.",
        ),
      );
    }
  });

  ipcMain.handle(PROJECT_STARTUP_CHANNEL, async () => {
    if (!projectDependencies.startupProjectPath) {
      return startupProjectResultSchema.parse({ status: "none" });
    }

    try {
      const project = await projectDependencies.loadProject.execute(
        projectDependencies.startupProjectPath,
      );
      projectDependencies.pathSession.setKnownPath(
        projectDependencies.startupProjectPath,
      );

      return startupProjectResultSchema.parse({
        status: "loaded",
        project,
        location: { kind: "known-path" },
      });
    } catch (error) {
      return startupProjectResultSchema.parse(
        mapProjectError(
          error,
          "PROJECT_READ_FAILED",
          "Project file could not be opened.",
        ),
      );
    }
  });

  ipcMain.handle(PROJECT_AUTOSAVE_CHANNEL, async (_event, payload: unknown) => {
    const request = autosaveRecoveryRequestSchema.safeParse(payload);
    if (!request.success) {
      return autosaveRecoveryResultSchema.parse({
        status: "error",
        code: "RECOVERY_INVALID",
        message: "Autosave recovery request is invalid.",
      });
    }

    try {
      return autosaveRecoveryResultSchema.parse(
        await projectDependencies.recoveryService.autosave(
          request.data.project,
          request.data.savedRevision,
        ),
      );
    } catch (error) {
      return autosaveRecoveryResultSchema.parse(
        mapRecoveryError(
          error,
          "AUTOSAVE_WRITE_FAILED",
          "Recovery autosave could not be written.",
        ),
      );
    }
  });

  ipcMain.handle(
    PROJECT_RECOVERY_STATUS_CHANNEL,
    async (_event, payload: unknown) => {
      const request = recoveryStatusRequestSchema.safeParse(payload);
      if (!request.success) {
        return recoveryStatusResultSchema.parse({
          status: "invalid",
          code: "RECOVERY_INVALID",
          message: "Recovery status request is invalid.",
        });
      }

      try {
        return recoveryStatusResultSchema.parse(
          await projectDependencies.recoveryService.inspect(
            request.data.primaryProject,
          ),
        );
      } catch {
        return recoveryStatusResultSchema.parse({
          status: "invalid",
          code: "RECOVERY_INVALID",
          message: "Recovery status could not be determined safely.",
        });
      }
    },
  );

  ipcMain.handle(
    PROJECT_RECOVERY_ACCEPT_CHANNEL,
    async (_event, payload: unknown) => {
      const request = recoveryAcceptRequestSchema.safeParse(payload);
      if (!request.success) {
        return recoveryAcceptResultSchema.parse({
          status: "error",
          code: "RECOVERY_INVALID",
          message: "Recovery request is invalid.",
        });
      }

      try {
        return recoveryAcceptResultSchema.parse(
          await projectDependencies.recoveryService.accept(
            request.data.primaryProject,
          ),
        );
      } catch {
        return recoveryAcceptResultSchema.parse({
          status: "error",
          code: "RECOVERY_INVALID",
          message: "Recovery could not be accepted safely.",
        });
      }
    },
  );

  ipcMain.handle(
    PROJECT_RECOVERY_DISCARD_CHANNEL,
    async (_event, payload: unknown) => {
      const request = recoveryDiscardRequestSchema.safeParse(payload);
      if (!request.success) {
        return recoveryDiscardResultSchema.parse({
          status: "error",
          code: "RECOVERY_INVALID",
          message: "Recovery discard request is invalid.",
        });
      }

      try {
        return recoveryDiscardResultSchema.parse(
          await projectDependencies.recoveryService.discard(
            request.data.projectId,
          ),
        );
      } catch (error) {
        return recoveryDiscardResultSchema.parse(
          mapRecoveryError(
            error,
            "AUTOSAVE_WRITE_FAILED",
            "Recovery artifact could not be discarded.",
          ),
        );
      }
    },
  );
}
