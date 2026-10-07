import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTrackReorderCommand,
  createTrackSetEnabledCommand,
} from "../../src/core/application/services/project-track-commands";
import { ProjectCommandEngine } from "../../src/core/application/services/project-command-engine";
import { projectAlbumTimeline } from "../../src/core/domain/album-timeline";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { JsonProjectStore } from "../../src/main/infrastructure/persistence/json-project-store";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("track application command persistence", () => {
  it("survives Save/Close/Reopen with Unicode + spaces and leaves source audio unchanged", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa timeline Ω "));
    cleanupPaths.push(root);

    const sourcePaths = [
      join(root, "Audio Dengan Spasi Ω", "01 Satu.wav"),
      join(root, "Audio Dengan Spasi Ω", "02 Dua.wav"),
      join(root, "Audio Dengan Spasi Ω", "03 Tiga.wav"),
    ];
    await Promise.all(
      sourcePaths.map(async (path, index) => {
        await writeFile(path, `source-audio-${index}`, "utf8");
      }),
    );
    const sourceBefore = await Promise.all(sourcePaths.map((path) => readFile(path)));

    const project: ProjectDocument = {
      schemaVersion: 1,
      projectId: "persist-track-command",
      name: "Album Ω",
      revision: 0,
      mediaAssets: sourcePaths.map((sourcePath, index) => ({
        id: `asset-${index + 1}`,
        kind: "audio" as const,
        required: true,
        sourcePath,
        fileName: `${index + 1} Track Ω.wav`,
        sizeBytes: sourceBefore[index]?.byteLength ?? 0,
        availability: "ready" as const,
        metadata: { durationMs: (index + 1) * 1000 },
      })),
      tracks: sourcePaths.map((sourcePath, index) => ({
        id: `track-${index + 1}`,
        title: `Track Ω ${index + 1}`,
        sourcePath,
        audioAssetId: `asset-${index + 1}`,
      })),
    };

    const engine = new ProjectCommandEngine(project);
    engine.execute(
      createTrackReorderCommand({ trackId: "track-3", toIndex: 0 }),
    );
    engine.execute(
      createTrackSetEnabledCommand({ trackId: "track-2", enabled: false }),
    );

    const projectPath = join(root, "Proyek Dengan Spasi Ω", "Album Ω.lfa.json");
    const store = new JsonProjectStore();
    await store.save(projectPath, engine.snapshot().project);

    const reopened = await store.load(projectPath);

    expect(reopened.tracks.map((track) => track.id)).toEqual([
      "track-3",
      "track-1",
      "track-2",
    ]);
    expect(reopened.tracks.find((track) => track.id === "track-2")).toMatchObject({
      enabled: false,
      audioAssetId: "asset-2",
    });
    expect(reopened.mediaAssets?.find((asset) => asset.id === "asset-2")).toMatchObject({
      required: false,
    });
    expect(projectAlbumTimeline(reopened)).toMatchObject({
      complete: true,
      enabledTrackCount: 2,
      totalDurationMs: 4000,
    });

    const sourceAfter = await Promise.all(sourcePaths.map((path) => readFile(path)));
    expect(sourceAfter).toEqual(sourceBefore);
  });
});
