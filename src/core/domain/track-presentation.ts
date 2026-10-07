import {
  projectDocumentSchema,
  type ProjectDocument,
  type ProjectTrack,
} from "./project-document";
import type { AudioMediaMetadata, MediaAssetReference } from "./media-asset";

export type TrackPresentationProvenance =
  | "manual-override"
  | "audio-metadata"
  | "track-fallback"
  | "filename-fallback"
  | "project-fallback"
  | "canonical-position"
  | "album-default"
  | "placeholder";

export interface ResolvedTrackPresentationField<T> {
  value: T;
  provenance: TrackPresentationProvenance;
}

export interface ResolvedTrackArtwork {
  assetId?: string;
  provenance: TrackPresentationProvenance;
}

export interface ResolvedTrackPresentation {
  trackId: string;
  title: ResolvedTrackPresentationField<string>;
  artist: ResolvedTrackPresentationField<string>;
  album: ResolvedTrackPresentationField<string>;
  year: ResolvedTrackPresentationField<number | undefined>;
  trackNumber: ResolvedTrackPresentationField<number>;
  artwork: ResolvedTrackArtwork;
}

function findAudioAsset(
  project: ProjectDocument,
  track: ProjectTrack,
): MediaAssetReference | undefined {
  if (track.audioAssetId === undefined) return undefined;
  return project.mediaAssets?.find(
    (asset) => asset.id === track.audioAssetId && asset.kind === "audio",
  );
}

function metadataFor(
  project: ProjectDocument,
  track: ProjectTrack,
): AudioMediaMetadata | undefined {
  return findAudioAsset(project, track)?.metadata;
}

function filenameStem(fileName: string): string {
  const normalized = fileName.replace(/\\/g, "/");
  const leaf = normalized.split("/").pop() ?? normalized;
  const dotIndex = leaf.lastIndexOf(".");
  const stem = dotIndex > 0 ? leaf.slice(0, dotIndex) : leaf;
  return stem.trim();
}

function sourceFilename(project: ProjectDocument, track: ProjectTrack): string {
  return findAudioAsset(project, track)?.fileName ?? track.sourcePath;
}

function resolveTitle(
  project: ProjectDocument,
  track: ProjectTrack,
  metadata: AudioMediaMetadata | undefined,
): ResolvedTrackPresentationField<string> {
  if (track.binding?.titleOverride !== undefined) {
    return {
      value: track.binding.titleOverride,
      provenance: "manual-override",
    };
  }

  if (metadata?.title !== undefined) {
    return { value: metadata.title, provenance: "audio-metadata" };
  }

  const trackTitle = track.title.trim();
  if (trackTitle.length > 0) {
    return { value: trackTitle, provenance: "track-fallback" };
  }

  return {
    value: filenameStem(sourceFilename(project, track)),
    provenance: "filename-fallback",
  };
}

function resolveArtist(
  track: ProjectTrack,
  metadata: AudioMediaMetadata | undefined,
): ResolvedTrackPresentationField<string> {
  if (track.binding?.artistOverride !== undefined) {
    return {
      value: track.binding.artistOverride,
      provenance: "manual-override",
    };
  }

  if (metadata?.artist !== undefined) {
    return { value: metadata.artist, provenance: "audio-metadata" };
  }

  return { value: "", provenance: "placeholder" };
}

function resolveAlbum(
  project: ProjectDocument,
  track: ProjectTrack,
  metadata: AudioMediaMetadata | undefined,
): ResolvedTrackPresentationField<string> {
  if (track.binding?.albumOverride !== undefined) {
    return {
      value: track.binding.albumOverride,
      provenance: "manual-override",
    };
  }

  if (metadata?.album !== undefined) {
    return { value: metadata.album, provenance: "audio-metadata" };
  }

  return { value: project.name, provenance: "project-fallback" };
}

function resolveYear(
  track: ProjectTrack,
  metadata: AudioMediaMetadata | undefined,
): ResolvedTrackPresentationField<number | undefined> {
  if (track.binding?.yearOverride !== undefined) {
    return {
      value: track.binding.yearOverride,
      provenance: "manual-override",
    };
  }

  if (metadata?.year !== undefined) {
    return { value: metadata.year, provenance: "audio-metadata" };
  }

  return { value: undefined, provenance: "placeholder" };
}

function resolveTrackNumber(
  metadata: AudioMediaMetadata | undefined,
  canonicalIndex: number,
): ResolvedTrackPresentationField<number> {
  if (metadata?.trackNumber !== undefined) {
    return {
      value: metadata.trackNumber,
      provenance: "audio-metadata",
    };
  }

  return {
    value: canonicalIndex + 1,
    provenance: "canonical-position",
  };
}

function resolveArtwork(
  project: ProjectDocument,
  track: ProjectTrack,
): ResolvedTrackArtwork {
  if (track.binding?.artworkAssetId !== undefined) {
    return {
      assetId: track.binding.artworkAssetId,
      provenance: "manual-override",
    };
  }

  if (project.albumPresentation?.defaultArtworkAssetId !== undefined) {
    return {
      assetId: project.albumPresentation.defaultArtworkAssetId,
      provenance: "album-default",
    };
  }

  return { provenance: "placeholder" };
}

export function resolveTrackPresentation(
  projectInput: ProjectDocument,
  trackId: string,
): ResolvedTrackPresentation {
  const project = projectDocumentSchema.parse(projectInput);
  const canonicalIndex = project.tracks.findIndex((track) => track.id === trackId);

  if (canonicalIndex < 0) {
    throw new Error("Track presentation cannot resolve an unknown track ID.");
  }

  const track = project.tracks[canonicalIndex]!;
  const metadata = metadataFor(project, track);

  return {
    trackId: track.id,
    title: resolveTitle(project, track, metadata),
    artist: resolveArtist(track, metadata),
    album: resolveAlbum(project, track, metadata),
    year: resolveYear(track, metadata),
    trackNumber: resolveTrackNumber(metadata, canonicalIndex),
    artwork: resolveArtwork(project, track),
  };
}
