import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";

export const PROJECT_COMMAND_ORIGINS = [
  "manual",
  "template",
  "auto-susun",
  "ai",
] as const;

export type ProjectCommandOrigin = (typeof PROJECT_COMMAND_ORIGINS)[number];
export type ProjectStateToken = string;

export interface ProjectCommand {
  kind: string;
  label: string;
  origin: ProjectCommandOrigin;
  expectedBaseRevision?: number;
  expectedStateToken?: ProjectStateToken;
  apply(project: ProjectDocument): ProjectDocument;
}

export interface ProjectCommandBatch {
  kind: string;
  label: string;
  origin: ProjectCommandOrigin;
  expectedBaseRevision?: number;
  expectedStateToken?: ProjectStateToken;
  commands: readonly ProjectCommand[];
}

export type ProjectCommandRejectionCode =
  | "STALE_REVISION"
  | "STALE_STATE_TOKEN"
  | "INVALID_COMMAND"
  | "COMMAND_FAILED"
  | "INVALID_PROJECT_RESULT";

export type ProjectCommandExecutionResult =
  | { status: "applied"; entry: ProjectHistoryEntry }
  | { status: "noop" }
  | {
      status: "rejected";
      code: ProjectCommandRejectionCode;
      failedCommandIndex?: number;
    };

export type ProjectHistoryActionResult =
  { status: "applied"; entry: ProjectHistoryEntry } | { status: "unavailable" };

export interface ProjectHistoryEntry {
  id: string;
  kind: string;
  label: string;
  origin: ProjectCommandOrigin;
  beforeStateToken: ProjectStateToken;
  afterStateToken: ProjectStateToken;
}

export interface ProjectCommandEngineSnapshot {
  project: ProjectDocument;
  stateToken: ProjectStateToken;
  canUndo: boolean;
  canRedo: boolean;
  undoDepth: number;
  redoDepth: number;
}

interface ProjectHistoryNode {
  entry: ProjectHistoryEntry;
  beforeProject: ProjectDocument;
  afterProject: ProjectDocument;
}

interface CommandEngineOptions {
  maxEntries?: number;
}

function cloneProject(project: ProjectDocument): ProjectDocument {
  return projectDocumentSchema.parse(structuredClone(project));
}

function withoutRevision(project: ProjectDocument): Record<string, unknown> {
  const snapshot: Record<string, unknown> = { ...project };
  delete snapshot.revision;
  return snapshot;
}

function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right, "en-US"),
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(String(value));
}

function semanticallyEqual(
  left: ProjectDocument,
  right: ProjectDocument,
): boolean {
  return (
    stableSerialize(withoutRevision(left)) ===
    stableSerialize(withoutRevision(right))
  );
}

function hasValidMetadata(command: { kind: string; label: string }): boolean {
  return command.kind.trim().length > 0 && command.label.trim().length > 0;
}

export class ProjectCommandEngine {
  private currentProject: ProjectDocument;
  private currentStateToken: ProjectStateToken = "state-0";
  private readonly past: ProjectHistoryNode[] = [];
  private readonly future: ProjectHistoryNode[] = [];
  private stateSequence = 0;
  private historySequence = 0;
  private readonly maxEntries: number;

  constructor(
    initialProject: ProjectDocument,
    options: CommandEngineOptions = {},
  ) {
    this.currentProject = cloneProject(initialProject);
    const maxEntries = options.maxEntries ?? 100;
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 1000) {
      throw new Error("Command history maxEntries must be between 1 and 1000.");
    }
    this.maxEntries = maxEntries;
  }

  snapshot(): ProjectCommandEngineSnapshot {
    return {
      project: cloneProject(this.currentProject),
      stateToken: this.currentStateToken,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      undoDepth: this.past.length,
      redoDepth: this.future.length,
    };
  }

  historyEntries(): ProjectHistoryEntry[] {
    return this.past.map((node) => ({ ...node.entry }));
  }

  redoEntries(): ProjectHistoryEntry[] {
    return this.future.map((node) => ({ ...node.entry }));
  }

  execute(command: ProjectCommand): ProjectCommandExecutionResult {
    if (!hasValidMetadata(command)) {
      return { status: "rejected", code: "INVALID_COMMAND" };
    }

    const expectationFailure = this.validateExpectation(command);
    if (expectationFailure !== undefined) {
      return { status: "rejected", code: expectationFailure };
    }

    const applied = this.applyOne(this.currentProject, command);
    if (applied.status === "rejected") return applied;
    if (applied.status === "noop") return applied;

    return this.publish(
      command.kind,
      command.label,
      command.origin,
      applied.project,
    );
  }

  executeBatch(batch: ProjectCommandBatch): ProjectCommandExecutionResult {
    if (!hasValidMetadata(batch)) {
      return { status: "rejected", code: "INVALID_COMMAND" };
    }

    const expectationFailure = this.validateExpectation(batch);
    if (expectationFailure !== undefined) {
      return { status: "rejected", code: expectationFailure };
    }

    if (batch.commands.length === 0) {
      return { status: "noop" };
    }

    let workingProject = cloneProject(this.currentProject);
    let changed = false;

    for (let index = 0; index < batch.commands.length; index += 1) {
      const command = batch.commands[index];
      if (
        command === undefined ||
        !hasValidMetadata(command) ||
        command.origin !== batch.origin
      ) {
        return {
          status: "rejected",
          code: "INVALID_COMMAND",
          failedCommandIndex: index,
        };
      }

      const commandExpectationFailure = this.validateExpectation(command);
      if (commandExpectationFailure !== undefined) {
        return {
          status: "rejected",
          code: commandExpectationFailure,
          failedCommandIndex: index,
        };
      }

      const applied = this.applyOne(workingProject, command);
      if (applied.status === "rejected") {
        return {
          ...applied,
          failedCommandIndex: index,
        };
      }

      if (applied.status === "applied") {
        workingProject = applied.project;
        changed = true;
      }
    }

    if (!changed || semanticallyEqual(this.currentProject, workingProject)) {
      return { status: "noop" };
    }

    return this.publish(batch.kind, batch.label, batch.origin, workingProject);
  }

  undo(): ProjectHistoryActionResult {
    const node = this.past.pop();
    if (node === undefined) return { status: "unavailable" };

    this.currentProject = this.restoreWithNextRevision(node.beforeProject);
    this.currentStateToken = node.entry.beforeStateToken;
    this.future.push(node);

    return { status: "applied", entry: { ...node.entry } };
  }

  redo(): ProjectHistoryActionResult {
    const node = this.future.pop();
    if (node === undefined) return { status: "unavailable" };

    this.currentProject = this.restoreWithNextRevision(node.afterProject);
    this.currentStateToken = node.entry.afterStateToken;
    this.past.push(node);
    this.trimPast();

    return { status: "applied", entry: { ...node.entry } };
  }

  private validateExpectation(command: {
    expectedBaseRevision?: number;
    expectedStateToken?: ProjectStateToken;
  }): ProjectCommandRejectionCode | undefined {
    if (
      command.expectedBaseRevision !== undefined &&
      command.expectedBaseRevision !== this.currentProject.revision
    ) {
      return "STALE_REVISION";
    }

    if (
      command.expectedStateToken !== undefined &&
      command.expectedStateToken !== this.currentStateToken
    ) {
      return "STALE_STATE_TOKEN";
    }

    return undefined;
  }

  private applyOne(
    baseProject: ProjectDocument,
    command: ProjectCommand,
  ):
    | { status: "applied"; project: ProjectDocument }
    | { status: "noop" }
    | { status: "rejected"; code: ProjectCommandRejectionCode } {
    let candidate: ProjectDocument;
    try {
      candidate = projectDocumentSchema.parse(
        command.apply(cloneProject(baseProject)),
      );
    } catch {
      return { status: "rejected", code: "COMMAND_FAILED" };
    }

    if (
      candidate.schemaVersion !== baseProject.schemaVersion ||
      candidate.projectId !== baseProject.projectId
    ) {
      return { status: "rejected", code: "INVALID_PROJECT_RESULT" };
    }

    const normalizedCandidate = projectDocumentSchema.parse({
      ...candidate,
      revision: baseProject.revision,
    });

    if (semanticallyEqual(baseProject, normalizedCandidate)) {
      return { status: "noop" };
    }

    return { status: "applied", project: normalizedCandidate };
  }

  private publish(
    kind: string,
    label: string,
    origin: ProjectCommandOrigin,
    semanticProject: ProjectDocument,
  ): ProjectCommandExecutionResult {
    const beforeProject = cloneProject(this.currentProject);
    const beforeStateToken = this.currentStateToken;
    const afterStateToken = this.nextStateToken();
    const afterProject = projectDocumentSchema.parse({
      ...semanticProject,
      revision: this.currentProject.revision + 1,
    });

    this.historySequence += 1;
    const entry: ProjectHistoryEntry = {
      id: `history-${this.historySequence}`,
      kind,
      label,
      origin,
      beforeStateToken,
      afterStateToken,
    };

    this.currentProject = afterProject;
    this.currentStateToken = afterStateToken;
    this.future.splice(0);
    this.past.push({
      entry,
      beforeProject,
      afterProject: cloneProject(afterProject),
    });
    this.trimPast();

    return { status: "applied", entry: { ...entry } };
  }

  private restoreWithNextRevision(snapshot: ProjectDocument): ProjectDocument {
    return projectDocumentSchema.parse({
      ...cloneProject(snapshot),
      revision: this.currentProject.revision + 1,
    });
  }

  private nextStateToken(): ProjectStateToken {
    this.stateSequence += 1;
    return `state-${this.stateSequence}`;
  }

  private trimPast(): void {
    const overflow = this.past.length - this.maxEntries;
    if (overflow > 0) this.past.splice(0, overflow);
  }
}
