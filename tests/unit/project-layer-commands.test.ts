import { describe, expect, it } from "vitest";
import {
  LayerTransformGestureSession,
  createLayerAddCommand,
  createLayerDuplicateCommand,
  createLayerRemoveCommand,
  createLayerReorderCommand,
  createLayerSetCommonCommand,
  createLayerSetTextStyleCommand,
  createLayerSetTransformCommand,
} from "../../src/core/application/services/project-layer-commands";
import { ProjectCommandEngine } from "../../src/core/application/services/project-command-engine";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import type {
  VisualLayer,
  VisualLayerTransform,
  VisualTextStyle,
} from "../../src/core/domain/visual-scene-schema";

const transform: VisualLayerTransform = {
  x: 0.5,
  y: 0.5,
  width: 0.5,
  height: 0.2,
  rotationDeg: 0,
  opacity: 1,
  anchor: "center",
};

const textStyle: VisualTextStyle = {
  fontFamily: "Inter",
  fontSizeRatio: 0.05,
  fontWeight: "semibold",
  italic: false,
  align: "center",
  color: "#FFFFFFFF",
  letterSpacingRatio: 0,
  lineHeight: 1.2,
};

function textLayer(id: string, name = id): VisualLayer {
  return {
    id,
    kind: "text",
    name,
    visible: true,
    locked: false,
    transform: structuredClone(transform),
    role: "static",
    text: `Teks ${id}`,
    style: structuredClone(textStyle),
  };
}

function projectFixture(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "layer-command-project",
    name: "Layer Command Album",
    revision: 0,
    mediaAssets: [
      {
        id: "audio-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/01 Track.wav",
        fileName: "01 Track.wav",
        sizeBytes: 1200,
        availability: "ready",
        metadata: { durationMs: 1000 },
      },
      {
        id: "image-1",
        kind: "image",
        required: false,
        sourcePath: "D:/Album/cover.webp",
        fileName: "cover.webp",
        sizeBytes: 400,
        availability: "ready",
      },
    ],
    tracks: [
      {
        id: "track-1",
        title: "Track",
        sourcePath: "D:/Album/01 Track.wav",
        audioAssetId: "audio-1",
      },
    ],
    visualScene: {
      sceneVersion: 1,
      layers: [
        {
          id: "background",
          kind: "background",
          name: "Background",
          visible: true,
          locked: true,
          transform: { ...transform, width: 1, height: 1 },
          fill: { type: "solid", color: "#101820FF" },
        },
        {
          id: "title",
          kind: "text",
          name: "Judul",
          visible: true,
          locked: false,
          transform: structuredClone(transform),
          role: "title",
          style: structuredClone(textStyle),
        },
        {
          id: "spectrum",
          kind: "spectrum",
          name: "Spectrum",
          visible: true,
          locked: false,
          transform: structuredClone(transform),
        },
      ],
    },
  };
}

function layerIds(project: ProjectDocument): string[] {
  return project.visualScene?.layers.map((layer) => layer.id) ?? [];
}

describe("T11-W05-02 manual layer commands", () => {
  it("adds a first layer to a legacy schema-v1 project and Undo restores absence of visualScene", () => {
    const legacy: ProjectDocument = {
      schemaVersion: 1,
      projectId: "legacy-layer-add",
      name: "Legacy",
      revision: 0,
      tracks: [],
    };
    const session = new ProjectSessionHistory(legacy);
    const before = session.snapshot();

    expect(
      session.execute(
        createLayerAddCommand({
          layer: textLayer("first-layer"),
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        }),
      ).status,
    ).toBe("applied");

    expect(session.snapshot()).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
      dirty: true,
    });
    expect(layerIds(session.snapshot().project)).toEqual(["first-layer"]);

    expect(session.undo().status).toBe("applied");
    expect(session.snapshot().project).not.toHaveProperty("visualScene");
    expect(session.snapshot().dirty).toBe(false);
  });

  it("removes only project layer state and never mutates referenced source media", () => {
    const session = new ProjectSessionHistory(projectFixture());
    const before = session.snapshot();
    const sourcesBefore = structuredClone(before.project.mediaAssets);

    expect(
      session.execute(
        createLayerRemoveCommand({
          layerId: "title",
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        }),
      ).status,
    ).toBe("applied");

    const changed = session.snapshot();
    expect(layerIds(changed.project)).toEqual(["background", "spectrum"]);
    expect(changed.project.mediaAssets).toEqual(sourcesBefore);
    expect(changed.project.tracks).toEqual(before.project.tracks);

    session.undo();
    expect(layerIds(session.snapshot().project)).toEqual([
      "background",
      "title",
      "spectrum",
    ]);
    expect(session.snapshot().project.mediaAssets).toEqual(sourcesBefore);
  });

  it("duplicates with a caller-supplied stable ID and rejects duplicate IDs atomically", () => {
    const engine = new ProjectCommandEngine(projectFixture());

    expect(
      engine.execute(
        createLayerDuplicateCommand({
          layerId: "title",
          newLayerId: "title-copy",
        }),
      ).status,
    ).toBe("applied");

    expect(layerIds(engine.snapshot().project)).toEqual([
      "background",
      "title",
      "title-copy",
      "spectrum",
    ]);
    expect(engine.snapshot().project.visualScene?.layers[2]).toMatchObject({
      id: "title-copy",
      kind: "text",
      role: "title",
    });

    const revision = engine.snapshot().project.revision;
    expect(
      engine.execute(
        createLayerDuplicateCommand({
          layerId: "title",
          newLayerId: "title-copy",
        }),
      ),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(engine.snapshot().project.revision).toBe(revision);
    expect(engine.snapshot().undoDepth).toBe(1);
  });

  it("reorders by stable ID, preserves canonical array z-order, and same-index reorder is a no-op", () => {
    const engine = new ProjectCommandEngine(projectFixture());

    expect(
      engine.execute(
        createLayerReorderCommand({ layerId: "spectrum", toIndex: 1 }),
      ).status,
    ).toBe("applied");
    expect(layerIds(engine.snapshot().project)).toEqual([
      "background",
      "spectrum",
      "title",
    ]);

    const revision = engine.snapshot().project.revision;
    const historyDepth = engine.snapshot().undoDepth;

    expect(
      engine.execute(
        createLayerReorderCommand({ layerId: "spectrum", toIndex: 1 }),
      ),
    ).toEqual({ status: "noop" });
    expect(engine.snapshot().project.revision).toBe(revision);
    expect(engine.snapshot().undoDepth).toBe(historyDepth);
  });

  it("applies transform as one manual history entry and Undo/Redo restores semantic states", () => {
    const session = new ProjectSessionHistory(projectFixture());
    const before = session.snapshot();
    const changedTransform: VisualLayerTransform = {
      ...transform,
      x: 0.2,
      y: 0.8,
      width: 0.7,
      rotationDeg: 15,
      opacity: 0.75,
      anchor: "bottom-center",
    };

    expect(
      session.execute(
        createLayerSetTransformCommand({
          layerId: "title",
          transform: changedTransform,
          expectedBaseRevision: before.project.revision,
          expectedStateToken: before.stateToken,
        }),
      ).status,
    ).toBe("applied");

    expect(session.snapshot()).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
      redoDepth: 0,
      dirty: true,
    });
    expect(session.snapshot().project.visualScene?.layers[1]?.transform).toEqual(
      changedTransform,
    );

    expect(session.undo().status).toBe("applied");
    expect(session.snapshot().project.visualScene?.layers[1]?.transform).toEqual(
      transform,
    );
    expect(session.snapshot().dirty).toBe(false);

    expect(session.redo().status).toBe("applied");
    expect(session.snapshot().project.visualScene?.layers[1]?.transform).toEqual(
      changedTransform,
    );
  });
});
