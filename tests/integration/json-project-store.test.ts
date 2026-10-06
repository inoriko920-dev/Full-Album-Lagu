import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../src/core/domain/project-document";
import { JsonProjectStore } from "../../src/main/infrastructure/persistence/json-project-store";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("JsonProjectStore", () => {
  it("atomically saves and reloads a project through a Unicode path", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa project Ω "));
    cleanupPaths.push(root);
    const projectPath = join(
      root,
      "Folder Dengan Spasi Ω",
      "Proyek Baru.lfa.json",
    );
    const store = new JsonProjectStore();
    const project = createEmptyProject("project-integration-001");

    await store.save(projectPath, project);
    const loaded = await store.load(projectPath);

    expect(loaded).toEqual(project);
    expect(JSON.parse(await readFile(projectPath, "utf8"))).toEqual(project);

    const directoryEntries = await readdir(
      join(root, "Folder Dengan Spasi Ω"),
    );
    expect(directoryEntries).toEqual(["Proyek Baru.lfa.json"]);
  });

  it("rejects corrupt JSON without modifying the source file", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa corrupt "));
    cleanupPaths.push(root);
    const projectPath = join(root, "rusak.lfa.json");
    const original = "{ this is not valid json";
    await writeFile(projectPath, original, "utf8");
    const store = new JsonProjectStore();

    await expect(store.load(projectPath)).rejects.toMatchObject({
      code: "PROJECT_INVALID",
    });
    expect(await readFile(projectPath, "utf8")).toBe(original);
  });
});
