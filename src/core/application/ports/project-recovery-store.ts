import type { RecoverySnapshot } from "../../contracts/project-recovery";

export type ProjectRecoveryStoreErrorCode =
  | "RECOVERY_INVALID"
  | "AUTOSAVE_WRITE_FAILED";

export class ProjectRecoveryStoreError extends Error {
  constructor(
    public readonly code: ProjectRecoveryStoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectRecoveryStoreError";
  }
}

export interface ProjectRecoveryStore {
  save(projectId: string, snapshot: RecoverySnapshot): Promise<void>;
  load(projectId: string): Promise<RecoverySnapshot | null>;
  remove(projectId: string): Promise<boolean>;
}
