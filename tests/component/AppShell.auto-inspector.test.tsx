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
import { AppShell } from "../../src/renderer/app/AppShell";

function albumProject(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "w04-ui",
    name: "Album W04 UI",
    revision: 0,
    mediaAssets: [
      {
        id: "audio-c",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/03 C.mp3",
        fileName: "03 C.mp3",
        sizeBytes: 1003,
        availability: "ready",
        metadata: {
          durationMs: 3000,
          title: "Metadata C",
          artist: "Artist C",
          album: "Album Meta",
          trackNumber: 3,
          year: 2023,
        },
      },
      {
        id: "audio-a",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/01 A.mp3",
        fileName: "01 A.mp3",
        sizeBytes: 1001,
        availability: "ready",
        metadata: {
          durationMs: 1000,
          title: "Metadata A",
          artist: "Artist A",
          album: "Album Meta",
          trackNumber: 1,
          year: 2021,
        },
      },
      {
        id: "audio-b",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/02 B.mp3",
        fileName: "02 B.mp3",
        sizeBytes: 1002,
        availability: "ready",
        metadata: {
          durationMs: 2000,
          title: "Metadata B",
          artist: "Artist B",
          album: "Album Meta",
          trackNumber: 2,
          year: 2022,
        },
      },
    ],
    tracks: [
      {
        id: "track-c",
        title: "Track C",
        sourcePath: "D:/Album/03 C.mp3",
        audioAssetId: "audio-c",
      },
      {
        id: "track-a",
        title: "Track A",
        sourcePath: "D:/Album/01 A.mp3",
        audioAssetId: "audio-a",
      },
      {
        id: "track-b",
        title: "Track B",
        sourcePath: "D:/Album/02 B.mp3",
        audioAssetId: "audio-b",
        binding: {
          titleOverride: "Existing Manual B",
        },
      },
    ],
  };
}

let startupProject = albumProject();

const importArtworkMock = vi.fn<LfaBridge["importArtwork"]>();
const bridge: LfaBridge = {
  getFoundationInfo: async () => ({
    platform: "win32",
    arch: "x64",
    phase: "foundation",
  }),
  importArtwork: importArtworkMock,
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
    message: "Not used.",
  }),
  getMediaDiscoveryStatus: async (batchId) => ({
    status: "error",
    batchId,
    code: "MEDIA_DISCOVERY_FAILED",
    message: "Not used.",
  }),
  cancelMediaDiscovery: async (batchId) => ({
    status: "not-running",
    batchId,
  }),
  startMediaIntake: async () => ({
    status: "error",
    code: "MEDIA_PROBE_FAILED",
    message: "Not used.",
  }),
  getMediaIntakeStatus: async (batchId) => ({
    status: "error",
    batchId,
    code: "MEDIA_PROBE_FAILED",
    message: "Not used.",
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
  relinkMediaAsset: async (request) => ({
    status: "cancelled",
    result: {
      status: "cancelled",
      code: "RELINK_CANCELLED",
      assetId: request.assetId,
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
    project: structuredClone(startupProject),
    location: { kind: "known-path" },
  }),
  autosaveProject: async () => ({ status: "skipped", reason: "clean" }),
  getRecoveryStatus: async () => ({ status: "none" }),
  acceptRecovery: async () => ({ status: "none" }),
  discardRecovery: async () => ({ status: "none" }),
};

beforeEach(() => {
  startupProject = albumProject();
  importArtworkMock.mockReset();
  importArtworkMock.mockResolvedValue({
    status: "cancelled",
    code: "MEDIA_SELECTION_CANCELLED",
  });
  Object.defineProperty(window, "lfa", {
    configurable: true,
    value: bridge,
  });
});

afterEach(() => {
  cleanup();
});

function mediaOrder(): Array<string | null> {
  return Array.from(document.querySelectorAll("[data-media-track-id]")).map(
    (node) => node.getAttribute("data-media-track-id"),
  );
}

describe("T11-W04-05 frozen Auto Susun + Inspector wiring", () => {
  it("runs Auto Susun through shared history while keeping selected track synchronized", async () => {
    render(<AppShell />);
    const shell = document.querySelector(".app-shell");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Auto Susun Album" }),
      ).toBeEnabled();
      expect(mediaOrder()).toEqual(["track-c", "track-a", "track-b"]);
    });

    fireEvent.click(
      document.querySelector(
        '[data-media-track-id="track-c"] button',
      ) as Element,
    );
    expect(shell).toHaveAttribute("data-selected-track-id", "track-c");

    fireEvent.click(screen.getByRole("button", { name: "Auto Susun Album" }));

    await waitFor(() => {
      expect(mediaOrder()).toEqual(["track-a", "track-b", "track-c"]);
      expect(shell).toHaveAttribute("data-project-revision", "1");
      expect(shell).toHaveAttribute("data-project-dirty", "true");
      expect(shell).toHaveAttribute("data-auto-arrange-state", "applied");
      expect(shell).toHaveAttribute("data-selected-track-id", "track-c");
    });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => {
      expect(mediaOrder()).toEqual(["track-c", "track-a", "track-b"]);
      expect(shell).toHaveAttribute("data-project-dirty", "false");
      expect(shell).toHaveAttribute("data-selected-track-id", "track-c");
    });

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await waitFor(() => {
      expect(mediaOrder()).toEqual(["track-a", "track-b", "track-c"]);
      expect(shell).toHaveAttribute("data-project-dirty", "true");
    });

    fireEvent.click(screen.getByRole("button", { name: "Auto Susun Album" }));
    expect(shell).toHaveAttribute("data-auto-arrange-state", "noop");
    expect(shell).toHaveAttribute("data-project-revision", "3");
  });

  it("keeps Inspector draft non-dirty until one atomic Apply and clears blank fields to metadata fallback", async () => {
    render(<AppShell />);
    const shell = document.querySelector(".app-shell");

    await waitFor(() => {
      expect(
        document.querySelector('[data-media-track-id="track-b"]'),
      ).not.toBeNull();
    });

    fireEvent.click(
      document.querySelector(
        '[data-media-track-id="track-b"] button',
      ) as Element,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));

    const titleInput = await screen.findByRole("textbox", {
      name: "Override judul",
    });
    expect(titleInput).toHaveValue("Existing Manual B");
    expect(screen.getByText(/Aktif: Existing Manual B/)).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: "" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Override artis" }), {
      target: { value: "Draft Artist" },
    });

    expect(shell).toHaveAttribute("data-project-revision", "0");
    expect(shell).toHaveAttribute("data-project-dirty", "false");

    fireEvent.click(screen.getByRole("button", { name: "Terapkan Metadata" }));

    await waitFor(() => {
      expect(shell).toHaveAttribute("data-project-revision", "1");
      expect(shell).toHaveAttribute("data-project-dirty", "true");
      expect(screen.getByText(/Aktif: Metadata B/)).toBeInTheDocument();
      expect(screen.getByText(/Aktif: Draft Artist/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => {
      expect(shell).toHaveAttribute("data-project-revision", "2");
      expect(shell).toHaveAttribute("data-project-dirty", "false");
      expect(
        screen.getByRole("textbox", { name: "Override judul" }),
      ).toHaveValue("Existing Manual B");
    });
  });

  it("imports selected-track artwork through main-owned intake as one global Undo step", async () => {
    const base = albumProject();
    const withArtwork: ProjectDocument = {
      ...base,
      revision: 1,
      mediaAssets: [
        ...(base.mediaAssets ?? []),
        {
          id: "image-track-b",
          kind: "image",
          required: false,
          sourcePath: "D:/Album/Cover B.webp",
          fileName: "Cover B.webp",
          sizeBytes: 222,
          availability: "ready",
        },
      ],
      tracks: base.tracks.map((track) =>
        track.id === "track-b"
          ? {
              ...track,
              binding: {
                ...(track.binding ?? {}),
                artworkAssetId: "image-track-b",
              },
            }
          : track,
      ),
    };

    importArtworkMock.mockResolvedValueOnce({
      status: "imported",
      project: withArtwork,
      asset: {
        assetId: "image-track-b",
        fileName: "Cover B.webp",
      },
    });

    render(<AppShell />);
    const shell = document.querySelector(".app-shell");

    await waitFor(() => {
      expect(
        document.querySelector('[data-media-track-id="track-b"]'),
      ).not.toBeNull();
    });
    fireEvent.click(
      document.querySelector(
        '[data-media-track-id="track-b"] button',
      ) as Element,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));

    fireEvent.click(
      await screen.findByRole("button", { name: "Pilih Artwork Track" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Cover B.webp")).toBeInTheDocument();
      expect(shell).toHaveAttribute("data-project-revision", "1");
      expect(shell).toHaveAttribute("data-project-dirty", "true");
    });
    expect(importArtworkMock).toHaveBeenCalledWith({
      project: expect.objectContaining({
        projectId: "w04-ui",
        revision: 0,
      }),
      target: { kind: "track", trackId: "track-b" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => {
      expect(screen.queryByText("Cover B.webp")).not.toBeInTheDocument();
      expect(shell).toHaveAttribute("data-project-dirty", "false");
      expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await waitFor(() => {
      expect(screen.getByText("Cover B.webp")).toBeInTheDocument();
      expect(shell).toHaveAttribute("data-project-dirty", "true");
    });
  });

  it("keeps empty frozen SCR-002A behavior unchanged", () => {
    startupProject = {
      schemaVersion: 1,
      projectId: "empty-w04-ui",
      name: "Proyek Baru",
      revision: 0,
      tracks: [],
    };

    render(<AppShell />);

    expect(
      screen.getByRole("button", { name: "Auto Susun Album" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));
    expect(screen.getByText("Belum ada pilihan")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
  });
});
