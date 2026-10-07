import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";
import type { TrackMetadataOverrides } from "./project-metadata-commands";

export interface TrackMetadataDraft {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  year: string;
}

export type TrackMetadataDraftPatch = Partial<
  Omit<TrackMetadataDraft, "trackId">
>;

function requireTrack(project: ProjectDocument, trackId: string) {
  const normalized = trackId.trim();
  if (normalized.length === 0) {
    throw new Error("Metadata draft track ID must be non-empty.");
  }

  const track = project.tracks.find((candidate) => candidate.id === normalized);
  if (track === undefined) {
    throw new Error("Metadata draft target track does not exist.");
  }

  return track;
}

export function createTrackMetadataDraft(
  projectInput: ProjectDocument,
  trackId: string,
): TrackMetadataDraft {
  const project = projectDocumentSchema.parse(projectInput);
  const track = requireTrack(project, trackId);

  return {
    trackId: track.id,
    title: track.binding?.titleOverride ?? "",
    artist: track.binding?.artistOverride ?? "",
    album: track.binding?.albumOverride ?? "",
    year:
      track.binding?.yearOverride === undefined
        ? ""
        : String(track.binding.yearOverride),
  };
}

export function updateTrackMetadataDraft(
  draft: TrackMetadataDraft,
  patch: TrackMetadataDraftPatch,
): TrackMetadataDraft {
  return {
    ...draft,
    ...patch,
    trackId: draft.trackId,
  };
}

export function overridesFromTrackMetadataDraft(
  draft: TrackMetadataDraft,
): TrackMetadataOverrides {
  const title = draft.title.trim();
  const artist = draft.artist.trim();
  const album = draft.album.trim();
  const yearText = draft.year.trim();

  let yearOverride: number | undefined;
  if (yearText.length > 0) {
    if (!/^\d{4}$/u.test(yearText)) {
      throw new Error("Metadata draft year must contain exactly four digits.");
    }

    const parsedYear = Number(yearText);
    if (parsedYear < 1000 || parsedYear > 9999) {
      throw new Error("Metadata draft year must be from 1000 to 9999.");
    }
    yearOverride = parsedYear;
  }

  return {
    ...(title.length === 0 ? {} : { titleOverride: title }),
    ...(artist.length === 0 ? {} : { artistOverride: artist }),
    ...(album.length === 0 ? {} : { albumOverride: album }),
    ...(yearOverride === undefined ? {} : { yearOverride }),
  };
}
