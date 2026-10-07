import {
  isProjectTrackEnabled,
} from "../../domain/album-timeline";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";
import type {
  ProjectCommand,
  ProjectCommandOrigin,
  ProjectStateToken,
} from "./project-command-engine";

export interface TrackCommandExpectation {
  expectedBaseRevision?: number;
  expectedStateToken?: ProjectStateToken;
}

export interface TrackReorderCommandInput extends TrackCommandExpectation {
  trackId: string;
  toIndex: number;
  origin?: ProjectCommandOrigin;
}

export interface TrackSetEnabledCommandInput extends TrackCommandExpectation {
  trackId: string;
  enabled: boolean;
  origin?: ProjectCommandOrigin;
}

function expectationFields(
  input: TrackCommandExpectation,
): Pick<ProjectCommand, "expectedBaseRevision" | "expectedStateToken"> {
  return {
    ...(input.expectedBaseRevision === undefined
      ? {}
      : { expectedBaseRevision: input.expectedBaseRevision }),
    ...(input.expectedStateToken === undefined
      ? {}
      : { expectedStateToken: input.expectedStateToken }),
  };
}

function requireTrackId(trackId: string): string {
  const normalized = trackId.trim();
  if (normalized.length === 0) {
    throw new Error("Track ID must be non-empty.");
  }
  return normalized;
}

export function synchronizeRequiredAudioAssets(
  projectInput: ProjectDocument,
): ProjectDocument {
  const project = projectDocumentSchema.parse(projectInput);
  if (project.mediaAssets === undefined) return project;

  const referencedAudioAssetIds = new Set<string>();
  const enabledAudioAssetIds = new Set<string>();

  for (const track of project.tracks) {
    if (track.audioAssetId === undefined) continue;
    referencedAudioAssetIds.add(track.audioAssetId);
    if (isProjectTrackEnabled(track)) {
      enabledAudioAssetIds.add(track.audioAssetId);
    }
  }

  let changed = false;
  const mediaAssets = project.mediaAssets.map((asset) => {
    if (
      asset.kind !== "audio" ||
      !referencedAudioAssetIds.has(asset.id)
    ) {
      return asset;
    }

    const required = enabledAudioAssetIds.has(asset.id);
    if (asset.required === required) return asset;

    changed = true;
    return { ...asset, required };
  });

  if (!changed) return project;

  return projectDocumentSchema.parse({
    ...project,
    mediaAssets,
  });
}

export function createTrackReorderCommand(
  input: TrackReorderCommandInput,
): ProjectCommand {
  return {
    kind: "track.reorder",
    label: `Pindahkan track ${input.trackId}`,
    origin: input.origin ?? "manual",
    ...expectationFields(input),
    apply: (project) => {
      const trackId = requireTrackId(input.trackId);
      if (!Number.isInteger(input.toIndex)) {
        throw new Error("Track reorder target index must be an integer.");
      }

      const fromIndex = project.tracks.findIndex(
        (track) => track.id === trackId,
      );
      if (fromIndex < 0) {
        throw new Error("Track reorder target does not exist.");
      }

      if (input.toIndex < 0 || input.toIndex >= project.tracks.length) {
        throw new Error("Track reorder target index is out of range.");
      }

      if (fromIndex === input.toIndex) return project;

      const tracks = [...project.tracks];
      const [moved] = tracks.splice(fromIndex, 1);
      if (moved === undefined) {
        throw new Error("Track reorder target could not be resolved.");
      }
      tracks.splice(input.toIndex, 0, moved);

      return projectDocumentSchema.parse({
        ...project,
        tracks,
      });
    },
  };
}

export function createTrackSetEnabledCommand(
  input: TrackSetEnabledCommandInput,
): ProjectCommand {
  return {
    kind: "track.set-enabled",
    label: input.enabled
      ? `Aktifkan track ${input.trackId}`
      : `Nonaktifkan track ${input.trackId}`,
    origin: input.origin ?? "manual",
    ...expectationFields(input),
    apply: (project) => {
      const trackId = requireTrackId(input.trackId);
      if (typeof input.enabled !== "boolean") {
        throw new Error("Track enabled state must be boolean.");
      }

      const trackIndex = project.tracks.findIndex(
        (track) => track.id === trackId,
      );
      if (trackIndex < 0) {
        throw new Error("Track enable target does not exist.");
      }

      const currentTrack = project.tracks[trackIndex];
      if (currentTrack === undefined) {
        throw new Error("Track enable target could not be resolved.");
      }

      if (isProjectTrackEnabled(currentTrack) === input.enabled) {
        return project;
      }

      const tracks = [...project.tracks];
      tracks[trackIndex] = {
        ...currentTrack,
        enabled: input.enabled,
      };

      return synchronizeRequiredAudioAssets(
        projectDocumentSchema.parse({
          ...project,
          tracks,
        }),
      );
    },
  };
}
