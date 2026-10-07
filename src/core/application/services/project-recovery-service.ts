import {
  ProjectRecoveryStoreError,
  type ProjectRecoveryStore,
} from "../ports/project-recovery-store";
import {
  recoverySnapshotSchema,
  type AutosaveRecoveryResult,
  type RecoveryAcceptResult,
  type RecoveryDiscardResult,
  type RecoveryStatusResult,
} from "../../contracts/project-recovery";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";

export type RecoveryClock = () => Date;

export class ProjectRecoveryService {
  constructor(
    private readonly recoveryStore: ProjectRecoveryStore,
    private readonly now: RecoveryClock = () => new Date(),
  ) {}

  async autosave(
    project: ProjectDocument,
    savedRevision: number,
  ): Promise<AutosaveRecoveryResult> {
    const validatedProject = projectDocumentSchema.parse(project);

    if (!Number.isInteger(savedRevision) || savedRevision < 0) {
      throw new ProjectRecoveryStoreError(
        "RECOVERY_INVALID",
        "Saved project revision is invalid.",
      );
    }

    if (savedRevision > validatedProject.revision) {
      throw new ProjectRecoveryStoreError(
        "RECOVERY_INVALID",
        "Saved project revision cannot be newer than the current project.",
      );
    }

    if (savedRevision === validatedProject.revision) {
      return { status: "skipped", reason: "clean" };
    }

    const previous = await this.recoveryStore.load(validatedProject.projectId);
    const generation = (previous?.generation ?? 0) + 1;
    const snapshot = recoverySnapshotSchema.parse({
      recoverySchemaVersion: 1,
      generation,
      capturedAt: this.now().toISOString(),
      savedRevision,
      project: validatedProject,
    });

    await this.recoveryStore.save(validatedProject.projectId, snapshot);

    return {
      status: "saved",
      generation,
      projectRevision: validatedProject.revision,
    };
  }

  async inspect(primaryProject: ProjectDocument): Promise<RecoveryStatusResult> {
    const primary = projectDocumentSchema.parse(primaryProject);

    let snapshot;
    try {
      snapshot = await this.recoveryStore.load(primary.projectId);
    } catch (error) {
      if (
        error instanceof ProjectRecoveryStoreError &&
        error.code === "RECOVERY_INVALID"
      ) {
        return {
          status: "invalid",
          code: "RECOVERY_INVALID",
          message: error.message,
        };
      }
      throw error;
    }

    if (!snapshot) {
      return { status: "none" };
    }

    if (snapshot.project.projectId !== primary.projectId) {
      return {
        status: "invalid",
        code: "RECOVERY_INVALID",
        message: "Recovery artifact does not belong to this project.",
      };
    }

    if (
      snapshot.savedRevision !== primary.revision ||
      snapshot.project.revision <= primary.revision
    ) {
      return {
        status: "stale",
        code: "RECOVERY_STALE",
        message: "Recovery artifact is not newer than the primary project.",
      };
    }

    return {
      status: "available",
      generation: snapshot.generation,
      project: snapshot.project,
    };
  }

  async accept(primaryProject: ProjectDocument): Promise<RecoveryAcceptResult> {
    const status = await this.inspect(primaryProject);

    if (status.status === "available") {
      return {
        status: "recovered",
        generation: status.generation,
        project: status.project,
      };
    }

    if (status.status === "invalid") {
      return {
        status: "error",
        code: "RECOVERY_INVALID",
        message: status.message,
      };
    }

    return status;
  }

  async discard(projectId: string): Promise<RecoveryDiscardResult> {
    const removed = await this.recoveryStore.remove(projectId);
    return removed ? { status: "discarded" } : { status: "none" };
  }
}
