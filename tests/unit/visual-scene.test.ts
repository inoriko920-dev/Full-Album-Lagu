import { describe, expect, it } from "vitest";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../src/core/domain/project-document";
import {
  resolveVisualScene,
} from "../../src/core/domain/visual-scene-projection";
import {
  visualSceneSchema,
  type VisualLayerTransform,
  type VisualTextStyle,
} from "../../src/core/domain/visual-scene-schema";

const baseTransform: VisualLayerTransform = {
  x: 0.5,
  y: 0.5,
  width: 0.5,
  height: 0.2,
  rotationDeg: 0,
  opacity: 1,
  anchor: "center",
};

const baseTextStyle: VisualTextStyle = {
  fontFamily: "Inter",
  fontSizeRatio: 0.05,
  fontWeight: "semibold",
  italic: false,
  align: "center",
  color: "#FFFFFFFF",
  letterSpacingRatio: 0,
  lineHeight: 1.2,
};

function projectFixture(): ProjectDocument {
  return projectDocumentSchema.parse({
    schemaVersion: 1,
    projectId: "visual-scene-project",
    name: "Visual Album",
    revision: 4,
    albumPresentation: {
      defaultArtworkAssetId: "image-default",
    },
    mediaAssets: [
      {
        id: "audio-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/01 Track.wav",
        fileName: "01 Track.wav",
        sizeBytes: 1200,
        availability: "ready",
        metadata: {
          durationMs: 1000,
          title: "Metadata Title",
          artist: "Metadata Artist",
          trackNumber: 1,
        },
      },
      {
        id: "audio-2",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/02 Track.wav",
        fileName: "02 Track.wav",
        sizeBytes: 1300,
        availability: "ready",
        metadata: {
          durationMs: 1200,
          title: "Second Title",
          artist: "Second Artist",
          trackNumber: 2,
        },
      },
      {
        id: "image-default",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/default.webp",
        fileName: "default.webp",
        sizeBytes: 500,
        availability: "ready",
      },
      {
        id: "image-track",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/track.webp",
        fileName: "track.webp",
        sizeBytes: 550,
        availability: "ready",
      },
    ],
    tracks: [
      {
        id: "track-1",
        title: "Track One",
        sourcePath: "D:/Album/01 Track.wav",
        audioAssetId: "audio-1",
        enabled: false,
        binding: {
          titleOverride: "Manual Title",
          artistOverride: "Manual Artist",
          artworkAssetId: "image-track",
        },
      },
      {
        id: "track-2",
        title: "Track Two",
        sourcePath: "D:/Album/02 Track.wav",
        audioAssetId: "audio-2",
        enabled: true,
      },
    ],
    visualScene: {
      sceneVersion: 1,
      layers: [
        {
          id: "layer-background",
          kind: "background",
          name: "Background",
          visible: true,
          locked: true,
          transform: {
            ...baseTransform,
            width: 1,
            height: 1,
          },
          fill: {
            type: "linear-gradient",
            angleDeg: 90,
            stops: [
              { offset: 0, color: "#101820FF" },
              { offset: 1, color: "#24425CFF" },
            ],
          },
        },
        {
          id: "layer-artwork",
          kind: "artwork",
          name: "Artwork",
          visible: true,
          locked: false,
          transform: baseTransform,
          binding: "active-track-artwork",
        },
        {
          id: "layer-title",
          kind: "text",
          name: "Judul Track",
          visible: true,
          locked: false,
          transform: baseTransform,
          role: "title",
          style: baseTextStyle,
        },
        {
          id: "layer-artist",
          kind: "text",
          name: "Artis",
          visible: true,
          locked: false,
          transform: baseTransform,
          role: "artist",
          style: baseTextStyle,
        },
        {
          id: "layer-static",
          kind: "text",
          name: "Brand",
          visible: true,
          locked: false,
          transform: baseTransform,
          role: "static",
          text: "PROGRES SUNYI",
          style: baseTextStyle,
        },
        {
          id: "layer-spectrum",
          kind: "spectrum",
          name: "Spectrum",
          visible: true,
          locked: false,
          transform: baseTransform,
        },
        {
          id: "layer-progress",
          kind: "progress",
          name: "Progress Bar",
          visible: true,
          locked: false,
          transform: baseTransform,
        },
      ],
    },
  });
}

describe("visual scene schema", () => {
  it("keeps a legacy schema-v1 project valid without injecting visualScene", () => {
    const legacy = {
      schemaVersion: 1,
      projectId: "legacy-before-w11-05",
      name: "Legacy Project",
      revision: 3,
      tracks: [],
      legacyExtension: {
        preserved: true,
      },
    };

    const parsed = projectDocumentSchema.parse(legacy);

    expect(parsed).toEqual(legacy);
    expect(parsed).not.toHaveProperty("visualScene");
  });

  it("uses layer array order as canonical back-to-front z-order", () => {
    const project = projectFixture();

    expect(project.visualScene?.layers.map((layer) => layer.id)).toEqual([
      "layer-background",
      "layer-artwork",
      "layer-title",
      "layer-artist",
      "layer-static",
      "layer-spectrum",
      "layer-progress",
    ]);
  });

  it("rejects duplicate layer IDs", () => {
    const scene = projectFixture().visualScene!;
    const duplicate = {
      ...scene,
      layers: [
        ...scene.layers,
        {
          ...scene.layers[0]!,
          name: "Duplicate",
        },
      ],
    };

    expect(visualSceneSchema.safeParse(duplicate).success).toBe(false);
  });

  it.each([
    {
      label: "out-of-bounds transform",
      mutate: () => ({
        ...projectFixture().visualScene!.layers[0]!,
        transform: {
          ...baseTransform,
          opacity: 1.5,
        },
      }),
    },
    {
      label: "dynamic text persisting derived content",
      mutate: () => ({
        ...projectFixture().visualScene!.layers[2]!,
        text: "Persisted Current Track Title",
      }),
    },
    {
      label: "unsorted gradient stops",
      mutate: () => ({
        ...projectFixture().visualScene!.layers[0]!,
        fill: {
          type: "linear-gradient",
          angleDeg: 0,
          stops: [
            { offset: 0.8, color: "#FFFFFFFF" },
            { offset: 0.2, color: "#000000FF" },
          ],
        },
      }),
    },
  ])("rejects $label", ({ mutate }) => {
    expect(
      visualSceneSchema.safeParse({
        sceneVersion: 1,
        layers: [mutate()],
      }).success,
    ).toBe(false);
  });
});

describe("visual scene projection", () => {
  it("resolves selected-track title, artist and artwork through W11-04 bindings", () => {
    const resolved = resolveVisualScene(projectFixture(), "track-1");

    expect(resolved.trackContext).toEqual({
      source: "selected",
      trackId: "track-1",
    });
    expect(resolved.layers.map((layer) => layer.id)).toEqual([
      "layer-background",
      "layer-artwork",
      "layer-title",
      "layer-artist",
      "layer-static",
      "layer-spectrum",
      "layer-progress",
    ]);

    expect(
      resolved.layers.find((layer) => layer.id === "layer-artwork"),
    ).toMatchObject({
      resolvedArtwork: {
        assetId: "image-track",
        provenance: "manual-override",
      },
    });
    expect(
      resolved.layers.find((layer) => layer.id === "layer-title"),
    ).toMatchObject({
      resolvedText: {
        value: "Manual Title",
        provenance: "manual-override",
      },
    });
    expect(
      resolved.layers.find((layer) => layer.id === "layer-artist"),
    ).toMatchObject({
      resolvedText: {
        value: "Manual Artist",
        provenance: "manual-override",
      },
    });
    expect(
      resolved.layers.find((layer) => layer.id === "layer-static"),
    ).toMatchObject({
      resolvedText: {
        value: "PROGRES SUNYI",
        provenance: "static",
      },
    });
  });

  it("falls back to the first enabled track when selectedTrackId is unavailable", () => {
    const resolved = resolveVisualScene(projectFixture(), "track-missing");

    expect(resolved.trackContext).toEqual({
      source: "first-enabled",
      trackId: "track-2",
    });
    expect(
      resolved.layers.find((layer) => layer.id === "layer-title"),
    ).toMatchObject({
      resolvedText: {
        value: "Second Title",
        provenance: "audio-metadata",
      },
    });
    expect(
      resolved.layers.find((layer) => layer.id === "layer-artwork"),
    ).toMatchObject({
      resolvedArtwork: {
        assetId: "image-default",
        provenance: "album-default",
      },
    });
  });

  it("resolves album-artwork semantically without copying asset IDs into track state", () => {
    const project = projectFixture();
    project.visualScene!.layers[1] = {
      ...project.visualScene!.layers[1]!,
      kind: "artwork",
      binding: "album-artwork",
    };

    const resolved = resolveVisualScene(project, "track-1");

    expect(resolved.layers[1]).toMatchObject({
      resolvedArtwork: {
        assetId: "image-default",
        provenance: "album-default",
      },
    });
    expect(project.tracks[0]!.binding?.artworkAssetId).toBe("image-track");
  });

  it("keeps spectrum/progress structural and does not pull W11-06 runtime forward", () => {
    const resolved = resolveVisualScene(projectFixture(), "track-1");

    expect(
      resolved.layers.find((layer) => layer.id === "layer-spectrum"),
    ).toMatchObject({
      runtimeState: "structural-placeholder",
    });
    expect(
      resolved.layers.find((layer) => layer.id === "layer-progress"),
    ).toMatchObject({
      runtimeState: "structural-placeholder",
    });
  });

  it("is pure, offline and never persists derived scene values or mutates source refs", () => {
    const project = projectFixture();
    const before = JSON.stringify(project);
    const sourcePathsBefore = project.mediaAssets?.map(
      (asset) => asset.sourcePath,
    );

    const first = resolveVisualScene(project, "track-1");
    const second = resolveVisualScene(project, "track-1");

    expect(second).toEqual(first);
    expect(JSON.stringify(project)).toBe(before);
    expect(project.mediaAssets?.map((asset) => asset.sourcePath)).toEqual(
      sourcePathsBefore,
    );
    expect(JSON.stringify(project)).not.toContain("resolvedText");
    expect(JSON.stringify(project)).not.toContain("resolvedArtwork");
    expect(JSON.stringify(project)).not.toContain("runtimeState");
  });

  it("returns structural placeholders when no track context exists", () => {
    const project = projectFixture();
    project.tracks = project.tracks.map((track) => ({
      ...track,
      enabled: false,
    }));

    const resolved = resolveVisualScene(project);

    expect(resolved.trackContext).toEqual({ source: "none" });
    expect(
      resolved.layers.find((layer) => layer.id === "layer-title"),
    ).toMatchObject({
      resolvedText: {
        value: "",
        provenance: "structural-placeholder",
      },
    });
  });
});
