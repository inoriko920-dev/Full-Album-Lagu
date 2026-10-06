import type { ProjectDocument } from "../../domain/project-document";
import { ProjectPathSession } from "./project-path-session";
import { LoadProjectUseCase, SaveProjectUseCase } from "./project-persistence";

export type ProjectPathSelector = () => Promise<string | null>;

export type LifecycleSaveOutcome =
  | {
      status: "saved";
      projectRevision: number;
    }
  | {
      status: "cancelled";
    };

export type LifecycleOpenOutcome =
  | {
      status: "opened";
      project: ProjectDocument;
    }
  | {
      status: "cancelled";
    };

export class ProjectLifecycleService {
  constructor(
    private readonly saveProject: SaveProjectUseCase,
    private readonly loadProject: LoadProjectUseCase,
    private readonly pathSession: ProjectPathSession,
    private readonly selectSavePath: ProjectPathSelector,
    private readonly selectOpenPath: ProjectPathSelector,
  ) {}

  async save(project: ProjectDocument): Promise<LifecycleSaveOutcome> {
    const knownPath = this.pathSession.getCurrentPath();
    if (knownPath) {
      await this.saveProject.execute(knownPath, project);
      return {
        status: "saved",
        projectRevision: project.revision,
      };
    }

    return this.saveAs(project);
  }

  async saveAs(project: ProjectDocument): Promise<LifecycleSaveOutcome> {
    const selectedPath = await this.selectSavePath();
    if (!selectedPath) {
      return { status: "cancelled" };
    }

    await this.saveProject.execute(selectedPath, project);
    this.pathSession.setKnownPath(selectedPath);

    return {
      status: "saved",
      projectRevision: project.revision,
    };
  }

  async open(): Promise<LifecycleOpenOutcome> {
    const selectedPath = await this.selectOpenPath();
    if (!selectedPath) {
      return { status: "cancelled" };
    }

    const project = await this.loadProject.execute(selectedPath);
    this.pathSession.setKnownPath(selectedPath);

    return {
      status: "opened",
      project,
    };
  }
}
