import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { MediaDiscoveryPort } from "../../src/core/application/ports/media-discovery-port";
import type { MediaProbePort } from "../../src/core/application/ports/media-probe-port";
import type { MediaSourcePort } from "../../src/core/application/ports/media-source-port";
import {
  createClearTrackMetadataOverridesCommand,
  createSetTrackMetadataOverridesCommand,
} from "../../src/core/application/services/project-metadata-commands";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import { MediaRelinkService } from "../../src/core/application/services/media-relink-service";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { resolveTrackPresentation } from "../../src/core/domain/track-presentation";
import { JsonProjectStore } from "../../src/main/infrastructure/persistence/json-project-store";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

function projectFixture(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "metadata-relink",
    name: "Metadata Relink",
    revision: 0,
    tracks: [
      {
        id: "track-1",
        title: "Track Fallback",
        sourcePath: "D:/Old/song.mp3",
        audioAssetId: "audio-1",
      },
    ],
    mediaAssets: [
      {
        id: "audio-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Old/song.mp3",
        fileName: "song.mp3",
        sizeBytes: 1000,
        availability: "missing",
        errorCode: "MEDIA_NOT_FOUND",
        metadata: {
          durationMs: 5000,
          title: "Old Title",
          artist: "Old Artist",
          album: "Old Album",
          year: 2020,
        },
      },
    ],
  };
}

function relinkService(): MediaRelinkService {
  const sourcePort: MediaSourcePort = {
    async inspect() {
      return {
        status: "found",
        source: {
          sourcePath: "E:/Moved/song.mp3",
          fileName: "song.mp3",
          sizeBytes: 1001,
        },
      };
    },
  };

  const discoveryPort: MediaDiscoveryPort = {
    async inspectPath() {
      throw new Error("Folder discovery is not used in this test.");
    },
    async listDirectory() {
      throw new Error("Folder discovery is not used in this test.");
    },
  };

  const probePort: MediaProbePort = {
    async probe() {
      return {
        status: "ready",
        metadata: {
          durationMs: 5100,
          title: "Refreshed Title",
          artist: "Refreshed Artist",
          album: "Refreshed Album",
          year: 2026,
          trackNumber: 1,
        },
      };
    },
  };

  return new MediaRelinkService(sourcePort, discoveryPort, probePort);
}

describe("metadata binding relink + persistence integration", () => {
  it("uses refreshed relink metadata as dynamic fallback unless a manual override blocks that field", async () => {
    const session = new ProjectSessionHistory(projectFixture());
    expect(
      session.execute(
        createSetTrackMetadataOverridesCommand({
          trackId: "track-1",
          overrides: {
            titleOverride: "Manual Title",
          },
        }),
      ).status,
    ).toBe("applied");

    const beforeRelink = resolveTrackPresentation(
      session.snapshot().project,
      "track-1",
    );
    expect(beforeRelink.title).toEqual({
      value: "Manual Title",
      provenance: "manual-override",
    });
    expect(beforeRelink.artist).toEqual({
      value: "Old Artist",
      provenance: "audio-metadata",
    });

    const outcome = await relinkService().relinkSingle(
      session.snapshot().project,
      "audio-1",
      "E:/Moved/song.mp3",
    );
    expect(outcome.result).toMatchObject({
      status: "relinked",
      assetId: "audio-1",
      fileName: "song.mp3",
    });
    if (outcome.project === undefined) {
      throw new Error("Expected relinked project.");
    }

    expect(
      session.commitExternalProject({
        kind: "media.relink.single",
        label: "Relink media",
        project: outcome.project,
      }).status,
    ).toBe("applied");

    const afterRelink = resolveTrackPresentation(
      session.snapshot().project,
      "track-1",
    );
    expect(afterRelink.title).toEqual({
      value: "Manual Title",
      provenance: "manual-override",
    });
    expect(afterRelink.artist).toEqual({
      value: "Refreshed Artist",
      provenance: "audio-metadata",
    });
    expect(afterRelink.album).toEqual({
      value: "Refreshed Album",
      provenance: "audio-metadata",
    });
    expect(afterRelink.year).toEqual({
      value: 2026,
      provenance: "audio-metadata",
    });

    expect(
      session.execute(
        createClearTrackMetadataOverridesCommand({
          trackId: "track-1",
          fields: ["titleOverride"],
        }),
      ).status,
    ).toBe("applied");
    expect(
      resolveTrackPresentation(session.snapshot().project, "track-1").title,
    ).toEqual({
      value: "Refreshed Title",
      provenance: "audio-metadata",
    });
  });

  it("persists explicit metadata overrides across real save/reopen without persisting derived presentation", async () => {
    const root = await mkdtemp(join(tmpdir(), "lfa metadata binding "));
    cleanupPaths.push(root);
    const projectPath = join(root, "metadata-binding.lfa.json");

    const session = new ProjectSessionHistory(projectFixture());
    expect(
      session.execute(
        createSetTrackMetadataOverridesCommand({
          trackId: "track-1",
          overrides: {
            titleOverride: "Saved Manual Title",
            artistOverride: "Saved Manual Artist",
            yearOverride: 2026,
          },
        }),
      ).status,
    ).toBe("applied");

    const store = new JsonProjectStore();
    await store.save(projectPath, session.snapshot().project);
    session.markSaved();
    expect(session.snapshot().dirty).toBe(false);

    const reopened = await store.load(projectPath);
    expect(reopened.tracks[0]?.binding).toEqual({
      titleOverride: "Saved Manual Title",
      artistOverride: "Saved Manual Artist",
      yearOverride: 2026,
    });
    expect(JSON.stringify(reopened)).not.toContain("resolvedPresentation");

    const resolved = resolveTrackPresentation(reopened, "track-1");
    expect(resolved.title).toEqual({
      value: "Saved Manual Title",
      provenance: "manual-override",
    });
    expect(resolved.artist).toEqual({
      value: "Saved Manual Artist",
      provenance: "manual-override",
    });
    expect(resolved.album).toEqual({
      value: "Old Album",
      provenance: "audio-metadata",
    });
  });
});
