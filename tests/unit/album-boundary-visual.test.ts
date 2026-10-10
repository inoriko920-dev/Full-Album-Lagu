import { describe, expect, it } from "vitest";
import {
  evaluateBoundaryVisualEffect,
  resolveAlbumBoundaryVisualFrame,
} from "../../src/core/domain/album-boundary-visual";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../src/core/domain/project-document";
import type { VisualBoundaryTransition } from "../../src/core/domain/visual-scene-schema";

const presets: VisualBoundaryTransition["preset"][] = [
  "crossfade",
  "fade-through-black-blur",
  "slide",
  "zoom",
  "dissolve",
  "light-glitch",
  "soft-flash",
  "premium-album-change",
];

function setting(
  fromTrackId: string,
  toTrackId: string,
  preset: VisualBoundaryTransition["preset"] = "crossfade",
  durationMs = 800,
): VisualBoundaryTransition {
  return {
    fromTrackId,
    toTrackId,
    preset,
    durationMs,
    easing: "linear",
    artworkHandoff: "during-transition",
    titleHandoff: "at-boundary",
  };
}

function project(
  durations: Array<number | undefined>,
  options: {
    disabled?: number[];
    transitions?: VisualBoundaryTransition[];
  } = {},
): ProjectDocument {
  return projectDocumentSchema.parse({
    schemaVersion: 1,
    projectId: "boundary-visual-test",
    name: "Test Album",
    revision: 3,
    mediaAssets: [
      ...durations.map((durationMs, i) => ({
        id: `audio-${i}`,
        kind: "audio" as const,
        required: true,
        sourcePath: `Song-${i}.wav`,
        fileName: `Song-${i}.wav`,
        sizeBytes: 512,
        ...(durationMs === undefined
          ? { availability: "invalid" as const, errorCode: "MEDIA_DURATION_UNAVAILABLE" as const }
          : {
              availability: "ready" as const,
              metadata: {
                durationMs,
                title: `Metadata Title ${i}`,
                artist: `Metadata Artist ${i}`,
              },
            }),
      })),
      ...durations.map((_, i) => ({
        id: `image-${i}`,
        kind: "image" as const,
        required: false,
        sourcePath: `Artwork-${i}.png`,
        fileName: `Artwork-${i}.png`,
        sizeBytes: 256,
        availability: "ready" as const,
      })),
    ],
    tracks: durations.map((_, i) => ({
      id: `track-${i}`,
      title: `Track ${i}`,
      sourcePath: `Song-${i}.wav`,
      audioAssetId: `audio-${i}`,
      ...(options.disabled?.includes(i) ? { enabled: false } : {}),
      binding: {
        artworkAssetId: `image-${i}`,
      },
    })),
    ...(options.transitions === undefined
      ? {}
      : { boundaryTransitions: options.transitions }),
    visualScene: {
      sceneVersion: 1,
      layers: [
        {
          id: "background",
          name: "Background",
          kind: "background",
          visible: true,
          locked: true,
          transform: {
            x: 0.5,
            y: 0.5,
            width: 1,
            height: 1,
            rotationDeg: 0,
            opacity: 1,
            anchor: "center",
          },
          fill: { type: "solid", color: "#122233" },
        },
        {
          id: "artwork",
          name: "Artwork",
          kind: "artwork",
          visible: true,
          locked: false,
          transform: {
            x: 0.5,
            y: 0.5,
            width: 0.4,
            height: 0.4,
            rotationDeg: 0,
            opacity: 1,
            anchor: "center",
          },
          binding: "active-track-artwork",
        },
        {
          id: "spectrum",
          name: "Spectrum",
          kind: "spectrum",
          visible: true,
          locked: false,
          transform: {
            x: 0.5,
            y: 0.7,
            width: 0.6,
            height: 0.3,
            rotationDeg: 0,
            opacity: 1,
            anchor: "center",
          },
        },
      ],
    },
  });
}

describe("W11-07 T04 canonical boundary transition projection", () => {
  it("returns idle for legacy albums with no configured transition and does not inject one", () => {
    const album = project([1000, 2000]);
    const original = structuredClone(album);
    expect(resolveAlbumBoundaryVisualFrame(album, 1000)).toEqual({
      status: "idle",
      reason: "no-transition",
    });
    expect(album).toEqual(original);
  });

  it("starts exactly at the incoming track boundary, never before it", () => {
    const album = project([1000, 2000], {
      transitions: [setting("track-0", "track-1")],
    });
    expect(resolveAlbumBoundaryVisualFrame(album, 999)).toMatchObject({
      status: "idle",
    });
    const exact = resolveAlbumBoundaryVisualFrame(album, 1000);
    expect(exact).toMatchObject({
      status: "active",
      boundaryTimeMs: 1000,
      albumTimeMs: 1000,
      elapsedMs: 0,
      progress: 0,
      fromTrackId: "track-0",
      toTrackId: "track-1",
      from: { title: { value: "Metadata Title 0" }, artwork: { assetId: "image-0" } },
      to: { title: { value: "Metadata Title 1" }, artwork: { assetId: "image-1" } },
      backgroundState: "unchanged",
      spectrumClock: "continuous",
    });
    if (exact.status !== "active") throw new Error("expected boundary frame");
    expect(exact.fromScene.layers[0]).toEqual(exact.toScene.layers[0]);
    expect(exact.fromScene.layers[1]).toMatchObject({
      resolvedArtwork: { assetId: "image-0" },
    });
    expect(exact.toScene.layers[1]).toMatchObject({
      resolvedArtwork: { assetId: "image-1" },
    });
    expect(exact.fromScene.layers[2]).toMatchObject({ runtimeState: "structural-placeholder" });
    expect(exact.toScene.layers[2]).toMatchObject({ runtimeState: "structural-placeholder" });
  });

  it("honors at-boundary title and continuous artwork handoff independently", () => {
    const album = project([1000, 2000], {
      transitions: [setting("track-0", "track-1")],
    });
    const middle = resolveAlbumBoundaryVisualFrame(album, 1400);
    expect(middle).toMatchObject({
      status: "active",
      progress: 0.5,
      titleHandoff: { mode: "at-boundary", fromWeight: 0, toWeight: 1 },
      artistHandoff: { mode: "at-boundary", fromWeight: 0, toWeight: 1 },
      artworkHandoff: { mode: "during-transition", fromWeight: 0.5, toWeight: 0.5 },
      from: { artist: { value: "Metadata Artist 0" } },
      to: { artist: { value: "Metadata Artist 1" } },
    });
    expect(resolveAlbumBoundaryVisualFrame(album, 1800)).toEqual({
      status: "idle",
      reason: "outside-window",
    });
  });

  it("clamps visual transition window to short incoming song without shifting album end", () => {
    const album = project([1000, 250], {
      transitions: [setting("track-0", "track-1", "zoom", 800)],
    });
    expect(resolveAlbumBoundaryVisualFrame(album, 1249)).toMatchObject({
      status: "active",
      effectiveDurationMs: 250,
      elapsedMs: 249,
    });
    expect(resolveAlbumBoundaryVisualFrame(album, 1250)).toEqual({
      status: "idle",
      reason: "finished",
    });
  });

  it("uses the agreed non-linear easing to derive visual and handoff values", () => {
    const album = project([1000, 2000], {
      transitions: [{ ...setting("track-0", "track-1"), easing: "ease-in" }],
    });
    const frame = resolveAlbumBoundaryVisualFrame(album, 1400);
    expect(frame).toMatchObject({
      status: "active",
      progress: 0.5,
      easedProgress: 0.25,
      artworkHandoff: { fromWeight: 0.75, toWeight: 0.25 },
      effect: {
        outgoing: { opacity: 0.75 },
        incoming: { opacity: 0.25 },
      },
    });
  });

  it("supports during-transition title/artist and at-boundary artwork without ghosting", () => {
    const album = project([1000, 2000], {
      transitions: [{
        ...setting("track-0", "track-1"),
        titleHandoff: "during-transition",
        artworkHandoff: "at-boundary",
      }],
    });
    expect(resolveAlbumBoundaryVisualFrame(album, 1200)).toMatchObject({
      status: "active",
      titleHandoff: { fromWeight: 0.75, toWeight: 0.25 },
      artistHandoff: { fromWeight: 0.75, toWeight: 0.25 },
      artworkHandoff: { fromWeight: 0, toWeight: 1 },
    });
  });

  it("ignores stale per-pair settings after track reorder, removal, and disable", () => {
    const source = project([1000, 2000, 3000], {
      transitions: [setting("track-0", "track-1")],
    });
    const reordered = projectDocumentSchema.parse({
      ...source,
      tracks: [source.tracks[1], source.tracks[0], source.tracks[2]],
    });
    expect(resolveAlbumBoundaryVisualFrame(reordered, 2000)).toMatchObject({
      status: "idle",
      reason: "not-adjacent",
    });

    const removed = projectDocumentSchema.parse({
      ...source,
      tracks: source.tracks.filter((track) => track.id !== "track-0"),
    });
    expect(resolveAlbumBoundaryVisualFrame(removed, 2000)).toMatchObject({
      status: "idle",
    });

    const disabled = projectDocumentSchema.parse({
      ...source,
      tracks: source.tracks.map((track) => ({
        ...track,
        ...(track.id === "track-1" ? { enabled: false } : {}),
      })),
    });
    expect(resolveAlbumBoundaryVisualFrame(disabled, 1000)).toMatchObject({
      status: "idle",
      reason: "not-adjacent",
    });
  });

  it("allows a deliberately configured adjacent enabled pair across a disabled middle track", () => {
    const album = project([1000, 2000, 3000], {
      disabled: [1],
      transitions: [setting("track-0", "track-2")],
    });
    expect(resolveAlbumBoundaryVisualFrame(album, 1000)).toMatchObject({
      status: "active",
      fromTrackId: "track-0",
      toTrackId: "track-2",
    });
  });

  it("blocks when the incoming or outgoing audio is unavailable", () => {
    const source = project([1000, 2000], {
      transitions: [setting("track-0", "track-1")],
    });
    for (const missing of [0, 1]) {
      const assets = source.mediaAssets!.map((asset) =>
        asset.id === `audio-${missing}`
          ? { ...asset, availability: "missing" as const, errorCode: "MEDIA_NOT_FOUND" as const }
          : asset,
      );
      const album = projectDocumentSchema.parse({ ...source, mediaAssets: assets });
      expect(resolveAlbumBoundaryVisualFrame(album, 1000)).toEqual({
        status: "blocked",
        reason: "audio-unavailable",
      });
    }
  });

  it("fails closed for unresolved prior duration and never fabricates boundary timestamps", () => {
    const album = project([undefined, 2000], {
      transitions: [setting("track-0", "track-1")],
    });
    expect(resolveAlbumBoundaryVisualFrame(album, 1000)).toEqual({
      status: "blocked",
      reason: "unresolved-timing",
    });
  });

  it.each([NaN, Infinity, -Infinity, -1])("blocks invalid album timestamp %s", (time) => {
    const album = project([1000, 2000], {
      transitions: [setting("track-0", "track-1")],
    });
    expect(resolveAlbumBoundaryVisualFrame(album, time)).toEqual({
      status: "blocked",
      reason: "invalid-time",
    });
  });

  it.each(presets)("produces distinct bounded finite effect channels for %s", (preset) => {
    const initial = evaluateBoundaryVisualEffect(preset, 0);
    const middle = evaluateBoundaryVisualEffect(preset, 0.5);
    const final = evaluateBoundaryVisualEffect(preset, 1);
    expect(initial.outgoing.opacity).toBe(1);
    expect(initial.incoming.opacity).toBe(0);
    expect(final.outgoing.opacity).toBe(0);
    expect(final.incoming.opacity).toBe(1);
    expect(middle).toEqual(evaluateBoundaryVisualEffect(preset, 0.5));
    for (const frame of [initial, middle, final]) {
      expect(
        JSON.stringify(frame),
      ).not.toContain("null");
      for (const side of [frame.outgoing, frame.incoming]) {
        expect(side.opacity).toBeGreaterThanOrEqual(0);
        expect(side.opacity).toBeLessThanOrEqual(1);
        expect(side.scale).toBeGreaterThan(0);
      }
      expect(frame.blackOverlayOpacity).toBeGreaterThanOrEqual(0);
      expect(frame.whiteOverlayOpacity).toBeLessThanOrEqual(1);
      expect(frame.glitchAmount).toBeLessThanOrEqual(1);
    }
    expect(evaluateBoundaryVisualEffect(preset, -50)).toEqual(initial);
    expect(evaluateBoundaryVisualEffect(preset, 50)).toEqual(final);
  });

  it("each of eight presets has a valid complete canonical track-to-track event", () => {
    for (const preset of presets) {
      const album = project([1000, 2000], {
        transitions: [setting("track-0", "track-1", preset)],
      });
      const result = resolveAlbumBoundaryVisualFrame(album, 1400);
      expect(result).toMatchObject({
        status: "active",
        preset,
        boundaryTimeMs: 1000,
        effectiveDurationMs: 800,
      });
    }
  });

  it("is seek-order independent and does not mutate project revision or playlist", () => {
    const album = project([1000, 2000, 1500], {
      transitions: [
        setting("track-0", "track-1", "soft-flash"),
        setting("track-1", "track-2", "premium-album-change"),
      ],
    });
    const before = structuredClone(album);
    const positions = [3300, 1000, 4500, 1400, 1000, 3400, 1400];
    const frames = positions.map((time) =>
      resolveAlbumBoundaryVisualFrame(album, time),
    );
    expect(frames[1]).toEqual(frames[4]);
    expect(frames[3]).toEqual(frames[6]);
    expect(album).toEqual(before);
  });

  it("handles 128 tracks, all 127 enabled boundaries, and 10 repeated seek passes", () => {
    const durations = Array.from({ length: 128 }, () => 1000);
    const transitions = Array.from({ length: 127 }, (_, i) =>
      setting(`track-${i}`, `track-${i + 1}`, presets[i % presets.length]!),
    );
    const album = project(durations, { transitions });
    const original = structuredClone(album);
    const first = Array.from({ length: 127 }, (_, i) =>
      resolveAlbumBoundaryVisualFrame(album, (i + 1) * 1000 + 400),
    );
    for (let i = 0; i < 127; i++) {
      expect(first[i]).toMatchObject({
        status: "active",
        fromTrackId: `track-${i}`,
        toTrackId: `track-${i + 1}`,
      });
    }
    for (let pass = 0; pass < 10; pass++) {
      for (const i of [0, 12, 37, 66, 98, 126]) {
        expect(
          resolveAlbumBoundaryVisualFrame(album, (i + 1) * 1000 + 400),
        ).toEqual(first[i]);
      }
    }
    expect(album).toEqual(original);
  });
});
