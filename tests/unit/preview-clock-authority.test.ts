import { describe, expect, it } from "vitest";
import type { PlaybackClockSnapshot } from "../../src/core/contracts/playback";
import { projectDocumentSchema } from "../../src/core/domain/project-document";
import { resolveAuthoritativePreviewPosition } from "../../src/renderer/playback/preview-clock-authority";

const album = projectDocumentSchema.parse({
  schemaVersion: 1,
  projectId: "authoritative-audio-clock",
  name: "Test",
  revision: 0,
  tracks: [
    { id: "first", title: "First", sourcePath: "a.wav", audioAssetId: "a" },
    { id: "second", title: "Second", sourcePath: "b.wav", audioAssetId: "b" },
  ],
  mediaAssets: [
    {
      id: "a",
      kind: "audio",
      required: true,
      sourcePath: "a.wav",
      fileName: "a.wav",
      sizeBytes: 30,
      availability: "ready",
      metadata: { durationMs: 2000 },
    },
    {
      id: "b",
      kind: "audio",
      required: true,
      sourcePath: "b.wav",
      fileName: "b.wav",
      sizeBytes: 30,
      availability: "ready",
      metadata: { durationMs: 3000 },
    },
  ],
});
const valid: PlaybackClockSnapshot = {
  phase: "playing",
  generation: 3,
  projectId: album.projectId,
  activeTrackId: "second",
  albumTimeMs: 2400,
  localTimeMs: 400,
};
describe("W11-07 AC09 coherent authoritative audio clock guard", () => {
  it("accepts matching active-track/local time and a paused position", () => {
    expect(
      resolveAuthoritativePreviewPosition(album, valid, true),
    ).toMatchObject({
      status: "resolved",
      trackId: "second",
      albumTimeMs: 2400,
      localTimeMs: 400,
    });
    expect(
      resolveAuthoritativePreviewPosition(
        album,
        { ...valid, phase: "paused" },
        true,
      ),
    ).toMatchObject({ status: "resolved", trackId: "second" });
  });
  it("never previews the next track while the old media remains active at its exact end", () => {
    const endOfFirst = {
      ...valid,
      activeTrackId: "first",
      albumTimeMs: 2000,
      localTimeMs: 2000,
    };
    expect(
      resolveAuthoritativePreviewPosition(album, endOfFirst, true),
    ).toBeNull();
    expect(
      resolveAuthoritativePreviewPosition(
        album,
        { ...endOfFirst, activeTrackId: "second", localTimeMs: 0 },
        true,
      ),
    ).toMatchObject({ status: "resolved", trackId: "second", localTimeMs: 0 });
  });
  it("refuses a torn local sample, but tolerates one millisecond of rounding", () => {
    for (const localTimeMs of [
      0,
      399,
      401,
      800,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -1,
    ]) {
      const result = resolveAuthoritativePreviewPosition(
        album,
        { ...valid, localTimeMs },
        true,
      );
      if (localTimeMs === 399 || localTimeMs === 401)
        expect(result?.trackId).toBe("second");
      else expect(result).toBeNull();
    }
  });
  it.each([
    "ready",
    "loading",
    "idle",
    "seeking",
    "finished",
    "blocked",
    "error",
  ] as const)("ignores non-authoritative %s phase", (phase) => {
    expect(
      resolveAuthoritativePreviewPosition(album, { ...valid, phase }, true),
    ).toBeNull();
  });
  it("rejects revoked media, stale project ID, missing track, disabled track and end-of-album", () => {
    expect(resolveAuthoritativePreviewPosition(album, valid, false)).toBeNull();
    expect(
      resolveAuthoritativePreviewPosition(
        album,
        { ...valid, projectId: "old-id" },
        true,
      ),
    ).toBeNull();
    expect(
      resolveAuthoritativePreviewPosition(
        album,
        { ...valid, activeTrackId: "removed" },
        true,
      ),
    ).toBeNull();
    expect(
      resolveAuthoritativePreviewPosition(
        album,
        { ...valid, albumTimeMs: 5000 },
        true,
      ),
    ).toBeNull();
    const disabled = projectDocumentSchema.parse({
      ...album,
      tracks: album.tracks.map((track) =>
        track.id === "second" ? { ...track, enabled: false } : track,
      ),
    });
    expect(
      resolveAuthoritativePreviewPosition(disabled, valid, true),
    ).toBeNull();
  });
  it("never edits the project or snapshot while checking media clock authority", () => {
    const original = structuredClone(album),
      clock = structuredClone(valid);
    for (let i = 0; i < 10; i++)
      resolveAuthoritativePreviewPosition(album, valid, true);
    expect(album).toEqual(original);
    expect(valid).toEqual(clock);
  });
});
