import {
  visualLayerSchema,
  type VisualLayer,
  type VisualLayerAnimation,
  type VisualLayerTransform,
  type VisualAnimationEasing,
} from "./visual-scene-schema";

/**
 * W11-07 T02: deterministic and side-effect-free animation evaluation.
 *
 * Times are milliseconds RELATIVE to the canonical track start, as supplied
 * by projectAlbumTimeline / resolveAlbumPlaybackPosition. Never calculate a
 * second album clock, advance time per rendered frame, or write ProjectDocument.
 *
 * Keyframe position/opacity replaces the layer's static value; scale is a
 * multiplier of its static width and height. Entrance, loop, exit run after
 * manual keyframes. No rendered pixel, CommandEngine or UI integration here.
 */
export function evaluateVisualLayerAnimation(
  layerInput: VisualLayer,
  trackLocalTimeMs: number,
  trackDurationMs: number,
): VisualLayerTransform {
  if (!Number.isFinite(trackLocalTimeMs) || trackLocalTimeMs < 0) {
    throw new Error("Animation time must be finite and non-negative.");
  }
  if (!Number.isFinite(trackDurationMs) || trackDurationMs <= 0) {
    throw new Error("Track duration must be positive and finite.");
  }

  const layer = visualLayerSchema.parse(layerInput);
  const animation = layer.animation;
  const timeMs = Math.min(trackLocalTimeMs, trackDurationMs);
  const result: VisualLayerTransform = { ...layer.transform };

  if (animation === undefined) return result;

  applyKeyframes(result, animation, timeMs);
  applyLoop(result, animation, timeMs);
  applyEntrance(result, animation, timeMs);
  applyExit(result, animation, timeMs, trackDurationMs);

  result.x = clamp(result.x, -1, 2);
  result.y = clamp(result.y, -1, 2);
  result.width = clamp(result.width, 0.000001, 2);
  result.height = clamp(result.height, 0.000001, 2);
  result.opacity = clamp(result.opacity, 0, 1);
  return result;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function ease(t: number, easing: VisualAnimationEasing): number {
  const p = clamp(t, 0, 1);
  switch (easing) {
    case "linear":
      return p;
    case "ease-in":
      return p * p;
    case "ease-out":
      return 1 - (1 - p) * (1 - p);
    case "ease-in-out":
      return p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
  }
}

function interpolate(
  points: ReadonlyArray<{ timeMs: number; value: number }>,
  timeMs: number,
): number {
  const first = points[0]!;
  if (timeMs <= first.timeMs) return first.value;
  const last = points[points.length - 1]!;
  if (timeMs >= last.timeMs) return last.value;

  for (let index = 1; index < points.length; index += 1) {
    const next = points[index]!;
    if (timeMs <= next.timeMs) {
      const previous = points[index - 1]!;
      const proportion =
        (timeMs - previous.timeMs) / (next.timeMs - previous.timeMs);
      return previous.value + (next.value - previous.value) * proportion;
    }
  }
  return last.value;
}

function applyKeyframes(
  result: VisualLayerTransform,
  animation: VisualLayerAnimation,
  timeMs: number,
): void {
  for (const track of animation.keyframes ?? []) {
    const value = interpolate(track.points, timeMs);
    switch (track.property) {
      case "x":
        result.x = value;
        break;
      case "y":
        result.y = value;
        break;
      case "opacity":
        result.opacity = value;
        break;
      case "scale":
        result.width *= value;
        result.height *= value;
        break;
    }
  }
}

function applyLoop(
  result: VisualLayerTransform,
  animation: VisualLayerAnimation,
  timeMs: number,
): void {
  const loop = animation.loop;
  if (loop === undefined || !loop.enabled) return;

  const phase = (timeMs % loop.durationMs) / loop.durationMs;
  const amplitude = loop.intensity === "subtle" ? 0.04 : 0.08;
  const smoothPulse = Math.sin(Math.PI * phase) ** 2;

  switch (loop.preset) {
    case "slow-zoom": {
      const scale = 1 + amplitude * smoothPulse;
      result.width *= scale;
      result.height *= scale;
      break;
    }
    case "float":
      result.y += amplitude * Math.sin(2 * Math.PI * phase);
      break;
    case "pulse":
      result.opacity *= 1 - amplitude * smoothPulse;
      break;
  }
}

function applyEntrance(
  result: VisualLayerTransform,
  animation: VisualLayerAnimation,
  timeMs: number,
): void {
  const entrance = animation.entrance;
  if (entrance === undefined) return;

  const progress = ease(timeMs / entrance.durationMs, entrance.easing);
  switch (entrance.preset) {
    case "fade-in":
      result.opacity *= progress;
      break;
    case "slide-up":
      result.y += 0.12 * (1 - progress);
      break;
    case "zoom-in": {
      const scale = 0.85 + 0.15 * progress;
      result.width *= scale;
      result.height *= scale;
      break;
    }
  }
}

function applyExit(
  result: VisualLayerTransform,
  animation: VisualLayerAnimation,
  timeMs: number,
  trackDurationMs: number,
): void {
  const exit = animation.exit;
  if (exit === undefined) return;

  const exitStartMs = Math.max(0, trackDurationMs - exit.durationMs);
  if (timeMs < exitStartMs) return;
  const exitWindowMs = trackDurationMs - exitStartMs;
  const progress = ease((timeMs - exitStartMs) / exitWindowMs, exit.easing);

  switch (exit.preset) {
    case "fade-out":
      result.opacity *= 1 - progress;
      break;
    case "slide":
      result.x += 0.12 * progress;
      break;
    case "shrink": {
      const scale = 1 - 0.15 * progress;
      result.width *= scale;
      result.height *= scale;
      break;
    }
  }
}
