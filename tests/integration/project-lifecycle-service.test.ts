import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectLifecycleService } from "../../src/core/application/services/project-lifecycle-service";
import { ProjectPathSession } from "../../src/core/application/services/project-path-session";
import {
  LoadProjectUseCase,
  SaveProjectUseCase,
} from "../../src/core/application/services/project-persistence";
import { createEmptyProject } from "../../src/core/domain/project-document";
import { JsonProjectStore } from "../../src/main/infrastructure/persistence/json-project-store";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function createHarness(
  selectSavePath: () => Promise<string | null>,
  selectOpenPath: () => Promise<string | null>,
) {
  const root = await mkdtemp(join(tmpdir(), "lfa lifecycle Ω "));
  cleanupPaths.push(root);

  const store = new JsonProjectStore();
  const pathSession = new ProjectPathSession();
  const saveProject = new SaveProjectUseCase(store);
  const loadProject = new LoadProjectUseCase(store);
  const lifecycle = new ProjectLifecycleService(
    saveProject,
    loadProject,
    pathSession,
    selectSavePath,
    selectOpenPath,
  );

  return { root, store, pathSession, lifecycle };
}

describe("ProjectLifecycleService", () => {
  it("uses Save As once, then known-path Save bypasses path selection", async () => {
    let saveSelections = 0;
    let targetPath = "";

    const harness = await createHarness(
      async () => {
        saveSelections += 1;
        if (saveSelections > 1) {
          throw new Error("known-path save reopened Save As");
        }
        return targetPath;
      },
      async () => null,
    );

    targetPath = join(
      harness.root,
      "Folder Dengan Spasi Ω",
      "Album Utama.lfa.json",
    );

    const project = createEmptyProject("lifecycle-known-save");
    expect(await harness.lifecycle.saveAs(project)).toEqual({
      status: "saved",
      projectRevision: 0,
    });

    const revised = { ...project, revision: 1 };
    expect(await harness.lifecycle.save(revised)).toEqual({
      status: "saved",
      projectRevision: 1,
    });

    expect(saveSelections).toBe(1);
    expect(await harness.store.load(targetPath)).toEqual(revised);
  });

  it("Save As cancel preserves the existing known path", async () => {
    const oldPathHolder = { path: "" };
    const harness = await createHarness(
      async () => null,
      async () => null,
    );
    oldPathHolder.path = join(harness.root, "Proyek Lama Ω", "utama.lfa.json");

    const project = createEmptyProject("lifecycle-save-as-cancel");
    await harness.store.save(oldPathHolder.path, project);
    harness.pathSession.setKnownPath(oldPathHolder.path);

    expect(await harness.lifecycle.saveAs({ ...project, revision: 1 })).toEqual(
      {
        status: "cancelled",
      },
    );
    expect(harness.pathSession.getCurrentPath()).toBe(oldPathHolder.path);

    const afterCancel = { ...project, revision: 2 };
    await harness.lifecycle.save(afterCancel);
    expect(await harness.store.load(oldPathHolder.path)).toEqual(afterCancel);
  });

  it("Open cancel preserves the current project path", async () => {
    const harness = await createHarness(
      async () => null,
      async () => null,
    );
    const currentPath = join(harness.root, "Saat Ini Ω", "current.lfa.json");
    const project = createEmptyProject("lifecycle-open-cancel");
    await harness.store.save(currentPath, project);
    harness.pathSession.setKnownPath(currentPath);

    expect(await harness.lifecycle.open()).toEqual({ status: "cancelled" });
    expect(harness.pathSession.getCurrentPath()).toBe(currentPath);

    const revised = { ...project, revision: 1 };
    await harness.lifecycle.save(revised);
    expect(await harness.store.load(currentPath)).toEqual(revised);
  });

  it("valid Open restores the selected project and moves known-path ownership", async () => {
    let selectedOpenPath = "";
    const harness = await createHarness(
      async () => null,
      async () => selectedOpenPath,
    );

    const oldPath = join(harness.root, "Old Ω", "old.lfa.json");
    const newPath = join(harness.root, "New Project Ω", "opened.lfa.json");
    const oldProject = createEmptyProject("lifecycle-old");
    const openedProject = {
      ...createEmptyProject("lifecycle-opened"),
      name: "Album Dibuka Ω",
      revision: 4,
    };

    await harness.store.save(oldPath, oldProject);
    await harness.store.save(newPath, openedProject);
    harness.pathSession.setKnownPath(oldPath);
    selectedOpenPath = newPath;

    expect(await harness.lifecycle.open()).toEqual({
      status: "opened",
      project: openedProject,
    });
    expect(harness.pathSession.getCurrentPath()).toBe(newPath);

    const revisedOpened = { ...openedProject, revision: 5 };
    await harness.lifecycle.save(revisedOpened);

    expect(await harness.store.load(newPath)).toEqual(revisedOpened);
    expect(await harness.store.load(oldPath)).toEqual(oldProject);
  });

  it("failed Open preserves the previous known path", async () => {
    let selectedOpenPath = "";
    const harness = await createHarness(
      async () => null,
      async () => selectedOpenPath,
    );

    const currentPath = join(harness.root, "Current Ω", "current.lfa.json");
    const missingPath = join(harness.root, "Missing Ω", "missing.lfa.json");
    const project = createEmptyProject("lifecycle-open-error");
    await harness.store.save(currentPath, project);
    harness.pathSession.setKnownPath(currentPath);
    selectedOpenPath = missingPath;

    await expect(harness.lifecycle.open()).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
    });
    expect(harness.pathSession.getCurrentPath()).toBe(currentPath);

    const revised = { ...project, revision: 1 };
    await harness.lifecycle.save(revised);
    expect(await harness.store.load(currentPath)).toEqual(revised);
  });
});
