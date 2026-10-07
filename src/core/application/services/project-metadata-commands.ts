import {
  projectDocumentSchema,
  type ProjectDocument,
  type ProjectTrack,
  type ProjectTrackBinding,
} from "../../domain/project-document";
import type {
  ProjectCommand,
  ProjectStateToken,
} from "./project-command-engine";

export const TRACK_METADATA_OVERRIDE_FIELDS = [
  "titleOverride",
  "artistOverride",
  "albumOverride",
  "yearOverride",
] as const;

export type TrackMetadataOverrideField =
  (typeof TRACK_METADATA_OVERRIDE_FIELDS)[number];

export interface TrackMetadataOverrides {
  titleOverride?: string;
  artistOverride?: string;
  albumOverride?: string;
  yearOverride?: number;
}

export interface MetadataCommandExpectation {
  expectedBaseRevision?: number;
  expectedStateToken?: ProjectStateToken;
}

export interface SetTrackMetadataOverridesCommandInput
  extends MetadataCommandExpectation {
  trackId: string;
  overrides: TrackMetadataOverrides;
}

export interface ClearTrackMetadataOverridesCommandInput
  extends MetadataCommandExpectation {
  trackId: string;
  fields?: readonly TrackMetadataOverrideField[];
}

const OVERRIDE_FIELD_SET = new Set<string>(TRACK_METADATA_OVERRIDE_FIELDS);

function expectationFields(
  input: MetadataCommandExpectation,
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
    throw new Error("Metadata target track ID must be non-empty.");
  }
  return normalized;
}

function updateTrack(
  project: ProjectDocument,
  trackId: string,
  updater: (track: ProjectTrack) => ProjectTrack,
): ProjectDocument {
  const normalized = requireTrackId(trackId);
  const index = project.tracks.findIndex((track) => track.id === normalized);
  if (index < 0) {
    throw new Error("Metadata target track does not exist.");
  }

  const current = project.tracks[index];
  if (current === undefined) {
    throw new Error("Metadata target track could not be resolved.");
  }

  const tracks = [...project.tracks];
  tracks[index] = updater(current);
  return projectDocumentSchema.parse({ ...project, tracks });
}

function normalizeTextOverride(
  value: string | undefined,
  label: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${label} override must be text.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} override must be non-empty.`);
  }
  if (normalized.length > 500) {
    throw new Error(`${label} override is too long.`);
  }

  return normalized;
}

function normalizeOverrides(
  input: TrackMetadataOverrides,
): TrackMetadataOverrides {
  for (const key of Object.keys(input)) {
    if (!OVERRIDE_FIELD_SET.has(key)) {
      throw new Error("Unknown metadata override field.");
    }
  }

  const titleOverride = normalizeTextOverride(
    input.titleOverride,
    "Title",
  );
  const artistOverride = normalizeTextOverride(
    input.artistOverride,
    "Artist",
  );
  const albumOverride = normalizeTextOverride(
    input.albumOverride,
    "Album",
  );

  let yearOverride: number | undefined;
  if (input.yearOverride !== undefined) {
    if (
      !Number.isInteger(input.yearOverride) ||
      input.yearOverride < 1000 ||
      input.yearOverride > 9999
    ) {
      throw new Error("Year override must be an integer from 1000 to 9999.");
    }
    yearOverride = input.yearOverride;
  }

  return {
    ...(titleOverride === undefined ? {} : { titleOverride }),
    ...(artistOverride === undefined ? {} : { artistOverride }),
    ...(albumOverride === undefined ? {} : { albumOverride }),
    ...(yearOverride === undefined ? {} : { yearOverride }),
  };
}

function clearMetadataFields(
  binding: ProjectTrackBinding | undefined,
  fields: readonly TrackMetadataOverrideField[],
): ProjectTrackBinding | undefined {
  if (binding === undefined) return undefined;

  const next = { ...binding };
  for (const field of fields) {
    delete next[field];
  }

  return Object.keys(next).length === 0 ? undefined : next;
}

export function createSetTrackMetadataOverridesCommand(
  input: SetTrackMetadataOverridesCommandInput,
): ProjectCommand {
  return {
    kind: "metadata.set-overrides",
    label: `Atur metadata track ${input.trackId}`,
    origin: "manual",
    ...expectationFields(input),
    apply: (project) => {
      const overrides = normalizeOverrides(input.overrides);
      if (Object.keys(overrides).length === 0) return project;

      return updateTrack(project, input.trackId, (track) => ({
        ...track,
        binding: {
          ...(track.binding ?? {}),
          ...overrides,
        },
      }));
    },
  };
}

export function createClearTrackMetadataOverridesCommand(
  input: ClearTrackMetadataOverridesCommandInput,
): ProjectCommand {
  return {
    kind: "metadata.clear-overrides",
    label: `Hapus metadata override track ${input.trackId}`,
    origin: "manual",
    ...expectationFields(input),
    apply: (project) => {
      const fields = input.fields ?? TRACK_METADATA_OVERRIDE_FIELDS;
      const uniqueFields = [...new Set(fields)];

      for (const field of uniqueFields) {
        if (!OVERRIDE_FIELD_SET.has(field)) {
          throw new Error("Unknown metadata override field.");
        }
      }

      if (uniqueFields.length === 0) return project;

      return updateTrack(project, input.trackId, (track) => {
        const binding = clearMetadataFields(track.binding, uniqueFields);
        if (binding === track.binding) return track;

        const next: ProjectTrack = { ...track };
        if (binding === undefined) delete next.binding;
        else next.binding = binding;
        return next;
      });
    },
  };
}
