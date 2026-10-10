import type { ProjectCommand, ProjectStateToken } from "./project-command-engine";
import { projectAlbumTimeline } from "../../domain/album-timeline";
import { projectDocumentSchema } from "../../domain/project-document";
import {
  visualBoundaryTransitionSchema,
  type VisualBoundaryTransition,
} from "../../domain/visual-scene-schema";

/**
 * A boundary is editable only while the actual canonical enabled tracks form
 * that adjacent directed pair and their audio sources are ready. A stored
 * stale transition remains in the document for history/reconciliation but
 * never becomes a ghost boundary control or active visual event.
 */
export function isEditableBoundaryPair(
  project: Parameters<typeof projectAlbumTimeline>[0],
  fromTrackId: string,
  toTrackId: string,
): boolean {
  const items = projectAlbumTimeline(project).items.filter(
    (item) => item.status === "resolved",
  );
  const index = items.findIndex((item) => item.trackId === fromTrackId);
  if (index < 0 || index >= items.length - 1) return false;
  const from = items[index]!;
  const to = items[index + 1]!;
  if (to.trackId !== toTrackId || from.endMs !== to.startMs) return false;
  return [from, to].every((item) => {
    const track = project.tracks[item.sourceIndex];
    return project.mediaAssets?.some(
      (asset) =>
        asset.id === track?.audioAssetId &&
        asset.kind === "audio" &&
        asset.availability === "ready",
    ) ?? false;
  });
}

export interface BoundaryCommandExpectation {
  expectedBaseRevision?: number;
  expectedStateToken?: ProjectStateToken;
}

export interface SetBoundaryTransitionInput extends BoundaryCommandExpectation {
  fromTrackId: string;
  toTrackId: string;
  /** Undefined removes a configured transition; no implicit defaults saved. */
  transition?: VisualBoundaryTransition;
}

/** A single official history action; stale state and orphan pairs fail closed. */
export function createSetBoundaryTransitionCommand(
  input: SetBoundaryTransitionInput,
): ProjectCommand {
  const transition = input.transition === undefined
    ? undefined
    : visualBoundaryTransitionSchema.parse(structuredClone(input.transition));
  if (transition !== undefined &&
    (transition.fromTrackId !== input.fromTrackId ||
     transition.toTrackId !== input.toTrackId)) {
    throw new Error("Boundary transition must match its directed track pair.");
  }
  return {
    kind: "boundary.set-transition",
    label: `Atur transisi ${input.fromTrackId} → ${input.toTrackId}`,
    origin: "manual",
    ...(input.expectedBaseRevision === undefined
      ? {} : { expectedBaseRevision: input.expectedBaseRevision }),
    ...(input.expectedStateToken === undefined
      ? {} : { expectedStateToken: input.expectedStateToken }),
    apply: (project) => {
      if (!isEditableBoundaryPair(project, input.fromTrackId, input.toTrackId)) {
        throw new Error("Boundary is no longer adjacent, enabled and ready.");
      }
      const entries = (project.boundaryTransitions ?? []).filter(
        (entry) => !(entry.fromTrackId === input.fromTrackId &&
          entry.toTrackId === input.toTrackId),
      );
      if (transition !== undefined) entries.push(structuredClone(transition));
      const { boundaryTransitions: _old, ...base } = project;
      // ProjectDocument has a passthrough schema; explicitly omit the field
      // when no boundaries remain, preserving clean legacy JSON.
      if (entries.length === 0) {
        const next = { ...base };
        return projectDocumentSchema.parse(next);
      }
      return projectDocumentSchema.parse({ ...base, boundaryTransitions: entries });
    },
  };
}
