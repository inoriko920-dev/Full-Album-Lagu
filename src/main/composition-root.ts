import { dialog } from "electron";
import { resolve } from "node:path";
import {
  LoadProjectUseCase,
  SaveProjectUseCase,
} from "../core/application/services/project-persistence";
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
  const saveProject = new SaveProjectUseCase(projectStore);
  const loadProject = new LoadProjectUseCase(projectStore);
  const fixedSavePath = readArgValue(argv, "slc-save-path");
  const cancelSave = argv.includes("--slc-save-cancel");
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

  const projectIpc: ProjectIpcDependencies = {
    saveProject,
    loadProject,
    selectSavePath,
  };

  if (startupProjectPath) {
    projectIpc.startupProjectPath = resolve(startupProjectPath);
  }

  return { projectIpc };
}
