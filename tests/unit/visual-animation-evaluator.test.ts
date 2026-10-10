import { describe, expect, it } from "vitest";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { resolveAlbumPlaybackPosition } from "../../src/core/domain/album-timeline";
import { evaluateVisualLayerAnimation } from "../../src/core/domain/visual-animation-evaluator";
import type { VisualLayer } from "../../src/core/domain/visual-scene-schema";

function artwork(animation?: VisualLayer["animation"]): VisualLayer {
  return {
    id: "artwork",
    name: "Artwork",
    kind: "artwork",
    binding: "active-track-artwork",
    visible: true,
    locked: false,
    transform: {
      x: 0.5,
      y: 0.5,
      width: 0.4,
      height: 0.3,
      rotationDeg: 0,
      opacity: 1,
      anchor: "center",
    },
    ...(animation === undefined ? {} : { animation }),
  };
}

const opacityKeyframes = {
  keyframes: [
    {
      property: "opacity" as const,
      points: [
        { timeMs: 0, value: 1 },
        { timeMs: 2500, value: 0.85 },
      ],
    },
  ],
};

function album(durations: number[]): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "deterministic-evaluator",
    name: "Album",
    revision: 4,
    mediaAssets: durations.map((durationMs, index) => ({
      id: `audio-${index}`,
      kind: "audio" as const,
      required: true,
      sourcePath: `track-${index}.wav`,
      fileName: `track-${index}.wav`,
      sizeBytes: 256,
      availability: "ready" as const,
      metadata: { durationMs },
    })),
    tracks: durations.map((_, index) => ({
      id: `track-${index}`,
      title: `Track ${index}`,
      sourcePath: `track-${index}.wav`,
      audioAssetId: `audio-${index}`,
    })),
  };
}

describe("W11-07 T02 pure time-driven visual animation evaluator", () => {
  it("returns unchanged values for a legacy layer without animation", () => {
    const input = artwork();
    const before = structuredClone(input);
    const result = evaluateVisualLayerAnimation(input, 999, 5000);
    expect(result).toEqual(input.transform);
    expect(result).not.toBe(input.transform);
    expect(input).toEqual(before);
  });

  it("interpolates the approved 0.0 to 2.5 second 100% to 85% opacity keys", () => {
    const layer = artwork(opacityKeyframes);
    expect(evaluateVisualLayerAnimation(layer, 0, 5000).opacity).toBe(1);
    expect(evaluateVisualLayerAnimation(layer, 1250, 5000).opacity).toBeCloseTo(0.925);
    expect(evaluateVisualLayerAnimation(layer, 2500, 5000).opacity).toBe(0.85);
    expect(evaluateVisualLayerAnimation(layer, 4999, 5000).opacity).toBe(0.85);
  });

  it("interpolates x/y as absolute properties and scale relative to static size", () => {
    const layer = artwork({
      keyframes: [
        { property: "x", points: [{ timeMs: 0, value: -1 }, { timeMs: 2000, value: 1 }] },
        { property: "y", points: [{ timeMs: 0, value: 0.5 }, { timeMs: 2000, value: 1.5 }] },
        { property: "scale", points: [{ timeMs: 0, value: 1 }, { timeMs: 2000, value: 2 }] },
      ],
    });
    const midpoint = evaluateVisualLayerAnimation(layer, 1000, 5000);
    expect(midpoint.x).toBe(0);
    expect(midpoint.y).toBe(1);
    expect(midpoint.width).toBeCloseTo(0.6);
    expect(midpoint.height).toBeCloseTo(0.45);
  });

  it("applies fade-in ease-in and fade-out ease-out only in their windows", () => {
    const layer = artwork({
      entrance: { preset: "fade-in", durationMs: 1000, easing: "ease-in" },
      exit: { preset: "fade-out", durationMs: 1000, easing: "ease-out" },
    });
    expect(evaluateVisualLayerAnimation(layer, 0, 6000).opacity).toBe(0);
    expect(evaluateVisualLayerAnimation(layer, 500, 6000).opacity).toBeCloseTo(0.25);
    expect(evaluateVisualLayerAnimation(layer, 1000, 6000).opacity).toBe(1);
    expect(evaluateVisualLayerAnimation(layer, 4500, 6000).opacity).toBe(1);
    expect(evaluateVisualLayerAnimation(layer, 5500, 6000).opacity).toBeCloseTo(0.25);
    expect(evaluateVisualLayerAnimation(layer, 6000, 6000).opacity).toBe(0);
  });

  it("handles overlapping entrance and exit windows for short tracks", () => {
    const layer = artwork({
      entrance: { preset: "fade-in", durationMs: 1200, easing: "linear" },
      exit: { preset: "fade-out", durationMs: 1200, easing: "linear" },
    });
    expect(evaluateVisualLayerAnimation(layer, 300, 600).opacity).toBeCloseTo(0.125);
    expect(evaluateVisualLayerAnimation(layer, 600, 600).opacity).toBe(0);
  });

  it("uses smooth and bounded finite entrance, exit, and loop geometry", () => {
    const layer = artwork({
      entrance: { preset: "slide-up", durationMs: 800, easing: "ease-out" },
      exit: { preset: "shrink", durationMs: 800, easing: "linear" },
      loop: { preset: "slow-zoom", enabled: true, durationMs: 4000, intensity: "subtle" },
    });
    const input = structuredClone(layer);
    const atStart = evaluateVisualLayerAnimation(layer, 0, 8000);
    expect(atStart.y).toBeCloseTo(0.62);
    const halfway = evaluateVisualLayerAnimation(layer, 2000, 8000);
    expect(halfway.width).toBeCloseTo(0.416);
    const end = evaluateVisualLayerAnimation(layer, 8000, 8000);
    expect(end.width).toBeCloseTo(0.34);
    expect(layer).toEqual(input);
  });

  it("resolves zoom-in and slide-out at the exact opening and ending times", () => {
    const layer = artwork({
      entrance: { preset: "zoom-in", durationMs: 1000, easing: "linear" },
      exit: { preset: "slide", durationMs: 1000, easing: "linear" },
    });
    expect(evaluateVisualLayerAnimation(layer, 0, 5000).width).toBeCloseTo(0.34);
    expect(evaluateVisualLayerAnimation(layer, 1000, 5000).width).toBe(0.4);
    expect(evaluateVisualLayerAnimation(layer, 5000, 5000).x).toBeCloseTo(0.62);
  });

  it("makes loop phases identical on repeated seek and after a full loop period", () => {
    const layer = artwork({
      loop: { preset: "float", enabled: true, durationMs: 3000, intensity: "moderate" },
    });
    const a = evaluateVisualLayerAnimation(layer, 750, 15000);
    const b = evaluateVisualLayerAnimation(layer, 750, 15000);
    const c = evaluateVisualLayerAnimation(layer, 3750, 15000);
    expect(a).toEqual(b);
    expect(a).toEqual(c);
    expect(a.y).toBeCloseTo(0.58);
  });

  it("respects a disabled loop without changing original geometry", () => {
    const layer = artwork({
      loop: { preset: "pulse", enabled: false, durationMs: 3000, intensity: "moderate" },
    });
    expect(evaluateVisualLayerAnimation(layer, 750, 15000)).toEqual(layer.transform);
  });

  it("evaluates pulse deterministically without alpha overflows", () => {
    const layer = artwork({
      loop: { preset: "pulse", enabled: true, durationMs: 2000, intensity: "subtle" },
    });
    expect(evaluateVisualLayerAnimation(layer, 1000, 12000).opacity).toBeCloseTo(0.96);
    expect(evaluateVisualLayerAnimation(layer, 3000, 12000).opacity).toBeCloseTo(0.96);
    expect(evaluateVisualLayerAnimation(layer, 2000, 12000).opacity).toBe(1);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])(
    "rejects invalid local time %s before reading animation",
    (time) => {
      expect(() => evaluateVisualLayerAnimation(artwork(), time, 1000)).toThrow();
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    "rejects invalid duration %s",
    (duration) => {
      expect(() => evaluateVisualLayerAnimation(artwork(), 0, duration)).toThrow();
    },
  );

  it("fails closed for malformed animation without mutating the supplied object", () => {
    const input = artwork(opacityKeyframes);
    const broken = { ...input, animation: { keyframes: [{ property: "opacity", points: [{ timeMs: 0, value: Number.NaN }] }] } };
    expect(() => evaluateVisualLayerAnimation(broken as VisualLayer, 0, 5000)).toThrow();
    expect(input.animation).toEqual(opacityKeyframes);
  });

  it("evaluates exact album boundary against the NEXT canonical track", () => {
    const project = album([1000, 3000]);
    const a = resolveAlbumPlaybackPosition(project, 999);
    const b = resolveAlbumPlaybackPosition(project, 1000);
    expect(a).toMatchObject({ status: "resolved", trackId: "track-0", localTimeMs: 999 });
    expect(b).toMatchObject({ status: "resolved", trackId: "track-1", localTimeMs: 0 });
    if (a.status !== "resolved" || b.status !== "resolved") throw new Error("missing album timing");
    const layer = artwork(opacityKeyframes);
    expect(evaluateVisualLayerAnimation(layer, a.localTimeMs, a.durationMs).opacity).toBeGreaterThan(0.9);
    expect(evaluateVisualLayerAnimation(layer, b.localTimeMs, b.durationMs).opacity).toBe(1);
  });

  it("is invariant to playback visit order and repeated seek, without project edits", () => {
    const project = album([5000]);
    const original = structuredClone(project);
    const layer = artwork({
      ...opacityKeyframes,
      entrance: { preset: "zoom-in", durationMs: 800, easing: "ease-in-out" },
      loop: { preset: "float", enabled: true, durationMs: 1800, intensity: "subtle" },
    });
    const originalLayer = structuredClone(layer);
    const order = [1300, 0, 4700, 100, 1300, 2500, 1300];
    const sampled = order.map((time) => evaluateVisualLayerAnimation(layer, time, 5000));
    expect(sampled[0]).toEqual(sampled[4]);
    expect(sampled[0]).toEqual(sampled[6]);
    expect(project).toEqual(original);
    expect(layer).toEqual(originalLayer);
  });

  it("samples 128 layers without frame-state drift or mutating any layer", () => {
    const layers = Array.from({ length: 128 }, (_, index) => ({
      ...artwork({
        ...opacityKeyframes,
        loop: { preset: "slow-zoom" as const, enabled: true, durationMs: 2000, intensity: "subtle" as const },
      }),
      id: `layer-${index}`,
    }));
    const frozen = structuredClone(layers);
    const first = layers.map((layer) => evaluateVisualLayerAnimation(layer, 1500, 5000));
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const again = layers.map((layer) => evaluateVisualLayerAnimation(layer, 1500, 5000));
      expect(again).toEqual(first);
    }
    expect(layers).toEqual(frozen);
  });

  it("clamps sample times after track completion without negative or NaN geometry", () => {
    const layer = artwork({
      keyframes: [{ property: "scale", points: [{ timeMs: 0, value: 1.5 }] }],
      exit: { preset: "shrink", durationMs: 200, easing: "linear" },
    });
    expect(evaluateVisualLayerAnimation(layer, 5000, 1000)).toEqual(
      evaluateVisualLayerAnimation(layer, 1000, 1000),
    );
  });
});
