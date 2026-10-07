import type {
  AudioMediaMetadata,
  MediaAssetReference,
} from "../../domain/media-asset";
import {
  projectDocumentSchema,
  type ProjectDocument,
  type ProjectTrack,
} from "../../domain/project-document";
import type {
  ProjectCommand,
  ProjectCommandBatch,
  ProjectStateToken,
} from "./project-command-engine";

export interface AutoArrangePlan {
  projectId: string;
  baseRevision: number;
  baseStateToken: ProjectStateToken;
  baseTrackIds: readonly string[];
  orderedTrackIds: readonly string[];
  changed: boolean;
}

interface AutoArrangeSortRecord {
  trackId: string;
  originalIndex: number;
  metadataTrackNumber?: number;
  filenameNumber?: number;
  normalizedName: string;
}

function compareOptionalNumber(
  left: number | undefined,
  right: number | undefined,
): number {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function leafName(pathOrName: string): string {
  const normalized = pathOrName.replace(/\\/g, "/");
  return normalized.split("/").pop() ?? normalized;
}

function filenameStem(pathOrName: string): string {
  const leaf = leafName(pathOrName);
  const dotIndex = leaf.lastIndexOf(".");
  return (dotIndex > 0 ? leaf.slice(0, dotIndex) : leaf).trim();
}

function leadingFilenameNumber(pathOrName: string): number | undefined {
  const match = /^\s*(\d+)/u.exec(filenameStem(pathOrName));
  if (match?.[1] === undefined) return undefined;

  const value = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function normalizeSortName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function findAudioAsset(
  assetsById: ReadonlyMap<string, MediaAssetReference>,
  track: ProjectTrack,
): MediaAssetReference | undefined {
  if (track.audioAssetId === undefined) return undefined;
  const asset = assetsById.get(track.audioAssetId);
  return asset?.kind === "audio" ? asset : undefined;
}

function metadataTrackNumber(
  metadata: AudioMediaMetadata | undefined,
): number | undefined {
  const value = metadata?.trackNumber;
  return value !== undefined && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function createSortRecord(
  track: ProjectTrack,
  originalIndex: number,
  assetsById: ReadonlyMap<string, MediaAssetReference>,
): AutoArrangeSortRecord {
  const audioAsset = findAudioAsset(assetsById, track);
  const sourceName = audioAsset?.fileName ?? leafName(track.sourcePath);
  const filenameName = normalizeSortName(filenameStem(sourceName));
  const trackName = normalizeSortName(track.title);

  return {
    trackId: track.id,
    originalIndex,
    metadataTrackNumber: metadataTrackNumber(audioAsset?.metadata),
    filenameNumber: leadingFilenameNumber(sourceName),
    normalizedName: filenameName || trackName || normalizeSortName(track.id),
  };
}

function compareSortRecords(
  left: AutoArrangeSortRecord,
  right: AutoArrangeSortRecord,
): number {
  const trackNumberOrder = compareOptionalNumber(
    left.metadataTrackNumber,
    right.metadataTrackNumber,
  );
  if (trackNumberOrder !== 0) return trackNumberOrder;

  const filenameNumberOrder = compareOptionalNumber(
    left.filenameNumber,
    right.filenameNumber,
  );
  if (filenameNumberOrder !== 0) return filenameNumberOrder;

  const normalizedNameOrder = compareText(
    left.normalizedName,
    right.normalizedName,
  );
  if (normalizedNameOrder !== 0) return normalizedNameOrder;

  if (left.originalIndex < right.originalIndex) return -1;
  if (left.originalIndex > right.originalIndex) return 1;

  return compareText(left.trackId, right.trackId);
}

function sameOrder(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((trackId, index) => trackId === right[index])
  );
}

function requireStateToken(stateToken: ProjectStateToken): ProjectStateToken {
  const normalized = stateToken.trim();
  if (normalized.length === 0) {
    throw new Error("Auto Susun requires a non-empty project state token.");
  }
  return normalized;
}

function requireUniqueTrackIds(trackIds: readonly string[]): void {
  if (new Set(trackIds).size !== trackIds.length) {
    throw new Error("Auto Susun requires unique track IDs.");
  }
}

function validatePlan(plan: AutoArrangePlan): void {
  if (plan.projectId.trim().length === 0) {
    throw new Error("Auto Susun plan requires a project ID.");
  }
  if (!Number.isInteger(plan.baseRevision) || plan.baseRevision < 0) {
    throw new Error("Auto Susun plan base revision must be non-negative.");
  }
  requireStateToken(plan.baseStateToken);

  requireUniqueTrackIds(plan.baseTrackIds);
  requireUniqueTrackIds(plan.orderedTrackIds);

  if (plan.baseTrackIds.length !== plan.orderedTrackIds.length) {
    throw new Error("Auto Susun plan must preserve the track set.");
  }

  const targetIds = new Set(plan.orderedTrackIds);
  if (plan.baseTrackIds.some((trackId) => !targetIds.has(trackId))) {
    throw new Error("Auto Susun plan must preserve the track set.");
  }

  if (plan.changed === sameOrder(plan.baseTrackIds, plan.orderedTrackIds)) {
    throw new Error("Auto Susun plan changed flag does not match its order.");
  }
}

export function createAutoArrangePlan(
  projectInput: ProjectDocument,
  stateToken: ProjectStateToken,
): AutoArrangePlan {
  const project = projectDocumentSchema.parse(projectInput);
  const baseStateToken = requireStateToken(stateToken);
  const baseTrackIds = project.tracks.map((track) => track.id);

  requireUniqueTrackIds(baseTrackIds);

  const assetsById = new Map(
    (project.mediaAssets ?? []).map((asset) => [asset.id, asset]),
  );
  const orderedTrackIds = project.tracks
    .map((track, originalIndex) =>
      createSortRecord(track, originalIndex, assetsById),
    )
    .sort(compareSortRecords)
    .map((record) => record.trackId);

  return {
    projectId: project.projectId,
    baseRevision: project.revision,
    baseStateToken,
    baseTrackIds,
    orderedTrackIds,
    changed: !sameOrder(baseTrackIds, orderedTrackIds),
  };
}

function expectationFields(
  plan: AutoArrangePlan,
): Pick<ProjectCommand, "expectedBaseRevision" | "expectedStateToken"> {
  return {
    expectedBaseRevision: plan.baseRevision,
    expectedStateToken: plan.baseStateToken,
  };
}

export function createAutoArrangeCommandBatch(
  planInput: AutoArrangePlan,
): ProjectCommandBatch {
  const plan: AutoArrangePlan = {
    ...planInput,
    baseTrackIds: [...planInput.baseTrackIds],
    orderedTrackIds: [...planInput.orderedTrackIds],
  };
  validatePlan(plan);

  const commands: ProjectCommand[] = plan.changed
    ? [
        {
          kind: "track.apply-auto-susun-order",
          label: "Terapkan urutan Auto Susun",
          origin: "auto-susun",
          ...expectationFields(plan),
          apply: (project) => {
            if (project.projectId !== plan.projectId) {
              throw new Error("Auto Susun plan targets a different project.");
            }

            const currentTrackIds = project.tracks.map((track) => track.id);
            if (!sameOrder(currentTrackIds, plan.baseTrackIds)) {
              throw new Error("Auto Susun plan track order is stale.");
            }

            const tracksById = new Map(
              project.tracks.map((track) => [track.id, track]),
            );
            const tracks = plan.orderedTrackIds.map((trackId) => {
              const track = tracksById.get(trackId);
              if (track === undefined) {
                throw new Error("Auto Susun plan references an unknown track.");
              }
              return track;
            });

            return projectDocumentSchema.parse({
              ...project,
              tracks,
            });
          },
        },
      ]
    : [];

  return {
    kind: "album.auto-susun",
    label: "Auto Susun Album",
    origin: "auto-susun",
    ...expectationFields(plan),
    commands,
  };
}
