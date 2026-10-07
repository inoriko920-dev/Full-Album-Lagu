import { useCallback, useEffect, useRef, useState } from "react";
import { isProjectDirty } from "../../../core/application/services/project-dirty-state";
import type { ProjectLocation } from "../../../core/contracts/project-lifecycle";
import type {
  MediaBatchSummary,
  MediaRelinkResult,
} from "../../../core/contracts/media-intake";
import type {
  FolderRelinkOperationResult,
  MissingMediaScanResult,
  SingleRelinkOperationResult,
} from "../../../core/contracts/media-relink";
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
export type MediaOperationState =
  | "idle"
  | "selecting"
  | "discovering"
  | "probing"
  | "committing"
  | "completed"
  | "cancelled"
  | "error";
export type RelinkActionState = "idle" | "working" | "error";

export interface MediaUiProgress {
  phase: "discovering" | "probing" | "committing";
  discovered: number;
  processed: number;
  accepted: number;
  rejected: number;
}

export interface MediaUiError {
  code: string;
  message: string;
}

type MissingMediaItem = MissingMediaScanResult["items"][number];
type MediaReadiness = MissingMediaScanResult["readiness"];

const AUTOSAVE_INTERVAL_MS = 15_000;
const MEDIA_POLL_INTERVAL_MS = 40;

function createSessionProject(): ProjectDocument {
  const projectId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "project-new";
  return createEmptyProject(projectId);
}

function waitForMediaPoll(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MEDIA_POLL_INTERVAL_MS);
  });
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
  mediaOperationState: MediaOperationState;
  mediaProgress: MediaUiProgress | null;
  mediaSummary: MediaBatchSummary | null;
  mediaError: MediaUiError | null;
  missingMediaItems: MissingMediaItem[];
  mediaReadiness: MediaReadiness;
  relinkActionState: RelinkActionState;
  lastRelinkResults: MediaRelinkResult[];
  save(): Promise<SaveProjectResult>;
  acceptRecovery(): Promise<RecoveryAcceptResult>;
  discardRecovery(): Promise<RecoveryDiscardResult>;
  importAudio(): Promise<void>;
  importMediaFolder(): Promise<void>;
  importDroppedAudio(files: readonly File[]): Promise<void>;
  cancelMediaImport(): Promise<void>;
  refreshMissingMedia(): Promise<void>;
  relinkMediaAsset(assetId: string): Promise<SingleRelinkOperationResult>;
  relinkMissingMediaFolder(): Promise<FolderRelinkOperationResult>;
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

  const [mediaOperationState, setMediaOperationState] =
    useState<MediaOperationState>("idle");
  const [mediaProgress, setMediaProgress] = useState<MediaUiProgress | null>(
    null,
  );
  const [mediaSummary, setMediaSummary] = useState<MediaBatchSummary | null>(
    null,
  );
  const [mediaError, setMediaError] = useState<MediaUiError | null>(null);
  const [missingMediaItems, setMissingMediaItems] = useState<
    MissingMediaItem[]
  >([]);
  const [mediaReadiness, setMediaReadiness] = useState<MediaReadiness>({
    ready: true,
    blockers: [],
  });
  const [relinkActionState, setRelinkActionState] =
    useState<RelinkActionState>("idle");
  const [lastRelinkResults, setLastRelinkResults] = useState<
    MediaRelinkResult[]
  >([]);

  const projectRef = useRef(project);
  const mediaBusyRef = useRef(false);
  const activeMediaBatchRef = useRef<
    | { phase: "discovery"; batchId: string }
    | { phase: "intake"; batchId: string }
    | null
  >(null);

  const dirty = isProjectDirty(project.revision, savedRevision);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const scanAndApplyMissingMedia = useCallback(
    async (targetProject: ProjectDocument): Promise<ProjectDocument> => {
      try {
        const scan = await window.lfa.scanMissingMedia({
          project: targetProject,
        });
        setProject(scan.project);
        setMissingMediaItems(scan.items);
        setMediaReadiness(scan.readiness);
        return scan.project;
      } catch {
        setProject(targetProject);
        setMediaError({
          code: "MEDIA_DISCOVERY_FAILED",
          message: "Status media proyek tidak dapat diperiksa.",
        });
        return targetProject;
      }
    },
    [],
  );

  useEffect(() => {
    let alive = true;

    const loadStartup = async () => {
      const result = await window.lfa.getStartupProject();
      if (!alive) return;

      if (result.status === "loaded") {
        const scannedProject = await scanAndApplyMissingMedia(result.project);
        if (!alive) return;

        setSavedRevision(result.project.revision);
        setSourceState("loaded");
        setLocation(result.location);
        setErrorCode(null);

        try {
          const recovery = await window.lfa.getRecoveryStatus({
            primaryProject: scannedProject,
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
  }, [scanAndApplyMissingMedia]);

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
          primaryProject: projectRef.current,
        });

        if (result.status === "recovered") {
          await scanAndApplyMissingMedia(result.project);
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
    }, [recoveryActionState, scanAndApplyMissingMedia]);

  const discardRecovery =
    useCallback(async (): Promise<RecoveryDiscardResult> => {
      if (recoveryActionState === "working") {
        return { status: "none" };
      }

      setRecoveryActionState("working");
      setRecoveryErrorCode(null);

      try {
        const result = await window.lfa.discardRecovery({
          projectId: projectRef.current.projectId,
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
    }, [recoveryActionState]);

  const runMediaImport = useCallback(
    async (
      startDiscovery: () => ReturnType<typeof window.lfa.pickAudioFiles>,
    ): Promise<void> => {
      if (mediaBusyRef.current) return;

      mediaBusyRef.current = true;
      setMediaOperationState("selecting");
      setMediaProgress(null);
      setMediaSummary(null);
      setMediaError(null);
      setLastRelinkResults([]);

      try {
        const start = await startDiscovery();
        if (start.status === "cancelled") {
          setMediaOperationState("cancelled");
          return;
        }

        if (start.status === "error") {
          setMediaOperationState("error");
          setMediaError({ code: start.code, message: start.message });
          return;
        }

        activeMediaBatchRef.current = {
          phase: "discovery",
          batchId: start.batchId,
        };
        setMediaOperationState("discovering");

        while (true) {
          const discovery = await window.lfa.getMediaDiscoveryStatus(
            start.batchId,
          );

          if (discovery.status === "discovering") {
            setMediaProgress({
              phase: "discovering",
              discovered: discovery.progress.filesDiscovered,
              processed: discovery.progress.rootsProcessed,
              accepted: 0,
              rejected: discovery.progress.duplicatesSkipped,
            });
            await waitForMediaPoll();
            continue;
          }

          if (discovery.status === "cancelled") {
            setMediaOperationState("cancelled");
            setMediaSummary(null);
            return;
          }

          if (discovery.status === "error") {
            setMediaOperationState("error");
            setMediaError({
              code: discovery.code,
              message: discovery.message,
            });
            return;
          }

          const intakeStart = await window.lfa.startMediaIntake({
            discoveryBatchId: start.batchId,
            project: projectRef.current,
          });
          if (intakeStart.status === "error") {
            setMediaOperationState("error");
            setMediaError({
              code: intakeStart.code,
              message: intakeStart.message,
            });
            return;
          }

          activeMediaBatchRef.current = {
            phase: "intake",
            batchId: intakeStart.batchId,
          };

          while (true) {
            const intake = await window.lfa.getMediaIntakeStatus(
              intakeStart.batchId,
            );

            if (intake.status === "probing" || intake.status === "committing") {
              setMediaOperationState(intake.status);
              setMediaProgress({
                phase: intake.status,
                ...intake.progress,
              });
              await waitForMediaPoll();
              continue;
            }

            if (intake.status === "cancelled") {
              setMediaOperationState("cancelled");
              setMediaSummary(intake.summary);
              setMediaProgress({
                phase: "probing",
                ...intake.progress,
              });
              return;
            }

            if (intake.status === "error") {
              setMediaOperationState("error");
              setMediaSummary(intake.summary ?? null);
              setMediaError({
                code: intake.code,
                message: intake.message,
              });
              return;
            }

            setMediaOperationState("completed");
            setMediaSummary(intake.summary);
            setMediaProgress({
              phase: "committing",
              ...intake.progress,
            });
            await scanAndApplyMissingMedia(intake.project);
            return;
          }
        }
      } catch {
        setMediaOperationState("error");
        setMediaError({
          code: "MEDIA_PROBE_FAILED",
          message: "Impor media gagal diproses dengan aman.",
        });
      } finally {
        activeMediaBatchRef.current = null;
        mediaBusyRef.current = false;
      }
    },
    [scanAndApplyMissingMedia],
  );

  const importAudio = useCallback(
    async (): Promise<void> =>
      runMediaImport(() => window.lfa.pickAudioFiles()),
    [runMediaImport],
  );

  const importMediaFolder = useCallback(
    async (): Promise<void> =>
      runMediaImport(() => window.lfa.pickMediaFolder()),
    [runMediaImport],
  );

  const importDroppedAudio = useCallback(
    async (files: readonly File[]): Promise<void> => {
      if (files.length === 0) return;
      await runMediaImport(() => window.lfa.discoverDroppedMedia(files));
    },
    [runMediaImport],
  );

  const cancelMediaImport = useCallback(async (): Promise<void> => {
    const active = activeMediaBatchRef.current;
    if (active === null) return;

    if (active.phase === "discovery") {
      await window.lfa.cancelMediaDiscovery(active.batchId);
      return;
    }

    await window.lfa.cancelMediaIntake(active.batchId);
  }, []);

  const refreshMissingMedia = useCallback(async (): Promise<void> => {
    await scanAndApplyMissingMedia(projectRef.current);
  }, [scanAndApplyMissingMedia]);

  const relinkMediaAsset = useCallback(
    async (assetId: string): Promise<SingleRelinkOperationResult> => {
      if (relinkActionState === "working") {
        return {
          status: "cancelled",
          result: {
            status: "cancelled",
            code: "RELINK_CANCELLED",
            assetId,
          },
        };
      }

      setRelinkActionState("working");
      setMediaError(null);

      try {
        const result = await window.lfa.relinkMediaAsset({
          project: projectRef.current,
          assetId,
        });

        if (result.status === "relinked") {
          setLastRelinkResults([result.result]);
          await scanAndApplyMissingMedia(result.project);
          setRelinkActionState("idle");
        } else if (result.status === "cancelled") {
          setLastRelinkResults([result.result]);
          setRelinkActionState("idle");
        } else {
          setLastRelinkResults([result.result]);
          setRelinkActionState("error");
          setMediaError({
            code: result.result.code,
            message: result.result.message,
          });
        }

        return result;
      } catch {
        const result: SingleRelinkOperationResult = {
          status: "error",
          result: {
            status: "error",
            code: "RELINK_FAILED",
            assetId,
            message: "Media tidak dapat dihubungkan kembali.",
          },
        };
        setLastRelinkResults([result.result]);
        setRelinkActionState("error");
        setMediaError({
          code: result.result.code,
          message: result.result.message,
        });
        return result;
      }
    },
    [relinkActionState, scanAndApplyMissingMedia],
  );

  const relinkMissingMediaFolder =
    useCallback(async (): Promise<FolderRelinkOperationResult> => {
      if (relinkActionState === "working") {
        return {
          status: "cancelled",
          code: "RELINK_CANCELLED",
        };
      }

      setRelinkActionState("working");
      setMediaError(null);

      try {
        const result = await window.lfa.relinkMissingMediaFolder({
          project: projectRef.current,
        });

        if (result.status === "completed") {
          setLastRelinkResults(result.results);
          await scanAndApplyMissingMedia(result.project);
          setRelinkActionState("idle");
        } else if (result.status === "cancelled") {
          setRelinkActionState("idle");
        } else {
          setRelinkActionState("error");
          setMediaError({ code: result.code, message: result.message });
        }

        return result;
      } catch {
        const result: FolderRelinkOperationResult = {
          status: "error",
          code: "RELINK_FAILED",
          message: "Folder relink tidak dapat diproses dengan aman.",
        };
        setRelinkActionState("error");
        setMediaError({ code: result.code, message: result.message });
        return result;
      }
    }, [relinkActionState, scanAndApplyMissingMedia]);

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
    mediaOperationState,
    mediaProgress,
    mediaSummary,
    mediaError,
    missingMediaItems,
    mediaReadiness,
    relinkActionState,
    lastRelinkResults,
    save,
    acceptRecovery,
    discardRecovery,
    importAudio,
    importMediaFolder,
    importDroppedAudio,
    cancelMediaImport,
    refreshMissingMedia,
    relinkMediaAsset,
    relinkMissingMediaFolder,
  };
}
