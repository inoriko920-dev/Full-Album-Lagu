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
import { getProjectMediaReadiness } from "../../src/core/domain/media-readiness";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { AppShell } from "../../src/renderer/app/AppShell";

const getFoundationInfoMock = vi.fn<LfaBridge["getFoundationInfo"]>(
  async () => ({
    platform: "win32",
    arch: "x64",
    phase: "foundation" as const,
  }),
);
const saveProjectMock = vi.fn<LfaBridge["saveProject"]>(async (request) => ({
  status: "saved" as const,
  projectRevision: request.project.revision,
  location: { kind: "known-path" as const },
}));
const saveProjectAsMock = vi.fn<LfaBridge["saveProjectAs"]>(async () => ({
  status: "cancelled" as const,
}));
const openProjectMock = vi.fn<LfaBridge["openProject"]>(async () => ({
  status: "cancelled" as const,
}));
const getStartupProjectMock = vi.fn<LfaBridge["getStartupProject"]>(
  async () => ({ status: "none" as const }),
);
const autosaveProjectMock = vi.fn<LfaBridge["autosaveProject"]>(async () => ({
  status: "skipped" as const,
  reason: "clean" as const,
}));
const getRecoveryStatusMock = vi.fn<LfaBridge["getRecoveryStatus"]>(
  async () => ({ status: "none" as const }),
);
const acceptRecoveryMock = vi.fn<LfaBridge["acceptRecovery"]>(async () => ({
  status: "none" as const,
}));
const discardRecoveryMock = vi.fn<LfaBridge["discardRecovery"]>(async () => ({
  status: "none" as const,
}));
const pickAudioFilesMock = vi.fn<LfaBridge["pickAudioFiles"]>(async () => ({
  status: "cancelled" as const,
  code: "MEDIA_SELECTION_CANCELLED" as const,
}));
const pickMediaFolderMock = vi.fn<LfaBridge["pickMediaFolder"]>(async () => ({
  status: "cancelled" as const,
  code: "MEDIA_SELECTION_CANCELLED" as const,
}));
const discoverDroppedMediaMock = vi.fn<LfaBridge["discoverDroppedMedia"]>(
  async () => ({
    status: "error" as const,
    code: "MEDIA_DISCOVERY_FAILED" as const,
    message: "Not used in timeline/history tests.",
  }),
);
const getMediaDiscoveryStatusMock = vi.fn<LfaBridge["getMediaDiscoveryStatus"]>(
  async (batchId) => ({
    status: "error" as const,
    batchId,
    code: "MEDIA_DISCOVERY_FAILED" as const,
    message: "Not used in timeline/history tests.",
  }),
);
const cancelMediaDiscoveryMock = vi.fn<LfaBridge["cancelMediaDiscovery"]>(
  async (batchId) => ({
    status: "not-running" as const,
    batchId,
  }),
);
const startMediaIntakeMock = vi.fn<LfaBridge["startMediaIntake"]>(async () => ({
  status: "error" as const,
  code: "MEDIA_PROBE_FAILED" as const,
  message: "Not used in timeline/history tests.",
}));
const getMediaIntakeStatusMock = vi.fn<LfaBridge["getMediaIntakeStatus"]>(
  async (batchId) => ({
    status: "error" as const,
    batchId,
    code: "MEDIA_PROBE_FAILED" as const,
    message: "Not used in timeline/history tests.",
  }),
);
const cancelMediaIntakeMock = vi.fn<LfaBridge["cancelMediaIntake"]>(
  async (batchId) => ({
    status: "not-running" as const,
    batchId,
  }),
);
const scanMissingMediaMock = vi.fn<LfaBridge["scanMissingMedia"]>(
  async (request) => ({
    status: "scanned" as const,
    project: request.project,
    items: (request.project.mediaAssets ?? []).flatMap((asset) => {
      if (
        (asset.availability !== "missing" &&
          asset.availability !== "invalid") ||
        asset.errorCode === undefined
      ) {
        return [];
      }
      return [
        {
          assetId: asset.id,
          fileName: asset.fileName,
          kind: asset.kind,
          required: asset.required,
          availability: asset.availability,
          code: asset.errorCode,
        },
      ];
    }),
    readiness: getProjectMediaReadiness(request.project),
  }),
);
const relinkMediaAssetMock = vi.fn<LfaBridge["relinkMediaAsset"]>(
  async (request) => ({
    status: "cancelled" as const,
    result: {
      status: "cancelled" as const,
      code: "RELINK_CANCELLED" as const,
      assetId: request.assetId,
    },
  }),
);
const relinkMissingMediaFolderMock = vi.fn<
  LfaBridge["relinkMissingMediaFolder"]
>(async () => ({
  status: "cancelled" as const,
  code: "RELINK_CANCELLED" as const,
}));

const bridge: LfaBridge = {
  getFoundationInfo: getFoundationInfoMock,
  pickAudioFiles: pickAudioFilesMock,
  pickMediaFolder: pickMediaFolderMock,
  discoverDroppedMedia: discoverDroppedMediaMock,
  getMediaDiscoveryStatus: getMediaDiscoveryStatusMock,
  cancelMediaDiscovery: cancelMediaDiscoveryMock,
  startMediaIntake: startMediaIntakeMock,
  getMediaIntakeStatus: getMediaIntakeStatusMock,
  cancelMediaIntake: cancelMediaIntakeMock,
  scanMissingMedia: scanMissingMediaMock,
  relinkMediaAsset: relinkMediaAssetMock,
  relinkMissingMediaFolder: relinkMissingMediaFolderMock,
  saveProject: saveProjectMock,
  saveProjectAs: saveProjectAsMock,
  openProject: openProjectMock,
  getStartupProject: getStartupProjectMock,
  autosaveProject: autosaveProjectMock,
  getRecoveryStatus: getRecoveryStatusMock,
  acceptRecovery: acceptRecoveryMock,
  discardRecovery: discardRecoveryMock,
};

function albumProject({
  missingTrack2 = false,
}: {
  missingTrack2?: boolean;
} = {}): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "timeline-ui-project",
    name: "Album Timeline UI",
    revision: 0,
    mediaAssets: [
      {
        id: "asset-1",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/01 Track Satu.mp3",
        fileName: "01 Track Satu.mp3",
        sizeBytes: 1001,
        availability: "ready",
        metadata: { durationMs: 1000 },
      },
      {
        id: "asset-2",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/02 Track Dua.mp3",
        fileName: "02 Track Dua.mp3",
        sizeBytes: 1002,
        ...(missingTrack2
          ? {
              availability: "missing" as const,
              errorCode: "MEDIA_NOT_FOUND" as const,
            }
          : { availability: "ready" as const }),
        metadata: { durationMs: 2000 },
      },
      {
        id: "asset-3",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/03 Track Tiga.mp3",
        fileName: "03 Track Tiga.mp3",
        sizeBytes: 1003,
        availability: "ready",
        metadata: { durationMs: 3000 },
      },
    ],
    tracks: [
      {
        id: "track-1",
        title: "Track Satu",
        sourcePath: "D:/Album/01 Track Satu.mp3",
        audioAssetId: "asset-1",
      },
      {
        id: "track-2",
        title: "Track Dua",
        sourcePath: "D:/Album/02 Track Dua.mp3",
        audioAssetId: "asset-2",
      },
      {
        id: "track-3",
        title: "Track Tiga",
        sourcePath: "D:/Album/03 Track Tiga.mp3",
        audioAssetId: "asset-3",
      },
    ],
  };
}

function emptyLoadedProject(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "timeline-import-project",
    name: "Album Import Batch",
    revision: 0,
    tracks: [],
  };
}

function importedTwoTrackProject(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "timeline-import-project",
    name: "Album Import Batch",
    revision: 1,
    mediaAssets: [
      {
        id: "asset-a",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/A.mp3",
        fileName: "A.mp3",
        sizeBytes: 1000,
        availability: "ready",
        metadata: { durationMs: 1000 },
      },
      {
        id: "asset-b",
        kind: "audio",
        required: true,
        sourcePath: "D:/Album/B.mp3",
        fileName: "B.mp3",
        sizeBytes: 2000,
        availability: "ready",
        metadata: { durationMs: 2000 },
      },
    ],
    tracks: [
      {
        id: "track-a",
        title: "Track A",
        sourcePath: "D:/Album/A.mp3",
        audioAssetId: "asset-a",
      },
      {
        id: "track-b",
        title: "Track B",
        sourcePath: "D:/Album/B.mp3",
        audioAssetId: "asset-b",
      },
    ],
  };
}

function resetMocks(): void {
  for (const mock of [
    getFoundationInfoMock,
    saveProjectMock,
    saveProjectAsMock,
    openProjectMock,
    getStartupProjectMock,
    autosaveProjectMock,
    getRecoveryStatusMock,
    acceptRecoveryMock,
    discardRecoveryMock,
    pickAudioFilesMock,
    pickMediaFolderMock,
    discoverDroppedMediaMock,
    getMediaDiscoveryStatusMock,
    cancelMediaDiscoveryMock,
    startMediaIntakeMock,
    getMediaIntakeStatusMock,
    cancelMediaIntakeMock,
    scanMissingMediaMock,
    relinkMediaAssetMock,
    relinkMissingMediaFolderMock,
  ]) {
    mock.mockClear();
  }
}

beforeEach(() => {
  Object.defineProperty(window, "lfa", {
    configurable: true,
    value: bridge,
  });
  resetMocks();
});

afterEach(() => {
  cleanup();
});

describe("AppShell frozen timeline and global history wiring", () => {
  it("keeps empty SCR-002A free of conditional history controls", () => {
    render(<AppShell />);

    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Redo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Perkecil timeline" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Perbesar timeline" })).toBeDisabled();
  });

  it("keeps track selection and timeline zoom session-only without dirtying the project", async () => {
    getStartupProjectMock.mockResolvedValueOnce({
      status: "loaded",
      project: albumProject(),
      location: { kind: "known-path" },
    });

    render(<AppShell />);

    const shell = document.querySelector(".app-shell");
    await waitFor(() => {
      expect(document.querySelector('[data-media-track-id="track-2"]')).not.toBeNull();
      expect(shell).toHaveAttribute("data-project-dirty", "false");
    });

    const timeline = screen.getByRole("region", { name: "Album Timeline" });
    const trackTwo = within(timeline).getByRole("button", {
      name: /Track Dua/,
    });

    fireEvent.click(trackTwo);
    expect(trackTwo).toHaveAttribute("aria-pressed", "true");
    expect(shell).toHaveAttribute("data-selected-track-id", "track-2");
    expect(shell).toHaveAttribute("data-project-dirty", "false");
    expect(shell).toHaveAttribute("data-project-revision", "0");

    fireEvent.click(
      within(timeline).getByRole("button", { name: "Perbesar timeline" }),
    );

    expect(shell).toHaveAttribute("data-timeline-zoom", "125");
    expect(shell).toHaveAttribute("data-project-dirty", "false");
    expect(shell).toHaveAttribute("data-project-revision", "0");
  });

  it("reorders the frozen Media and Album Timeline surfaces and supports global Undo/Redo", async () => {
    getStartupProjectMock.mockResolvedValueOnce({
      status: "loaded",
      project: albumProject(),
      location: { kind: "known-path" },
    });

    render(<AppShell />);
    const shell = document.querySelector(".app-shell");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Pindahkan Track Tiga ke atas" }),
    );

    await waitFor(() => {
      expect(shell).toHaveAttribute("data-project-revision", "1");
      expect(shell).toHaveAttribute("data-project-dirty", "true");
      expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    });

    expect(
      Array.from(document.querySelectorAll("[data-media-track-id]")).map(
        (node) => node.getAttribute("data-media-track-id"),
      ),
    ).toEqual(["track-1", "track-3", "track-2"]);
    expect(
      Array.from(document.querySelectorAll("[data-timeline-track-id]")).map(
        (node) => node.getAttribute("data-timeline-track-id"),
      ),
    ).toEqual(["track-1", "track-3", "track-2"]);

    const timeline = screen.getByRole("region", { name: "Album Timeline" });
    expect(
      within(timeline).getByRole("button", { name: /Track Tiga.*00:01.*00:04/ }),
    ).toBeInTheDocument();
    expect(
      within(timeline).getByRole("button", { name: /Track Dua.*00:04.*00:06/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(
        Array.from(document.querySelectorAll("[data-media-track-id]")).map(
          (node) => node.getAttribute("data-media-track-id"),
        ),
      ).toEqual(["track-1", "track-2", "track-3"]);
      expect(shell).toHaveAttribute("data-project-dirty", "false");
      expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));

    await waitFor(() => {
      expect(
        Array.from(document.querySelectorAll("[data-media-track-id]")).map(
          (node) => node.getAttribute("data-media-track-id"),
        ),
      ).toEqual(["track-1", "track-3", "track-2"]);
      expect(shell).toHaveAttribute("data-project-dirty", "true");
    });
  });

  it("wires enabled state to frozen visuals, Render readiness, Undo and Redo", async () => {
    getStartupProjectMock.mockResolvedValueOnce({
      status: "loaded",
      project: albumProject({ missingTrack2: true }),
      location: { kind: "known-path" },
    });

    render(<AppShell />);
    const shell = document.querySelector(".app-shell");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Render" })).toBeDisabled();
      expect(
        screen.getByRole("status", { name: "Media proyek tidak ditemukan" }),
      ).toBeInTheDocument();
    });

    const enabledToggle = screen.getByRole("checkbox", {
      name: "Aktifkan track Track Dua",
    });
    expect(enabledToggle).toBeChecked();

    fireEvent.click(enabledToggle);

    await waitFor(() => {
      expect(enabledToggle).not.toBeChecked();
      expect(screen.getByRole("button", { name: "Render" })).toBeEnabled();
      expect(
        screen.queryByRole("status", { name: "Media proyek tidak ditemukan" }),
      ).not.toBeInTheDocument();
      expect(shell).toHaveAttribute("data-project-dirty", "true");
    });

    const disabledTimelineTrack = document.querySelector(
      '[data-timeline-track-id="track-2"]',
    );
    expect(disabledTimelineTrack).toHaveClass("timeline-track--disabled");
    expect(disabledTimelineTrack).toHaveTextContent("Nonaktif");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(enabledToggle).toBeChecked();
      expect(screen.getByRole("button", { name: "Render" })).toBeDisabled();
      expect(shell).toHaveAttribute("data-project-dirty", "false");
    });

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));

    await waitFor(() => {
      expect(enabledToggle).not.toBeChecked();
      expect(screen.getByRole("button", { name: "Render" })).toBeEnabled();
      expect(shell).toHaveAttribute("data-project-dirty", "true");
    });
  });

  it("undoes and redoes a multi-track import as one global UI history step", async () => {
    const imported = importedTwoTrackProject();

    getStartupProjectMock.mockResolvedValueOnce({
      status: "loaded",
      project: emptyLoadedProject(),
      location: { kind: "known-path" },
    });
    pickAudioFilesMock.mockResolvedValueOnce({
      status: "started",
      batchId: "discovery-batch-ui",
    });
    getMediaDiscoveryStatusMock.mockResolvedValueOnce({
      status: "completed",
      batchId: "discovery-batch-ui",
      summary: {
        rootsSelected: 2,
        directoriesVisited: 0,
        filesDiscovered: 2,
        duplicatesSkipped: 0,
        issues: [],
        items: [
          {
            discoveryId: "discovery-batch-ui:item:000001",
            fileName: "A.mp3",
            sizeBytes: 1000,
          },
          {
            discoveryId: "discovery-batch-ui:item:000002",
            fileName: "B.mp3",
            sizeBytes: 2000,
          },
        ],
      },
    });
    startMediaIntakeMock.mockResolvedValueOnce({
      status: "started",
      batchId: "intake-batch-ui",
    });
    getMediaIntakeStatusMock.mockResolvedValueOnce({
      status: "completed",
      batchId: "intake-batch-ui",
      progress: {
        discovered: 2,
        processed: 2,
        accepted: 2,
        rejected: 0,
      },
      summary: {
        discovered: 2,
        accepted: 2,
        rejected: 0,
        cancelled: 0,
        items: [
          {
            assetId: "asset-a",
            fileName: "A.mp3",
            kind: "audio",
            status: "ready",
          },
          {
            assetId: "asset-b",
            fileName: "B.mp3",
            kind: "audio",
            status: "ready",
          },
        ],
      },
      project: imported,
    });

    render(<AppShell />);
    const shell = document.querySelector(".app-shell");

    fireEvent.click(
      within(screen.getByLabelText("Aksi proyek")).getByRole("button", {
        name: "Impor Audio",
      }),
    );

    await waitFor(() => {
      expect(document.querySelectorAll("[data-media-track-id]")).toHaveLength(2);
      expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
      expect(shell).toHaveAttribute("data-project-dirty", "true");
    });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(screen.getByText("Belum ada media audio")).toBeInTheDocument();
      expect(document.querySelectorAll("[data-media-track-id]")).toHaveLength(0);
      expect(shell).toHaveAttribute("data-project-dirty", "false");
      expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));

    await waitFor(() => {
      expect(document.querySelectorAll("[data-media-track-id]")).toHaveLength(2);
      expect(shell).toHaveAttribute("data-project-dirty", "true");
    });
  });
});
