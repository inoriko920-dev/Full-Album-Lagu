import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { JsonTemplateStore } from "../../src/main/infrastructure/persistence/json-template-store";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import {
  saveTemplateFromProject,
  TemplateTrialSession,
} from "../../src/core/application/services/template-workflow-service";
import { createEmptyProject } from "../../src/core/domain/project-document";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanup.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function createStore(): Promise<{
  store: JsonTemplateStore;
  userRoot: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "lfa-templates-"));
  cleanup.push(root);
  const userRoot = join(root, "user-templates");

  return {
    store: new JsonTemplateStore(
      () => join(process.cwd(), "resources", "templates", "catalog.json"),
      () => userRoot,
    ),
    userRoot,
  };
}

describe("T11-W05-03 main-owned local template store", () => {
  it("loads nine read-only category starters including Minimal Biru", async () => {
    const { store } = await createStore();
    const catalog = await store.list();

    expect(catalog).toHaveLength(9);
    expect(catalog.every((entry) => entry.readOnly)).toBe(true);
    expect(new Set(catalog.map((entry) => entry.category)).size).toBe(9);
    expect(catalog.some((entry) => entry.name === "Minimal Biru")).toBe(true);
    const minimal = await store.load("minimal-biru");
    expect(minimal.scene.layers.map((layer) => layer.kind)).toEqual([
      "background",
      "artwork",
      "text",
      "text",
      "spectrum",
      "progress",
    ]);
  });

  it("saves without dirtying the project and protects built-ins and duplicates", async () => {
    const { store, userRoot } = await createStore();
    const session = new ProjectSessionHistory(
      createEmptyProject("template-save"),
    );
    const before = session.snapshot();

    await saveTemplateFromProject(store, before.project, {
      templateId: "custom-one",
      name: "Template Baru",
      category: "Minimal",
    });

    expect(session.snapshot()).toEqual(before);
    expect((await store.list()).length).toBe(10);
    expect(await store.load("custom-one")).toMatchObject({
      templateId: "custom-one",
      name: "Template Baru",
    });

    const original = await readFile(
      join(userRoot, "custom-one.template.json"),
      "utf8",
    );
    await expect(
      saveTemplateFromProject(store, before.project, {
        templateId: "custom-one",
        name: "Overwrite Attempt",
        category: "Minimal",
      }),
    ).rejects.toMatchObject({ code: "TEMPLATE_EXISTS" });
    expect(
      await readFile(join(userRoot, "custom-one.template.json"), "utf8"),
    ).toBe(original);

    await expect(
      saveTemplateFromProject(store, before.project, {
        templateId: "minimal-biru",
        name: "Built-in Overwrite Attempt",
        category: "Minimal",
      }),
    ).rejects.toMatchObject({ code: "TEMPLATE_EXISTS" });
  });

  it("round-trips a valid Unicode visual template larger than the old 2 MiB read limit", async () => {
    const { store, userRoot } = await createStore();
    const builtIn = await store.load("minimal-biru");
    const starterText = builtIn.scene.layers.find(
      (layer) => layer.kind === "text",
    );
    if (starterText?.kind !== "text") {
      throw new Error("Expected a built-in text layer fixture.");
    }
    const largeTemplate = {
      ...builtIn,
      templateId: "large-unicode-scene",
      name: "Unicode Besar",
      scene: {
        sceneVersion: 1 as const,
        layers: Array.from({ length: 440 }, (_, index) => ({
          ...starterText,
          id: `unicode-layer-${index}`,
          role: "static" as const,
          text: "界".repeat(2000),
        })),
      },
    };
    const expectedBytes = Buffer.byteLength(
      `${JSON.stringify(largeTemplate, null, 2)}\n`,
      "utf8",
    );
    expect(expectedBytes).toBeGreaterThan(2 * 1024 * 1024);
    expect(expectedBytes).toBeLessThan(8 * 1024 * 1024);

    await store.saveUserTemplate(largeTemplate);
    const persisted = await readFile(
      join(userRoot, "large-unicode-scene.template.json"),
      "utf8",
    );
    expect(Buffer.byteLength(persisted, "utf8")).toBe(expectedBytes);
    expect((await store.list()).some(
      (entry) => entry.templateId === "large-unicode-scene",
    )).toBe(true);
    expect(await store.load("large-unicode-scene")).toEqual(largeTemplate);
  });

  it("rejects corrupt and incompatible user templates without damaging project", async () => {
    const { store, userRoot } = await createStore();
    await saveTemplateFromProject(store, createEmptyProject("source"), {
      templateId: "corrupt",
      name: "Corrupt",
      category: "Neon",
    });
    await writeFile(
      join(userRoot, "corrupt.template.json"),
      "{invalid}",
      "utf8",
    );

    await expect(store.load("corrupt")).rejects.toMatchObject({
      code: "TEMPLATE_INVALID",
    });
    expect(
      (await store.list()).every((entry) => entry.templateId !== "corrupt"),
    ).toBe(true);
    await expect(store.load("../outside")).rejects.toThrow();

    const session = new ProjectSessionHistory(createEmptyProject("target"));
    const before = session.snapshot();
    await expect(store.load("corrupt")).rejects.toThrow();
    expect(session.snapshot()).toEqual(before);
  });

  it("handles a deterministic 100-user-template catalog with no project writes", async () => {
    const { store } = await createStore();
    const session = new ProjectSessionHistory(createEmptyProject("stress"));
    const before = session.snapshot();

    for (let index = 0; index < 100; index += 1) {
      await saveTemplateFromProject(store, before.project, {
        templateId: `user-${String(index).padStart(3, "0")}`,
        name: `Template ${index}`,
        category: "Minimal",
      });
    }

    const catalog = await store.list();
    expect(catalog).toHaveLength(109);
    expect(catalog.filter((entry) => entry.origin === "user")).toHaveLength(
      100,
    );
    expect(
      catalog.filter((entry) => entry.category === "Minimal"),
    ).toHaveLength(101);

    const chosen = await store.load("user-099");
    const trial = new TemplateTrialSession(session.snapshot(), chosen);
    expect(trial.previewProject().visualScene?.layers).toHaveLength(0);
    expect(trial.revert()).toEqual(before.project);
    expect(session.snapshot()).toEqual(before);
  });
});
