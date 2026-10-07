import { app, dialog } from "electron";
import { join, resolve } from "node:path";
import { ProjectLifecycleService } from "../core/application/services/project-lifecycle-service";
import { ProjectPathSession } from "../core/application/services/project-path-session";
import {
  LoadProjectUseCase,
  SaveProjectUseCase,
} from "../core/application/services/project-persistence";
import { ProjectRecoveryService } from "../core/application/services/project-recovery-service";
import { JsonProjectRecoveryStore } from "./infrastructure/persistence/json-project-recovery-store";
import { JsonProjectStore } from "./infrastructure/persistence/json-project-store";
import type { ProjectIpcDependencies } from "./ipc/register-ipc";

function readArgValue(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
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

  const fixedSavePath =
    readArgValue(argv, "w11-save-as-path") ??
    readArgValue(argv, "slc-save-path");
  const cancelSave =
    argv.includes("--w11-save-as-cancel") || argv.includes("--slc-save-cancel");
  const fixedOpenPath = readArgValue(argv, "w11-open-path");
  const cancelOpen = argv.includes("--w11-open-cancel");
  const startupProjectPath = readArgValue(argv, "open-project");

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

  const projectIpc: ProjectIpcDependencies = {
    lifecycle,
    loadProject,
    pathSession,
    recoveryService,
  };

  if (startupProjectPath) {
    projectIpc.startupProjectPath = resolve(startupProjectPath);
  }

  return { projectIpc };
}
