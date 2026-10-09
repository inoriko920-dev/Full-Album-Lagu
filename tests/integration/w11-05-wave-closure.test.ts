import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import {
  createLayerAddCommand,
  createLayerSetTransformCommand,
} from "../../src/core/application/services/project-layer-commands";
import {
  createTemplateFromProject,
  TemplateTrialSession,
  saveTemplateFromProject,
} from "../../src/core/application/services/template-workflow-service";
import { createEmptyProject } from "../../src/core/domain/project-document";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { resolveVisualScene } from "../../src/core/domain/visual-scene-projection";
import { buildStaticScenePreview } from "../../src/core/domain/static-scene-preview";
import { JsonProjectStore } from "../../src/main/infrastructure/persistence/json-project-store";
import { JsonTemplateStore } from "../../src/main/infrastructure/persistence/json-template-store";

const tempRoots: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function sandbox() {
  const root = await mkdtemp(join(tmpdir(), "lfa-w05-07-closure-Ω-"));
  tempRoots.push(root);
  return root;
}
async function fingerprint(path: string) {
  const [buffer, data] = await Promise.all([readFile(path), stat(path)]);
  return {
    sha256: createHash("sha256").update(buffer).digest("hex"),
    size: data.size,
    mtimeMs: data.mtimeMs,
  };
}
function album(id: string, song: string, source: string): ProjectDocument {
  return {
    ...createEmptyProject(id),
    name: `Album ${id}`,
    tracks: [{ id: "song-1", title: song, sourcePath: source }],
    visualScene: { sceneVersion: 1, layers: [] },
  };
}
async function store(root: string) {
  return new JsonTemplateStore(
    () => join(process.cwd(), "resources", "templates", "catalog.json"),
    () => join(root, "local-user-templates"),
  );
}

describe("T11-W05-07 closure: actual filesystem + one canonical ProjectSessionHistory", () => {
  it("real source audio/artwork SHA256, size, mtime unchanged across add, template Try/Revert/Apply, Save/Reopen and Undo/Redo", async () => {
    const root = await sandbox();
    const audio = join(root, "Original Audio Ω.wav");
    const artwork = join(root, "Album Artwork Ω.png");
    await writeFile(audio, Buffer.from("RIFF-WAVE-ORIGINAL-IMMUTABLE-Ω"));
    await writeFile(
      artwork,
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]),
    );
    const original = {
      audio: await fingerprint(audio),
      artwork: await fingerprint(artwork),
    };
    const templates = await store(root);
    const minimal = await templates.load("minimal-biru");
    const project = album("closure-one", "Song ONE", audio);
    const history = new ProjectSessionHistory(project);
    const addResult = history.execute(
      createLayerAddCommand({ layer: minimal.scene.layers[0]! }),
    );
    expect(addResult.status).toBe("applied");
    expect(history.snapshot().undoDepth).toBe(1);
    const beforeTry = history.snapshot();
    const trySession = new TemplateTrialSession(beforeTry, minimal);
    expect(trySession.previewProject().visualScene).toEqual(minimal.scene);
    expect(trySession.revert()).toEqual(beforeTry.project);
    expect(history.snapshot()).toEqual(beforeTry);
    const applied = trySession.apply(history);
    expect(applied).toMatchObject({
      status: "applied",
      entry: { kind: "template.apply", origin: "template" },
    });
    expect(history.snapshot().undoDepth).toBe(2);
    expect(history.snapshot().project.tracks).toEqual(project.tracks);
    expect(history.undo().status).toBe("applied");
    expect(history.snapshot().project.visualScene?.layers).toHaveLength(1);
    expect(history.redo().status).toBe("applied");
    expect(history.snapshot().project.visualScene).toEqual(minimal.scene);
    const projectPath = join(root, "Final Proyek Ω.lfa.json");
    const projectStore = new JsonProjectStore();
    await projectStore.save(projectPath, history.snapshot().project);
    history.markSaved();
    expect(history.snapshot().dirty).toBe(false);
    const reloaded = await projectStore.load(projectPath);
    expect(reloaded.visualScene).toEqual(minimal.scene);
    expect(reloaded.tracks).toEqual(project.tracks);
    const reopenedHistory = new ProjectSessionHistory(reloaded);
    expect(reopenedHistory.snapshot()).toMatchObject({
      dirty: false,
      undoDepth: 0,
      redoDepth: 0,
    });
    expect(await fingerprint(audio)).toEqual(original.audio);
    expect(await fingerprint(artwork)).toEqual(original.artwork);
  });

  it("visual-only Save as Template persists locally and resolves the SECOND project's selected track", async () => {
    const root = await sandbox();
    const templates = await store(root);
    const builtIn = await templates.load("minimal-biru");
    const one = album(
      "project-one",
      "Rahasia Track ONE",
      join(root, "Source-One.wav"),
    );
    one.visualScene = builtIn.scene;
    const saveSession = new ProjectSessionHistory(one);
    await saveTemplateFromProject(templates, saveSession.snapshot().project, {
      templateId: "custom-closure-visual",
      name: "Visual Closure",
      category: "Premium",
    });
    expect(saveSession.snapshot().dirty).toBe(false);
    const saved = await templates.load("custom-closure-visual");
    const json = JSON.stringify(saved);
    expect(json).not.toContain("Source-One.wav");
    expect(json).not.toContain("Rahasia Track ONE");
    expect(json).not.toContain("project-one");
    expect(json).not.toContain("tracks");
    const two = album(
      "project-two",
      "Track TWO Selected",
      join(root, "Source-Two.wav"),
    );
    const history = new ProjectSessionHistory(two);
    expect(
      new TemplateTrialSession(history.snapshot(), saved).apply(history).status,
    ).toBe("applied");
    const resolved = resolveVisualScene(history.snapshot().project, "song-1");
    expect(
      resolved.layers
        .filter((x) => x.kind === "text")
        .some(
          (x) =>
            x.kind === "text" && x.resolvedText.value === "Track TWO Selected",
        ),
    ).toBe(true);
    expect(
      JSON.stringify(history.snapshot().project.visualScene),
    ).not.toContain("Rahasia Track ONE");
    expect(history.snapshot().project.tracks).toEqual(two.tracks);
    expect(history.undo().status).toBe("applied");
    expect(history.snapshot().project.visualScene?.layers).toHaveLength(0);
  });

  it("100 stored user templates + 9 starters and 128 layers remain deterministic with 64 edits/Undo/Redo", async () => {
    const root = await sandbox();
    const templates = await store(root);
    const basic = await templates.load("minimal-biru");
    const project = album(
      "stress-128",
      "Stress Song",
      join(root, "stress.wav"),
    );
    const count = 128;
    project.visualScene = {
      sceneVersion: 1,
      layers: Array.from({ length: count }, (_, i) => ({
        ...structuredClone(basic.scene.layers[2]!),
        id: `stress-layer-${i}`,
        name: `Text ${i}`,
      })),
    };
    const h = new ProjectSessionHistory(project);
    const model = buildStaticScenePreview(project);
    expect(model.layers).toHaveLength(128);
    expect(model.layerList.map((layer) => layer.id)).toEqual(
      [...project.visualScene.layers].reverse().map((layer) => layer.id),
    );
    const start = h.snapshot();
    for (let i = 0; i < 64; i++) {
      const layer = h.snapshot().project.visualScene!.layers[i]!;
      expect(
        h.execute(
          createLayerSetTransformCommand({
            layerId: layer.id,
            transform: { ...layer.transform, x: 0.05 + i / 100 },
          }),
        ).status,
      ).toBe("applied");
    }
    expect(h.snapshot().undoDepth).toBe(64);
    for (let i = 0; i < 64; i++) expect(h.undo().status).toBe("applied");
    expect(h.snapshot().project.visualScene).toEqual(start.project.visualScene);
    for (let i = 0; i < 64; i++) expect(h.redo().status).toBe("applied");
    expect(h.snapshot().project.visualScene?.layers).toHaveLength(count);
    for (let i = 0; i < 100; i++) {
      await templates.saveUserTemplate(
        createTemplateFromProject(project, {
          templateId: `closure-template-${String(i).padStart(3, "0")}`,
          name: `Closure Template ${i}`,
          category: "Minimal",
        }),
      );
    }
    const catalog = await templates.list();
    expect(catalog).toHaveLength(109);
    expect(catalog.filter((entry) => entry.origin === "user")).toHaveLength(
      100,
    );
    const chosen = catalog.find(
      (entry) => entry.templateId === "closure-template-099",
    );
    expect(chosen?.category).toBe("Minimal");
    const target = album(
      "target-stress",
      "Different Target Track",
      join(root, "two.wav"),
    );
    const targetHistory = new ProjectSessionHistory(target);
    expect(
      new TemplateTrialSession(
        targetHistory.snapshot(),
        await templates.load(chosen!.templateId),
      ).apply(targetHistory).status,
    ).toBe("applied");
    expect(targetHistory.snapshot().project.visualScene?.layers).toHaveLength(
      128,
    );
    expect(targetHistory.snapshot().project.tracks).toEqual(target.tracks);
  }, 20_000);

  it("stale template trial rejects without any change to protected project data or visual scene", async () => {
    const root = await sandbox();
    const templates = await store(root);
    const minimal = await templates.load("minimal-biru");
    const source = album("stale", "Unchanged Track", join(root, "track.wav"));
    const session = new ProjectSessionHistory(source);
    const trial = new TemplateTrialSession(session.snapshot(), minimal);
    expect(
      session.execute(
        createLayerAddCommand({ layer: minimal.scene.layers[0]! }),
      ).status,
    ).toBe("applied");
    const before = session.snapshot();
    expect(trial.apply(session).status).toBe("rejected");
    expect(session.snapshot()).toEqual(before);
    expect(session.snapshot().project.tracks).toEqual(source.tracks);
  });
});
