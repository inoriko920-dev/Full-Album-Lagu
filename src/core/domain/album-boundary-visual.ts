import {
  projectAlbumTimeline,
  resolveAlbumPlaybackPosition,
  type AlbumTimelineItem,
} from "./album-timeline";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "./project-document";
import {
  resolveTrackPresentation,
  type ResolvedTrackPresentation,
} from "./track-presentation";
import {
  resolveVisualScene,
  type ResolvedVisualScene,
} from "./visual-scene-projection";
import type {
  VisualAnimationEasing,
  VisualBoundaryTransition,
} from "./visual-scene-schema";

export interface BoundaryVisualSide {
  opacity: number;
  offsetX: number;
  scale: number;
  blur: number;
}

export interface BoundaryVisualEffect {
  outgoing: BoundaryVisualSide;
  incoming: BoundaryVisualSide;
  blackOverlayOpacity: number;
  whiteOverlayOpacity: number;
  glitchAmount: number;
  dissolveAmount: number;
}

export interface BoundaryPresentationHandoff {
  mode: "at-boundary" | "during-transition";
  fromWeight: number;
  toWeight: number;
}

export interface ActiveBoundaryVisualFrame {
  status: "active";
  albumTimeMs: number;
  boundaryTimeMs: number;
  elapsedMs: number;
  effectiveDurationMs: number;
  fromTrackId: string;
  toTrackId: string;
  preset: VisualBoundaryTransition["preset"];
  progress: number;
  easedProgress: number;
  from: ResolvedTrackPresentation;
  to: ResolvedTrackPresentation;
  fromScene: ResolvedVisualScene;
  toScene: ResolvedVisualScene;
  artworkHandoff: BoundaryPresentationHandoff;
  titleHandoff: BoundaryPresentationHandoff;
  /** Artist changes together with the title; no separate user preset. */
  artistHandoff: BoundaryPresentationHandoff;
  /** Background remains the project's canonical layer state on both sides. */
  backgroundState: "unchanged";
  /** Spectrum continues to use the active real audio clock; never restarts. */
  spectrumClock: "continuous";
  effect: BoundaryVisualEffect;
}

export type AlbumBoundaryVisualFrame =
  | ActiveBoundaryVisualFrame
  | {
      status: "idle";
      reason:
        | "no-transition"
        | "outside-window"
        | "not-adjacent"
        | "finished"
        | "no-active-track";
    }
  | {
      status: "blocked";
      reason: "invalid-time" | "unresolved-timing" | "audio-unavailable";
    };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function ease(value: number, mode: VisualAnimationEasing): number {
  const progress = clamp01(value);
  switch (mode) {
    case "linear":
      return progress;
    case "ease-in":
      return progress * progress;
    case "ease-out":
      return 1 - (1 - progress) ** 2;
    case "ease-in-out":
      return progress < 0.5
        ? 2 * progress * progress
        : 1 - 2 * (1 - progress) ** 2;
  }
}

function handoff(
  mode: VisualBoundaryTransition["artworkHandoff"],
  progress: number,
): BoundaryPresentationHandoff {
  return mode === "at-boundary"
    ? { mode, fromWeight: 0, toWeight: 1 }
    : { mode, fromWeight: 1 - progress, toWeight: progress };
}

/**
 * Numeric instructions for the already-approved eight presets.
 * An effect value is not a claim that any renderer/UI already draws it.
 */
export function evaluateBoundaryVisualEffect(
  preset: VisualBoundaryTransition["preset"],
  progressInput: number,
): BoundaryVisualEffect {
  if (!Number.isFinite(progressInput)) {
    throw new Error("Transition progress must be finite.");
  }
  const progress = clamp01(progressInput);
  const fromWeight = 1 - progress;
  const toWeight = progress;
  const pulse = Math.sin(Math.PI * progress);
  const outgoing: BoundaryVisualSide = {
    opacity: fromWeight,
    offsetX: 0,
    scale: 1,
    blur: 0,
  };
  const incoming: BoundaryVisualSide = {
    opacity: toWeight,
    offsetX: 0,
    scale: 1,
    blur: 0,
  };
  let blackOverlayOpacity = 0;
  let whiteOverlayOpacity = 0;
  let glitchAmount = 0;
  let dissolveAmount = 0;

  switch (preset) {
    case "crossfade":
      break;
    case "fade-through-black-blur":
      outgoing.opacity = clamp01(1 - 2 * progress);
      incoming.opacity = clamp01(2 * progress - 1);
      blackOverlayOpacity = pulse * 0.85;
      outgoing.blur = progress * 0.6;
      incoming.blur = (1 - progress) * 0.6;
      break;
    case "slide":
      outgoing.offsetX = -progress;
      incoming.offsetX = 1 - progress;
      break;
    case "zoom":
      outgoing.scale = 1 + progress * 0.12;
      incoming.scale = 0.88 + progress * 0.12;
      break;
    case "dissolve": {
      const dissolve = progress * progress * (3 - 2 * progress);
      outgoing.opacity = 1 - dissolve;
      incoming.opacity = dissolve;
      dissolveAmount = dissolve;
      break;
    }
    case "light-glitch":
      glitchAmount = pulse * 0.65;
      outgoing.offsetX = -0.04 * pulse;
      incoming.offsetX = 0.04 * pulse;
      break;
    case "soft-flash":
      whiteOverlayOpacity = pulse * 0.55;
      break;
    case "premium-album-change":
      outgoing.scale = 1 + progress * 0.08;
      incoming.scale = 0.92 + progress * 0.08;
      outgoing.blur = progress * 0.35;
      incoming.blur = (1 - progress) * 0.35;
      whiteOverlayOpacity = pulse * 0.25;
      break;
  }

  return {
    outgoing,
    incoming,
    blackOverlayOpacity,
    whiteOverlayOpacity,
    glitchAmount,
    dissolveAmount,
  };
}

function isAudioReady(
  project: ProjectDocument,
  item: AlbumTimelineItem,
): boolean {
  const track = project.tracks[item.sourceIndex];
  if (track?.audioAssetId === undefined) return false;
  return (
    project.mediaAssets?.some(
      (asset) =>
        asset.id === track.audioAssetId &&
        asset.kind === "audio" &&
        asset.availability === "ready",
    ) ?? false
  );
}

/**
 * T11-W07-04: resolve an immutable visual transition sample from the ONE
 * canonical album timeline. The exact boundary belongs to the incoming track.
 *
 * Effects run after the boundary and are clipped to the incoming track's
 * duration; they never shift, overlap or extend the audio track timeline.
 * Outdated pair settings after reorder/removal/disable are inert (no ghost).
 * This is domain projection, not UI/render execution or a playback event queue.
 */
export function resolveAlbumBoundaryVisualFrame(
  input: ProjectDocument,
  albumTimeMs: number,
): AlbumBoundaryVisualFrame {
  if (!Number.isFinite(albumTimeMs) || albumTimeMs < 0) {
    return { status: "blocked", reason: "invalid-time" };
  }

  const project = projectDocumentSchema.parse(input);
  if ((project.boundaryTransitions?.length ?? 0) === 0) {
    return { status: "idle", reason: "no-transition" };
  }

  const position = resolveAlbumPlaybackPosition(project, albumTimeMs);
  if (position.status === "finished") {
    return { status: "idle", reason: "finished" };
  }
  if (position.status === "blocked") {
    if (position.reason === "duration-unavailable") {
      return { status: "blocked", reason: "unresolved-timing" };
    }
    if (position.reason === "audio-unavailable") {
      return { status: "blocked", reason: "audio-unavailable" };
    }
    if (position.reason === "invalid-position") {
      return { status: "blocked", reason: "invalid-time" };
    }
    return { status: "idle", reason: "no-active-track" };
  }

  const projection = projectAlbumTimeline(project);
  const enabled = projection.items.filter((item) => item.status === "resolved");
  const incomingIndex = enabled.findIndex(
    (item) => item.trackId === position.trackId,
  );
  if (incomingIndex <= 0) {
    return { status: "idle", reason: "no-active-track" };
  }

  const outgoing = enabled[incomingIndex - 1]!;
  const incoming = enabled[incomingIndex]!;
  if (outgoing.endMs !== incoming.startMs) {
    return { status: "idle", reason: "not-adjacent" };
  }

  const setting = project.boundaryTransitions?.find(
    (candidate) =>
      candidate.fromTrackId === outgoing.trackId &&
      candidate.toTrackId === incoming.trackId,
  );
  if (setting === undefined) {
    return { status: "idle", reason: "not-adjacent" };
  }
  if (!isAudioReady(project, outgoing) || !isAudioReady(project, incoming)) {
    return { status: "blocked", reason: "audio-unavailable" };
  }

  const effectiveDurationMs = Math.min(
    setting.durationMs,
    incoming.durationMs!,
  );
  const elapsedMs = position.localTimeMs;
  if (elapsedMs >= effectiveDurationMs) {
    return { status: "idle", reason: "outside-window" };
  }

  const progress = clamp01(elapsedMs / effectiveDurationMs);
  const easedProgress = ease(progress, setting.easing);
  const artworkHandoff = handoff(setting.artworkHandoff, easedProgress);
  const titleHandoff = handoff(setting.titleHandoff, easedProgress);

  return {
    status: "active",
    albumTimeMs,
    boundaryTimeMs: incoming.startMs!,
    elapsedMs,
    effectiveDurationMs,
    fromTrackId: outgoing.trackId,
    toTrackId: incoming.trackId,
    preset: setting.preset,
    progress,
    easedProgress,
    from: resolveTrackPresentation(project, outgoing.trackId),
    to: resolveTrackPresentation(project, incoming.trackId),
    fromScene: resolveVisualScene(project, outgoing.trackId),
    toScene: resolveVisualScene(project, incoming.trackId),
    artworkHandoff,
    titleHandoff,
    artistHandoff: { ...titleHandoff },
    backgroundState: "unchanged",
    spectrumClock: "continuous",
    effect: evaluateBoundaryVisualEffect(setting.preset, easedProgress),
  };
}
