import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyProject,
  projectDocumentSchema,
  type ProjectDocument,
} from "../../src/core/domain/project-document";
import { useAlbumPreviewPlayback } from "../../src/renderer/state/use-album-preview-playback";
import type { TrustedAudioBatch } from "../../src/renderer/playback/html-media-playback-driver";

let subscribeCount = 0;
let unsubscribeCount = 0;

function album(projectId = "w11-07-audio-lifecycle"): ProjectDocument {
  return projectDocumentSchema.parse({
    ...createEmptyProject(projectId),
    mediaAssets: [0, 1].map((index) => ({
      id: `audio-${index}`,
      kind: "audio",
      required: true,
      sourcePath: `C:/Music/song-${index}.wav`,
      fileName: `song-${index}.wav`,
      sizeBytes: 128,
      availability: "ready",
      metadata: { durationMs: 2000 },
    })),
    tracks: [0, 1].map((index) => ({
      id: `track-${index}`,
      title: `Song ${index}`,
      sourcePath: `C:/Music/song-${index}.wav`,
      audioAssetId: `audio-${index}`,
    })),
  });
}

const trusted: TrustedAudioBatch = {
  projectId: "w11-07-audio-lifecycle",
  batchId: "trusted-picked-batch",
};

function PlaybackHarness({
  project,
  batch = trusted,
}: {
  project: ProjectDocument;
  batch?: TrustedAudioBatch | null;
}) {
  const playback = useAlbumPreviewPlayback(project, batch);
  return (
    <div
      data-testid="playback"
      data-available={String(playback.available)}
      data-phase={playback.clock.phase}
      data-project-id={playback.clock.projectId}
    />
  );
}

beforeEach(() => {
  subscribeCount = 0;
  unsubscribeCount = 0;
  Object.defineProperty(window, "lfa", {
    configurable: true,
    value: {
      requestAudioPreview: vi.fn().mockResolvedValue({ status: "blocked" }),
      onPlaybackPowerChange: () => {
        subscribeCount += 1;
        return () => {
          unsubscribeCount += 1;
        };
      },
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("W11-07 audio lifecycle during manual visual editing", () => {
  it("keeps the same powered media driver across animation, boundary and project-revision edits", async () => {
    const original = album();
    const { rerender } = render(<PlaybackHarness project={original} />);
    expect(subscribeCount).toBe(1);
    expect(unsubscribeCount).toBe(0);
    expect(screen.getByTestId("playback")).toHaveAttribute(
      "data-available",
      "true",
    );

    const animation = projectDocumentSchema.parse({
      ...original,
      revision: 1,
      visualScene: {
        sceneVersion: 1,
        layers: [
          {
            id: "artwork",
            name: "Artwork",
            kind: "artwork",
            visible: true,
            locked: false,
            binding: "active-track-artwork",
            transform: {
              x: 0.5,
              y: 0.5,
              width: 0.4,
              height: 0.4,
              rotationDeg: 0,
              opacity: 1,
              anchor: "center",
            },
            animation: {
              entrance: {
                preset: "zoom-in",
                durationMs: 800,
                easing: "ease-out",
              },
            },
          },
        ],
      },
    });
    await act(async () => rerender(<PlaybackHarness project={animation} />));
    expect(subscribeCount).toBe(1);
    expect(unsubscribeCount).toBe(0);

    const boundary = projectDocumentSchema.parse({
      ...animation,
      revision: 2,
      boundaryTransitions: [
        {
          fromTrackId: "track-0",
          toTrackId: "track-1",
          preset: "crossfade",
          durationMs: 800,
          easing: "linear",
          artworkHandoff: "during-transition",
          titleHandoff: "at-boundary",
        },
      ],
    });
    await act(async () => rerender(<PlaybackHarness project={boundary} />));
    expect(subscribeCount).toBe(1);
    expect(unsubscribeCount).toBe(0);

    const visualTitle = projectDocumentSchema.parse({
      ...boundary,
      revision: 3,
      tracks: boundary.tracks.map((track, i) =>
        i === 0 ? { ...track, title: "Renamed for visuals" } : track,
      ),
    });
    await act(async () => rerender(<PlaybackHarness project={visualTitle} />));
    expect(subscribeCount).toBe(1);
    expect(unsubscribeCount).toBe(0);
    expect(screen.getByTestId("playback")).toHaveAttribute(
      "data-project-id",
      original.projectId,
    );
  });

  it("revokes the previous media generation when audio track order, source or grant changes", async () => {
    const original = album();
    const { rerender } = render(<PlaybackHarness project={original} />);
    expect(subscribeCount).toBe(1);

    const reordered = projectDocumentSchema.parse({
      ...original,
      tracks: [...original.tracks].reverse(),
    });
    await act(async () => rerender(<PlaybackHarness project={reordered} />));
    expect(subscribeCount).toBe(2);
    expect(unsubscribeCount).toBe(1);

    const relinked = projectDocumentSchema.parse({
      ...reordered,
      mediaAssets: reordered.mediaAssets!.map((asset) =>
        asset.id === "audio-0"
          ? { ...asset, sourcePath: "C:/Music/relinked.wav" }
          : asset,
      ),
    });
    await act(async () => rerender(<PlaybackHarness project={relinked} />));
    expect(subscribeCount).toBe(3);
    expect(unsubscribeCount).toBe(2);

    const disabled = projectDocumentSchema.parse({
      ...relinked,
      tracks: relinked.tracks.map((track) =>
        track.id === "track-1" ? { ...track, enabled: false } : track,
      ),
    });
    await act(async () => rerender(<PlaybackHarness project={disabled} />));
    expect(subscribeCount).toBe(4);
    expect(unsubscribeCount).toBe(3);

    await act(async () =>
      rerender(
        <PlaybackHarness
          project={disabled}
          batch={{
            ...trusted,
            batchId: "new-main-issued-batch",
          }}
        />,
      ),
    );
    expect(subscribeCount).toBe(5);
    expect(unsubscribeCount).toBe(4);
  });

  it("does not reuse the old driver after switching project IDs or losing batch authority", async () => {
    const original = album();
    const { rerender } = render(<PlaybackHarness project={original} />);
    expect(subscribeCount).toBe(1);
    const newProject = album("another-project");
    await act(async () =>
      rerender(<PlaybackHarness project={newProject} batch={null} />),
    );
    expect(subscribeCount).toBe(2);
    expect(unsubscribeCount).toBe(1);
    expect(screen.getByTestId("playback")).toHaveAttribute(
      "data-available",
      "false",
    );
    expect(screen.getByTestId("playback")).toHaveAttribute(
      "data-project-id",
      "another-project",
    );
  });
});
