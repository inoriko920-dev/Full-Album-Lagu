import type { ArtworkBindingTarget } from "../../contracts/artwork-intake";
import type { MediaAssetReference } from "../../domain/media-asset";
import {
  projectDocumentSchema,
  type ProjectDocument,
  type ProjectTrack,
  type ProjectTrackBinding,
} from "../../domain/project-document";
import type {
  ProjectCommand,
  ProjectCommandBatch,
  ProjectCommandOrigin,
  ProjectStateToken,
} from "./project-command-engine";

export interface ArtworkCommandExpectation {
  expectedBaseRevision?: number;
  expectedStateToken?: ProjectStateToken;
}

export interface SetAlbumArtworkCommandInput extends ArtworkCommandExpectation {
  assetId?: string;
  origin?: ProjectCommandOrigin;
}

export interface SetTrackArtworkCommandInput extends ArtworkCommandExpectation {
  trackId: string;
  assetId?: string;
  origin?: ProjectCommandOrigin;
}

export interface ImportAndBindArtworkBatchInput extends ArtworkCommandExpectation {
  asset: MediaAssetReference;
  target: ArtworkBindingTarget;
  origin?: ProjectCommandOrigin;
}

function expectationFields(
  input: ArtworkCommandExpectation,
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

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) throw new Error(`${label} must be non-empty.`);
  return normalized;
}

function requireImageAsset(
  project: ProjectDocument,
  assetId: string,
): MediaAssetReference {
  const normalized = requireNonEmpty(assetId, "Artwork asset ID");
  const asset = project.mediaAssets?.find(
    (candidate) => candidate.id === normalized,
  );
  if (asset === undefined) throw new Error("Artwork asset does not exist.");
  if (asset.kind !== "image")
    throw new Error("Artwork asset must be an image.");
  return asset;
}

function updateTrack(
  project: ProjectDocument,
  trackId: string,
  updater: (track: ProjectTrack) => ProjectTrack,
): ProjectDocument {
  const normalized = requireNonEmpty(trackId, "Track ID");
  const index = project.tracks.findIndex((track) => track.id === normalized);
  if (index < 0) throw new Error("Artwork target track does not exist.");
  const current = project.tracks[index];
  if (current === undefined) {
    throw new Error("Artwork target track could not be resolved.");
  }
  const tracks = [...project.tracks];
  tracks[index] = updater(current);
  return projectDocumentSchema.parse({ ...project, tracks });
}

function bindingWithoutArtwork(
  binding: ProjectTrackBinding | undefined,
): ProjectTrackBinding | undefined {
  if (binding === undefined || binding.artworkAssetId === undefined) {
    return binding;
  }
  const next = { ...binding };
  delete next.artworkAssetId;
  return Object.keys(next).length === 0 ? undefined : next;
}

export function createSetAlbumArtworkCommand(
  input: SetAlbumArtworkCommandInput,
): ProjectCommand {
  return {
    kind: "artwork.set-album-default",
    label:
      input.assetId === undefined
        ? "Hapus artwork default album"
        : "Atur artwork default album",
    origin: input.origin ?? "manual",
    ...expectationFields(input),
    apply: (project) => {
      if (input.assetId !== undefined) {
        requireImageAsset(project, input.assetId);
        if (
          project.albumPresentation?.defaultArtworkAssetId === input.assetId
        ) {
          return project;
        }
        return projectDocumentSchema.parse({
          ...project,
          albumPresentation: { defaultArtworkAssetId: input.assetId },
        });
      }
      if (project.albumPresentation?.defaultArtworkAssetId === undefined) {
        return project;
      }
      const next: ProjectDocument = { ...project };
      delete next.albumPresentation;
      return projectDocumentSchema.parse(next);
    },
  };
}

export function createSetTrackArtworkCommand(
  input: SetTrackArtworkCommandInput,
): ProjectCommand {
  return {
    kind: "artwork.set-track",
    label:
      input.assetId === undefined
        ? `Hapus artwork track ${input.trackId}`
        : `Atur artwork track ${input.trackId}`,
    origin: input.origin ?? "manual",
    ...expectationFields(input),
    apply: (project) => {
      if (input.assetId !== undefined)
        requireImageAsset(project, input.assetId);
      return updateTrack(project, input.trackId, (track) => {
        if (input.assetId !== undefined) {
          if (track.binding?.artworkAssetId === input.assetId) return track;
          return {
            ...track,
            binding: {
              ...(track.binding ?? {}),
              artworkAssetId: input.assetId,
            },
          };
        }
        const binding = bindingWithoutArtwork(track.binding);
        if (binding === track.binding) return track;
        const next: ProjectTrack = { ...track };
        if (binding === undefined) delete next.binding;
        else next.binding = binding;
        return next;
      });
    },
  };
}

function createAddArtworkAssetCommand(
  assetInput: MediaAssetReference,
  origin: ProjectCommandOrigin,
): ProjectCommand {
  const asset = structuredClone(assetInput);
  return {
    kind: "artwork.add-asset",
    label: `Impor artwork ${asset.fileName}`,
    origin,
    apply: (project) => {
      if (asset.kind !== "image") {
        throw new Error("Imported artwork asset must be an image.");
      }
      if (asset.required) {
        throw new Error("Imported artwork must remain optional.");
      }
      if (asset.availability !== "ready") {
        throw new Error("Imported artwork must be readable before binding.");
      }
      if (
        (project.mediaAssets ?? []).some(
          (candidate) => candidate.id === asset.id,
        )
      ) {
        throw new Error("Imported artwork asset ID already exists.");
      }
      return projectDocumentSchema.parse({
        ...project,
        mediaAssets: [...(project.mediaAssets ?? []), asset],
      });
    },
  };
}

export function createImportAndBindArtworkBatch(
  input: ImportAndBindArtworkBatchInput,
): ProjectCommandBatch {
  const origin = input.origin ?? "manual";
  const asset = structuredClone(input.asset);
  const bindCommand =
    input.target.kind === "album-default"
      ? createSetAlbumArtworkCommand({ assetId: asset.id, origin })
      : createSetTrackArtworkCommand({
          trackId: input.target.trackId,
          assetId: asset.id,
          origin,
        });

  return {
    kind: "artwork.import-bind",
    label:
      input.target.kind === "album-default"
        ? "Impor dan pasang artwork album"
        : `Impor dan pasang artwork track ${input.target.trackId}`,
    origin,
    ...expectationFields(input),
    commands: [createAddArtworkAssetCommand(asset, origin), bindCommand],
  };
}
