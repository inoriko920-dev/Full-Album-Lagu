import { describe, expect, it } from "vitest";
import {
  createLayerAddCommand,
  createLayerDuplicateCommand,
  createLayerRemoveCommand,
  createLayerReorderCommand,
  createLayerSetCommonCommand,
  createLayerSetStaticTextCommand,
  createLayerSetTextStyleCommand,
  createLayerSetTransformCommand,
} from "../../src/core/application/services/project-layer-commands";
import { ProjectCommandEngine } from "../../src/core/application/services/project-command-engine";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import type {
  VisualLayer,
  VisualLayerTransform,
  VisualTextStyle,
} from "../../src/core/domain/visual-scene-schema";

const transform: VisualLayerTransform = {
  x: 0.5, y: 0.5, width: 0.5, height: 0.2,
  rotationDeg: 0, opacity: 1, anchor: "center",
};
const style: VisualTextStyle = {
  fontFamily: "Inter", fontSizeRatio: 0.05, fontWeight: "semibold",
  italic: false, align: "center", color: "#FFFFFFFF",
  letterSpacingRatio: 0, lineHeight: 1.2,
};

function layer(id: string): VisualLayer {
  return {
    id, kind: "text", name: id, visible: true, locked: false,
    transform: structuredClone(transform), role: "static",
    text: `Original ${id}`, style: structuredClone(style),
  };
}
function fixture(): ProjectDocument {
  return {
    schemaVersion: 1, projectId: "layer-snapshot-qa",
    name: "Existing approved editor", revision: 0, tracks: [],
    visualScene: {
      sceneVersion: 1,
      layers: [layer("first"), layer("second"), layer("third")],
    },
  };
}
function ids(engine: ProjectCommandEngine): string[] {
  return engine.snapshot().project.visualScene?.layers.map((item) => item.id) ?? [];
}
function chosen(engine: ProjectCommandEngine, id: string): VisualLayer {
  const result = engine.snapshot().project.visualScene?.layers.find((item) => item.id === id);
  if (result === undefined) throw new Error(`Missing layer ${id}`);
  return result;
}

describe("W11-07 regression: deferred legacy layer commands cannot retarget", () => {
  it("snapshots an add insertion index and validated layer contents", () => {
    const engine = new ProjectCommandEngine(fixture());
    const input = { layer: layer("new"), toIndex: 1 };
    const command = createLayerAddCommand(input);
    input.toIndex = 3;
    input.layer.name = "INJECTED";
    expect(engine.execute(command).status).toBe("applied");
    expect(ids(engine)).toEqual(["first", "new", "second", "third"]);
    expect(chosen(engine, "new").name).toBe("new");
    expect(engine.undo().status).toBe("applied");
    expect(ids(engine)).toEqual(["first", "second", "third"]);
    expect(engine.redo().status).toBe("applied");
    expect(ids(engine)).toEqual(["first", "new", "second", "third"]);
  });

  it("removes only the original target despite a mutable caller object", () => {
    const engine = new ProjectCommandEngine(fixture());
    const input = { layerId: "first" };
    const command = createLayerRemoveCommand(input);
    input.layerId = "second";
    expect(engine.execute(command).status).toBe("applied");
    expect(ids(engine)).toEqual(["second", "third"]);
    expect(engine.undo().status).toBe("applied");
    expect(ids(engine)).toEqual(["first", "second", "third"]);
  });

  it("duplicates the original source with its original new ID and index", () => {
    const engine = new ProjectCommandEngine(fixture());
    const input = { layerId: "first", newLayerId: "copy", toIndex: 2 };
    const command = createLayerDuplicateCommand(input);
    input.layerId = "second";
    input.newLayerId = "changed-copy";
    input.toIndex = 0;
    expect(engine.execute(command).status).toBe("applied");
    expect(ids(engine)).toEqual(["first", "second", "copy", "third"]);
    expect(chosen(engine, "copy")).toMatchObject({ text: "Original first" });
    expect(ids(engine)).not.toContain("changed-copy");
  });

  it("reorders the original layer to the original destination", () => {
    const engine = new ProjectCommandEngine(fixture());
    const input = { layerId: "third", toIndex: 0 };
    const command = createLayerReorderCommand(input);
    input.layerId = "first";
    input.toIndex = 2;
    expect(engine.execute(command).status).toBe("applied");
    expect(ids(engine)).toEqual(["third", "first", "second"]);
  });

  it("keeps immutable transform and target while retaining one Undo checkpoint", () => {
    const engine = new ProjectCommandEngine(fixture());
    const input = { layerId: "first", transform: { ...transform, x: 0.25 } };
    const command = createLayerSetTransformCommand(input);
    input.layerId = "second";
    input.transform.x = 0.75;
    expect(engine.execute(command).status).toBe("applied");
    expect(chosen(engine, "first").transform.x).toBe(0.25);
    expect(chosen(engine, "second").transform.x).toBe(0.5);
    expect(engine.snapshot().undoDepth).toBe(1);
    engine.undo();
    expect(chosen(engine, "first").transform.x).toBe(0.5);
    engine.redo();
    expect(chosen(engine, "first").transform.x).toBe(0.25);
  });

  it("keeps common patch and target stable, even when caller tries to lock another layer", () => {
    const engine = new ProjectCommandEngine(fixture());
    const input = { layerId: "first", patch: { visible: false, locked: true } };
    const command = createLayerSetCommonCommand(input);
    input.layerId = "second";
    input.patch.visible = true;
    input.patch.locked = false;
    expect(engine.execute(command).status).toBe("applied");
    expect(chosen(engine, "first")).toMatchObject({ visible: false, locked: true });
    expect(chosen(engine, "second")).toMatchObject({ visible: true, locked: false });
  });

  it("keeps text style and target immutable for delayed writes", () => {
    const engine = new ProjectCommandEngine(fixture());
    const input = { layerId: "first", style: { ...style, fontFamily: "Arial" } };
    const command = createLayerSetTextStyleCommand(input);
    input.layerId = "second";
    input.style.fontFamily = "Injected";
    expect(engine.execute(command).status).toBe("applied");
    expect(chosen(engine, "first")).toMatchObject({ style: { fontFamily: "Arial" } });
    expect(chosen(engine, "second")).toMatchObject({ style: { fontFamily: "Inter" } });
  });

  it("preserves original static text and target, independent of later input edits", () => {
    const engine = new ProjectCommandEngine(fixture());
    const input = { layerId: "first", text: "Approved caption" };
    const command = createLayerSetStaticTextCommand(input);
    input.layerId = "second";
    input.text = "Malicious later caption";
    expect(engine.execute(command).status).toBe("applied");
    expect(chosen(engine, "first")).toMatchObject({ text: "Approved caption" });
    expect(chosen(engine, "second")).toMatchObject({ text: "Original second" });
  });

  it("refuses a changed/locked target after command construction instead of retargeting", () => {
    const engine = new ProjectCommandEngine(fixture());
    const input = { layerId: "first" };
    const removeFirst = createLayerRemoveCommand(input);
    input.layerId = "second";
    expect(engine.execute(createLayerSetCommonCommand({
      layerId: "first", patch: { locked: true },
    })).status).toBe("applied");
    const before = engine.snapshot();
    expect(engine.execute(removeFirst)).toEqual({
      status: "rejected", code: "COMMAND_FAILED",
    });
    expect(engine.snapshot()).toEqual(before);
    expect(ids(engine)).toEqual(["first", "second", "third"]);
  });
});
