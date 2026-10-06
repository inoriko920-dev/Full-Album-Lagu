import { ipcMain } from "electron";
import { ProjectStoreError } from "../../core/application/ports/project-store";
import type { ProjectLifecycleService } from "../../core/application/services/project-lifecycle-service";
import { ProjectPathSession } from "../../core/application/services/project-path-session";
import type { LoadProjectUseCase } from "../../core/application/services/project-persistence";
import {
  FOUNDATION_INFO_CHANNEL,
  foundationInfoSchema,
} from "../../core/contracts/foundation-info";
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
}
