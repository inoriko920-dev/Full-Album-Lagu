import { describe, expect, it } from "vitest";
import { buildStaticScenePreview } from "../../src/core/domain/static-scene-preview";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import {
  LayerTransformGestureSession,
  createLayerSetCommonCommand,
} from "../../src/core/application/services/project-layer-commands";
import { VisualSelectionSession } from "../../src/renderer/state/ui-session/visual-selection-session";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import type {
  VisualLayer,
  VisualLayerTransform,
} from "../../src/core/domain/visual-scene-schema";

const transform: VisualLayerTransform = {
  x: 0.5,
  y: 0.5,
  width: 0.4,
  height: 0.2,
  rotationDeg: 0,
  opacity: 1,
  anchor: "center",
};
const textStyle = {
  fontFamily: "Inter",
  fontSizeRatio: 0.05,
  fontWeight: "bold" as const,
  italic: false,
  align: "center" as const,
  color: "#FFFFFFFF",
  letterSpacingRatio: 0,
  lineHeight: 1.2,
};

function staticText(id: string): VisualLayer {
  return {
    id,
    name: id,
    kind: "text",
    visible: true,
    locked: false,
    transform: structuredClone(transform),
    role: "static",
    text: `Statik ${id}`,
    style: structuredClone(textStyle),
  };
}

function fixture(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "static-preview-projection",
    name: "Album Preview",
    revision: 0,
    mediaAssets: [
      {
        id: "img-1",
        kind: "image",
        required: false,
        sourcePath: "hidden-artwork-path",
        fileName: "cover.png",
        sizeBytes: 20,
        availability: "ready",
      },
    ],
    tracks: [
      {
        id: "track-off",
        title: "Nonaktif",
        sourcePath: "hidden-off",
        enabled: false,
        binding: {
          titleOverride: "Judul Manual",
          artistOverride: "Artis Manual",
          artworkAssetId: "img-1",
        },
      },
      {
        id: "track-on",
        title: "Lagu Aktif",
        sourcePath: "hidden-on",
        enabled: true,
        binding: { artistOverride: "Artis Aktif" },
      },
    ],
    visualScene: {
      sceneVersion: 1,
      layers: [
        {
          id: "bg",
          name: "Background",
          kind: "background",
          visible: true,
          locked: true,
          transform: { ...transform, width: 1, height: 1 },
          fill: {
            type: "linear-gradient",
            angleDeg: 120,
            stops: [
              { offset: 0, color: "#101820FF" },
              { offset: 1, color: "#334455FF" },
            ],
          },
        },
        {
          id: "art",
          name: "Artwork",
          kind: "artwork",
          binding: "active-track-artwork",
          visible: true,
          locked: false,
          transform: structuredClone(transform),
        },
        {
          id: "title",
          name: "Judul Track",
          kind: "text",
          role: "title",
          style: structuredClone(textStyle),
          visible: true,
          locked: false,
          transform: structuredClone(transform),
        },
        {
          id: "artist",
          name: "Artis",
          kind: "text",
          role: "artist",
          style: structuredClone(textStyle),
          visible: false,
          locked: false,
          transform: structuredClone(transform),
        },
        {
          id: "spectrum",
          name: "Spectrum",
          kind: "spectrum",
          visible: true,
          locked: false,
          transform: structuredClone(transform),
        },
        {
          id: "progress",
          name: "Progress Bar",
          kind: "progress",
          visible: true,
          locked: false,
          transform: structuredClone(transform),
        },
      ],
    },
  };
}

describe("T11-W05-04 deterministic static projection", () => {
  it("inherits selected-track and first-enabled W11-04 bindings without modifying source project", () => {
    const project = fixture();
    const before = structuredClone(project);
    const selected = buildStaticScenePreview(project, {
      selectedTrackId: "track-off",
      selectedLayerId: "title",
    });
    const fallback = buildStaticScenePreview(project, {
      selectedTrackId: "unknown",
      selectedLayerId: "title",
    });

    expect(selected.trackContext).toEqual({
      source: "selected",
      trackId: "track-off",
    });
    expect(selected.layers.find((layer) => layer.id === "title")).toMatchObject(
      {
        resolvedText: { value: "Judul Manual", provenance: "manual-override" },
      },
    );
    expect(selected.layers.find((layer) => layer.id === "art")).toMatchObject({
      resolvedArtwork: { assetId: "img-1", provenance: "manual-override" },
    });
    expect(fallback.trackContext).toEqual({
      source: "first-enabled",
      trackId: "track-on",
    });
    expect(fallback.layers.find((layer) => layer.id === "title")).toMatchObject(
      {
        resolvedText: { value: "Lagu Aktif" },
      },
    );
    expect(project).toEqual(before);
    expect(JSON.stringify(selected)).not.toContain("hidden-artwork-path");
  });

  it("keeps canonical z-order, reverses only left-hand list, and exposes selected Inspector", () => {
    const view = buildStaticScenePreview(fixture(), { selectedLayerId: "bg" });
    expect(view.layers.map((layer) => layer.id)).toEqual([
      "bg",
      "art",
      "title",
      "artist",
      "spectrum",
      "progress",
    ]);
    expect(view.layerList.map((item) => item.id)).toEqual([
      "progress",
      "spectrum",
      "artist",
      "title",
      "art",
      "bg",
    ]);
    expect(view.inspector).toMatchObject({
      id: "bg",
      locked: true,
      transform: { width: 1, height: 1 },
      details: { kind: "background", fill: { type: "linear-gradient" } },
    });
    expect(view.selectionOutline).toEqual({
      layerId: "bg",
      transform: { ...transform, width: 1, height: 1 },
    });
    expect(
      buildStaticScenePreview(fixture(), { selectedLayerId: "missing" })
        .selectedLayerId,
    ).toBeNull();
    expect(
      buildStaticScenePreview(fixture(), { selectedLayerId: "artist" })
        .selectionOutline,
    ).toBeNull();
  });

  it("keeps spectrum and progress structural, without synthesizing playhead or audio data", () => {
    const view = buildStaticScenePreview(fixture(), {
      selectedLayerId: "spectrum",
    });
    expect(view.inspector?.details).toEqual({
      kind: "spectrum",
      runtimeState: "structural-placeholder",
    });
    expect(
      view.layers.filter(
        (layer) => layer.kind === "progress" || layer.kind === "spectrum",
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "spectrum",
        runtimeState: "structural-placeholder",
      }),
      expect.objectContaining({
        kind: "progress",
        runtimeState: "structural-placeholder",
      }),
    ]);
    expect(view).not.toHaveProperty("playhead");
  });

  it("projects pointer previews but preserves canonical revision/history until gesture-end commit", () => {
    const session = new ProjectSessionHistory(fixture());
    const baseline = session.snapshot();
    const gesture = new LayerTransformGestureSession(baseline, "title");
    let latest = transform;
    for (let i = 0; i < 50; i += 1) {
      latest = { ...transform, x: 0.2 + i / 100, opacity: 0.7, rotationDeg: i };
      gesture.preview(latest);
      const projected = buildStaticScenePreview(session.snapshot().project, {
        selectedLayerId: "title",
        gesturePreview: { layerId: "title", transform: latest },
      });
      expect(projected.selectionOutline?.transform).toEqual(latest);
    }
    expect(session.snapshot()).toEqual(baseline);

    expect(session.execute(gesture.createCommitCommand()).status).toBe(
      "applied",
    );
    expect(session.snapshot()).toMatchObject({
      undoDepth: 1,
      project: { revision: 1 },
    });
    expect(
      buildStaticScenePreview(session.snapshot().project, {
        selectedLayerId: "title",
      }).selectionOutline?.transform,
    ).toEqual(latest);
    expect(session.undo().status).toBe("applied");
    expect(
      buildStaticScenePreview(session.snapshot().project, {
        selectedLayerId: "title",
      }).selectionOutline?.transform,
    ).toEqual(transform);
  });

  it("does not preview a locked or unrelated layer transform", () => {
    const view = buildStaticScenePreview(fixture(), {
      selectedLayerId: "bg",
      gesturePreview: { layerId: "bg", transform: { ...transform, x: 0.9 } },
    });
    expect(view.selectionOutline?.transform.x).toBe(0.5);
  });

  it("supports legacy scene absence and deterministic 128-layer stress", () => {
    const legacy: ProjectDocument = {
      schemaVersion: 1,
      projectId: "legacy",
      name: "Legacy",
      revision: 0,
      tracks: [],
    };
    expect(buildStaticScenePreview(legacy)).toMatchObject({
      layers: [],
      layerList: [],
      inspector: null,
      selectionOutline: null,
    });

    const project = fixture();
    project.visualScene = {
      sceneVersion: 1,
      layers: Array.from({ length: 128 }, (_, i) => staticText(`layer-${i}`)),
    };
    const start = performance.now();
    const view = buildStaticScenePreview(project, {
      selectedLayerId: "layer-63",
    });
    expect(view.layers).toHaveLength(128);
    expect(view.layerList[0]?.id).toBe("layer-127");
    expect(view.layerList[127]?.id).toBe("layer-0");
    expect(view.inspector?.id).toBe("layer-63");
    expect(performance.now() - start).toBeLessThan(3000);
  });
});

describe("T11-W05-04 UI-session selection lifecycle", () => {
  it("coordinates canvas and list, permits locked/hidden list selection and never dirties project", () => {
    const history = new ProjectSessionHistory(fixture());
    const before = history.snapshot();
    const selection = new VisualSelectionSession();
    const model = buildStaticScenePreview(before.project);

    expect(selection.selectFromCanvas(model, "bg")).toBe(true);
    expect(selection.snapshot().selectedLayerId).toBe("bg");
    expect(selection.previewGesture(model, { ...transform, x: 0.1 })).toBe(
      false,
    );
    expect(selection.selectFromCanvas(model, "artist")).toBe(false);
    expect(selection.selectFromLayerList(model, "artist")).toBe(true);
    expect(selection.selectFromLayerList(model, "unknown")).toBe(false);
    expect(selection.snapshot().selectedLayerId).toBe("artist");
    expect(history.snapshot()).toEqual(before);
  });

  it("allows only valid editable gesture previews and clears selection after remove/reopen", () => {
    const history = new ProjectSessionHistory(fixture());
    const selection = new VisualSelectionSession();
    const model = buildStaticScenePreview(history.snapshot().project);
    expect(selection.selectFromCanvas(model, "title")).toBe(true);
    expect(
      selection.previewGesture(model, { ...transform, opacity: 0.8 }),
    ).toBe(true);
    expect(selection.snapshot().gesturePreview?.transform.opacity).toBe(0.8);
    selection.discardGesture();
    expect(selection.snapshot().gesturePreview).toBeNull();
    selection.hover(model, "art");

    const current = history.snapshot();
    const changed = history.execute(
      createLayerSetCommonCommand({
        layerId: "title",
        patch: { visible: false },
        expectedBaseRevision: current.project.revision,
        expectedStateToken: current.stateToken,
      }),
    );
    expect(changed.status).toBe("applied");
    const newProject = history.snapshot().project;
    newProject.visualScene = {
      sceneVersion: 1,
      layers: newProject.visualScene!.layers.filter(
        (layer) => layer.id !== "title" && layer.id !== "art",
      ),
    };
    selection.reconcile(
      buildStaticScenePreview(newProject, {
        selectedLayerId: selection.snapshot().selectedLayerId,
      }),
    );
    expect(selection.snapshot()).toEqual({
      selectedLayerId: null,
      hoveredLayerId: null,
      gesturePreview: null,
    });
    selection.reset();
    expect(
      history
        .snapshot()
        .project.visualScene?.layers.some((layer) => layer.id === "title"),
    ).toBe(true);
  });
});
