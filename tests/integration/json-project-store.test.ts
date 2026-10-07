import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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

    const directoryEntries = await readdir(join(root, "Folder Dengan Spasi Ω"));
    expect(directoryEntries).toEqual(["Proyek Baru.lfa.json"]);
  });

  it("round-trips a W11-01 schema-v1 project without forcing media fields", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa legacy media "));
    cleanupPaths.push(root);
    const sourcePath = join(root, "legacy.lfa.json");
    const roundTripPath = join(root, "legacy-roundtrip.lfa.json");
    const legacyProject = {
      schemaVersion: 1,
      projectId: "legacy-w11-01",
      name: "Legacy W11-01",
      revision: 7,
      tracks: [
        {
          id: "track-legacy",
          title: "Track Lama",
          sourcePath: "D:/Musik Lama/01 Track.mp3",
          legacyExtension: "preserved",
        },
      ],
      futureProjectField: { preserved: true },
    };

    await writeFile(
      sourcePath,
      `${JSON.stringify(legacyProject, null, 2)}\n`,
      "utf8",
    );

    const store = new JsonProjectStore();
    const loaded = await store.load(sourcePath);

    expect(loaded).toEqual(legacyProject);
    expect(loaded).not.toHaveProperty("mediaAssets");

    await store.save(roundTripPath, loaded);

    expect(JSON.parse(await readFile(roundTripPath, "utf8"))).toEqual(
      legacyProject,
    );
  });

  it("persists additive schema-v1 media references without a version bump", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa media schema "));
    cleanupPaths.push(root);
    const projectPath = join(root, "media.lfa.json");
    const store = new JsonProjectStore();
    const project = {
      schemaVersion: 1 as const,
      projectId: "media-roundtrip",
      name: "Media Roundtrip",
      revision: 1,
      mediaAssets: [
        {
          id: "asset-audio-1",
          kind: "audio" as const,
          required: true,
          sourcePath: "D:/Album/01 Intro.mp3",
          fileName: "01 Intro.mp3",
          sizeBytes: 12345,
          availability: "ready" as const,
          metadata: {
            durationMs: 125000,
            title: "Intro",
            trackNumber: 1,
          },
        },
      ],
      tracks: [
        {
          id: "track-1",
          title: "Intro",
          sourcePath: "D:/Album/01 Intro.mp3",
          audioAssetId: "asset-audio-1",
          enabled: false,
        },
      ],
    };

    await store.save(projectPath, project);

    expect(await store.load(projectPath)).toEqual(project);
  });

  it("round-trips W11-04 additive binding/default artwork fields without derived duplication", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa binding schema "));
    cleanupPaths.push(root);
    const projectPath = join(root, "binding-roundtrip.lfa.json");
    const store = new JsonProjectStore();
    const project = {
      schemaVersion: 1 as const,
      projectId: "binding-roundtrip",
      name: "Binding Roundtrip",
      revision: 3,
      albumPresentation: {
        defaultArtworkAssetId: "image-default",
      },
      mediaAssets: [
        {
          id: "audio-1",
          kind: "audio" as const,
          required: true,
          sourcePath: "D:/Album/01 Track.wav",
          fileName: "01 Track.wav",
          sizeBytes: 1234,
          availability: "ready" as const,
          metadata: {
            durationMs: 1000,
            title: "Metadata Title",
            artist: "Metadata Artist",
          },
        },
        {
          id: "image-default",
          kind: "image" as const,
          required: false,
          sourcePath: "D:/Album/default.webp",
          fileName: "default.webp",
          sizeBytes: 345,
          availability: "ready" as const,
        },
        {
          id: "image-track",
          kind: "image" as const,
          required: false,
          sourcePath: "D:/Album/track.jpg",
          fileName: "track.jpg",
          sizeBytes: 456,
          availability: "missing" as const,
          errorCode: "MEDIA_NOT_FOUND" as const,
        },
      ],
      tracks: [
        {
          id: "track-1",
          title: "Track",
          sourcePath: "D:/Album/01 Track.wav",
          audioAssetId: "audio-1",
          binding: {
            titleOverride: "Manual Title",
            artistOverride: "Manual Artist",
            albumOverride: "Manual Album",
            yearOverride: 2026,
            artworkAssetId: "image-track",
          },
        },
      ],
    };

    await store.save(projectPath, project);
    const loaded = await store.load(projectPath);

    expect(loaded).toEqual(project);
    expect(JSON.stringify(loaded)).not.toContain("resolvedPresentation");
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
