import {
  createLayerAddCommand,
  createLayerDuplicateCommand,
  createLayerRemoveCommand,
  createLayerReorderCommand,
  createLayerSetCommonCommand,
  createLayerSetAnimationCommand,
  createLayerSetTextStyleCommand,
  createLayerSetStaticTextCommand,
  createLayerSetTransformCommand,
  LayerTransformGestureSession,
  type LayerCommonPatch,
} from "../../../core/application/services/project-layer-commands";
import type {
  ProjectCommand,
  ProjectStateToken,
} from "../../../core/application/services/project-command-engine";
import type {
  VisualLayer,
  VisualLayerAnimation,
  VisualLayerTransform,
  VisualTextStyle,
} from "../../../core/domain/visual-scene-schema";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createTemplateFromProject,
  TemplateTrialSession,
  type SaveTemplateInput,
} from "../../../core/application/services/template-workflow-service";
import type { TemplateDocument } from "../../../core/domain/template-document";
import {
  createAutoArrangeCommandBatch,
  createAutoArrangePlan,
} from "../../../core/application/services/auto-arrange-service";
import {
  createSetAlbumArtworkCommand,
  createSetTrackArtworkCommand,
} from "../../../core/application/services/project-artwork-commands";
import {
  createClearTrackMetadataOverridesCommand,
  createSetTrackMetadataOverridesCommand,
  type TrackMetadataOverrideField,
  type TrackMetadataOverrides,
} from "../../../core/application/services/project-metadata-commands";
import { ProjectSessionHistory } from "../../../core/application/services/project-session-history";
import {
  createTrackMetadataDraft as buildTrackMetadataDraft,
  overridesFromTrackMetadataDraft,
  type TrackMetadataDraft,
} from "../../../core/application/services/track-metadata-draft";
import {
  createTrackReorderCommand,
  createTrackSetEnabledCommand,
} from "../../../core/application/services/project-track-commands";
import type { ArtworkBindingTarget } from "../../../core/contracts/artwork-intake";
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
import { getProjectMediaReadiness } from "../../../core/domain/media-readiness";
import {
  createEmptyProject,
  type ProjectDocument,
} from "../../../core/domain/project-document";
import {
  resolveSelectedTrackProjection,
  type SelectedTrackProjection,
} from "../../../core/domain/selected-track-projection";

/** Ephemeral only: binds the renderer to a completed MAIN picker-based intake. */
export interface TrustedPreviewBatch {
  readonly projectId: string;
  readonly batchId: string;
  /** Ephemeral MAIN-verified import provenance. Never persisted in project. */
  readonly batchByAssetId?: Readonly<Record<string, string>>;
}

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
export type AutoArrangeActionState =
  "idle" | "planning" | "applying" | "applied" | "noop" | "error";
export type ArtworkActionState = "idle" | "working" | "cancelled" | "error";
export type MetadataDraftApplyResult = "applied" | "noop" | "error";

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
  canUndo: boolean;
  canRedo: boolean;
  mediaOperationState: MediaOperationState;
  /** Never persisted to ProjectDocument; dropped/opened projects stay blocked. */
  trustedPreviewBatch: TrustedPreviewBatch | null;
  mediaProgress: MediaUiProgress | null;
  mediaSummary: MediaBatchSummary | null;
  mediaError: MediaUiError | null;
  missingMediaItems: MissingMediaItem[];
  mediaReadiness: MediaReadiness;
  relinkActionState: RelinkActionState;
  lastRelinkResults: MediaRelinkResult[];
  autoArrangeState: AutoArrangeActionState;
  artworkActionState: ArtworkActionState;
  artworkError: MediaUiError | null;
  templateTrialName: string | null;
  templateTrialProject: ProjectDocument | null;
  templateError: string | null;
  beginTemplateTrial(template: TemplateDocument): boolean;
  revertTemplateTrial(): void;
  applyTemplateTrial(): boolean;
  saveVisualTemplate(
    input: SaveTemplateInput,
    includedKinds?: VisualLayer["kind"][],
  ): Promise<boolean>;
  layerError: string | null;
  addVisualLayer(layer: VisualLayer): boolean;
  duplicateVisualLayer(layerId: string, newLayerId: string): boolean;
  removeVisualLayer(layerId: string): boolean;
  reorderVisualLayer(layerId: string, toIndex: number): boolean;
  setVisualLayerCommon(layerId: string, patch: LayerCommonPatch): boolean;
  setVisualLayerAnimation(layerId: string, animation: VisualLayerAnimation | undefined): boolean;
  setVisualLayerTransform(
    layerId: string,
    transform: VisualLayerTransform,
  ): boolean;
  setVisualLayerTextStyle(layerId: string, style: VisualTextStyle): boolean;
  setVisualLayerStaticText(layerId: string, text: string): boolean;
  beginVisualLayerGesture(layerId: string): boolean;
  commitVisualLayerGesture(transform: VisualLayerTransform): boolean;
  cancelVisualLayerGesture(): void;
  reorderTrack(trackId: string, toIndex: number): boolean;
  setTrackEnabled(trackId: string, enabled: boolean): boolean;
  selectedTrackProjection(trackId: string | null): SelectedTrackProjection;
  createTrackMetadataDraft(trackId: string): TrackMetadataDraft;
  applyTrackMetadataOverrides(
    trackId: string,
    overrides: TrackMetadataOverrides,
  ): boolean;
  applyTrackMetadataDraft(draft: TrackMetadataDraft): MetadataDraftApplyResult;
  clearTrackMetadataOverrides(
    trackId: string,
    fields?: readonly TrackMetadataOverrideField[],
  ): boolean;
  autoArrangeAlbum(): "applied" | "noop" | "error";
  importTrackArtwork(trackId: string): Promise<boolean>;
  importAlbumArtwork(): Promise<boolean>;
  clearTrackArtwork(trackId: string): boolean;
  clearAlbumArtwork(): boolean;
  undo(): boolean;
  redo(): boolean;
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
  const [history] = useState(
    () => new ProjectSessionHistory(createSessionProject()),
  );
  const [historySnapshot, setHistorySnapshot] = useState(() =>
    history.snapshot(),
  );
  const project = historySnapshot.project;
  const dirty = historySnapshot.dirty;
  const savedRevision = historySnapshot.savedRevision;
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

  const [mediaOperationState, setMediaOperationState] =
    useState<MediaOperationState>("idle");
  const [trustedPreviewBatch, setTrustedPreviewBatch] =
    useState<TrustedPreviewBatch | null>(null);
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
  const [autoArrangeState, setAutoArrangeState] =
    useState<AutoArrangeActionState>("idle");
  const [artworkActionState, setArtworkActionState] =
    useState<ArtworkActionState>("idle");
  const [artworkError, setArtworkError] = useState<MediaUiError | null>(null);

  const [templateTrialName, setTemplateTrialName] = useState<string | null>(
    null,
  );
  const [templateTrialProject, setTemplateTrialProject] =
    useState<ProjectDocument | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const templateTrialRef = useRef<TemplateTrialSession | null>(null);
  const [layerError, setLayerError] = useState<string | null>(null);
  const layerGestureRef = useRef<LayerTransformGestureSession | null>(null);
  const projectRef = useRef(project);
  const mediaBusyRef = useRef(false);
  const activeMediaBatchRef = useRef<
    | { phase: "discovery"; batchId: string }
    | { phase: "intake"; batchId: string }
    | null
  >(null);

  const publishHistorySnapshot = useCallback(() => {
    const snapshot = history.snapshot();
    projectRef.current = snapshot.project;
    setHistorySnapshot(snapshot);
    return snapshot;
  }, [history]);

  const syncMediaProjection = useCallback((targetProject: ProjectDocument) => {
    const items: MissingMediaItem[] = (targetProject.mediaAssets ?? []).flatMap(
      (asset) => {
        if (
          (asset.availability !== "missing" &&
            asset.availability !== "invalid") ||
          asset.errorCode === undefined ||
          (asset.kind === "audio" && !asset.required)
        ) {
          return [];
        }

        return [
          {
            assetId: asset.id,
            fileName: asset.fileName,
            kind: asset.kind,
            required: asset.required,
            availability: asset.availability,
            code: asset.errorCode,
          },
        ];
      },
    );

    setMissingMediaItems(items);
    setMediaReadiness(getProjectMediaReadiness(targetProject));
  }, []);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const scanMissingMediaState = useCallback(
    async (targetProject: ProjectDocument): Promise<ProjectDocument> => {
      try {
        const scan = await window.lfa.scanMissingMedia({
          project: targetProject,
        });
        setMissingMediaItems(scan.items);
        setMediaReadiness(scan.readiness);
        return scan.project;
      } catch {
        setMediaError({
          code: "MEDIA_DISCOVERY_FAILED",
          message: "Status media proyek tidak dapat diperiksa.",
        });
        return targetProject;
      }
    },
    [],
  );

  const reconcileMissingMedia = useCallback(
    async (targetProject: ProjectDocument): Promise<ProjectDocument> => {
      const scannedProject = await scanMissingMediaState(targetProject);
      history.reconcileSystemProject(scannedProject);
      return publishHistorySnapshot().project;
    },
    [history, publishHistorySnapshot, scanMissingMediaState],
  );

  const commitUserProjectMutation = useCallback(
    (
      targetProject: ProjectDocument,
      kind: string,
      label: string,
    ): ProjectDocument => {
      const result = history.commitExternalProject({
        kind,
        label,
        origin: "manual",
        project: targetProject,
      });

      if (result.status === "rejected") {
        throw new Error("Project mutation could not be committed safely.");
      }

      return publishHistorySnapshot().project;
    },
    [history, publishHistorySnapshot],
  );

  useEffect(() => {
    let alive = true;

    const loadStartup = async () => {
      const result = await window.lfa.getStartupProject();
      if (!alive) return;

      if (result.status === "loaded") {
        const scannedProject = await scanMissingMediaState(result.project);
        if (!alive) return;

        setTrustedPreviewBatch(null);
        history.resetClean(scannedProject);
        publishHistorySnapshot();
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
  }, [history, publishHistorySnapshot, scanMissingMediaState]);

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

  const reorderTrack = useCallback(
    (trackId: string, toIndex: number): boolean => {
      const before = history.snapshot();
      const result = history.execute(
        createTrackReorderCommand({
          trackId,
          toIndex,
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        }),
      );

      if (result.status === "rejected") return false;

      const snapshot = publishHistorySnapshot();
      syncMediaProjection(snapshot.project);
      return result.status === "applied";
    },
    [history, publishHistorySnapshot, syncMediaProjection],
  );

  const setTrackEnabled = useCallback(
    (trackId: string, enabled: boolean): boolean => {
      const before = history.snapshot();
      const result = history.execute(
        createTrackSetEnabledCommand({
          trackId,
          enabled,
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        }),
      );

      if (result.status === "rejected") return false;

      const snapshot = publishHistorySnapshot();
      syncMediaProjection(snapshot.project);
      return result.status === "applied";
    },
    [history, publishHistorySnapshot, syncMediaProjection],
  );

  const executeVisualLayerCommand = useCallback(
    (
      build: (guards: {
        expectedBaseRevision: number;
        expectedStateToken: ProjectStateToken;
      }) => ProjectCommand,
    ): boolean => {
      const before = history.snapshot();
      try {
        const command = build({
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        });
        const result = history.execute(command);
        if (result.status === "rejected") {
          setLayerError(
            "Perubahan layer ditolak. Periksa pilihan atau kondisi terkunci.",
          );
          return false;
        }
        setLayerError(null);
        if (result.status === "applied") publishHistorySnapshot();
        return result.status === "applied";
      } catch {
        setLayerError("Data layer tidak valid; proyek tidak diubah.");
        return false;
      }
    },
    [history, publishHistorySnapshot],
  );

  const addVisualLayer = useCallback(
    (layer: VisualLayer) =>
      executeVisualLayerCommand((guards) =>
        createLayerAddCommand({ layer, ...guards }),
      ),
    [executeVisualLayerCommand],
  );
  const duplicateVisualLayer = useCallback(
    (layerId: string, newLayerId: string) =>
      executeVisualLayerCommand((guards) =>
        createLayerDuplicateCommand({ layerId, newLayerId, ...guards }),
      ),
    [executeVisualLayerCommand],
  );
  const removeVisualLayer = useCallback(
    (layerId: string) =>
      executeVisualLayerCommand((guards) =>
        createLayerRemoveCommand({ layerId, ...guards }),
      ),
    [executeVisualLayerCommand],
  );
  const reorderVisualLayer = useCallback(
    (layerId: string, toIndex: number) =>
      executeVisualLayerCommand((guards) =>
        createLayerReorderCommand({ layerId, toIndex, ...guards }),
      ),
    [executeVisualLayerCommand],
  );
  const setVisualLayerCommon = useCallback(
    (layerId: string, patch: LayerCommonPatch) =>
      executeVisualLayerCommand((guards) =>
        createLayerSetCommonCommand({ layerId, patch, ...guards }),
      ),
    [executeVisualLayerCommand],
  );
  const setVisualLayerAnimation = useCallback(
    (layerId: string, animation: VisualLayerAnimation | undefined) =>
      executeVisualLayerCommand((guards) =>
        createLayerSetAnimationCommand({
          layerId,
          ...(animation === undefined ? {} : { animation }),
          ...guards,
        }),
      ),
    [executeVisualLayerCommand],
  );
  const setVisualLayerTransform = useCallback(
    (layerId: string, transform: VisualLayerTransform) =>
      executeVisualLayerCommand((guards) =>
        createLayerSetTransformCommand({ layerId, transform, ...guards }),
      ),
    [executeVisualLayerCommand],
  );
  const setVisualLayerTextStyle = useCallback(
    (layerId: string, style: VisualTextStyle) =>
      executeVisualLayerCommand((guards) =>
        createLayerSetTextStyleCommand({ layerId, style, ...guards }),
      ),
    [executeVisualLayerCommand],
  );
  const setVisualLayerStaticText = useCallback(
    (layerId: string, text: string) =>
      executeVisualLayerCommand((guards) =>
        createLayerSetStaticTextCommand({ layerId, text, ...guards }),
      ),
    [executeVisualLayerCommand],
  );
  const beginVisualLayerGesture = useCallback(
    (layerId: string): boolean => {
      try {
        layerGestureRef.current = new LayerTransformGestureSession(
          history.snapshot(),
          layerId,
        );
        setLayerError(null);
        return true;
      } catch {
        layerGestureRef.current = null;
        setLayerError("Layer terkunci atau tidak tersedia untuk transform.");
        return false;
      }
    },
    [history],
  );
  const commitVisualLayerGesture = useCallback(
    (transform: VisualLayerTransform): boolean => {
      const gesture = layerGestureRef.current;
      layerGestureRef.current = null;
      if (gesture === null) return false;
      try {
        gesture.preview(transform);
        const result = history.execute(gesture.createCommitCommand());
        if (result.status === "rejected") {
          setLayerError(
            "Gesture tidak diterapkan karena state proyek berubah.",
          );
          return false;
        }
        setLayerError(null);
        if (result.status === "applied") publishHistorySnapshot();
        return result.status === "applied";
      } catch {
        setLayerError("Transform layer tidak valid.");
        return false;
      }
    },
    [history, publishHistorySnapshot],
  );
  const cancelVisualLayerGesture = useCallback(() => {
    layerGestureRef.current = null;
  }, []);

  const selectedTrackProjection = useCallback(
    (trackId: string | null): SelectedTrackProjection =>
      resolveSelectedTrackProjection(projectRef.current, trackId),
    [],
  );

  const createTrackMetadataDraft = useCallback(
    (trackId: string): TrackMetadataDraft =>
      buildTrackMetadataDraft(projectRef.current, trackId),
    [],
  );

  const applyTrackMetadataOverrides = useCallback(
    (trackId: string, overrides: TrackMetadataOverrides): boolean => {
      const before = history.snapshot();
      const result = history.execute(
        createSetTrackMetadataOverridesCommand({
          trackId,
          overrides,
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        }),
      );

      if (result.status === "rejected") return false;
      if (result.status === "applied") publishHistorySnapshot();
      return result.status === "applied";
    },
    [history, publishHistorySnapshot],
  );

  const clearTrackMetadataOverrides = useCallback(
    (
      trackId: string,
      fields?: readonly TrackMetadataOverrideField[],
    ): boolean => {
      const before = history.snapshot();
      const result = history.execute(
        createClearTrackMetadataOverridesCommand({
          trackId,
          ...(fields === undefined ? {} : { fields }),
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        }),
      );

      if (result.status === "rejected") return false;
      if (result.status === "applied") publishHistorySnapshot();
      return result.status === "applied";
    },
    [history, publishHistorySnapshot],
  );

  const applyTrackMetadataDraft = useCallback(
    (draft: TrackMetadataDraft): MetadataDraftApplyResult => {
      let overrides: TrackMetadataOverrides;
      try {
        overrides = overridesFromTrackMetadataDraft(draft);
      } catch {
        return "error";
      }

      const before = history.snapshot();
      const result = history.executeBatch({
        kind: "metadata.apply-draft",
        label: `Terapkan metadata track ${draft.trackId}`,
        origin: "manual",
        expectedBaseRevision: before.project.revision,
        expectedStateToken: before.stateToken,
        commands: [
          createClearTrackMetadataOverridesCommand({
            trackId: draft.trackId,
          }),
          createSetTrackMetadataOverridesCommand({
            trackId: draft.trackId,
            overrides,
          }),
        ],
      });

      if (result.status === "rejected") return "error";
      if (result.status === "noop") return "noop";
      publishHistorySnapshot();
      return "applied";
    },
    [history, publishHistorySnapshot],
  );

  const autoArrangeAlbum = useCallback((): "applied" | "noop" | "error" => {
    const before = history.snapshot();
    setAutoArrangeState("planning");

    try {
      const plan = createAutoArrangePlan(before.project, before.stateToken);
      if (!plan.changed) {
        setAutoArrangeState("noop");
        return "noop";
      }

      setAutoArrangeState("applying");
      const result = history.executeBatch(createAutoArrangeCommandBatch(plan));
      if (result.status === "rejected") {
        setAutoArrangeState("error");
        return "error";
      }
      if (result.status === "noop") {
        setAutoArrangeState("noop");
        return "noop";
      }

      const snapshot = publishHistorySnapshot();
      syncMediaProjection(snapshot.project);
      setAutoArrangeState("applied");
      return "applied";
    } catch {
      setAutoArrangeState("error");
      return "error";
    }
  }, [history, publishHistorySnapshot, syncMediaProjection]);

  const importArtwork = useCallback(
    async (target: ArtworkBindingTarget): Promise<boolean> => {
      if (artworkActionState === "working") return false;

      const base = history.snapshot();
      setArtworkActionState("working");
      setArtworkError(null);

      try {
        const result = await window.lfa.importArtwork({
          project: base.project,
          target,
        });

        if (result.status === "cancelled") {
          setArtworkActionState("cancelled");
          return false;
        }

        if (result.status === "error") {
          setArtworkActionState("error");
          setArtworkError({ code: result.code, message: result.message });
          return false;
        }

        const current = history.snapshot();
        if (
          current.stateToken !== base.stateToken ||
          current.project.revision !== base.project.revision
        ) {
          setArtworkActionState("error");
          setArtworkError({
            code: "STALE_ARTWORK_SELECTION",
            message:
              "Proyek berubah saat pemilihan artwork. Pilih artwork kembali.",
          });
          return false;
        }

        const committed = history.commitExternalProject({
          kind: "artwork.import-bind",
          label:
            target.kind === "album-default"
              ? "Impor dan pasang artwork album"
              : `Impor dan pasang artwork track ${target.trackId}`,
          origin: "manual",
          project: result.project,
        });
        if (committed.status === "rejected") {
          throw new Error("Artwork project could not be committed safely.");
        }

        const snapshot = publishHistorySnapshot();
        syncMediaProjection(snapshot.project);
        setArtworkActionState("idle");
        return committed.status === "applied";
      } catch {
        setArtworkActionState("error");
        setArtworkError({
          code: "MEDIA_PROBE_FAILED",
          message: "Artwork tidak dapat diterapkan dengan aman.",
        });
        return false;
      }
    },
    [artworkActionState, history, publishHistorySnapshot, syncMediaProjection],
  );

  const importTrackArtwork = useCallback(
    async (trackId: string): Promise<boolean> =>
      importArtwork({ kind: "track", trackId }),
    [importArtwork],
  );

  const importAlbumArtwork = useCallback(
    async (): Promise<boolean> => importArtwork({ kind: "album-default" }),
    [importArtwork],
  );

  const clearTrackArtwork = useCallback(
    (trackId: string): boolean => {
      const before = history.snapshot();
      const result = history.execute(
        createSetTrackArtworkCommand({
          trackId,
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        }),
      );
      if (result.status === "rejected") return false;
      if (result.status === "applied") publishHistorySnapshot();
      return result.status === "applied";
    },
    [history, publishHistorySnapshot],
  );

  const clearAlbumArtwork = useCallback((): boolean => {
    const before = history.snapshot();
    const result = history.execute(
      createSetAlbumArtworkCommand({
        expectedBaseRevision: before.project.revision,
        expectedStateToken: before.stateToken,
      }),
    );
    if (result.status === "rejected") return false;
    if (result.status === "applied") publishHistorySnapshot();
    return result.status === "applied";
  }, [history, publishHistorySnapshot]);

  const revertTemplateTrial = useCallback(() => {
    templateTrialRef.current = null;
    setTemplateTrialProject(null);
    setTemplateTrialName(null);
    setTemplateError(null);
  }, []);

  const beginTemplateTrial = useCallback(
    (template: TemplateDocument): boolean => {
      try {
        const trial = new TemplateTrialSession(history.snapshot(), template);
        templateTrialRef.current = trial;
        setTemplateTrialProject(trial.previewProject());
        setTemplateTrialName(template.name);
        setTemplateError(null);
        return true;
      } catch {
        setTemplateError(
          "Template rusak atau tidak kompatibel. Proyek tidak diubah.",
        );
        return false;
      }
    },
    [history],
  );

  const applyTemplateTrial = useCallback((): boolean => {
    const trial = templateTrialRef.current;
    if (trial === null) return false;
    try {
      const result = trial.apply(history);
      if (result.status === "rejected") {
        setTemplateError(
          "Proyek berubah sejak Mode Coba. Coba ulang template.",
        );
        templateTrialRef.current = null;
        setTemplateTrialProject(null);
        setTemplateTrialName(null);
        return false;
      }
      templateTrialRef.current = null;
      setTemplateTrialProject(null);
      setTemplateTrialName(null);
      setTemplateError(null);
      if (result.status === "applied") publishHistorySnapshot();
      return result.status === "applied" || result.status === "noop";
    } catch {
      setTemplateError("Template tidak dapat diterapkan. Proyek tidak diubah.");
      return false;
    }
  }, [history, publishHistorySnapshot]);

  const saveVisualTemplate = useCallback(
    async (
      input: SaveTemplateInput,
      includedKinds?: VisualLayer["kind"][],
    ): Promise<boolean> => {
      if (!window.lfa.saveTemplate) {
        setTemplateError("Penyimpanan template lokal tidak tersedia.");
        return false;
      }
      try {
        const before = history.snapshot();
        const projectForTemplate =
          includedKinds === undefined
            ? before.project
            : {
                ...before.project,
                visualScene: {
                  sceneVersion: 1 as const,
                  layers: (before.project.visualScene?.layers ?? []).filter(
                    (layer) => includedKinds.includes(layer.kind),
                  ),
                },
              };
        const template = createTemplateFromProject(projectForTemplate, input);
        const result = await window.lfa.saveTemplate(template);
        if (result.status === "error") {
          setTemplateError(
            result.code === "TEMPLATE_EXISTS"
              ? "ID template sudah digunakan."
              : result.message,
          );
          return false;
        }
        setTemplateError(null);
        return true;
      } catch {
        setTemplateError("Template tidak valid atau gagal disimpan.");
        return false;
      }
    },
    [history],
  );

  const undo = useCallback((): boolean => {
    const result = history.undo();
    if (result.status === "unavailable") return false;

    const snapshot = publishHistorySnapshot();
    syncMediaProjection(snapshot.project);
    return true;
  }, [history, publishHistorySnapshot, syncMediaProjection]);

  const redo = useCallback((): boolean => {
    const result = history.redo();
    if (result.status === "unavailable") return false;

    const snapshot = publishHistorySnapshot();
    syncMediaProjection(snapshot.project);
    return true;
  }, [history, publishHistorySnapshot, syncMediaProjection]);

  const save = useCallback(async (): Promise<SaveProjectResult> => {
    if (persistenceState === "saving") {
      return { status: "cancelled" };
    }

    const saveCheckpoint = history.snapshot();
    setPersistenceState("saving");
    setErrorCode(null);

    try {
      const result = await window.lfa.saveProject({
        project: saveCheckpoint.project,
      });
      if (result.status === "saved") {
        if (result.projectRevision !== saveCheckpoint.project.revision) {
          const invalidResult: SaveProjectResult = {
            status: "error",
            code: "PROJECT_WRITE_FAILED",
            message:
              "Saved project revision did not match the requested checkpoint.",
          };
          setPersistenceState("error");
          setErrorCode(invalidResult.code);
          return invalidResult;
        }

        history.markSavedCheckpoint(
          saveCheckpoint.stateToken,
          result.projectRevision,
        );
        publishHistorySnapshot();
        setPersistenceState("saved");
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
  }, [history, persistenceState, publishHistorySnapshot]);

  const acceptRecovery =
    useCallback(async (): Promise<RecoveryAcceptResult> => {
      if (recoveryActionState === "working") {
        return { status: "none" };
      }

      setRecoveryActionState("working");
      setRecoveryErrorCode(null);

      try {
        const recoveryBase = history.snapshot();
        const result = await window.lfa.acceptRecovery({
          primaryProject: recoveryBase.project,
        });

        if (result.status === "recovered") {
          const beforeScan = history.snapshot();
          if (
            beforeScan.stateToken !== recoveryBase.stateToken ||
            beforeScan.project.revision !== recoveryBase.project.revision
          ) {
            setRecoveryActionState("idle");
            return { status: "none" };
          }

          const scannedProject = await scanMissingMediaState(result.project);
          const beforePublish = history.snapshot();
          if (
            beforePublish.stateToken !== recoveryBase.stateToken ||
            beforePublish.project.revision !== recoveryBase.project.revision
          ) {
            setRecoveryActionState("idle");
            return { status: "none" };
          }

          setTrustedPreviewBatch(null);
          history.resetDirty(scannedProject, recoveryBase.savedRevision);
          publishHistorySnapshot();
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
    }, [
      history,
      publishHistorySnapshot,
      recoveryActionState,
      scanMissingMediaState,
    ]);

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
      pickerTrusted: boolean,
    ): Promise<void> => {
      if (mediaBusyRef.current) return;

      mediaBusyRef.current = true;
      const previousTrust =
        trustedPreviewBatch?.projectId === projectRef.current.projectId
          ? trustedPreviewBatch
          : null;
      const existingReadyIds = new Set(
        projectRef.current.mediaAssets?.map((asset) => asset.id) ?? [],
      );
      // Main may revoke previous grants on a new successful import.
      // Fail closed now instead of retaining an obsolete preview authority.
      setTrustedPreviewBatch(null);
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
            const committedProject = commitUserProjectMutation(
              intake.project,
              "media.import",
              "Impor media",
            );
            const canonical = await reconcileMissingMedia(committedProject);
            if (
              pickerTrusted &&
              canonical.projectId === intake.project.projectId
            ) {
              const byAsset: Record<string, string> = {
                ...(previousTrust?.batchByAssetId ??
                  Object.fromEntries(
                    (projectRef.current.mediaAssets ?? [])
                      .filter(
                        (asset) =>
                          asset.kind === "audio" &&
                          existingReadyIds.has(asset.id),
                      )
                      .map((asset) => [asset.id, previousTrust?.batchId ?? ""]),
                  )),
              };
              for (const asset of intake.project.mediaAssets ?? []) {
                if (
                  asset.kind === "audio" &&
                  asset.availability === "ready" &&
                  !existingReadyIds.has(asset.id)
                ) {
                  byAsset[asset.id] = intakeStart.batchId;
                }
              }
              setTrustedPreviewBatch({
                projectId: canonical.projectId,
                batchId: intakeStart.batchId,
                batchByAssetId: byAsset,
              });
            }
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
    [commitUserProjectMutation, reconcileMissingMedia, trustedPreviewBatch],
  );

  const importAudio = useCallback(
    async (): Promise<void> =>
      runMediaImport(() => window.lfa.pickAudioFiles(), true),
    [runMediaImport],
  );

  const importMediaFolder = useCallback(
    async (): Promise<void> =>
      runMediaImport(() => window.lfa.pickMediaFolder(), true),
    [runMediaImport],
  );

  const importDroppedAudio = useCallback(
    async (files: readonly File[]): Promise<void> => {
      if (files.length === 0) return;
      await runMediaImport(() => window.lfa.discoverDroppedMedia(files), false);
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
    await reconcileMissingMedia(projectRef.current);
  }, [reconcileMissingMedia]);

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
          setTrustedPreviewBatch(null);
          setLastRelinkResults([result.result]);
          const committedProject = commitUserProjectMutation(
            result.project,
            "media.relink.single",
            "Relink media",
          );
          await reconcileMissingMedia(committedProject);
          setRelinkActionState("idle");
        } else if (result.status === "cancelled") {
          setLastRelinkResults([result.result]);
          setRelinkActionState("idle");
        } else {
          setLastRelinkResults([result.result]);
          setRelinkActionState("error");
          setMediaError({
            code:
              "code" in result.result ? result.result.code : "RELINK_FAILED",
            message:
              result.result.status === "error"
                ? result.result.message
                : "Media tidak dapat dihubungkan kembali.",
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
          code: "RELINK_FAILED",
          message: "Media tidak dapat dihubungkan kembali.",
        });
        return result;
      }
    },
    [commitUserProjectMutation, reconcileMissingMedia, relinkActionState],
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
          setTrustedPreviewBatch(null);
          setLastRelinkResults(result.results);
          const committedProject = commitUserProjectMutation(
            result.project,
            "media.relink.folder",
            "Relink media dari folder",
          );
          await reconcileMissingMedia(committedProject);
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
    }, [commitUserProjectMutation, reconcileMissingMedia, relinkActionState]);

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
    canUndo: historySnapshot.canUndo,
    canRedo: historySnapshot.canRedo,
    mediaOperationState,
    trustedPreviewBatch,
    mediaProgress,
    mediaSummary,
    mediaError,
    missingMediaItems,
    mediaReadiness,
    relinkActionState,
    lastRelinkResults,
    autoArrangeState,
    artworkActionState,
    artworkError,
    templateTrialName,
    templateTrialProject,
    templateError,
    beginTemplateTrial,
    revertTemplateTrial,
    applyTemplateTrial,
    saveVisualTemplate,
    layerError,
    addVisualLayer,
    duplicateVisualLayer,
    removeVisualLayer,
    reorderVisualLayer,
    setVisualLayerCommon,
    setVisualLayerAnimation,
    setVisualLayerTransform,
    setVisualLayerTextStyle,
    setVisualLayerStaticText,
    beginVisualLayerGesture,
    commitVisualLayerGesture,
    cancelVisualLayerGesture,
    reorderTrack,
    setTrackEnabled,
    selectedTrackProjection,
    createTrackMetadataDraft,
    applyTrackMetadataOverrides,
    applyTrackMetadataDraft,
    clearTrackMetadataOverrides,
    autoArrangeAlbum,
    importTrackArtwork,
    importAlbumArtwork,
    clearTrackArtwork,
    clearAlbumArtwork,
    undo,
    redo,
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
