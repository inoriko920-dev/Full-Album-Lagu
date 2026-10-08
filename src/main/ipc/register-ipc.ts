import { ipcMain } from "electron";
import type { PreviewAudioAccessService } from "../infrastructure/media/preview-audio-access-service";
import {
  PREVIEW_AUDIO_ISSUE_CHANNEL,
  previewAudioIssueRequestSchema,
  previewAudioIssueResultSchema,
} from "../../core/contracts/preview-audio-ipc";
import {
  TemplateStoreError,
  type TemplateStore,
} from "../../core/application/ports/template-store";
import {
  TEMPLATE_LIST_CHANNEL,
  TEMPLATE_LOAD_CHANNEL,
  TEMPLATE_SAVE_CHANNEL,
  templateListResultSchema,
  templateLoadRequestSchema,
  templateLoadResultSchema,
  templateSaveRequestSchema,
  templateSaveResultSchema,
} from "../../core/contracts/template-ipc";
import { ProjectRecoveryStoreError } from "../../core/application/ports/project-recovery-store";
import { ProjectStoreError } from "../../core/application/ports/project-store";
import type { ArtworkIntakeService } from "../../core/application/services/artwork-intake-service";
import type { MediaDiscoveryService } from "../../core/application/services/media-discovery-service";
import {
  MediaIntakeStartError,
  type MediaIntakeService,
} from "../../core/application/services/media-intake-service";
import type { MediaRelinkService } from "../../core/application/services/media-relink-service";
import type { MissingMediaService } from "../../core/application/services/missing-media-service";
import type { ProjectLifecycleService } from "../../core/application/services/project-lifecycle-service";
import { ProjectPathSession } from "../../core/application/services/project-path-session";
import type { LoadProjectUseCase } from "../../core/application/services/project-persistence";
import type { ProjectRecoveryService } from "../../core/application/services/project-recovery-service";
import {
  ARTWORK_PICK_AND_BIND_CHANNEL,
  artworkImportRequestSchema,
  artworkImportResultSchema,
} from "../../core/contracts/artwork-intake";
import {
  FOUNDATION_INFO_CHANNEL,
  foundationInfoSchema,
} from "../../core/contracts/foundation-info";
import {
  MEDIA_DISCOVER_DROPPED_CHANNEL,
  MEDIA_DISCOVERY_CANCEL_CHANNEL,
  MEDIA_DISCOVERY_STATUS_CHANNEL,
  MEDIA_PICK_AUDIO_FILES_CHANNEL,
  MEDIA_PICK_FOLDER_CHANNEL,
  mediaDiscoveryCancelRequestSchema,
  mediaDiscoveryCancelResultSchema,
  mediaDiscoveryPathRequestSchema,
  mediaDiscoveryStartResultSchema,
  mediaDiscoveryStatusRequestSchema,
  mediaDiscoveryStatusResultSchema,
} from "../../core/contracts/media-discovery";
import {
  MEDIA_INTAKE_CANCEL_CHANNEL,
  MEDIA_INTAKE_START_CHANNEL,
  MEDIA_INTAKE_STATUS_CHANNEL,
  mediaIntakeCancelRequestSchema,
  mediaIntakeCancelResultSchema,
  mediaIntakeStartRequestSchema,
  mediaIntakeStartResultSchema,
  mediaIntakeStatusRequestSchema,
  mediaIntakeStatusResultSchema,
} from "../../core/contracts/media-intake-batch";
import {
  MEDIA_MISSING_SCAN_CHANNEL,
  MEDIA_RELINK_FOLDER_CHANNEL,
  MEDIA_RELINK_SINGLE_CHANNEL,
  folderRelinkOperationResultSchema,
  folderRelinkRequestSchema,
  missingMediaScanRequestSchema,
  missingMediaScanResultSchema,
  singleRelinkOperationResultSchema,
  singleRelinkRequestSchema,
} from "../../core/contracts/media-relink";
import type { MediaKind } from "../../core/domain/media-asset";
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
  templateStore?: TemplateStore;
  previewAudioAccess?: PreviewAudioAccessService;
  lifecycle: ProjectLifecycleService;
  loadProject: LoadProjectUseCase;
  pathSession: ProjectPathSession;
  recoveryService: ProjectRecoveryService;
  mediaDiscoveryService: MediaDiscoveryService;
  mediaIntakeService: MediaIntakeService;
  artworkIntakeService: ArtworkIntakeService;
  missingMediaService: MissingMediaService;
  mediaRelinkService: MediaRelinkService;
  selectAudioFiles: () => Promise<string[] | null>;
  selectArtworkFile: () => Promise<string | null>;
  selectMediaFolders: () => Promise<string[] | null>;
  selectRelinkFile: (kind: MediaKind) => Promise<string | null>;
  selectRelinkFolder: () => Promise<string | null>;
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
  const templateError = (error: unknown) => ({
    status: "error" as const,
    code:
      error instanceof TemplateStoreError ? error.code : "TEMPLATE_READ_FAILED",
    message: "Template tidak dapat diproses secara aman.",
  });

  ipcMain.handle(TEMPLATE_LIST_CHANNEL, async () => {
    if (!projectDependencies.templateStore) {
      return templateListResultSchema.parse({
        status: "error",
        code: "TEMPLATE_READ_FAILED",
        message: "Katalog template tidak tersedia.",
      });
    }
    try {
      return templateListResultSchema.parse({
        status: "ok",
        entries: await projectDependencies.templateStore.list(),
      });
    } catch (error) {
      return templateListResultSchema.parse(templateError(error));
    }
  });
  ipcMain.handle(TEMPLATE_LOAD_CHANNEL, async (_event, payload: unknown) => {
    const request = templateLoadRequestSchema.safeParse(payload);
    if (!request.success)
      return templateLoadResultSchema.parse({
        status: "error",
        code: "TEMPLATE_INVALID",
        message: "Pilihan template tidak valid.",
      });
    if (!projectDependencies.templateStore)
      return templateLoadResultSchema.parse({
        status: "error",
        code: "TEMPLATE_READ_FAILED",
        message: "Katalog template tidak tersedia.",
      });
    try {
      return templateLoadResultSchema.parse({
        status: "ok",
        template: await projectDependencies.templateStore.load(
          request.data.templateId,
        ),
      });
    } catch (error) {
      return templateLoadResultSchema.parse(templateError(error));
    }
  });
  ipcMain.handle(TEMPLATE_SAVE_CHANNEL, async (_event, payload: unknown) => {
    const request = templateSaveRequestSchema.safeParse(payload);
    if (!request.success)
      return templateSaveResultSchema.parse({
        status: "error",
        code: "TEMPLATE_INVALID",
        message: "Data template tidak valid.",
      });
    if (!projectDependencies.templateStore)
      return templateSaveResultSchema.parse({
        status: "error",
        code: "TEMPLATE_WRITE_FAILED",
        message: "Penyimpanan template tidak tersedia.",
      });
    try {
      await projectDependencies.templateStore.saveUserTemplate(
        request.data.template,
      );
      return templateSaveResultSchema.parse({
        status: "ok",
        templateId: request.data.template.templateId,
      });
    } catch (error) {
      const mapped = templateError(error);
      return templateSaveResultSchema.parse({
        ...mapped,
        code:
          mapped.code === "TEMPLATE_READ_FAILED"
            ? "TEMPLATE_WRITE_FAILED"
            : mapped.code,
      });
    }
  });

  ipcMain.handle(
    PREVIEW_AUDIO_ISSUE_CHANNEL,
    async (event, payload: unknown) => {
      const request = previewAudioIssueRequestSchema.safeParse(payload);
      if (!request.success || !projectDependencies.previewAudioAccess) {
        return previewAudioIssueResultSchema.parse({ status: "blocked" });
      }
      const url = await projectDependencies.previewAudioAccess.issue({
        ...request.data,
        ownerWebContentsId: event.sender.id,
      });
      return previewAudioIssueResultSchema.parse(
        url === null ? { status: "blocked" } : { status: "granted", url },
      );
    },
  );

  ipcMain.handle(FOUNDATION_INFO_CHANNEL, () =>
    foundationInfoSchema.parse({
      platform: process.platform,
      arch: process.arch,
      phase: "foundation",
    }),
  );

  const startMediaDiscovery = (paths: readonly string[]) => {
    try {
      const { batchId } =
        projectDependencies.mediaDiscoveryService.start(paths);
      return mediaDiscoveryStartResultSchema.parse({
        status: "started",
        batchId,
      });
    } catch {
      return mediaDiscoveryStartResultSchema.parse({
        status: "error",
        code: "MEDIA_DISCOVERY_FAILED",
        message: "Media discovery could not be started safely.",
      });
    }
  };

  ipcMain.handle(
    ARTWORK_PICK_AND_BIND_CHANNEL,
    async (_event, payload: unknown) => {
      const request = artworkImportRequestSchema.safeParse(payload);
      if (!request.success) {
        return artworkImportResultSchema.parse({
          status: "error",
          code: "MEDIA_PROBE_FAILED",
          message: "Permintaan artwork tidak valid.",
        });
      }

      try {
        const selectedPath = await projectDependencies.selectArtworkFile();
        if (selectedPath === null) {
          return artworkImportResultSchema.parse({
            status: "cancelled",
            code: "MEDIA_SELECTION_CANCELLED",
          });
        }

        return artworkImportResultSchema.parse(
          await projectDependencies.artworkIntakeService.importAndBind(
            request.data.project,
            request.data.target,
            selectedPath,
          ),
        );
      } catch {
        return artworkImportResultSchema.parse({
          status: "error",
          code: "MEDIA_PROBE_FAILED",
          message: "Artwork tidak dapat diproses dengan aman.",
        });
      }
    },
  );

  ipcMain.handle(MEDIA_PICK_AUDIO_FILES_CHANNEL, async (event) => {
    try {
      const paths = await projectDependencies.selectAudioFiles();
      if (!paths || paths.length === 0) {
        return mediaDiscoveryStartResultSchema.parse({
          status: "cancelled",
          code: "MEDIA_SELECTION_CANCELLED",
        });
      }

      const outcome = startMediaDiscovery(paths);
      if (outcome.status === "started" && !event.sender.isDestroyed()) {
        projectDependencies.previewAudioAccess?.trustPickerDiscovery(
          event.sender.id,
          outcome.batchId,
        );
      }
      return outcome;
    } catch {
      return mediaDiscoveryStartResultSchema.parse({
        status: "error",
        code: "MEDIA_DISCOVERY_FAILED",
        message: "Audio selection could not be completed safely.",
      });
    }
  });

  ipcMain.handle(MEDIA_PICK_FOLDER_CHANNEL, async (event) => {
    try {
      const paths = await projectDependencies.selectMediaFolders();
      if (!paths || paths.length === 0) {
        return mediaDiscoveryStartResultSchema.parse({
          status: "cancelled",
          code: "MEDIA_SELECTION_CANCELLED",
        });
      }

      const outcome = startMediaDiscovery(paths);
      if (outcome.status === "started" && !event.sender.isDestroyed()) {
        projectDependencies.previewAudioAccess?.trustPickerDiscovery(
          event.sender.id,
          outcome.batchId,
        );
      }
      return outcome;
    } catch {
      return mediaDiscoveryStartResultSchema.parse({
        status: "error",
        code: "MEDIA_DISCOVERY_FAILED",
        message: "Folder selection could not be completed safely.",
      });
    }
  });

  ipcMain.handle(
    MEDIA_DISCOVER_DROPPED_CHANNEL,
    async (_event, payload: unknown) => {
      const request = mediaDiscoveryPathRequestSchema.safeParse(payload);
      if (!request.success) {
        return mediaDiscoveryStartResultSchema.parse({
          status: "error",
          code: "MEDIA_DISCOVERY_FAILED",
          message: "Dropped media request is invalid.",
        });
      }

      return startMediaDiscovery(request.data.paths);
    },
  );

  ipcMain.handle(
    MEDIA_DISCOVERY_STATUS_CHANNEL,
    async (_event, payload: unknown) => {
      const request = mediaDiscoveryStatusRequestSchema.safeParse(payload);
      if (!request.success) {
        return mediaDiscoveryStatusResultSchema.parse({
          status: "error",
          batchId: "invalid",
          code: "MEDIA_DISCOVERY_FAILED",
          message: "Media discovery status request is invalid.",
        });
      }

      return mediaDiscoveryStatusResultSchema.parse(
        projectDependencies.mediaDiscoveryService.getStatus(
          request.data.batchId,
        ),
      );
    },
  );

  ipcMain.handle(
    MEDIA_DISCOVERY_CANCEL_CHANNEL,
    async (_event, payload: unknown) => {
      const request = mediaDiscoveryCancelRequestSchema.safeParse(payload);
      if (!request.success) {
        return mediaDiscoveryCancelResultSchema.parse({
          status: "not-running",
          batchId: "invalid",
        });
      }

      return mediaDiscoveryCancelResultSchema.parse(
        projectDependencies.mediaDiscoveryService.cancel(request.data.batchId),
      );
    },
  );

  ipcMain.handle(
    MEDIA_INTAKE_START_CHANNEL,
    async (event, payload: unknown) => {
      const request = mediaIntakeStartRequestSchema.safeParse(payload);
      if (!request.success) {
        return mediaIntakeStartResultSchema.parse({
          status: "error",
          code: "MEDIA_PROBE_FAILED",
          message: "Media intake request is invalid.",
        });
      }

      try {
        const { batchId } = projectDependencies.mediaIntakeService.start(
          request.data.discoveryBatchId,
          request.data.project,
        );
        projectDependencies.previewAudioAccess?.bindIntake(
          event.sender.id,
          request.data.discoveryBatchId,
          batchId,
          request.data.project.projectId,
        );
        return mediaIntakeStartResultSchema.parse({
          status: "started",
          batchId,
        });
      } catch (error) {
        if (error instanceof MediaIntakeStartError) {
          return mediaIntakeStartResultSchema.parse({
            status: "error",
            code: error.code,
            message: error.message,
          });
        }

        return mediaIntakeStartResultSchema.parse({
          status: "error",
          code: "MEDIA_PROBE_FAILED",
          message: "Media intake could not be started safely.",
        });
      }
    },
  );

  ipcMain.handle(
    MEDIA_INTAKE_STATUS_CHANNEL,
    async (_event, payload: unknown) => {
      const request = mediaIntakeStatusRequestSchema.safeParse(payload);
      if (!request.success) {
        return mediaIntakeStatusResultSchema.parse({
          status: "error",
          batchId: "invalid",
          code: "MEDIA_PROBE_FAILED",
          message: "Media intake status request is invalid.",
        });
      }

      return mediaIntakeStatusResultSchema.parse(
        projectDependencies.mediaIntakeService.getStatus(request.data.batchId),
      );
    },
  );

  ipcMain.handle(
    MEDIA_INTAKE_CANCEL_CHANNEL,
    async (_event, payload: unknown) => {
      const request = mediaIntakeCancelRequestSchema.safeParse(payload);
      if (!request.success) {
        return mediaIntakeCancelResultSchema.parse({
          status: "not-running",
          batchId: "invalid",
        });
      }

      return mediaIntakeCancelResultSchema.parse(
        projectDependencies.mediaIntakeService.cancel(request.data.batchId),
      );
    },
  );

  ipcMain.handle(
    MEDIA_MISSING_SCAN_CHANNEL,
    async (_event, payload: unknown) => {
      const request = missingMediaScanRequestSchema.parse(payload);
      const outcome = await projectDependencies.missingMediaService.scan(
        request.project,
      );
      return missingMediaScanResultSchema.parse({
        status: "scanned",
        ...outcome,
      });
    },
  );

  ipcMain.handle(
    MEDIA_RELINK_SINGLE_CHANNEL,
    async (event, payload: unknown) => {
      const request = singleRelinkRequestSchema.parse(payload);
      const asset = request.project.mediaAssets?.find(
        (item) => item.id === request.assetId,
      );
      if (asset === undefined) {
        return singleRelinkOperationResultSchema.parse({
          status: "error",
          result: {
            status: "error",
            code: "RELINK_FAILED",
            assetId: request.assetId,
            message: "Media asset tidak ditemukan di proyek.",
          },
        });
      }

      const replacementPath = await projectDependencies.selectRelinkFile(
        asset.kind,
      );
      if (replacementPath === null) {
        return singleRelinkOperationResultSchema.parse({
          status: "cancelled",
          result: {
            status: "cancelled",
            code: "RELINK_CANCELLED",
            assetId: asset.id,
          },
        });
      }

      const outcome = await projectDependencies.mediaRelinkService.relinkSingle(
        request.project,
        request.assetId,
        replacementPath,
      );

      if (
        outcome.project !== undefined &&
        outcome.result.status === "relinked"
      ) {
        // Only this freshly OS-picked and probed audio asset may receive a
        // new token. Never reauthorize the rest of the renderer's document.
        const selected = outcome.project.mediaAssets?.find(
          (candidate) => candidate.id === request.assetId,
        );
        const previewBatchId =
          selected?.kind === "audio" && selected.availability === "ready"
            ? projectDependencies.previewAudioAccess?.trustRelinkedSources(
                event.sender.id,
                outcome.project.projectId,
                [
                  {
                    assetId: selected.id,
                    source: {
                      sourcePath: selected.sourcePath,
                      fileName: selected.fileName,
                      sizeBytes: selected.sizeBytes,
                    },
                  },
                ],
              )
            : null;
        if (!previewBatchId) {
          projectDependencies.previewAudioAccess?.revokeWindow(event.sender.id);
        }
        return singleRelinkOperationResultSchema.parse({
          status: "relinked",
          project: outcome.project,
          result: outcome.result,
          ...(previewBatchId ? { previewBatchId } : {}),
        });
      }

      return singleRelinkOperationResultSchema.parse({
        status: "error",
        result: outcome.result,
      });
    },
  );

  ipcMain.handle(
    MEDIA_RELINK_FOLDER_CHANNEL,
    async (event, payload: unknown) => {
      const request = folderRelinkRequestSchema.parse(payload);
      const folderPath = await projectDependencies.selectRelinkFolder();
      if (folderPath === null) {
        return folderRelinkOperationResultSchema.parse({
          status: "cancelled",
          code: "RELINK_CANCELLED",
        });
      }

      try {
        const outcome =
          await projectDependencies.mediaRelinkService.relinkFolder(
            request.project,
            folderPath,
          );
        // Folder selection authorizes only the assets actually relinked
        // and probed by the main-owned relink service.
        const relinked = new Set(
          outcome.results
            .filter((result) => result.status === "relinked")
            .map((result) => result.assetId),
        );
        const trusted = (outcome.project.mediaAssets ?? [])
          .filter(
            (asset) =>
              relinked.has(asset.id) &&
              asset.kind === "audio" &&
              asset.availability === "ready",
          )
          .map((asset) => ({
            assetId: asset.id,
            source: {
              sourcePath: asset.sourcePath,
              fileName: asset.fileName,
              sizeBytes: asset.sizeBytes,
            },
          }));
        const previewBatchId =
          projectDependencies.previewAudioAccess?.trustRelinkedSources(
            event.sender.id,
            outcome.project.projectId,
            trusted,
          ) ?? null;
        if (!previewBatchId) {
          projectDependencies.previewAudioAccess?.revokeWindow(event.sender.id);
        }
        return folderRelinkOperationResultSchema.parse({
          status: "completed",
          ...outcome,
          ...(previewBatchId ? { previewBatchId } : {}),
        });
      } catch {
        return folderRelinkOperationResultSchema.parse({
          status: "error",
          code: "RELINK_FAILED",
          message: "Folder relink tidak dapat diproses dengan aman.",
        });
      }
    },
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

  ipcMain.handle(PROJECT_OPEN_CHANNEL, async (event) => {
    try {
      const outcome = await projectDependencies.lifecycle.open();

      if (outcome.status === "cancelled") {
        return openProjectResultSchema.parse({ status: "cancelled" });
      }

      const scannedProject = (
        await projectDependencies.missingMediaService.scan(outcome.project)
      ).project;
      projectDependencies.previewAudioAccess?.revokeWindow(event.sender.id);

      return openProjectResultSchema.parse({
        status: "opened",
        project: scannedProject,
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

      const scannedProject = (
        await projectDependencies.missingMediaService.scan(project)
      ).project;

      return startupProjectResultSchema.parse({
        status: "loaded",
        project: scannedProject,
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
    async (event, payload: unknown) => {
      const request = recoveryAcceptRequestSchema.safeParse(payload);
      if (!request.success) {
        return recoveryAcceptResultSchema.parse({
          status: "error",
          code: "RECOVERY_INVALID",
          message: "Recovery request is invalid.",
        });
      }

      try {
        const result = await projectDependencies.recoveryService.accept(
          request.data.primaryProject,
        );
        if (result.status === "recovered") {
          projectDependencies.previewAudioAccess?.revokeWindow(event.sender.id);
        }
        return recoveryAcceptResultSchema.parse(result);
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
