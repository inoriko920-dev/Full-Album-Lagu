import { extractFilenameOrderNumber } from "./media-intake-service";
import {
  projectDocumentSchema,
  type ProjectDocument,
  type ProjectTrack,
} from "../../domain/project-document";
import type {
  ProjectCommandBatch,
  ProjectStateToken,
} from "./project-command-engine";

export type AutoArrangeNumberSource = "audio-metadata" | "filename" | "none";

export interface AutoArrangePlanItem {
  trackId: string;
  fromIndex: number;
  toIndex: number;
  enabled: boolean;
  numberSource: AutoArrangeNumberSource;
  orderNumber?: number;
  normalizedName: string;
}

export interface AutoArrangePlan {
  projectId: string;
  baseRevision: number;
  baseStateToken: ProjectStateToken;
  changed: boolean;
  orderedTrackIds: string[];
  items: AutoArrangePlanItem[];
}

interface AutoArrangeCandidate {
  track: ProjectTrack;
  originalIndex: number;
  numberSource: AutoArrangeNumberSource;
  orderNumber?: number;
  normalizedName: string;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizedText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function filenameStem(fileName: string): string {
  const normalized = fileName.replace(/\\/g, "/");
  const leaf = normalized.split("/").pop() ?? normalized;
  const dotIndex = leaf.lastIndexOf(".");
  const stem = dotIndex > 0 ? leaf.slice(0, dotIndex) : leaf;
  return stem.trim();
}

function sourceFileName(project: ProjectDocument, track: ProjectTrack): string {
  if (track.audioAssetId !== undefined) {
    const asset = project.mediaAssets?.find(
      (candidate) =>
        candidate.id === track.audioAssetId && candidate.kind === "audio",
    );
    if (asset?.fileName !== undefined) return asset.fileName;
  }

  const sourcePath = track.sourcePath.replace(/\\/g, "/");
  return sourcePath.split("/").pop() ?? sourcePath;
}

function metadataTrackNumber(
  project: ProjectDocument,
  track: ProjectTrack,
): number | undefined {
  if (track.audioAssetId === undefined) return undefined;

  const asset = project.mediaAssets?.find(
    (candidate) =>
      candidate.id === track.audioAssetId && candidate.kind === "audio",
  );
  const value = asset?.metadata?.trackNumber;

  return Number.isInteger(value) && (value ?? 0) > 0 ? value : undefined;
}

function candidateFor(
  project: ProjectDocument,
  track: ProjectTrack,
  originalIndex: number,
): AutoArrangeCandidate {
  const fileName = sourceFileName(project, track);
  const metadataNumber = metadataTrackNumber(project, track);
  const filenameNumber = extractFilenameOrderNumber(fileName);
  const orderNumber = metadataNumber ?? filenameNumber;
  const numberSource: AutoArrangeNumberSource =
    metadataNumber !== undefined
      ? "audio-metadata"
      : filenameNumber !== undefined
        ? "filename"
        : "none";
  const normalizedName =
    normalizedText(filenameStem(fileName)) || normalizedText(track.title);

  return {
    track,
    originalIndex,
    numberSource,
    ...(orderNumber === undefined ? {} : { orderNumber }),
    normalizedName,
  };
}

function compareCandidates(
  left: AutoArrangeCandidate,
  right: AutoArrangeCandidate,
): number {
  if (left.orderNumber !== undefined || right.orderNumber !== undefined) {
    if (left.orderNumber === undefined) return 1;
    if (right.orderNumber === undefined) return -1;
    if (left.orderNumber !== right.orderNumber) {
      return left.orderNumber - right.orderNumber;
    }
  }

  const nameCompare = compareText(left.normalizedName, right.normalizedName);
  if (nameCompare !== 0) return nameCompare;

  if (left.originalIndex !== right.originalIndex) {
    return left.originalIndex - right.originalIndex;
  }

  return compareText(left.track.id, right.track.id);
}

function requireStateToken(stateToken: ProjectStateToken): ProjectStateToken {
  if (stateToken.trim().length === 0) {
    throw new Error("Auto Susun state token must be non-empty.");
  }
  return stateToken;
}

function validatePlanAgainstProject(
  project: ProjectDocument,
  plan: AutoArrangePlan,
): void {
  if (project.projectId !== plan.projectId) {
    throw new Error("Auto Susun plan targets a different project.");
  }

  if (project.revision !== plan.baseRevision) {
    throw new Error("Auto Susun plan revision is stale.");
  }

  if (plan.orderedTrackIds.length !== project.tracks.length) {
    throw new Error("Auto Susun plan must include every canonical track.");
  }

  const uniqueIds = new Set(plan.orderedTrackIds);
  if (uniqueIds.size !== plan.orderedTrackIds.length) {
    throw new Error("Auto Susun plan contains duplicate track IDs.");
  }

  const currentIds = new Set(project.tracks.map((track) => track.id));
  for (const trackId of plan.orderedTrackIds) {
    if (!currentIds.has(trackId)) {
      throw new Error("Auto Susun plan contains an unknown track ID.");
    }
  }
}

export function createAutoArrangePlan(
  projectInput: ProjectDocument,
  stateToken: ProjectStateToken,
): AutoArrangePlan {
  const project = projectDocumentSchema.parse(projectInput);
  const baseStateToken = requireStateToken(stateToken);
  const candidates = project.tracks.map((track, originalIndex) =>
    candidateFor(project, track, originalIndex),
  );

  const ordered = [...candidates].sort(compareCandidates);
  const orderedTrackIds = ordered.map((candidate) => candidate.track.id);
  const changed = orderedTrackIds.some(
    (trackId, index) => project.tracks[index]?.id !== trackId,
  );
  const targetIndexById = new Map(
    orderedTrackIds.map((trackId, index) => [trackId, index]),
  );

  return {
    projectId: project.projectId,
    baseRevision: project.revision,
    baseStateToken,
    changed,
    orderedTrackIds,
    items: candidates.map((candidate) => ({
      trackId: candidate.track.id,
      fromIndex: candidate.originalIndex,
      toIndex:
        targetIndexById.get(candidate.track.id) ?? candidate.originalIndex,
      enabled: candidate.track.enabled !== false,
      numberSource: candidate.numberSource,
      ...(candidate.orderNumber === undefined
        ? {}
        : { orderNumber: candidate.orderNumber }),
      normalizedName: candidate.normalizedName,
    })),
  };
}

export function applyAutoArrangePlan(
  projectInput: ProjectDocument,
  planInput: AutoArrangePlan,
): ProjectDocument {
  const project = projectDocumentSchema.parse(projectInput);
  const plan = structuredClone(planInput);
  validatePlanAgainstProject(project, plan);

  const currentOrder = project.tracks.map((track) => track.id);
  if (
    currentOrder.length === plan.orderedTrackIds.length &&
    currentOrder.every(
      (trackId, index) => trackId === plan.orderedTrackIds[index],
    )
  ) {
    return project;
  }

  const tracksById = new Map(
    project.tracks.map((track) => [track.id, track] as const),
  );
  const tracks = plan.orderedTrackIds.map((trackId) => {
    const track = tracksById.get(trackId);
    if (track === undefined) {
      throw new Error("Auto Susun plan could not resolve a track.");
    }
    return track;
  });

  return projectDocumentSchema.parse({
    ...project,
    tracks,
  });
}

export function createAutoArrangeCommandBatch(
  planInput: AutoArrangePlan,
): ProjectCommandBatch {
  const plan = structuredClone(planInput);
  requireStateToken(plan.baseStateToken);

  return {
    kind: "album.auto-arrange",
    label: "Auto Susun Album",
    origin: "auto-susun",
    expectedBaseRevision: plan.baseRevision,
    expectedStateToken: plan.baseStateToken,
    commands: [
      {
        kind: "album.auto-arrange.apply-order",
        label: "Terapkan urutan Auto Susun",
        origin: "auto-susun",
        expectedBaseRevision: plan.baseRevision,
        expectedStateToken: plan.baseStateToken,
        apply: (project) => applyAutoArrangePlan(project, plan),
      },
    ],
  };
}
