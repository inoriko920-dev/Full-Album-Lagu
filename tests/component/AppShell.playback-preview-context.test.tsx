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
      albumTimeMs: 1000,
      localTimeMs: 1000,
    },
    spectrum: Array.from({ length: 32 }, () => 0),
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
});
