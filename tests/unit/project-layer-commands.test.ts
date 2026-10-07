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
    expect(
      session.snapshot().project.visualScene?.layers[1]?.transform,
    ).toEqual(changedTransform);

    expect(session.undo().status).toBe("applied");
    expect(
      session.snapshot().project.visualScene?.layers[1]?.transform,
    ).toEqual(transform);
    expect(session.snapshot().dirty).toBe(false);

    expect(session.redo().status).toBe("applied");
    expect(
      session.snapshot().project.visualScene?.layers[1]?.transform,
    ).toEqual(changedTransform);
  });
});

describe("T11-W05-02 lock, style, stale and gesture semantics", () => {
  it("allows explicit unlock but rejects other mutations while a layer is locked", () => {
    const engine = new ProjectCommandEngine(projectFixture());
    const lockedTransform = { ...transform, x: 0.1 };

    for (const command of [
      createLayerRemoveCommand({ layerId: "background" }),
      createLayerReorderCommand({ layerId: "background", toIndex: 1 }),
      createLayerDuplicateCommand({
        layerId: "background",
        newLayerId: "background-copy",
      }),
      createLayerSetTransformCommand({
        layerId: "background",
        transform: lockedTransform,
      }),
      createLayerSetCommonCommand({
        layerId: "background",
        patch: { visible: false },
      }),
    ]) {
      expect(engine.execute(command)).toEqual({
        status: "rejected",
        code: "COMMAND_FAILED",
      });
    }

    expect(engine.snapshot()).toMatchObject({
      project: { revision: 0 },
      undoDepth: 0,
    });

    expect(
      engine.execute(
        createLayerSetCommonCommand({
          layerId: "background",
          patch: { locked: false },
        }),
      ).status,
    ).toBe("applied");
    expect(engine.snapshot().project.visualScene?.layers[0]).toMatchObject({
      locked: false,
    });

    expect(
      engine.execute(
        createLayerSetTransformCommand({
          layerId: "background",
          transform: lockedTransform,
        }),
      ).status,
    ).toBe("applied");
    expect(engine.snapshot()).toMatchObject({
      project: { revision: 2 },
      undoDepth: 2,
    });
  });

  it("updates validated common state and text style with no-op suppression", () => {
    const engine = new ProjectCommandEngine(projectFixture());

    expect(
      engine.execute(
        createLayerSetCommonCommand({
          layerId: "title",
          patch: { name: "Judul Utama", visible: false, locked: true },
        }),
      ).status,
    ).toBe("applied");

    expect(engine.snapshot().project.visualScene?.layers[1]).toMatchObject({
      name: "Judul Utama",
      visible: false,
      locked: true,
    });

    expect(
      engine.execute(
        createLayerSetCommonCommand({
          layerId: "title",
          patch: { locked: false },
        }),
      ).status,
    ).toBe("applied");

    const newStyle: VisualTextStyle = {
      ...textStyle,
      fontFamily: "Arial",
      fontSizeRatio: 0.08,
      fontWeight: "bold",
      italic: true,
      align: "left",
      color: "#00FFFFFF",
      letterSpacingRatio: 0.01,
      lineHeight: 1.4,
    };

    expect(
      engine.execute(
        createLayerSetTextStyleCommand({
          layerId: "title",
          style: newStyle,
        }),
      ).status,
    ).toBe("applied");

    const revision = engine.snapshot().project.revision;
    const depth = engine.snapshot().undoDepth;

    expect(
      engine.execute(
        createLayerSetTextStyleCommand({
          layerId: "title",
          style: newStyle,
        }),
      ),
    ).toEqual({ status: "noop" });
    expect(engine.snapshot()).toMatchObject({
      project: { revision },
      undoDepth: depth,
    });
  });

  it("rejects text-style changes against non-text layers without partial mutation", () => {
    const engine = new ProjectCommandEngine(projectFixture());
    const before = engine.snapshot();

    expect(
      engine.execute(
        createLayerSetTextStyleCommand({
          layerId: "spectrum",
          style: textStyle,
        }),
      ),
    ).toEqual({ status: "rejected", code: "COMMAND_FAILED" });

    expect(engine.snapshot()).toEqual(before);
  });

  it("rejects stale revision and state-token layer commands before mutation", () => {
    const engine = new ProjectCommandEngine(projectFixture());
    const before = engine.snapshot();

    expect(
      engine.execute(
        createLayerSetCommonCommand({
          layerId: "title",
          patch: { visible: false },
          expectedBaseRevision: before.project.revision + 1,
          expectedStateToken: before.stateToken,
        }),
      ),
    ).toEqual({ status: "rejected", code: "STALE_REVISION" });

    expect(
      engine.execute(
        createLayerSetCommonCommand({
          layerId: "title",
          patch: { visible: false },
          expectedBaseRevision: before.project.revision,
          expectedStateToken: "state-stale",
        }),
      ),
    ).toEqual({ status: "rejected", code: "STALE_STATE_TOKEN" });

    expect(engine.snapshot()).toEqual(before);
  });

  it("keeps repeated gesture previews session-only and publishes exactly one commit", () => {
    const session = new ProjectSessionHistory(projectFixture());
    const before = session.snapshot();
    const gesture = new LayerTransformGestureSession(before, "title");

    for (let index = 0; index < 50; index += 1) {
      gesture.preview({
        ...transform,
        x: 0.1 + index / 100,
        y: 0.2 + index / 200,
        rotationDeg: index,
      });

      expect(session.snapshot()).toMatchObject({
        project: { revision: 0 },
        stateToken: before.stateToken,
        undoDepth: 0,
        redoDepth: 0,
        dirty: false,
      });
    }

    const finalPreview = gesture.currentPreview();
    expect(session.execute(gesture.createCommitCommand()).status).toBe(
      "applied",
    );

    expect(session.snapshot()).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
      redoDepth: 0,
      dirty: true,
    });
    expect(
      session.snapshot().project.visualScene?.layers[1]?.transform,
    ).toEqual(finalPreview);

    expect(session.undo().status).toBe("applied");
    expect(
      session.snapshot().project.visualScene?.layers[1]?.transform,
    ).toEqual(transform);
    expect(session.snapshot().dirty).toBe(false);
  });

  it("rejects a gesture commit when project state changed after gesture start", () => {
    const session = new ProjectSessionHistory(projectFixture());
    const start = session.snapshot();
    const gesture = new LayerTransformGestureSession(start, "title");
    gesture.preview({ ...transform, x: 0.25 });

    expect(
      session.execute(
        createLayerSetCommonCommand({
          layerId: "title",
          patch: { visible: false },
        }),
      ).status,
    ).toBe("applied");

    expect(session.execute(gesture.createCommitCommand())).toEqual({
      status: "rejected",
      code: "STALE_REVISION",
    });
    expect(session.snapshot()).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
    });
    expect(session.snapshot().project.visualScene?.layers[1]).toMatchObject({
      visible: false,
      transform,
    });
  });
});

describe("T11-W05-02 128-layer core stress", () => {
  it("keeps command order and history deterministic through 64 edits and full Undo/Redo", () => {
    const layers = Array.from({ length: 128 }, (_, index) =>
      textLayer(`layer-${index}`, `Layer ${index}`),
    );
    const project: ProjectDocument = {
      schemaVersion: 1,
      projectId: "layer-stress-128",
      name: "Layer Stress",
      revision: 0,
      tracks: [],
      visualScene: {
        sceneVersion: 1,
        layers,
      },
    };
    const session = new ProjectSessionHistory(project);
    const originalIds = layerIds(session.snapshot().project);

    for (let index = 0; index < 64; index += 1) {
      const before = session.snapshot();
      const layerId = `layer-${index}`;
      const result =
        index % 2 === 0
          ? session.execute(
              createLayerSetTransformCommand({
                layerId,
                transform: {
                  ...transform,
                  x: (index % 20) / 20,
                  y: 0.25 + (index % 10) / 20,
                  rotationDeg: index,
                },
                expectedBaseRevision: before.project.revision,
                expectedStateToken: before.stateToken,
              }),
            )
          : session.execute(
              createLayerReorderCommand({
                layerId,
                toIndex: 127 - index,
                expectedBaseRevision: before.project.revision,
                expectedStateToken: before.stateToken,
              }),
            );

      expect(result.status).toBe("applied");
    }

    const changed = session.snapshot();
    expect(changed).toMatchObject({
      project: { revision: 64 },
      undoDepth: 64,
      redoDepth: 0,
      dirty: true,
    });
    expect(changed.project.visualScene?.layers).toHaveLength(128);
    expect(new Set(layerIds(changed.project)).size).toBe(128);
    const changedIds = layerIds(changed.project);

    for (let index = 0; index < 64; index += 1) {
      expect(session.undo().status).toBe("applied");
    }

    const restored = session.snapshot();
    expect(restored).toMatchObject({
      project: { revision: 128 },
      stateToken: "state-0",
      undoDepth: 0,
      redoDepth: 64,
      dirty: false,
    });
    expect(layerIds(restored.project)).toEqual(originalIds);

    for (let index = 0; index < 64; index += 1) {
      expect(session.redo().status).toBe("applied");
    }

    const redone = session.snapshot();
    expect(redone).toMatchObject({
      project: { revision: 192 },
      undoDepth: 64,
      redoDepth: 0,
      dirty: true,
    });
    expect(layerIds(redone.project)).toEqual(changedIds);
    expect(new Set(layerIds(redone.project)).size).toBe(128);
  });
});
