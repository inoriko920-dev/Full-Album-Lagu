import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { realpath } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { MediaRelinkService } from "../../src/core/application/services/media-relink-service";
import { MissingMediaService } from "../../src/core/application/services/missing-media-service";
import { createTrackReorderCommand } from "../../src/core/application/services/project-track-commands";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import { projectAlbumTimeline } from "../../src/core/domain/album-timeline";
import { resolveAlbumBoundaryVisualFrame } from "../../src/core/domain/album-boundary-visual";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../src/core/domain/project-document";
import { MusicMetadataProbePort } from "../../src/main/infrastructure/media/music-metadata-probe-port";
import { NodeMediaDiscoveryPort } from "../../src/main/infrastructure/media/node-media-discovery-port";
import { NodeMediaSourcePort } from "../../src/main/infrastructure/media/node-media-source-port";
import { SYNTHETIC_AUDIO_FIXTURES } from "../fixtures/synthetic-audio-fixtures";

const folders: string[] = [];
afterEach(async () => {
  await Promise.all(
    folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })),
  );
});

function visualSample(project: ProjectDocument): number {
  const boundary = projectAlbumTimeline(project).items.find(
    (item) => item.trackId === "track-b",
  );
  if (boundary?.startMs === undefined) throw new Error("Expected resolved boundary.");
  return boundary.startMs;
}

async function makeActualTwoTrackAlbum() {
  const folder = await mkdtemp(join(tmpdir(), "lfa w07 relink Ω "));
  folders.push(folder);
  const oldFolder = join(folder, "Original album");
  const newFolder = join(folder, "Moved album Ω");
  await mkdir(oldFolder, { recursive: true });
  await mkdir(newFolder, { recursive: true });

  const songA = join(oldFolder, "01 First.mp3");
  const songB = join(oldFolder, "02 Second.mp3");
  const relocatedB = join(newFolder, basename(songB));
  const bytes = Buffer.from(SYNTHETIC_AUDIO_FIXTURES.mp3, "base64");
  await writeFile(songA, bytes);
  await writeFile(songB, bytes);

  const sourcePort = new NodeMediaSourcePort();
  const probePort = new MusicMetadataProbePort();
  const paths = [songA, songB];
  const assets = [];
  for (const [index, path] of paths.entries()) {
    const inspected = await sourcePort.inspect(path);
    if (inspected.status !== "found") throw new Error("MP3 fixture not found.");
    const probed = await probePort.probe(inspected.source);
    if (probed.status !== "ready") throw new Error("MP3 fixture must be decodable.");
    assets.push({
      id: index === 0 ? "audio-a" : "audio-b",
      kind: "audio" as const,
      required: true,
      sourcePath: inspected.source.sourcePath,
      fileName: inspected.source.fileName,
      sizeBytes: inspected.source.sizeBytes,
      availability: "ready" as const,
      metadata: probed.metadata,
    });
  }

  const project = projectDocumentSchema.parse({
    schemaVersion: 1,
    projectId: "w07-relink-boundary",
    name: "W11-07 AC08 physical-path simulation",
    revision: 7,
    tracks: [
      { id: "track-a", title: "First", sourcePath: assets[0]!.sourcePath, audioAssetId: "audio-a" },
      { id: "track-b", title: "Second", sourcePath: assets[1]!.sourcePath, audioAssetId: "audio-b" },
    ],
    mediaAssets: assets,
    boundaryTransitions: [{
      fromTrackId: "track-a",
      toTrackId: "track-b",
      preset: "crossfade",
      durationMs: 200,
      easing: "linear",
      artworkHandoff: "during-transition",
      titleHandoff: "at-boundary",
    }],
  });
  return {
    project,
    songB,
    relocatedB,
    bytes,
    sourcePort,
    probePort,
  };
}

describe("W11-07 AC08 combined real-file boundary relink/recovery regression", () => {
  it("blocks on a moved file, validates relink, reopens JSON and replays seek without ghosting", async () => {
    const fixture = await makeActualTwoTrackAlbum();
    const initial = structuredClone(fixture.project);
    const atBoundary = visualSample(initial);
    expect(resolveAlbumBoundaryVisualFrame(initial, atBoundary)).toMatchObject({
      status: "active",
      fromTrackId: "track-a",
      toTrackId: "track-b",
    });

    // Actual filesystem move, not a test-only metadata mutation.
    await rename(fixture.songB, fixture.relocatedB);
    const missing = await new MissingMediaService(fixture.sourcePort).scan(initial);
    expect(missing.items).toContainEqual(expect.objectContaining({
      assetId: "audio-b",
      availability: "missing",
      code: "MEDIA_NOT_FOUND",
    }));
    expect(resolveAlbumBoundaryVisualFrame(missing.project, atBoundary)).toEqual({
      status: "blocked",
      reason: "audio-unavailable",
    });
    expect(missing.project.boundaryTransitions).toEqual(initial.boundaryTransitions);
    expect(initial).toEqual(fixture.project);

    const relink = new MediaRelinkService(
      fixture.sourcePort,
      new NodeMediaDiscoveryPort(),
      fixture.probePort,
    );
    const invalidPath = join(dirname(fixture.relocatedB), "Broken.mp3");
    await writeFile(invalidPath, "this is not MP3 audio", "utf8");
    const rejected = await relink.relinkSingle(
      missing.project, "audio-b", invalidPath,
    );
    expect(rejected.result).toMatchObject({ status: "error", code: "RELINK_FAILED" });
    expect(rejected.project).toBeUndefined();
    expect(resolveAlbumBoundaryVisualFrame(missing.project, atBoundary)).toMatchObject({
      status: "blocked",
    });

    const result = await relink.relinkSingle(
      missing.project, "audio-b", fixture.relocatedB,
    );
    expect(result.result).toMatchObject({ status: "relinked", assetId: "audio-b" });
    if (result.project === undefined) throw new Error("Expected relinked project.");
    const fixed = result.project;
    expect(fixed.revision).toBe(initial.revision + 1);
    expect(fixed.tracks.map((item) => item.id)).toEqual(["track-a", "track-b"]);
    expect(fixed.boundaryTransitions).toEqual(initial.boundaryTransitions);
    expect(fixed.mediaAssets?.find((asset) => asset.id === "audio-b")).toMatchObject({
      availability: "ready",
      sourcePath: await realpath(fixture.relocatedB),
    });
    expect(await readFile(fixture.relocatedB)).toEqual(fixture.bytes);

    // Persist/reopen must not introduce extra boundary states or new clocks.
    const reopened = projectDocumentSchema.parse(JSON.parse(JSON.stringify(fixed)));
    expect(reopened.boundaryTransitions).toEqual(initial.boundaryTransitions);
    const recoveredBoundary = visualSample(reopened);
    const sampleOrder = [
      recoveredBoundary, recoveredBoundary + 50,
      recoveredBoundary - 1, recoveredBoundary + 100,
      recoveredBoundary, recoveredBoundary + 50,
    ];
    const samples = sampleOrder.map((time) =>
      resolveAlbumBoundaryVisualFrame(reopened, time),
    );
    expect(samples[0]).toEqual(samples[4]);
    expect(samples[1]).toEqual(samples[5]);
    expect(samples[2]).toMatchObject({ status: "idle" });
    expect(samples[0]).toMatchObject({
      status: "active", fromTrackId: "track-a", toTrackId: "track-b",
    });

    // An old directed pair is inert after reordering; Undo restores precisely
    // the same canonical boundary frame without touching real audio bytes.
    const session = new ProjectSessionHistory(reopened);
    expect(session.execute(createTrackReorderCommand({
      trackId: "track-b", toIndex: 0,
    })).status).toBe("applied");
    const reordered = session.snapshot().project;
    expect(reordered.boundaryTransitions).toEqual(initial.boundaryTransitions);
    expect(resolveAlbumBoundaryVisualFrame(reordered, atBoundary)).toMatchObject({
      status: "idle",
    });
    expect(session.undo().status).toBe("applied");
    const restored = session.snapshot().project;
    expect(resolveAlbumBoundaryVisualFrame(restored, atBoundary)).toEqual(
      resolveAlbumBoundaryVisualFrame(reopened, atBoundary),
    );
  });
});
