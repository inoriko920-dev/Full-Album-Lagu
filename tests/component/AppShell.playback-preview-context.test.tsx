import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LfaBridge } from "../../src/core/contracts/lfa-bridge";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { createStarterLayer } from "../../src/renderer/app/visual-layer-defaults";
import { AppShell } from "../../src/renderer/app/AppShell";

const seekFromTimeline = vi.hoisted(() => vi.fn());

const previewClock = vi.hoisted(() => ({
  available: false,
  activeTrackId: null as string | null,
  projectId: "t05-preview-track-context",
  phase: "ready" as "ready" | "playing" | "paused" | "loading",
  albumTimeMs: 1000,
  localTimeMs: 1000,
  spectrumLevels: Array.from({ length: 32 }, () => 0),
}));

// Playback audio and decoder behavior are covered by separate driver/Windows
// tests. This test isolates the real AppShell's preview-vs-inspector projection.
vi.mock("../../src/renderer/state/use-album-preview-playback", () => ({
  useAlbumPreviewPlayback: () => ({
    available: previewClock.available,
    clock: {
      phase: previewClock.phase,
      generation: 0,
      projectId: previewClock.projectId,
      activeTrackId: previewClock.activeTrackId,
      albumTimeMs: previewClock.albumTimeMs,
      localTimeMs: previewClock.localTimeMs,
    },
    spectrum: previewClock.spectrumLevels,
    total: 4000,
    muted: false,
    toggleMute: vi.fn(),
    playPause: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
    seek: seekFromTimeline,
  }),
}));

function album(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "t05-preview-track-context",
    name: "Live Context",
    revision: 0,
    tracks: [
      {
        id: "track-a",
        title: "Track A",
        sourcePath: "C:/Fixtures/first.wav",
        audioAssetId: "asset-a",
      },
      {
        id: "track-b",
        title: "Track B",
        sourcePath: "C:/Fixtures/second.wav",
        audioAssetId: "asset-b",
        binding: { artworkAssetId: "cover-b" },
      },
    ],
    mediaAssets: [
      {
        id: "asset-a",
        kind: "audio",
        required: true,
        sourcePath: "C:/Fixtures/first.wav",
        fileName: "first.wav",
        sizeBytes: 5000,
        availability: "ready",
        metadata: { durationMs: 2000, title: "Title A", artist: "Artist A" },
      },
      {
        id: "asset-b",
        kind: "audio",
        required: true,
        sourcePath: "C:/Fixtures/second.wav",
        fileName: "second.wav",
        sizeBytes: 5000,
        availability: "ready",
        metadata: { durationMs: 2000, title: "Title B", artist: "Artist B" },
      },
      {
        id: "cover-b",
        kind: "image",
        required: false,
        sourcePath: "C:/Fixtures/cover.png",
        fileName: "cover.png",
        sizeBytes: 1200,
        availability: "ready",
      },
    ],
    visualScene: {
      sceneVersion: 1,
      layers: [
        createStarterLayer("title", "title"),
        createStarterLayer("artist", "artist"),
        createStarterLayer("artwork", "artwork"),
      ],
    },
  };
}

let startup = album();
const bridge: LfaBridge = {
  getFoundationInfo: async () => ({
    platform: "win32",
    arch: "x64",
    phase: "foundation",
  }),
  importArtwork: async () => ({
    status: "cancelled",
    code: "MEDIA_SELECTION_CANCELLED",
  }),
  pickAudioFiles: async () => ({
    status: "cancelled",
    code: "MEDIA_SELECTION_CANCELLED",
  }),
  pickMediaFolder: async () => ({
    status: "cancelled",
    code: "MEDIA_SELECTION_CANCELLED",
  }),
  discoverDroppedMedia: async () => ({
    status: "error",
    code: "MEDIA_DISCOVERY_FAILED",
    message: "Not used in preview binding test.",
  }),
  getMediaDiscoveryStatus: async (batchId) => ({
    status: "error",
    batchId,
    code: "MEDIA_DISCOVERY_FAILED",
    message: "Not used in preview binding test.",
  }),
  cancelMediaDiscovery: async (batchId) => ({
    status: "not-running",
    batchId,
  }),
  startMediaIntake: async () => ({
    status: "error",
    code: "MEDIA_PROBE_FAILED",
    message: "Not used in preview binding test.",
  }),
  getMediaIntakeStatus: async (batchId) => ({
    status: "error",
    batchId,
    code: "MEDIA_PROBE_FAILED",
    message: "Not used in preview binding test.",
  }),
  cancelMediaIntake: async (batchId) => ({
    status: "not-running",
    batchId,
  }),
  scanMissingMedia: async (request) => ({
    status: "scanned",
    project: request.project,
    items: [],
    readiness: { ready: true, blockers: [] },
  }),
  relinkMediaAsset: async () => ({
    status: "cancelled",
    result: {
      status: "cancelled",
      code: "RELINK_CANCELLED",
      assetId: "asset-a",
    },
  }),
  relinkMissingMediaFolder: async () => ({
    status: "cancelled",
    code: "RELINK_CANCELLED",
  }),
  saveProject: async (request) => ({
    status: "saved",
    projectRevision: request.project.revision,
    location: { kind: "known-path" },
  }),
  saveProjectAs: async () => ({ status: "cancelled" }),
  openProject: async () => ({ status: "cancelled" }),
  getStartupProject: async () => ({
    status: "loaded",
    project: structuredClone(startup),
    location: { kind: "known-path" },
  }),
  autosaveProject: async () => ({ status: "skipped", reason: "clean" }),
  getRecoveryStatus: async () => ({ status: "none" }),
  acceptRecovery: async () => ({ status: "none" }),
  discardRecovery: async () => ({ status: "none" }),
};

beforeEach(() => {
  seekFromTimeline.mockReset();
  startup = album();
  previewClock.available = false;
  previewClock.activeTrackId = null;
  previewClock.projectId = "t05-preview-track-context";
  previewClock.phase = "ready";
  previewClock.albumTimeMs = 1000;
  previewClock.localTimeMs = 1000;
  previewClock.spectrumLevels = Array.from({ length: 32 }, () => 0);
  Object.defineProperty(window, "lfa", { configurable: true, value: bridge });
});
afterEach(cleanup);

describe("T11-W06-05 live preview track context", () => {
  it("follows the actual playing track for dynamic title, artist and artwork without moving Inspector selection or dirtying project", async () => {
    const before = structuredClone(startup);
    const { rerender } = render(<AppShell />);
    await waitFor(() => {
      expect(
        document.querySelector('[data-media-track-id="track-a"]'),
      ).not.toBeNull();
    });

    fireEvent.click(
      document.querySelector('[data-media-track-id="track-a"] button')!,
    );
    const shell = document.querySelector(".app-shell");
    const preview = within(screen.getByLabelText("Preview visual statis"));
    expect(preview.getByText("Title A")).toBeInTheDocument();
    expect(preview.getByText("Artist A")).toBeInTheDocument();
    expect(
      preview.getByRole("img", {
        name: "Ilustrasi contoh, bukan artwork asli",
      }),
    ).toBeInTheDocument();
    expect(shell).toHaveAttribute("data-selected-track-id", "track-a");

    previewClock.available = true;
    previewClock.phase = "playing";
    previewClock.activeTrackId = "track-b";
    rerender(<AppShell />);
    expect(preview.getByText("Title B")).toBeInTheDocument();
    expect(preview.getByText("Artist B")).toBeInTheDocument();
    expect(
      preview.getByRole("img", {
        name: "Artwork sumber terhubung, thumbnail belum tersedia",
      }),
    ).toBeInTheDocument();
    expect(shell).toHaveAttribute("data-selected-track-id", "track-a");

    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));
    expect(screen.getByLabelText("Override judul")).toHaveValue("");
    expect(screen.getByText(/Aktif: Title A/)).toBeInTheDocument();

    previewClock.phase = "paused";
    rerender(<AppShell />);
    expect(preview.getByText("Title B")).toBeInTheDocument();

    previewClock.available = false;
    rerender(<AppShell />);
    expect(preview.getByText("Title A")).toBeInTheDocument();
    expect(preview.getByText("Artist A")).toBeInTheDocument();

    expect(shell).toHaveAttribute("data-project-revision", "0");
    expect(shell).toHaveAttribute("data-project-dirty", "false");
    expect(startup).toEqual(before);
  });

  it("never resolves an unknown or inactive clock track into Preview", async () => {
    const { rerender } = render(<AppShell />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-media-track-id="track-a"]'),
      ).not.toBeNull(),
    );
    previewClock.available = true;
    previewClock.phase = "playing";
    previewClock.activeTrackId = "unknown-track";
    rerender(<AppShell />);
    const preview = within(screen.getByLabelText("Preview visual statis"));
    expect(preview.getByText("Title A")).toBeInTheDocument();
    expect(preview.queryByText("Title B")).toBeNull();

    previewClock.activeTrackId = null;
    previewClock.phase = "ready";
    rerender(<AppShell />);
    expect(preview.getByText("Title A")).toBeInTheDocument();
  });

  it("seeks from approved timeline cards on double click while a normal click only selects", async () => {
    const { rerender } = render(<AppShell />);
    await waitFor(() => {
      expect(
        document.querySelector('[data-timeline-track-id="track-b"]'),
      ).not.toBeNull();
    });
    const card = document.querySelector<HTMLButtonElement>(
      '[data-timeline-track-id="track-b"]',
    )!;
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      left: 10,
      width: 100,
    } as DOMRect);

    // Selection is not an implicit audio seek.
    fireEvent.click(card);
    expect(seekFromTimeline).not.toHaveBeenCalled();
    expect(document.querySelector(".app-shell")).toHaveAttribute(
      "data-selected-track-id",
      "track-b",
    );

    // No main-issued authorization: double-click must fail closed.
    fireEvent.doubleClick(card, { clientX: 35 });
    expect(seekFromTimeline).not.toHaveBeenCalled();

    previewClock.available = true;
    previewClock.phase = "playing";
    previewClock.activeTrackId = "track-a";
    rerender(<AppShell />);
    fireEvent.doubleClick(card, { clientX: 35 });
    expect(seekFromTimeline).toHaveBeenLastCalledWith(2500);

    // Out-of-card pointer coordinates are clamped safely.
    fireEvent.doubleClick(card, { clientX: -200 });
    expect(seekFromTimeline).toHaveBeenLastCalledWith(2000);
    fireEvent.doubleClick(card, { clientX: 200 });
    expect(seekFromTimeline).toHaveBeenLastCalledWith(4000);
    expect(document.querySelector(".app-shell")).toHaveAttribute(
      "data-project-revision",
      "0",
    );
    expect(document.querySelector(".app-shell")).toHaveAttribute(
      "data-project-dirty",
      "false",
    );

    // A user-disabled card is not a seek target even with trusted playback.
    const toggle = document.querySelector<HTMLInputElement>(
      '[data-media-track-id="track-b"] input[type="checkbox"]',
    )!;
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(card.classList.contains("timeline-track--disabled")).toBe(true),
    );
    seekFromTimeline.mockClear();
    fireEvent.doubleClick(card, { clientX: 35 });
    expect(seekFromTimeline).not.toHaveBeenCalled();
  });

  it("rejects timeline seeks when an enabled track has no resolved duration", async () => {
    // Ready audio must always have a duration; model a valid unresolved
    // project with an explicitly invalid/duration-unavailable asset instead.
    startup.mediaAssets![1]!.availability = "invalid";
    startup.mediaAssets![1]!.errorCode = "MEDIA_DURATION_UNAVAILABLE";
    delete startup.mediaAssets![1]!.metadata!.durationMs;
    const { rerender } = render(<AppShell />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-timeline-track-id="track-b"]'),
      ).not.toBeNull(),
    );
    previewClock.available = true;
    rerender(<AppShell />);
    const card = document.querySelector<HTMLButtonElement>(
      '[data-timeline-track-id="track-b"]',
    )!;
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 100,
    } as DOMRect);
    fireEvent.doubleClick(card, { clientX: 40 });
    expect(seekFromTimeline).not.toHaveBeenCalled();
  });

  it("ignores stale playback metadata from an earlier project even when track IDs collide", async () => {
    const { rerender } = render(<AppShell />);
    await waitFor(() => {
      expect(
        document.querySelector('[data-media-track-id="track-a"]'),
      ).not.toBeNull();
    });

    previewClock.available = true;
    previewClock.phase = "playing";
    previewClock.activeTrackId = "track-b";
    previewClock.projectId = "old-project-with-reused-track-ids";
    rerender(<AppShell />);

    const preview = within(screen.getByLabelText("Preview visual statis"));
    expect(preview.getByText("Title A")).toBeInTheDocument();
    expect(preview.queryByText("Title B")).toBeNull();

    previewClock.projectId = "t05-preview-track-context";
    rerender(<AppShell />);
    expect(preview.getByText("Title B")).toBeInTheDocument();
    expect(document.querySelector(".app-shell")).toHaveAttribute(
      "data-project-revision",
      "0",
    );
  });

  it("does not replace an authorized playing or paused song with a selected boundary midpoint", async () => {
    startup = {
      ...album(),
      boundaryTransitions: [
        {
          fromTrackId: "track-a",
          toTrackId: "track-b",
          preset: "crossfade",
          durationMs: 800,
          easing: "linear",
          artworkHandoff: "during-transition",
          titleHandoff: "during-transition",
        },
      ],
      visualScene: {
        sceneVersion: 1,
        layers: [
          createStarterLayer("background", "background"),
          createStarterLayer("artwork", "artwork"),
          createStarterLayer("title", "title"),
          createStarterLayer("artist", "artist"),
          createStarterLayer("spectrum", "spectrum"),
          createStarterLayer("progress", "progress"),
        ],
      },
    };
    const unchanged = structuredClone(startup);
    const { rerender } = render(<AppShell />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Pilih boundary track-a ke track-b",
        }),
      ).toBeInTheDocument(),
    );

    previewClock.available = true;
    previewClock.phase = "playing";
    previewClock.activeTrackId = "track-a";
    previewClock.albumTimeMs = 1000;
    previewClock.localTimeMs = 1000;
    rerender(<AppShell />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Pilih boundary track-a ke track-b",
      }),
    );
    expect(screen.getByLabelText("Inspector Boundary")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toBeNull();
    expect(screen.getByLabelText("Preview visual statis")).toHaveTextContent(
      "Title A",
    );
    expect(
      screen.getByLabelText("Preview visual statis"),
    ).not.toHaveTextContent("Title B");
    expect(seekFromTimeline).not.toHaveBeenCalled();

    previewClock.phase = "paused";
    rerender(<AppShell />);
    expect(
      screen.queryByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toBeNull();

    // Idle/ready mode may show the chosen boundary's static sample without
    // seeking the audio driver or changing the authoritative album position.
    previewClock.phase = "ready";
    rerender(<AppShell />);
    expect(
      screen.getByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toHaveAttribute("data-boundary-progress", "0.500");
    expect(seekFromTimeline).not.toHaveBeenCalled();

    // As soon as active audio resumes, the live boundary frame wins.
    previewClock.phase = "playing";
    previewClock.activeTrackId = "track-b";
    previewClock.albumTimeMs = 2000;
    previewClock.localTimeMs = 0;
    rerender(<AppShell />);
    expect(
      screen.getByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toHaveAttribute("data-boundary-progress", "0.000");

    // After the 800ms transition, the selected midpoint must not ghost.
    previewClock.phase = "paused";
    previewClock.albumTimeMs = 2900;
    previewClock.localTimeMs = 900;
    rerender(<AppShell />);
    expect(
      screen.queryByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toBeNull();
    expect(screen.getByLabelText("Preview visual statis")).toHaveTextContent(
      "Title B",
    );

    const shell = document.querySelector(".app-shell");
    expect(shell).toHaveAttribute("data-project-revision", "0");
    expect(shell).toHaveAttribute("data-project-dirty", "false");
    expect(startup).toEqual(unchanged);
    expect(seekFromTimeline).not.toHaveBeenCalled();
  });

  it("ignores a retained ready-phase timestamp and preserves explicit selected-boundary sampling", async () => {
    startup = {
      ...album(),
      boundaryTransitions: [
        {
          fromTrackId: "track-a",
          toTrackId: "track-b",
          preset: "crossfade",
          durationMs: 800,
          easing: "linear",
          artworkHandoff: "during-transition",
          titleHandoff: "during-transition",
        },
      ],
      visualScene: {
        sceneVersion: 1,
        layers: [
          createStarterLayer("title", "title"),
          createStarterLayer("artist", "artist"),
        ],
      },
    };
    const unchanged = structuredClone(startup);
    const { rerender } = render(<AppShell />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Pilih boundary track-a ke track-b",
        }),
      ).toBeInTheDocument(),
    );

    previewClock.available = true;
    previewClock.phase = "ready";
    previewClock.activeTrackId = "track-b";
    previewClock.albumTimeMs = 2000;
    previewClock.localTimeMs = 0;
    rerender(<AppShell />);

    // A previously retained audio position cannot autonomously activate
    // boundary pixels while playback is idle/ready.
    expect(
      screen.queryByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Pilih boundary track-a ke track-b",
      }),
    );
    expect(
      screen.getByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toHaveAttribute("data-boundary-progress", "0.500");
    expect(seekFromTimeline).not.toHaveBeenCalled();

    previewClock.phase = "paused";
    rerender(<AppShell />);
    // Paused (unlike ready) is an authoritative live audio position.
    expect(
      screen.getByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toHaveAttribute("data-boundary-progress", "0.000");

    previewClock.phase = "ready";
    rerender(<AppShell />);
    expect(
      screen.getByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toHaveAttribute("data-boundary-progress", "0.500");
    expect(document.querySelector(".app-shell")).toHaveAttribute(
      "data-project-revision",
      "0",
    );
    expect(document.querySelector(".app-shell")).toHaveAttribute(
      "data-project-dirty",
      "false",
    );
    expect(startup).toEqual(unchanged);
    expect(seekFromTimeline).not.toHaveBeenCalled();
  });

  it("keeps real audio spectrum/progress and song metadata continuous across a configured boundary without mutating the album", async () => {
    startup = {
      ...album(),
      boundaryTransitions: [
        {
          fromTrackId: "track-a",
          toTrackId: "track-b",
          preset: "crossfade",
          durationMs: 800,
          easing: "linear",
          artworkHandoff: "during-transition",
          titleHandoff: "during-transition",
        },
      ],
      visualScene: {
        sceneVersion: 1,
        layers: [
          createStarterLayer("background", "background"),
          createStarterLayer("artwork", "artwork"),
          createStarterLayer("title", "title"),
          createStarterLayer("artist", "artist"),
          createStarterLayer("spectrum", "spectrum"),
          createStarterLayer("progress", "progress"),
        ],
      },
    };
    const initial = structuredClone(startup);
    const { rerender } = render(<AppShell />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-timeline-track-id="track-b"]'),
      ).not.toBeNull(),
    );

    previewClock.available = true;
    previewClock.phase = "playing";
    previewClock.activeTrackId = "track-a";
    previewClock.albumTimeMs = 1999;
    previewClock.localTimeMs = 1999;
    previewClock.spectrumLevels = [
      0.75,
      0.15,
      ...Array.from({ length: 30 }, () => 0),
    ];
    rerender(<AppShell />);

    const before = screen.getByLabelText("Preview visual statis");
    expect(before).toHaveTextContent("Title A");
    expect(
      before.querySelectorAll(".static-scene-preview__layer--spectrum"),
    ).toHaveLength(1);
    expect(
      before.querySelectorAll(".static-scene-preview__layer--progress"),
    ).toHaveLength(1);
    expect(before.querySelector(".static-scene-preview__bar")).toHaveStyle({
      height: "75%",
    });

    previewClock.activeTrackId = "track-b";
    previewClock.albumTimeMs = 2000;
    previewClock.localTimeMs = 0;
    rerender(<AppShell />);
    let boundary = screen.getByLabelText("Preview Boundary", {
      selector: ".boundary-visual-preview",
    });
    expect(boundary).toHaveAttribute("data-boundary-from", "track-a");
    expect(boundary).toHaveAttribute("data-boundary-to", "track-b");
    expect(boundary).toHaveAttribute("data-boundary-progress", "0.000");
    expect(boundary).toHaveTextContent("Title A");
    expect(boundary).toHaveTextContent("Title B");
    expect(boundary).toHaveTextContent("Artist A");
    expect(boundary).toHaveTextContent("Artist B");
    // Only the canonical incoming audio FFT/progress are rendered. Source
    // and target metadata layers must not duplicate spectrum or progress.
    expect(
      boundary.querySelectorAll(".static-scene-preview__layer--spectrum"),
    ).toHaveLength(1);
    expect(
      boundary.querySelectorAll(".static-scene-preview__layer--progress"),
    ).toHaveLength(1);
    expect(
      boundary.querySelectorAll(".static-scene-preview__layer--background"),
    ).toHaveLength(1);
    expect(
      boundary.querySelectorAll(".static-scene-preview__bar"),
    ).toHaveLength(32);
    expect(boundary.querySelector(".static-scene-preview__bar")).toHaveStyle({
      height: "75%",
    });

    previewClock.albumTimeMs = 2400;
    previewClock.localTimeMs = 400;
    previewClock.spectrumLevels = [
      0.31,
      0.8,
      ...Array.from({ length: 30 }, () => 0),
    ];
    rerender(<AppShell />);
    boundary = screen.getByLabelText("Preview Boundary", {
      selector: ".boundary-visual-preview",
    });
    expect(boundary).toHaveAttribute("data-boundary-progress", "0.500");
    const peakBars = boundary.querySelectorAll(".static-scene-preview__bar");
    expect(peakBars).toHaveLength(32);
    expect(peakBars[0]).toHaveStyle({ height: "31%" });
    expect(peakBars[1]).toHaveStyle({ height: "80%" });
    const progress = boundary.querySelector<HTMLElement>(
      ".static-scene-preview__progress-track",
    );
    expect(progress?.style.background).toContain("60%");
    const repeated = {
      incomingOpacity: boundary.querySelector<HTMLElement>(
        '.boundary-visual-preview__side:nth-of-type(3) [data-scene-layer-id="title"]',
      )?.style.opacity,
      spectrum: peakBars[0]?.getAttribute("style"),
      progress: progress?.getAttribute("style"),
    };

    previewClock.albumTimeMs = 2800;
    previewClock.localTimeMs = 800;
    rerender(<AppShell />);
    expect(
      screen.queryByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toBeNull();
    const after = screen.getByLabelText("Preview visual statis");
    expect(after).toHaveTextContent("Title B");
    expect(
      after.querySelectorAll(".static-scene-preview__layer--spectrum"),
    ).toHaveLength(1);
    expect(after.querySelector(".static-scene-preview__bar")).toHaveStyle({
      height: "31%",
    });

    // Reverse seek must reproduce the identical artwork/title/FFT/progress state.
    previewClock.albumTimeMs = 2400;
    previewClock.localTimeMs = 400;
    rerender(<AppShell />);
    boundary = screen.getByLabelText("Preview Boundary", {
      selector: ".boundary-visual-preview",
    });
    expect({
      incomingOpacity: boundary.querySelector<HTMLElement>(
        '.boundary-visual-preview__side:nth-of-type(3) [data-scene-layer-id="title"]',
      )?.style.opacity,
      spectrum: boundary
        .querySelector(".static-scene-preview__bar")
        ?.getAttribute("style"),
      progress: boundary
        .querySelector(".static-scene-preview__progress-track")
        ?.getAttribute("style"),
    }).toEqual(repeated);

    // A clock belonging to a previous project cannot activate a ghost boundary.
    previewClock.projectId = "stale-project-id";
    rerender(<AppShell />);
    expect(
      screen.queryByLabelText("Preview Boundary", {
        selector: ".boundary-visual-preview",
      }),
    ).toBeNull();
    const shell = document.querySelector(".app-shell");
    expect(shell).toHaveAttribute("data-project-revision", "0");
    expect(shell).toHaveAttribute("data-project-dirty", "false");
    expect(startup).toEqual(initial);
  });
});
