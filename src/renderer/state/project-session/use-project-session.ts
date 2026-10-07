import { useCallback, useEffect, useState } from "react";
import { isProjectDirty } from "../../../core/application/services/project-dirty-state";
import type { ProjectLocation } from "../../../core/contracts/project-lifecycle";
import type {
  RecoveryAcceptResult,
  RecoveryDiscardResult,
  RecoveryErrorCode,
  RecoveryStatusResult,
} from "../../../core/contracts/project-recovery";
import type {
  ProjectPersistenceErrorCode,
  SaveProjectResult,
} from "../../../core/contracts/project-persistence";
import {
  createEmptyProject,
  type ProjectDocument,
} from "../../../core/domain/project-document";

export type ProjectSourceState = "new" | "loaded" | "load-error";
export type ProjectPersistenceState =
  "idle" | "saving" | "saved" | "cancelled" | "error";
export type RecoveryActionState = "idle" | "working" | "error";

const AUTOSAVE_INTERVAL_MS = 15_000;

function createSessionProject(): ProjectDocument {
  const projectId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "project-new";
  return createEmptyProject(projectId);
}

export interface ProjectSessionView {
  project: ProjectDocument;
  sourceState: ProjectSourceState;
  persistenceState: ProjectPersistenceState;
  errorCode: ProjectPersistenceErrorCode | null;
  recoveryErrorCode: RecoveryErrorCode | null;
  recoveryState: RecoveryStatusResult;
  recoveryActionState: RecoveryActionState;
  location: ProjectLocation;
  dirty: boolean;
  savedRevision: number;
  save(): Promise<SaveProjectResult>;
  acceptRecovery(): Promise<RecoveryAcceptResult>;
  discardRecovery(): Promise<RecoveryDiscardResult>;
}

export function useProjectSession(): ProjectSessionView {
  const [project, setProject] = useState<ProjectDocument>(() =>
    createSessionProject(),
  );
  const [sourceState, setSourceState] = useState<ProjectSourceState>("new");
  const [persistenceState, setPersistenceState] =
    useState<ProjectPersistenceState>("idle");
  const [errorCode, setErrorCode] =
    useState<ProjectPersistenceErrorCode | null>(null);
  const [recoveryErrorCode, setRecoveryErrorCode] =
    useState<RecoveryErrorCode | null>(null);
  const [recoveryState, setRecoveryState] = useState<RecoveryStatusResult>({
    status: "none",
  });
  const [recoveryActionState, setRecoveryActionState] =
    useState<RecoveryActionState>("idle");
  const [location, setLocation] = useState<ProjectLocation>({
    kind: "unsaved",
  });
  const [savedRevision, setSavedRevision] = useState(0);

  const dirty = isProjectDirty(project.revision, savedRevision);

  useEffect(() => {
    let alive = true;

    const loadStartup = async () => {
      const result = await window.lfa.getStartupProject();
      if (!alive) return;

      if (result.status === "loaded") {
        setProject(result.project);
        setSavedRevision(result.project.revision);
        setSourceState("loaded");
        setLocation(result.location);
        setErrorCode(null);

        try {
          const recovery = await window.lfa.getRecoveryStatus({
            primaryProject: result.project,
          });
          if (!alive) return;
          setRecoveryState(recovery);
          setRecoveryErrorCode(
            recovery.status === "invalid" ? recovery.code : null,
          );
        } catch {
          if (!alive) return;
          setRecoveryState({
            status: "invalid",
            code: "RECOVERY_INVALID",
            message: "Recovery status could not be determined safely.",
          });
          setRecoveryErrorCode("RECOVERY_INVALID");
        }
      } else if (result.status === "error") {
        setSourceState("load-error");
        setErrorCode(result.code);
      }
    };

    void loadStartup().catch(() => {
      if (!alive) return;
      setSourceState("load-error");
      setErrorCode("PROJECT_READ_FAILED");
    });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!dirty || sourceState === "load-error") {
      return;
    }

    let alive = true;
    let running = false;

    const autosave = async () => {
      if (running) return;
      running = true;

      try {
        const result = await window.lfa.autosaveProject({
          project,
          savedRevision,
        });

        if (!alive) return;
        setRecoveryErrorCode(result.status === "error" ? result.code : null);
      } catch {
        if (!alive) return;
        setRecoveryErrorCode("AUTOSAVE_WRITE_FAILED");
      } finally {
        running = false;
      }
    };

    const timer = window.setInterval(() => {
      void autosave();
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [dirty, project, savedRevision, sourceState]);

  const save = useCallback(async (): Promise<SaveProjectResult> => {
    if (persistenceState === "saving") {
      return { status: "cancelled" };
    }

    setPersistenceState("saving");
    setErrorCode(null);

    try {
      const result = await window.lfa.saveProject({ project });
      if (result.status === "saved") {
        setPersistenceState("saved");
        setSavedRevision(result.projectRevision);
        setLocation(result.location);
      } else if (result.status === "cancelled") {
        setPersistenceState("cancelled");
      } else {
        setPersistenceState("error");
        setErrorCode(result.code);
      }

      return result;
    } catch {
      const result: SaveProjectResult = {
        status: "error",
        code: "PROJECT_WRITE_FAILED",
        message: "Project file could not be saved.",
      };
      setPersistenceState("error");
      setErrorCode(result.code);
      return result;
    }
  }, [persistenceState, project]);

  const acceptRecovery =
    useCallback(async (): Promise<RecoveryAcceptResult> => {
      if (recoveryActionState === "working") {
        return { status: "none" };
      }

      setRecoveryActionState("working");
      setRecoveryErrorCode(null);

      try {
        const result = await window.lfa.acceptRecovery({
          primaryProject: project,
        });

        if (result.status === "recovered") {
          setProject(result.project);
          setRecoveryState({ status: "none" });
          setRecoveryActionState("idle");
        } else if (result.status === "stale") {
          setRecoveryState(result);
          setRecoveryActionState("idle");
        } else if (result.status === "error") {
          setRecoveryErrorCode(result.code);
          setRecoveryActionState("error");
        } else {
          setRecoveryState({ status: "none" });
          setRecoveryActionState("idle");
        }

        return result;
      } catch {
        const result: RecoveryAcceptResult = {
          status: "error",
          code: "RECOVERY_INVALID",
          message: "Recovery could not be accepted safely.",
        };
        setRecoveryErrorCode(result.code);
        setRecoveryActionState("error");
        return result;
      }
    }, [project, recoveryActionState]);

  const discardRecovery =
    useCallback(async (): Promise<RecoveryDiscardResult> => {
      if (recoveryActionState === "working") {
        return { status: "none" };
      }

      setRecoveryActionState("working");
      setRecoveryErrorCode(null);

      try {
        const result = await window.lfa.discardRecovery({
          projectId: project.projectId,
        });

        if (result.status === "discarded" || result.status === "none") {
          setRecoveryState({ status: "none" });
          setRecoveryActionState("idle");
        } else {
          setRecoveryErrorCode(result.code);
          setRecoveryActionState("error");
        }

        return result;
      } catch {
        const result: RecoveryDiscardResult = {
          status: "error",
          code: "AUTOSAVE_WRITE_FAILED",
          message: "Recovery artifact could not be discarded.",
        };
        setRecoveryErrorCode(result.code);
        setRecoveryActionState("error");
        return result;
      }
    }, [project.projectId, recoveryActionState]);

  return {
    project,
    sourceState,
    persistenceState,
    errorCode,
    recoveryErrorCode,
    recoveryState,
    recoveryActionState,
    location,
    dirty,
    savedRevision,
    save,
    acceptRecovery,
    discardRecovery,
  };
}
