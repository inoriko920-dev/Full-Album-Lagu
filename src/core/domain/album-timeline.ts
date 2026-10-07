import {
  projectDocumentSchema,
  type ProjectDocument,
  type ProjectTrack,
} from "./project-document";

export type AlbumTimelineItemStatus = "resolved" | "disabled" | "unresolved";
export type AlbumTimelineUnresolvedReason =
  | "duration-unavailable"
  | "prior-duration-unresolved";

export interface AlbumTimelineItem {
  trackId: string;
  sourceIndex: number;
  title: string;
  enabled: boolean;
  status: AlbumTimelineItemStatus;
  effectiveIndex?: number;
  durationMs?: number;
  startMs?: number;
  endMs?: number;
  unresolvedReason?: AlbumTimelineUnresolvedReason;
}

export interface AlbumTimelineProjection {
  items: AlbumTimelineItem[];
  enabledTrackCount: number;
  knownPrefixDurationMs: number;
  totalDurationMs?: number;
  complete: boolean;
  unresolvedDurationTrackIds: string[];
}

export function isProjectTrackEnabled(track: ProjectTrack): boolean {
  return track.enabled !== false;
}

function getTrackDurationMs(
  project: ProjectDocument,
  track: ProjectTrack,
): number | undefined {
  if (track.audioAssetId === undefined) return undefined;

  const asset = project.mediaAssets?.find(
    (candidate) =>
      candidate.id === track.audioAssetId && candidate.kind === "audio",
  );
  const durationMs = asset?.metadata?.durationMs;

  if (
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    return undefined;
  }

  return Math.round(durationMs);
}

export function projectAlbumTimeline(
  projectInput: ProjectDocument,
): AlbumTimelineProjection {
  const project = projectDocumentSchema.parse(projectInput);
  const items: AlbumTimelineItem[] = [];
  const unresolvedDurationTrackIds: string[] = [];

  let effectiveIndex = 0;
  let cursorMs = 0;
  let cumulativeTimingBlocked = false;

  project.tracks.forEach((track, sourceIndex) => {
    const enabled = isProjectTrackEnabled(track);
    if (!enabled) {
      items.push({
        trackId: track.id,
        sourceIndex,
        title: track.title,
        enabled: false,
        status: "disabled",
      });
      return;
    }

    const currentEffectiveIndex = effectiveIndex;
    effectiveIndex += 1;

    const durationMs = getTrackDurationMs(project, track);

    if (cumulativeTimingBlocked) {
      items.push({
        trackId: track.id,
        sourceIndex,
        title: track.title,
        enabled: true,
        status: "unresolved",
        effectiveIndex: currentEffectiveIndex,
        ...(durationMs === undefined ? {} : { durationMs }),
        unresolvedReason: "prior-duration-unresolved",
      });
      return;
    }

    if (durationMs === undefined) {
      cumulativeTimingBlocked = true;
      unresolvedDurationTrackIds.push(track.id);
      items.push({
        trackId: track.id,
        sourceIndex,
        title: track.title,
        enabled: true,
        status: "unresolved",
        effectiveIndex: currentEffectiveIndex,
        startMs: cursorMs,
        unresolvedReason: "duration-unavailable",
      });
      return;
    }

    const startMs = cursorMs;
    const endMs = startMs + durationMs;
    cursorMs = endMs;

    items.push({
      trackId: track.id,
      sourceIndex,
      title: track.title,
      enabled: true,
      status: "resolved",
      effectiveIndex: currentEffectiveIndex,
      durationMs,
      startMs,
      endMs,
    });
  });

  const complete = unresolvedDurationTrackIds.length === 0;

  return {
    items,
    enabledTrackCount: effectiveIndex,
    knownPrefixDurationMs: cursorMs,
    ...(complete ? { totalDurationMs: cursorMs } : {}),
    complete,
    unresolvedDurationTrackIds,
  };
}
