import { describe, expect, it } from "vitest";
import {
  createLayerDuplicateCommand,
  createLayerSetAnimationCommand,
  createLayerSetCommonCommand,
  createLayerRemoveCommand,
} from "../../src/core/application/services/project-layer-commands";
import { ProjectCommandEngine } from "../../src/core/application/services/project-command-engine";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../src/core/domain/project-document";
import type { VisualLayerAnimation } from "../../src/core/domain/visual-scene-schema";
import { evaluateVisualLayerAnimation } from "../../src/core/domain/visual-animation-evaluator";

const originalAnimation: VisualLayerAnimation = {
  entrance: { preset: "zoom-in", durationMs: 800, easing: "ease-out" },
  loop: { preset: "slow-zoom", enabled: true, durationMs: 4000, intensity: "subtle" },
  keyframes: [{
    property: "opacity",
    points: [{ timeMs: 0, value: 1 }, { timeMs: 2500, value: 0.85 }],
  }],
};

const nextAnimation: VisualLayerAnimation = {
  entrance: { preset: "fade-in", durationMs: 600, easing: "ease-in-out" },
  exit: { preset: "fade-out", durationMs: 600, easing: "ease-out" },
  keyframes: [{
    property: "opacity",
    points: [{ timeMs: 0, value: 0.8 }, { timeMs: 2000, value: 0.5 }],
  }],
};

function fixture(count = 1, preconfigured = false): ProjectDocument {
  return projectDocumentSchema.parse({
    schemaVersion: 1,
    projectId: "animation-command-test",
    name: "Album",
    revision: 0,
    tracks: [{ id: "track-1", title: "First Song", sourcePath: "music.mp3" }],
    visualScene: {
      sceneVersion: 1,
      layers: Array.from({ length: count }, (_, index) => ({
        id: `layer-${index}`,
        name: `Artwork ${index}`,
        kind: "artwork",
        binding: "active-track-artwork",
        visible: true,
        locked: index === count - 1 && count > 1,
        transform: {
          x: 0.5,
          y: 0.5,
          width: 0.4,
          height: 0.3,
          rotationDeg: 0,
          opacity: 1,
          anchor: "center",
        },
        ...(preconfigured ? { animation: originalAnimation } : {}),
      })),
    },
  });
}

function animationAt(project: ProjectDocument, index = 0) {
  return project.visualScene?.layers[index]?.animation;
}

describe("W11-07 T03 official animation command / history", () => {
  it("applies one validated change as exactly one history entry and Undo/Redo restores state", () => {
    const session = new ProjectSessionHistory(fixture());
    const before = session.snapshot();
    const result = session.execute(createLayerSetAnimationCommand({
      layerId: "layer-0",
      animation: originalAnimation,
      expectedBaseRevision: before.project.revision,
      expectedStateToken: before.stateToken,
    }));

    expect(result.status).toBe("applied");
    expect(session.snapshot()).toMatchObject({
      project: { revision: 1 },
      dirty: true,
      undoDepth: 1,
      redoDepth: 0,
    });
    expect(animationAt(session.snapshot().project)).toEqual(originalAnimation);
    expect(session.snapshot().project.tracks).toEqual(before.project.tracks);
    expect(session.snapshot().project.visualScene?.layers[0]?.transform).toEqual(
      before.project.visualScene?.layers[0]?.transform,
    );

    expect(session.undo().status).toBe("applied");
    expect(animationAt(session.snapshot().project)).toBeUndefined();
    expect(session.snapshot().dirty).toBe(false);
    expect(session.redo().status).toBe("applied");
    expect(animationAt(session.snapshot().project)).toEqual(originalAnimation);
    expect(session.snapshot().dirty).toBe(true);
  });

  it("replaces existing keyframes atomically and holds one Undo checkpoint", () => {
    const session = new ProjectSessionHistory(fixture(1, true));
    const first = session.execute(createLayerSetAnimationCommand({
      layerId: "layer-0",
      animation: nextAnimation,
    }));
    expect(first.status).toBe("applied");
    expect(session.snapshot().undoDepth).toBe(1);
    expect(animationAt(session.snapshot().project)).toEqual(nextAnimation);
    expect(session.undo().status).toBe("applied");
    expect(animationAt(session.snapshot().project)).toEqual(originalAnimation);
    expect(session.redo().status).toBe("applied");
    expect(animationAt(session.snapshot().project)).toEqual(nextAnimation);
  });

  it("does not advance revision or dirty-state for an identical animation", () => {
    const session = new ProjectSessionHistory(fixture(1, true));
    const before = session.snapshot();
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "layer-0",
      animation: originalAnimation,
    }))).toEqual({ status: "noop" });
    expect(session.snapshot()).toEqual(before);
  });

  it("supports removing animation entirely without inserting an undefined field", () => {
    const session = new ProjectSessionHistory(fixture(1, true));
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "layer-0",
    })).status).toBe("applied");
    const removed = session.snapshot().project.visualScene!.layers[0]!;
    expect(removed).not.toHaveProperty("animation");
    expect(JSON.stringify(removed)).not.toContain("animation");
    session.undo();
    expect(animationAt(session.snapshot().project)).toEqual(originalAnimation);
  });

  it("does not invent visual state when removing an absent animation", () => {
    const session = new ProjectSessionHistory(fixture());
    const before = session.snapshot();
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "layer-0",
      animation: undefined,
    }))).toEqual({ status: "noop" });
    expect(session.snapshot()).toEqual(before);
  });

  it("rejects stale revision and stale state token without modifying source", () => {
    const session = new ProjectSessionHistory(fixture());
    const before = session.snapshot();
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "layer-0",
      animation: originalAnimation,
      expectedBaseRevision: before.project.revision + 1,
      expectedStateToken: before.stateToken,
    }))).toEqual({ status: "rejected", code: "STALE_REVISION" });
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "layer-0",
      animation: originalAnimation,
      expectedBaseRevision: before.project.revision,
      expectedStateToken: "not-current",
    }))).toEqual({ status: "rejected", code: "STALE_STATE_TOKEN" });
    expect(session.snapshot()).toEqual(before);
  });

  it("rejects locked and removed layers without committing partial data", () => {
    const session = new ProjectSessionHistory(fixture(2));
    const initial = session.snapshot();
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "layer-1",
      animation: originalAnimation,
    }))).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "missing",
      animation: originalAnimation,
    }))).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(session.snapshot()).toEqual(initial);
    expect(session.execute(createLayerRemoveCommand({ layerId: "layer-0" })).status).toBe("applied");
    const removed = session.snapshot();
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "layer-0",
      animation: originalAnimation,
    }))).toEqual({ status: "rejected", code: "COMMAND_FAILED" });
    expect(session.snapshot()).toEqual(removed);
  });

  it("normalizes bad values before command creation and refuses invalid keyframe timestamps", () => {
    for (const invalid of [
      { ...originalAnimation, keyframes: [{ property: "opacity", points: [{ timeMs: 0, value: Number.NaN }] }] },
      { ...originalAnimation, keyframes: [{ property: "opacity", points: [{ timeMs: 1, value: 1 }, { timeMs: 1, value: 0.85 }] }] },
      { ...originalAnimation, entrance: { preset: "spin", durationMs: 800, easing: "linear" } },
      { ...originalAnimation, randomOption: "not in baseline" },
    ]) {
      expect(() => createLayerSetAnimationCommand({
        layerId: "layer-0",
        animation: invalid as VisualLayerAnimation,
      })).toThrow();
    }
  });

  it("captures user input at command creation and never leaks caller mutations", () => {
    const session = new ProjectSessionHistory(fixture());
    const mutable = structuredClone(originalAnimation);
    const command = createLayerSetAnimationCommand({
      layerId: "layer-0",
      animation: mutable,
    });
    mutable.keyframes![0]!.points[1]!.value = 0.25;
    expect(session.execute(command).status).toBe("applied");
    expect(animationAt(session.snapshot().project)).toEqual(originalAnimation);
    expect(evaluateVisualLayerAnimation(
      session.snapshot().project.visualScene!.layers[0]!, 2500, 5000,
    ).opacity).toBeCloseTo(0.85);
  });

  it("rolls back a batch when the second mutation hits a locked layer", () => {
    const engine = new ProjectCommandEngine(fixture(2));
    const before = engine.snapshot();
    expect(engine.executeBatch({
      kind: "layer.animation-batch",
      label: "Ubah animasi dua layer",
      origin: "manual",
      expectedBaseRevision: before.project.revision,
      expectedStateToken: before.stateToken,
      commands: [
        createLayerSetAnimationCommand({ layerId: "layer-0", animation: originalAnimation }),
        createLayerSetAnimationCommand({ layerId: "layer-1", animation: originalAnimation }),
      ],
    })).toEqual({ status: "rejected", code: "COMMAND_FAILED", failedCommandIndex: 1 });
    expect(engine.snapshot()).toEqual(before);
  });

  it("duplicates an animated layer preserving animation while editing the copy independently", () => {
    const session = new ProjectSessionHistory(fixture(1, true));
    expect(session.execute(createLayerDuplicateCommand({
      layerId: "layer-0", newLayerId: "copy",
    })).status).toBe("applied");
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "copy", animation: nextAnimation,
    })).status).toBe("applied");
    const layers = session.snapshot().project.visualScene!.layers;
    expect(layers[0]!.animation).toEqual(originalAnimation);
    expect(layers[1]!.animation).toEqual(nextAnimation);
    expect(session.undo().status).toBe("applied");
    expect(session.snapshot().project.visualScene!.layers[1]!.animation).toEqual(originalAnimation);
  });

  it("persists animation through serialization and clean reopen without extraneous fields", () => {
    const session = new ProjectSessionHistory(fixture());
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "layer-0", animation: originalAnimation,
    })).status).toBe("applied");
    const snapshot = session.snapshot();
    const bytes = JSON.stringify(snapshot.project);
    const reopened = projectDocumentSchema.parse(JSON.parse(bytes));
    expect(animationAt(reopened)).toEqual(originalAnimation);
    expect(reopened.schemaVersion).toBe(1);
    expect(reopened.tracks).toEqual(fixture().tracks);
    const openedSession = new ProjectSessionHistory(reopened);
    expect(openedSession.snapshot().dirty).toBe(false);
    expect(animationAt(openedSession.snapshot().project)).toEqual(originalAnimation);
    session.markSaved();
    expect(session.snapshot().dirty).toBe(false);
    session.undo();
    expect(session.snapshot().dirty).toBe(true);
    session.redo();
    expect(session.snapshot().dirty).toBe(false);
  });

  it("executes 64 edits on 128 layers with deterministic Undo/Redo and zero layer-count drift", () => {
    const session = new ProjectSessionHistory(fixture(128));
    for (let index = 0; index < 64; index += 1) {
      const before = session.snapshot();
      expect(session.execute(createLayerSetAnimationCommand({
        layerId: `layer-${index}`,
        animation: originalAnimation,
        expectedBaseRevision: before.project.revision,
        expectedStateToken: before.stateToken,
      })).status).toBe("applied");
    }
    expect(session.snapshot().project.visualScene!.layers).toHaveLength(128);
    expect(session.snapshot().undoDepth).toBe(64);
    for (let index = 0; index < 64; index += 1) {
      expect(session.undo().status).toBe("applied");
    }
    expect(session.snapshot().dirty).toBe(false);
    expect(session.snapshot().project.visualScene!.layers.every(layer => layer.animation === undefined)).toBe(true);
    for (let index = 0; index < 64; index += 1) {
      expect(session.redo().status).toBe("applied");
    }
    expect(session.snapshot().project.visualScene!.layers).toHaveLength(128);
    expect(session.snapshot().project.visualScene!.layers.filter(layer => layer.animation !== undefined)).toHaveLength(64);
  });

  it("respects an explicit unlock then allows animation only after unlock", () => {
    const session = new ProjectSessionHistory(fixture(2));
    expect(session.execute(createLayerSetAnimationCommand({ layerId: "layer-1", animation: originalAnimation })).status).toBe("rejected");
    expect(session.execute(createLayerSetCommonCommand({
      layerId: "layer-1", patch: { locked: false },
    })).status).toBe("applied");
    expect(session.execute(createLayerSetAnimationCommand({
      layerId: "layer-1", animation: originalAnimation,
    })).status).toBe("applied");
    expect(animationAt(session.snapshot().project, 1)).toEqual(originalAnimation);
  });
});
