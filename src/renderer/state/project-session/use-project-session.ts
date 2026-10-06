import { useCallback, useEffect, useState } from "react";
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
  | "idle"
  | "saving"
  | "saved"
  | "cancelled"
  | "error";

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
  save(): Promise<SaveProjectResult>;
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

  useEffect(() => {
    let alive = true;

    void window.lfa
      .getStartupProject()
      .then((result) => {
        if (!alive) return;

        if (result.status === "loaded") {
          setProject(result.project);
          setSourceState("loaded");
          setErrorCode(null);
        } else if (result.status === "error") {
          setSourceState("load-error");
          setErrorCode(result.code);
        }
      })
      .catch(() => {
        if (!alive) return;
        setSourceState("load-error");
        setErrorCode("PROJECT_READ_FAILED");
      });

    return () => {
      alive = false;
    };
  }, []);

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

  return {
    project,
    sourceState,
    persistenceState,
    errorCode,
    save,
  };
}