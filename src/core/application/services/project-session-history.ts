import {
  ProjectCommandEngine,
  type ProjectCommand,
  type ProjectCommandEngineSnapshot,
  type ProjectCommandExecutionResult,
  type ProjectCommandOrigin,
  type ProjectHistoryActionResult,
  type ProjectStateToken,
  type ProjectSystemReconciliationResult,
} from "./project-command-engine";
import { isProjectDirty } from "./project-dirty-state";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";

export interface ProjectSessionHistorySnapshot extends ProjectCommandEngineSnapshot {
  savedStateToken: ProjectStateToken | null;
  savedRevision: number;
  dirty: boolean;
}

export interface ExternalProjectMutation {
  kind: string;
  label: string;
  origin?: ProjectCommandOrigin;
  project: ProjectDocument;
}

function validateSavedRevision(
  project: ProjectDocument,
  savedRevision: number,
): void {
  if (
    !Number.isInteger(savedRevision) ||
    savedRevision < 0 ||
    savedRevision > project.revision
  ) {
    throw new Error(
      "Saved revision must be a non-negative integer no newer than the project.",
    );
  }
}

export class ProjectSessionHistory {
  private engine: ProjectCommandEngine;
  private savedStateToken: ProjectStateToken | null;
  private savedRevision: number;

  constructor(initialProject: ProjectDocument) {
    const project = projectDocumentSchema.parse(initialProject);
    this.engine = new ProjectCommandEngine(project);
    const snapshot = this.engine.snapshot();
    this.savedStateToken = snapshot.stateToken;
    this.savedRevision = snapshot.project.revision;
  }

  snapshot(): ProjectSessionHistorySnapshot {
    const snapshot = this.engine.snapshot();
    return {
      ...snapshot,
      savedStateToken: this.savedStateToken,
      savedRevision: this.savedRevision,
      dirty: isProjectDirty(snapshot.stateToken, this.savedStateToken),
    };
  }

  execute(command: ProjectCommand): ProjectCommandExecutionResult {
    return this.engine.execute(command);
  }

  commitExternalProject(
    mutation: ExternalProjectMutation,
  ): ProjectCommandExecutionResult {
    const before = this.engine.snapshot();

    return this.engine.execute({
      kind: mutation.kind,
      label: mutation.label,
      origin: mutation.origin ?? "manual",
      expectedBaseRevision: before.project.revision,
      expectedStateToken: before.stateToken,
      apply: () => mutation.project,
    });
  }

  reconcileSystemProject(
    project: ProjectDocument,
  ): ProjectSystemReconciliationResult {
    return this.engine.reconcileSystemProject(project);
  }

  undo(): ProjectHistoryActionResult {
    return this.engine.undo();
  }

  redo(): ProjectHistoryActionResult {
    return this.engine.redo();
  }

  markSaved(savedRevision = this.engine.snapshot().project.revision): void {
    const snapshot = this.engine.snapshot();
    if (savedRevision !== snapshot.project.revision) {
      throw new Error(
        "Saved revision must match the current project revision checkpoint.",
      );
    }

    this.savedRevision = savedRevision;
    this.savedStateToken = snapshot.stateToken;
  }

  resetClean(projectInput: ProjectDocument): void {
    const project = projectDocumentSchema.parse(projectInput);
    this.engine = new ProjectCommandEngine(project);
    const snapshot = this.engine.snapshot();
    this.savedStateToken = snapshot.stateToken;
    this.savedRevision = snapshot.project.revision;
  }

  resetDirty(projectInput: ProjectDocument, savedRevision: number): void {
    const project = projectDocumentSchema.parse(projectInput);
    validateSavedRevision(project, savedRevision);
    this.engine = new ProjectCommandEngine(project);
    this.savedStateToken = null;
    this.savedRevision = savedRevision;
  }
}
