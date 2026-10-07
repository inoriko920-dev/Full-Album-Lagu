import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MediaRelinkService } from "../../src/core/application/services/media-relink-service";
import { MissingMediaService } from "../../src/core/application/services/missing-media-service";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { MusicMetadataProbePort } from "../../src/main/infrastructure/media/music-metadata-probe-port";
import { NodeMediaDiscoveryPort } from "../../src/main/infrastructure/media/node-media-discovery-port";
import { NodeMediaSourcePort } from "../../src/main/infrastructure/media/node-media-source-port";
import { SYNTHETIC_AUDIO_FIXTURES } from "../fixtures/synthetic-audio-fixtures";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function makeMovedTrackProject(
  root: string,
  replacementFileName = "05 Track 5.mp3",
): Promise<{ project: ProjectDocument; replacementPath: string }> {
  const moved = join(root, "Folder Pindah Ω", "Album Baru");
  await mkdir(moved, { recursive: true });
  const replacementPath = join(moved, replacementFileName);
  const bytes = Buffer.from(SYNTHETIC_AUDIO_FIXTURES.mp3, "base64");
  await writeFile(replacementPath, bytes);
  const probe = await new MusicMetadataProbePort().probe({
    sourcePath: replacementPath,
    fileName: replacementFileName,
    sizeBytes: bytes.length,
  });
  if (probe.status !== "ready") throw new Error("Fixture must be ready.");

  const oldPath = join(root, "Album Lama", replacementFileName);
  return {
    replacementPath,
    project: {
      schemaVersion: 1,
      projectId: "moved-track-5",
      name: "Moved Track 5",
      revision: 9,
      tracks: [
        { id: "track-1", title: "Track 1", sourcePath: "legacy-1.mp3" },
        { id: "track-2", title: "Track 2", sourcePath: "legacy-2.mp3" },
        { id: "track-3", title: "Track 3", sourcePath: "legacy-3.mp3" },
        { id: "track-4", title: "Track 4", sourcePath: "legacy-4.mp3" },
        {
          id: "track-5",
          title: "Track 5",
          sourcePath: oldPath,
          audioAssetId: "asset-5",
        },
      ],
      mediaAssets: [
        {
          id: "asset-5",
          kind: "audio",
          required: true,
          sourcePath: oldPath,
          fileName: replacementFileName,
          sizeBytes: bytes.length,
          availability: "missing",
          errorCode: "MEDIA_NOT_FOUND",
          metadata: probe.metadata,
        },
      ],
    },
  };
}

function relinkService() {
  return new MediaRelinkService(
    new NodeMediaSourcePort(),
    new NodeMediaDiscoveryPort(),
    new MusicMetadataProbePort(),
  );
}

describe("missing media + relink real filesystem", () => {
  it("relinks moved Track 5 explicitly after validation and leaves source unchanged", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa moved track Ω "));
    cleanupPaths.push(root);
    const { project, replacementPath } = await makeMovedTrackProject(root);
    const bytesBefore = await readFile(replacementPath);
    const statBefore = await stat(replacementPath);

    const outcome = await relinkService().relinkSingle(
      project,
      "asset-5",
      replacementPath,
    );

    expect(outcome.result).toMatchObject({
      status: "relinked",
      assetId: "asset-5",
      fileName: "05 Track 5.mp3",
    });
    expect(outcome.project?.revision).toBe(10);
    expect(outcome.project?.mediaAssets?.[0]).toMatchObject({
      id: "asset-5",
      availability: "ready",
      sourcePath: replacementPath,
    });
    expect(outcome.project?.tracks[4]?.sourcePath).toBe(replacementPath);

    expect(await readFile(replacementPath)).toEqual(bytesBefore);
    const statAfter = await stat(replacementPath);
    expect(statAfter.size).toBe(statBefore.size);
    expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);
  });

  it("rejects an invalid explicit audio replacement without changing project", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa invalid relink "));
    cleanupPaths.push(root);
    const { project } = await makeMovedTrackProject(root);
    const invalidPath = join(root, "invalid.mp3");
    await writeFile(invalidPath, "not audio", "utf8");

    const outcome = await relinkService().relinkSingle(
      project,
      "asset-5",
      invalidPath,
    );
    expect(outcome.result).toMatchObject({
      status: "error",
      code: "RELINK_FAILED",
      assetId: "asset-5",
    });
    expect(outcome.project).toBeUndefined();
    expect(project.revision).toBe(9);
  });

  it("folder relink resolves one unique high-confidence moved file in Unicode/spaces path", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa folder relink Ω "));
    cleanupPaths.push(root);
    const { project, replacementPath } = await makeMovedTrackProject(root);
    const folder = join(root, "Folder Pindah Ω");

    const outcome = await relinkService().relinkFolder(project, folder);
    expect(outcome.results).toEqual([
      {
        status: "relinked",
        assetId: "asset-5",
        fileName: "05 Track 5.mp3",
      },
    ]);
    expect(outcome.project.revision).toBe(10);
    expect(outcome.project.tracks[4]?.sourcePath).toBe(replacementPath);
  });

  it("keeps same-name same-confidence candidates ambiguous and unresolved", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa ambiguous "));
    cleanupPaths.push(root);
    const { project, replacementPath } = await makeMovedTrackProject(root);
    const duplicateDir = join(root, "Folder Pindah Ω", "Duplicate");
    await mkdir(duplicateDir, { recursive: true });
    const duplicatePath = join(duplicateDir, "05 Track 5.mp3");
    await writeFile(duplicatePath, await readFile(replacementPath));

    const outcome = await relinkService().relinkFolder(
      project,
      join(root, "Folder Pindah Ω"),
    );

    expect(outcome.results[0]).toMatchObject({
      status: "ambiguous",
      code: "RELINK_AMBIGUOUS",
      assetId: "asset-5",
    });
    if (outcome.results[0]?.status !== "ambiguous") {
      throw new Error("Expected ambiguity.");
    }
    expect(outcome.results[0].candidates).toHaveLength(2);
    expect(JSON.stringify(outcome.results[0].candidates)).not.toContain(root);
    expect(outcome.project.revision).toBe(9);
    expect(outcome.project.tracks[4]?.sourcePath).toBe(
      project.tracks[4]?.sourcePath,
    );
  });

  it("returns no-match instead of fuzzy guessing a different filename", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa no match "));
    cleanupPaths.push(root);
    const { project } = await makeMovedTrackProject(root, "Different.mp3");

    project.mediaAssets![0] = {
      ...project.mediaAssets![0]!,
      fileName: "05 Track 5.mp3",
    };

    const outcome = await relinkService().relinkFolder(
      project,
      join(root, "Folder Pindah Ω"),
    );
    expect(outcome.results).toEqual([
      {
        status: "no-match",
        code: "RELINK_NO_MATCH",
        assetId: "asset-5",
      },
    ]);
    expect(outcome.project.revision).toBe(9);
  });

  it("scan marks missing optional visual without making it a readiness blocker", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa optional visual "));
    cleanupPaths.push(root);
    const missingImage = join(root, "cover missing.png");
    const project: ProjectDocument = {
      schemaVersion: 1,
      projectId: "optional-image",
      name: "Optional Image",
      revision: 2,
      tracks: [],
      mediaAssets: [
        {
          id: "cover",
          kind: "image",
          required: false,
          sourcePath: missingImage,
          fileName: "cover missing.png",
          sizeBytes: 100,
          availability: "ready",
        },
      ],
    };

    const outcome = await new MissingMediaService(
      new NodeMediaSourcePort(),
    ).scan(project);
    expect(outcome.items[0]).toMatchObject({
      assetId: "cover",
      required: false,
      availability: "missing",
    });
    expect(outcome.readiness).toEqual({ ready: true, blockers: [] });
  });
});
