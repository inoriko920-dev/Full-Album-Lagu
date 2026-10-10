import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  projectDocumentSchema,
} from "../../src/core/domain/project-document";
import {
  visualBoundaryTransitionSchema,
  visualLayerAnimationSchema,
  visualSceneSchema,
} from "../../src/core/domain/visual-scene-schema";

const validSettings = {
  entrance: { preset: "zoom-in", durationMs: 800, easing: "ease-out" },
  exit: { preset: "fade-out", durationMs: 600, easing: "linear" },
  loop: {
    preset: "slow-zoom",
    durationMs: 8000,
    enabled: true,
    intensity: "subtle",
  },
  keyframes: [
    {
      property: "opacity",
      points: [
        { timeMs: 0, value: 1 },
        { timeMs: 2500, value: 0.85 },
      ],
    },
  ],
};

const artworkLayer = {
  id: "artwork",
  name: "Artwork",
  kind: "artwork",
  visible: true,
  locked: false,
  binding: "active-track-artwork",
  transform: {
    x: 0.5,
    y: 0.5,
    width: 0.4,
    height: 0.4,
    rotationDeg: 0,
    opacity: 1,
    anchor: "center",
  },
};

const transition = {
  fromTrackId: "track-05",
  toTrackId: "track-06",
  preset: "crossfade",
  durationMs: 800,
  easing: "ease-out",
  artworkHandoff: "during-transition",
  titleHandoff: "at-boundary",
};

function projectWithTracks() {
  return {
    ...createEmptyProject("w11-07-legacy"),
    tracks: [
      { id: "track-05", title: "Senja Terakhir", sourcePath: "track05.wav" },
      { id: "track-06", title: "Di Ujung Jalan", sourcePath: "track06.wav" },
    ],
  };
}

describe("W11-07 T01 additive visual animation contracts", () => {
  it("preserves a legacy schema-v1 project without injecting new fields", () => {
    const legacy = projectWithTracks();
    const output = projectDocumentSchema.parse(legacy);

    expect(output).toEqual(legacy);
    expect(output).not.toHaveProperty("boundaryTransitions");
    expect(output).not.toHaveProperty("visualScene");
  });

  it("accepts agreed entrance, exit, loop and normalized 0/2500ms opacity keyframes", () => {
    const scene = visualSceneSchema.parse({
      sceneVersion: 1,
      layers: [{ ...artworkLayer, animation: validSettings }],
    });

    expect(scene.layers[0]?.animation?.keyframes?.[0]?.points[1]).toEqual({
      timeMs: 2500,
      value: 0.85,
    });
    expect(visualSceneSchema.parse(JSON.parse(JSON.stringify(scene)))).toEqual(
      scene,
    );
  });

  it.each([
    ["unsupported entrance preset", { entrance: { preset: "spin", durationMs: 800, easing: "linear" } }],
    ["wrong-phase entrance", { entrance: { preset: "fade-out", durationMs: 800, easing: "linear" } }],
    ["zero entrance duration", { entrance: { preset: "zoom-in", durationMs: 0, easing: "linear" } }],
    ["fractional duration", { entrance: { preset: "zoom-in", durationMs: 0.5, easing: "linear" } }],
    ["unknown settings field", { entrance: validSettings.entrance, pluginSecret: "not allowed" }],
    ["duplicate keyframe timestamps", { keyframes: [{ property: "opacity", points: [{ timeMs: 0, value: 1 }, { timeMs: 0, value: 0.85 }] }] }],
    ["descending keyframe timestamps", { keyframes: [{ property: "opacity", points: [{ timeMs: 2500, value: 1 }, { timeMs: 0, value: 0.85 }] }] }],
    ["opacity value out of bounds", { keyframes: [{ property: "opacity", points: [{ timeMs: 0, value: 1.01 }] }] }],
    ["zero scale", { keyframes: [{ property: "scale", points: [{ timeMs: 0, value: 0 }] }] }],
    ["non-finite position", { keyframes: [{ property: "x", points: [{ timeMs: 0, value: Number.POSITIVE_INFINITY }] }] }],
    ["non-finite time", { keyframes: [{ property: "x", points: [{ timeMs: Number.NaN, value: 0 }] }] }],
    ["negative keyframe time", { keyframes: [{ property: "x", points: [{ timeMs: -1, value: 0 }] }] }],
    ["duplicate keyframe property", { keyframes: [{ property: "opacity", points: [{ timeMs: 0, value: 1 }] }, { property: "opacity", points: [{ timeMs: 2500, value: 0.85 }] }] }],
  ])("rejects %s without producing persisted animation state", (_reason, candidate) => {
    expect(visualLayerAnimationSchema.safeParse(candidate).success).toBe(false);
  });

  it("persists only the agreed V1 source model, without changing playlist order or revision", () => {
    const source = projectWithTracks();
    const output = projectDocumentSchema.parse({
      ...source,
      visualScene: {
        sceneVersion: 1,
        layers: [{ ...artworkLayer, animation: validSettings }],
      },
      boundaryTransitions: [transition],
    });

    expect(output.schemaVersion).toBe(1);
    expect(output.revision).toBe(source.revision);
    expect(output.tracks).toEqual(source.tracks);
    expect(output.boundaryTransitions?.[0]).toEqual(transition);
    expect(projectDocumentSchema.parse(JSON.parse(JSON.stringify(output)))).toEqual(output);
  });

  it.each([
    ["crossfade"],
    ["fade-through-black-blur"],
    ["slide"],
    ["zoom"],
    ["dissolve"],
    ["light-glitch"],
    ["soft-flash"],
    ["premium-album-change"],
  ])("has an explicit contract for the agreed %s boundary preset", (preset) => {
    expect(visualBoundaryTransitionSchema.safeParse({ ...transition, preset }).success).toBe(true);
  });

  it.each([
    ["same-track boundary", { toTrackId: "track-05" }],
    ["missing source ID", { fromTrackId: "" }],
    ["invalid easing", { easing: "dangerous" }],
    ["unsupported effect", { preset: "extra-ai-effect" }],
    ["invalid duration", { durationMs: -1 }],
    ["infinite duration", { durationMs: Number.POSITIVE_INFINITY }],
    ["unknown private field", { absolutePath: "C:/private.wav" }],
  ])("rejects %s transition", (_reason, mutation) => {
    expect(
      visualBoundaryTransitionSchema.safeParse({ ...transition, ...mutation }).success,
    ).toBe(false);
  });

  it("rejects duplicate directed boundary pairs but retains distinct pairs", () => {
    const project = projectWithTracks();
    expect(projectDocumentSchema.safeParse({
      ...project,
      boundaryTransitions: [transition, transition],
    }).success).toBe(false);
    expect(projectDocumentSchema.safeParse({
      ...project,
      boundaryTransitions: [
        transition,
        { ...transition, fromTrackId: "track-06", toTrackId: "track-05" },
      ],
    }).success).toBe(true);
  });

  it("does not reject a saved transition solely because tracks were reordered", () => {
    const project = projectWithTracks();
    expect(projectDocumentSchema.safeParse({
      ...project,
      tracks: [...project.tracks].reverse(),
      boundaryTransitions: [transition],
    }).success).toBe(true);
  });
});
