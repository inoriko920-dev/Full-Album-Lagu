import type { AudioMediaMetadata, MediaAvailability } from "./media-asset";
import {
  projectDocumentSchema,
  type ProjectDocument,
  type ProjectTrackBinding,
} from "./project-document";
import {
  resolveTrackPresentation,
  type ResolvedTrackPresentation,
} from "./track-presentation";

export interface SelectedTrackExplicitOverrides {
  titleOverride?: string;
  artistOverride?: string;
  albumOverride?: string;
  yearOverride?: number;
}

export type SelectedTrackAudioStatus = MediaAvailability | "unbound";

export type SelectedTrackProjection =
  | {
      status: "none";
    }
  | {
      status: "selected";
      trackId: string;
      audioAssetId?: string;
      audioStatus: SelectedTrackAudioStatus;
      sourceMetadata?: AudioMediaMetadata;
      explicitOverrides: SelectedTrackExplicitOverrides;
      presentation: ResolvedTrackPresentation;
    };

function metadataOverrides(
  binding: ProjectTrackBinding | undefined,
): SelectedTrackExplicitOverrides {
  if (binding === undefined) return {};

  return {
    ...(binding.titleOverride === undefined
      ? {}
      : { titleOverride: binding.titleOverride }),
    ...(binding.artistOverride === undefined
      ? {}
      : { artistOverride: binding.artistOverride }),
    ...(binding.albumOverride === undefined
      ? {}
      : { albumOverride: binding.albumOverride }),
    ...(binding.yearOverride === undefined
      ? {}
      : { yearOverride: binding.yearOverride }),
  };
}

export function resolveSelectedTrackProjection(
  projectInput: ProjectDocument,
  trackId: string | null,
): SelectedTrackProjection {
  const project = projectDocumentSchema.parse(projectInput);
  if (trackId === null) return { status: "none" };

  const track = project.tracks.find((candidate) => candidate.id === trackId);
  if (track === undefined) return { status: "none" };

  const audioAsset =
    track.audioAssetId === undefined
      ? undefined
      : project.mediaAssets?.find(
          (asset) => asset.id === track.audioAssetId && asset.kind === "audio",
        );

  return {
    status: "selected",
    trackId: track.id,
    ...(track.audioAssetId === undefined
      ? {}
      : { audioAssetId: track.audioAssetId }),
    audioStatus: audioAsset?.availability ?? "unbound",
    ...(audioAsset?.metadata === undefined
      ? {}
      : { sourceMetadata: structuredClone(audioAsset.metadata) }),
    explicitOverrides: metadataOverrides(track.binding),
    presentation: resolveTrackPresentation(project, track.id),
  };
}
