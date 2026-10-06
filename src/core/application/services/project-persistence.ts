import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";
import type { ProjectStore } from "../ports/project-store";

export class SaveProjectUseCase {
  constructor(private readonly projectStore: ProjectStore) {}

  async execute(path: string, project: ProjectDocument): Promise<void> {
    const validatedProject = projectDocumentSchema.parse(project);
    await this.projectStore.save(path, validatedProject);
  }
}

export class LoadProjectUseCase {
  constructor(private readonly projectStore: ProjectStore) {}

  async execute(path: string): Promise<ProjectDocument> {
    return this.projectStore.load(path);
  }
}
