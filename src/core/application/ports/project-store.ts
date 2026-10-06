import type { ProjectDocument } from "../../domain/project-document";

export type ProjectStoreErrorCode =
  | "PROJECT_INVALID"
  | "PROJECT_NOT_FOUND"
  | "PROJECT_READ_FAILED"
  | "PROJECT_WRITE_FAILED";

export class ProjectStoreError extends Error {
  constructor(
    public readonly code: ProjectStoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectStoreError";
  }
}

export interface ProjectStore {
  save(path: string, project: ProjectDocument): Promise<void>;
  load(path: string): Promise<ProjectDocument>;
}
