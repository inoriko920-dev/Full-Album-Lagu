import {
  projectDocumentSchema,
  type ProjectDocument,
  type ProjectTrack,
} from "./project-document";

export type AlbumTimelineItemStatus = "resolved" | "disabled" | "unresolved";
export type AlbumTimelineUnresolvedReason =
  "duration-unavailable" | "prior-duration-unresolved";

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

export type AlbumPlaybackBlockReason =
  | "invalid-position"
  | "no-enabled-track"
  | "position-out-of-range"
  | "duration-unavailable"
  | "audio-unavailable";

export type AlbumPlaybackPosition =
  | {
      status: "resolved";
      albumTimeMs: number;
      trackId: string;
      audioAssetId: string;
      effectiveIndex: number;
      startMs: number;
      endMs: number;
      durationMs: number;
      localTimeMs: number;
    }
  | { status: "finished"; albumTimeMs: number }
  | {
      status: "blocked";
      reason: AlbumPlaybackBlockReason;
      trackId?: string;
    };

/**
 * Pure seek mapping for W11-06. The one canonical album timeline is reused.
 *
 * This does not open, decode or play media and does not modify ProjectDocument,
 * revision, the current selection, or CommandEngine history.
 * Half-open track intervals assign an exact boundary to the following track.
 */
export function resolveAlbumPlaybackPosition(
  projectInput: ProjectDocument,
  albumTimeMs: number,
): AlbumPlaybackPosition {
  if (!Number.isFinite(albumTimeMs) || albumTimeMs < 0) {
    return { status: "blocked", reason: "invalid-position" };
  }

  const project = projectDocumentSchema.parse(projectInput);
  const timeline = projectAlbumTimeline(project);

  if (timeline.enabledTrackCount === 0) {
    return { status: "blocked", reason: "no-enabled-track" };
  }

  if (timeline.complete && albumTimeMs === timeline.totalDurationMs) {
    return { status: "finished", albumTimeMs };
  }
  if (
    timeline.complete &&
    timeline.totalDurationMs !== undefined &&
    albumTimeMs > timeline.totalDurationMs
  ) {
    return { status: "blocked", reason: "position-out-of-range" };
  }

  const item = timeline.items.find(
    (candidate) =>
      candidate.status === "resolved" &&
      candidate.startMs !== undefined &&
      candidate.endMs !== undefined &&
      albumTimeMs >= candidate.startMs &&
      albumTimeMs < candidate.endMs,
  );

  if (
    item === undefined ||
    item.startMs === undefined ||
    item.endMs === undefined ||
    item.durationMs === undefined ||
    item.effectiveIndex === undefined
  ) {
    return { status: "blocked", reason: "duration-unavailable" };
  }

  const track = project.tracks[item.sourceIndex];
  const asset =
    track?.audioAssetId === undefined
      ? undefined
      : project.mediaAssets?.find(
          (candidate) =>
            candidate.id === track.audioAssetId && candidate.kind === "audio",
        );
  if (asset?.availability !== "ready" || track?.audioAssetId === undefined) {
    return {
      status: "blocked",
      reason: "audio-unavailable",
      trackId: item.trackId,
    };
  }

  return {
    status: "resolved",
    albumTimeMs,
    trackId: item.trackId,
    audioAssetId: track.audioAssetId,
    effectiveIndex: item.effectiveIndex,
    startMs: item.startMs,
    endMs: item.endMs,
    durationMs: item.durationMs,
    localTimeMs: albumTimeMs - item.startMs,
  };
}
