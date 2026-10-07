import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectRecoveryService } from "../../src/core/application/services/project-recovery-service";
import { createEmptyProject } from "../../src/core/domain/project-document";
import { JsonProjectRecoveryStore } from "../../src/main/infrastructure/persistence/json-project-recovery-store";
import { JsonProjectStore } from "../../src/main/infrastructure/persistence/json-project-store";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function createHarness() {
  const root = await mkdtemp(join(tmpdir(), "lfa recovery Ω "));
  cleanupPaths.push(root);
  const recoveryRoot = join(root, "Recovery Store Ω");
  const primaryPath = join(root, "Primary Project Ω", "album.lfa.json");
  const projectStore = new JsonProjectStore();
  const recoveryStore = new JsonProjectRecoveryStore(() => recoveryRoot);
  const recoveryService = new ProjectRecoveryService(
    recoveryStore,
    () => new Date("2026-10-07T03:00:00.000Z"),
  );

  return {
    root,
    recoveryRoot,
    primaryPath,
    projectStore,
    recoveryStore,
    recoveryService,
  };
}

function recoveryArtifactPath(root: string, projectId: string): string {
  const key = createHash("sha256").update(projectId, "utf8").digest("hex");
  return join(root, `${key}.recovery.json`);
}

describe("ProjectRecoveryService", () => {
  it("writes dirty autosave generations separately from the primary project", async () => {
    const harness = await createHarness();
    const primary = {
      ...createEmptyProject("recovery-separate"),
      revision: 2,
    };
    const dirty = {
      ...primary,
      name: "Perubahan Belum Disimpan Ω",
      revision: 3,
    };

    await harness.projectStore.save(harness.primaryPath, primary);

    expect(await harness.recoveryService.autosave(dirty, 2)).toEqual({
      status: "saved",
      generation: 1,
      projectRevision: 3,
    });
    expect(await harness.recoveryService.autosave(dirty, 2)).toEqual({
      status: "saved",
      generation: 2,
      projectRevision: 3,
    });

    expect(await harness.projectStore.load(harness.primaryPath)).toEqual(
      primary,
    );
    expect(await harness.recoveryService.inspect(primary)).toEqual({
      status: "available",
      generation: 2,
      project: dirty,
    });
  });

  it("skips autosave for a clean project", async () => {
    const harness = await createHarness();
    const primary = {
      ...createEmptyProject("recovery-clean"),
      revision: 4,
    };

    expect(await harness.recoveryService.autosave(primary, 4)).toEqual({
      status: "skipped",
      reason: "clean",
    });
    expect(await harness.recoveryService.inspect(primary)).toEqual({
      status: "none",
    });
  });

  it("marks older recovery stale and never replaces the newer primary file", async () => {
    const harness = await createHarness();
    const primary = {
      ...createEmptyProject("recovery-stale"),
      revision: 2,
    };
    const dirty = {
      ...primary,
      revision: 3,
      name: "Autosave Lama",
    };
    await harness.projectStore.save(harness.primaryPath, primary);
    await harness.recoveryService.autosave(dirty, 2);

    const newerPrimary = {
      ...primary,
      revision: 4,
      name: "Primary Lebih Baru",
    };
    await harness.projectStore.save(harness.primaryPath, newerPrimary);

    expect(await harness.recoveryService.inspect(newerPrimary)).toEqual({
      status: "stale",
      code: "RECOVERY_STALE",
      message: "Recovery artifact is not newer than the primary project.",
    });
    expect(await harness.projectStore.load(harness.primaryPath)).toEqual(
      newerPrimary,
    );
  });

  it("fails safely for corrupt recovery while keeping the primary readable", async () => {
    const harness = await createHarness();
    const primary = {
      ...createEmptyProject("recovery-corrupt"),
      revision: 1,
    };
    await harness.projectStore.save(harness.primaryPath, primary);

    const artifactPath = recoveryArtifactPath(
      harness.recoveryRoot,
      primary.projectId,
    );
    await mkdir(harness.recoveryRoot, { recursive: true });
    await writeFile(artifactPath, "{ incomplete recovery", "utf8");

    expect(await harness.recoveryService.inspect(primary)).toEqual({
      status: "invalid",
      code: "RECOVERY_INVALID",
      message: "Recovery artifact is invalid or incomplete.",
    });
    expect(await harness.projectStore.load(harness.primaryPath)).toEqual(
      primary,
    );
  });

  it("ignores an interrupted temporary artifact when no completed recovery exists", async () => {
    const harness = await createHarness();
    const primary = {
      ...createEmptyProject("recovery-interrupted"),
      revision: 1,
    };
    await harness.projectStore.save(harness.primaryPath, primary);

    const completedPath = recoveryArtifactPath(
      harness.recoveryRoot,
      primary.projectId,
    );
    await mkdir(harness.recoveryRoot, { recursive: true });
    await writeFile(
      `${completedPath}.interrupted.tmp`,
      "{ partial write",
      "utf8",
    );

    expect(await harness.recoveryService.inspect(primary)).toEqual({
      status: "none",
    });
    expect(await readFile(harness.primaryPath, "utf8")).toContain(
      '"projectId": "recovery-interrupted"',
    );
  });

  it("accepts newer recovery without overwriting primary and discard removes only recovery", async () => {
    const harness = await createHarness();
    const primary = {
      ...createEmptyProject("recovery-accept-discard"),
      revision: 6,
    };
    const dirty = {
      ...primary,
      revision: 7,
      name: "Recovery Dipilih",
    };

    await harness.projectStore.save(harness.primaryPath, primary);
    await harness.recoveryService.autosave(dirty, 6);

    expect(await harness.recoveryService.accept(primary)).toEqual({
      status: "recovered",
      generation: 1,
      project: dirty,
    });
    expect(await harness.projectStore.load(harness.primaryPath)).toEqual(
      primary,
    );

    expect(await harness.recoveryService.discard(primary.projectId)).toEqual({
      status: "discarded",
    });
    expect(await harness.recoveryService.inspect(primary)).toEqual({
      status: "none",
    });
    expect(await harness.projectStore.load(harness.primaryPath)).toEqual(
      primary,
    );
  });
});
