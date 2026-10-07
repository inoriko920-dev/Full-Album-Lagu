import { app, dialog } from "electron";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { MediaDiscoveryService } from "../core/application/services/media-discovery-service";
import { MediaIntakeService } from "../core/application/services/media-intake-service";
import { MediaRelinkService } from "../core/application/services/media-relink-service";
import { MissingMediaService } from "../core/application/services/missing-media-service";
import { ProjectLifecycleService } from "../core/application/services/project-lifecycle-service";
import { ProjectPathSession } from "../core/application/services/project-path-session";
import {
  LoadProjectUseCase,
  SaveProjectUseCase,
} from "../core/application/services/project-persistence";
import { ProjectRecoveryService } from "../core/application/services/project-recovery-service";
import type { MediaKind } from "../core/domain/media-asset";
import { MusicMetadataProbePort } from "./infrastructure/media/music-metadata-probe-port";
import { NodeMediaDiscoveryPort } from "./infrastructure/media/node-media-discovery-port";
import { NodeMediaSourcePort } from "./infrastructure/media/node-media-source-port";
import { JsonProjectRecoveryStore } from "./infrastructure/persistence/json-project-recovery-store";
import { JsonProjectStore } from "./infrastructure/persistence/json-project-store";
import type { ProjectIpcDependencies } from "./ipc/register-ipc";

function readArgValue(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readArgValues(argv: string[], name: string): string[] {
  const prefix = `--${name}=`;
  return argv
    .filter((arg) => arg.startsWith(prefix))
    .map((arg) => arg.slice(prefix.length))
    .filter((value) => value.length > 0);
}

export interface CompositionRoot {
  projectIpc: ProjectIpcDependencies;
}

export function createCompositionRoot(argv: string[]): CompositionRoot {
  const projectStore = new JsonProjectStore();
  const pathSession = new ProjectPathSession();
  const saveProject = new SaveProjectUseCase(projectStore);
  const loadProject = new LoadProjectUseCase(projectStore);

  const fixedRecoveryRoot = readArgValue(argv, "w11-recovery-dir");
  const recoveryStore = new JsonProjectRecoveryStore(() =>
    fixedRecoveryRoot
      ? resolve(fixedRecoveryRoot)
      : join(app.getPath("userData"), "recovery"),
  );
  const recoveryService = new ProjectRecoveryService(recoveryStore);
  const mediaDiscoveryPort = new NodeMediaDiscoveryPort();
  const mediaDiscoveryService = new MediaDiscoveryService(
    mediaDiscoveryPort,
    randomUUID,
    4,
  );
  const mediaProbePort = new MusicMetadataProbePort();
  const mediaSourcePort = new NodeMediaSourcePort();
  const missingMediaService = new MissingMediaService(mediaSourcePort, 8);
  const mediaRelinkService = new MediaRelinkService(
    mediaSourcePort,
    mediaDiscoveryPort,
    mediaProbePort,
  );
  const mediaIntakeService = new MediaIntakeService(
    mediaDiscoveryService,
    mediaProbePort,
    randomUUID,
    4,
  );

  const fixedSavePath =
    readArgValue(argv, "w11-save-as-path") ??
    readArgValue(argv, "slc-save-path");
  const cancelSave =
    argv.includes("--w11-save-as-cancel") || argv.includes("--slc-save-cancel");
  const fixedOpenPath = readArgValue(argv, "w11-open-path");
  const cancelOpen = argv.includes("--w11-open-cancel");
  const startupProjectPath = readArgValue(argv, "open-project");
  const fixedMediaFiles = readArgValues(argv, "w11-media-file").map((path) =>
    resolve(path),
  );
  const fixedMediaFolders = readArgValues(argv, "w11-media-folder").map(
    (path) => resolve(path),
  );
  const cancelMediaFiles = argv.includes("--w11-media-files-cancel");
  const cancelMediaFolders = argv.includes("--w11-media-folders-cancel");
  const fixedRelinkFile = readArgValue(argv, "w11-relink-file");
  const fixedRelinkFolder = readArgValue(argv, "w11-relink-folder");
  const cancelRelinkFile = argv.includes("--w11-relink-file-cancel");
  const cancelRelinkFolder = argv.includes("--w11-relink-folder-cancel");

  const selectSavePath = async (): Promise<string | null> => {
    if (cancelSave) return null;
    if (fixedSavePath) return resolve(fixedSavePath);

    const result = await dialog.showSaveDialog({
      title: "Simpan Proyek",
      defaultPath: "Proyek Baru.lfa.json",
      filters: [{ name: "Lagu Full Album Project", extensions: ["lfa.json"] }],
      properties: ["showOverwriteConfirmation", "createDirectory"],
    });

    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  };

  const selectOpenPath = async (): Promise<string | null> => {
    if (cancelOpen) return null;
    if (fixedOpenPath) return resolve(fixedOpenPath);

    const result = await dialog.showOpenDialog({
      title: "Buka Proyek",
      filters: [{ name: "Lagu Full Album Project", extensions: ["lfa.json"] }],
      properties: ["openFile"],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  };

  const lifecycle = new ProjectLifecycleService(
    saveProject,
    loadProject,
    pathSession,
    selectSavePath,
    selectOpenPath,
  );

  const selectAudioFiles = async (): Promise<string[] | null> => {
    if (cancelMediaFiles) return null;
    if (fixedMediaFiles.length > 0) return [...fixedMediaFiles];

    const result = await dialog.showOpenDialog({
      title: "Impor Audio",
      filters: [
        {
          name: "Audio",
          extensions: [
            "mp3",
            "wav",
            "flac",
            "m4a",
            "aac",
            "ogg",
            "opus",
            "wma",
            "aiff",
            "aif",
          ],
        },
      ],
      properties: ["openFile", "multiSelections"],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths;
  };

  const selectMediaFolders = async (): Promise<string[] | null> => {
    if (cancelMediaFolders) return null;
    if (fixedMediaFolders.length > 0) return [...fixedMediaFolders];

    const result = await dialog.showOpenDialog({
      title: "Impor Folder Media",
      properties: ["openDirectory", "multiSelections"],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths;
  };

  const selectRelinkFile = async (kind: MediaKind): Promise<string | null> => {
    if (cancelRelinkFile) return null;
    if (fixedRelinkFile) return resolve(fixedRelinkFile);

    const extensions =
      kind === "audio"
        ? [
            "mp3",
            "wav",
            "flac",
            "m4a",
            "aac",
            "ogg",
            "opus",
            "wma",
            "aiff",
            "aif",
          ]
        : kind === "image"
          ? ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff"]
          : ["mp4", "mov", "mkv", "webm", "avi", "m4v"];

    const result = await dialog.showOpenDialog({
      title: "Pilih Media Pengganti",
      filters: [{ name: "Media", extensions }],
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  };

  const selectRelinkFolder = async (): Promise<string | null> => {
    if (cancelRelinkFolder) return null;
    if (fixedRelinkFolder) return resolve(fixedRelinkFolder);
    const result = await dialog.showOpenDialog({
      title: "Pilih Folder Relink",
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  };

  const projectIpc: ProjectIpcDependencies = {
    lifecycle,
    loadProject,
    pathSession,
    recoveryService,
    mediaDiscoveryService,
    mediaIntakeService,
    missingMediaService,
    mediaRelinkService,
    selectAudioFiles,
    selectMediaFolders,
    selectRelinkFile,
    selectRelinkFolder,
  };

  if (startupProjectPath) {
    projectIpc.startupProjectPath = resolve(startupProjectPath);
  }

  return { projectIpc };
}
