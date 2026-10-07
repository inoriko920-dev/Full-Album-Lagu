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
import { AppShell } from "../../src/renderer/app/AppShell";

const saveProjectMock = vi.fn<LfaBridge["saveProject"]>(async () => ({
  status: "saved" as const,
  projectRevision: 0,
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
const getFoundationInfoMock = vi.fn<LfaBridge["getFoundationInfo"]>(
  async () => ({
    platform: "win32",
    arch: "x64",
    phase: "foundation" as const,
  }),
);
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
    message: "Not used in frozen AppShell tests.",
  }),
);
const getMediaDiscoveryStatusMock = vi.fn<LfaBridge["getMediaDiscoveryStatus"]>(
  async (batchId) => ({
    status: "error" as const,
    batchId,
    code: "MEDIA_DISCOVERY_FAILED" as const,
    message: "Not used in frozen AppShell tests.",
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
  message: "Not used in frozen AppShell tests.",
}));
const getMediaIntakeStatusMock = vi.fn<LfaBridge["getMediaIntakeStatus"]>(
  async (batchId) => ({
    status: "error" as const,
    batchId,
    code: "MEDIA_PROBE_FAILED" as const,
    message: "Not used in frozen AppShell tests.",
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
    items: [],
    readiness: { ready: true, blockers: [] },
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

function project(projectId: string, name: string, revision: number) {
  return {
    schemaVersion: 1 as const,
    projectId,
    name,
    revision,
    tracks: [],
  };
}

beforeEach(() => {
  Object.defineProperty(window, "lfa", {
    configurable: true,
    value: bridge,
  });
  saveProjectMock.mockClear();
  saveProjectAsMock.mockClear();
  openProjectMock.mockClear();
  getStartupProjectMock.mockClear();
  autosaveProjectMock.mockClear();
  getRecoveryStatusMock.mockClear();
  acceptRecoveryMock.mockClear();
  discardRecoveryMock.mockClear();
  getFoundationInfoMock.mockClear();
  pickAudioFilesMock.mockClear();
  pickMediaFolderMock.mockClear();
  discoverDroppedMediaMock.mockClear();
  getMediaDiscoveryStatusMock.mockClear();
  cancelMediaDiscoveryMock.mockClear();
  startMediaIntakeMock.mockClear();
  getMediaIntakeStatusMock.mockClear();
  cancelMediaIntakeMock.mockClear();
  scanMissingMediaMock.mockClear();
  relinkMediaAssetMock.mockClear();
  relinkMissingMediaFolderMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("AppShell", () => {
  it("renders the frozen SCR-002A empty editor shell", () => {
    render(<AppShell />);

    expect(screen.getByText("Proyek Baru")).toBeInTheDocument();
    const projectActions = screen.getByLabelText("Aksi proyek");
    expect(
      within(projectActions).getByRole("button", { name: "Impor Audio" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Auto Susun Album" }),
    ).toBeDisabled();
    expect(screen.getByText("Belum ada visual")).toBeInTheDocument();
    expect(screen.getByText("Belum ada track")).toBeInTheDocument();
    expect(document.querySelector(".project-notice")).not.toBeInTheDocument();

    const geminiRail = screen.getByRole("complementary", {
      name: "Gemini Agent",
    });
    expect(
      within(geminiRail).getByText("Gemini • Belum dikonfigurasi • 0/100 key"),
    ).toBeInTheDocument();
    expect(
      within(geminiRail).getByRole("button", { name: "Tambahkan API Key" }),
    ).toBeEnabled();
  });

  it("keeps the permanent Gemini rail visible while the left work rail changes tabs", () => {
    render(<AppShell />);

    fireEvent.click(screen.getByRole("tab", { name: "Layer" }));
    expect(screen.getByText("Belum ada layer")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));
    expect(screen.getByText("Belum ada pilihan")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
  });

  it("routes Save through ProjectSession and tracks only public path state", async () => {
    render(<AppShell />);

    const shell = document.querySelector(".app-shell");
    expect(shell).toHaveAttribute("data-project-location", "unsaved");

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => {
      expect(saveProjectMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Proyek tersimpan.")).toBeInTheDocument();
      expect(shell).toHaveAttribute("data-project-location", "known-path");
    });

    expect(saveProjectMock.mock.calls[0]?.[0]).toMatchObject({
      project: {
        schemaVersion: 1,
        name: "Proyek Baru",
        revision: 0,
        tracks: [],
      },
    });
  });

  it("shows newer recovery without changing frozen hierarchy and can restore it as dirty live state", async () => {
    const primary = project("project-recovery-ui", "Album Utama", 2);
    const recovered = project("project-recovery-ui", "Album Dipulihkan", 3);

    getStartupProjectMock.mockResolvedValueOnce({
      status: "loaded",
      project: primary,
      location: { kind: "known-path" },
    });
    getRecoveryStatusMock.mockResolvedValueOnce({
      status: "available",
      generation: 1,
      project: recovered,
    });
    acceptRecoveryMock.mockResolvedValueOnce({
      status: "recovered",
      generation: 1,
      project: recovered,
    });

    render(<AppShell />);

    const notice = await screen.findByRole("status", {
      name: "Pemulihan proyek tersedia",
    });
    expect(
      within(notice).getByText("Autosave yang lebih baru ditemukan."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();

    fireEvent.click(within(notice).getByRole("button", { name: "Pulihkan" }));

    const shell = document.querySelector(".app-shell");
    await waitFor(() => {
      expect(screen.getByText("Album Dipulihkan")).toBeInTheDocument();
      expect(shell).toHaveAttribute("data-project-revision", "3");
      expect(shell).toHaveAttribute("data-project-dirty", "true");
      expect(shell).toHaveAttribute("data-recovery-state", "none");
    });

    expect(acceptRecoveryMock).toHaveBeenCalledWith({
      primaryProject: primary,
    });
  });

  it("can discard an available recovery without changing the primary project", async () => {
    const primary = project("project-discard-ui", "Album Utama", 4);
    const recovered = project("project-discard-ui", "Recovery Lama", 5);

    getStartupProjectMock.mockResolvedValueOnce({
      status: "loaded",
      project: primary,
      location: { kind: "known-path" },
    });
    getRecoveryStatusMock.mockResolvedValueOnce({
      status: "available",
      generation: 2,
      project: recovered,
    });
    discardRecoveryMock.mockResolvedValueOnce({ status: "discarded" });

    render(<AppShell />);

    const notice = await screen.findByRole("status", {
      name: "Pemulihan proyek tersedia",
    });
    fireEvent.click(within(notice).getByRole("button", { name: "Abaikan" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: "Pemulihan proyek tersedia" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Album Utama")).toBeInTheDocument();
    });
    expect(discardRecoveryMock).toHaveBeenCalledWith({
      projectId: primary.projectId,
    });
  });

  it("shows stale recovery safely and lets the user remove only the autosave", async () => {
    const primary = project("project-stale-ui", "Primary Lebih Baru", 8);

    getStartupProjectMock.mockResolvedValueOnce({
      status: "loaded",
      project: primary,
      location: { kind: "known-path" },
    });
    getRecoveryStatusMock.mockResolvedValueOnce({
      status: "stale",
      code: "RECOVERY_STALE",
      message: "Recovery artifact is not newer than the primary project.",
    });
    discardRecoveryMock.mockResolvedValueOnce({ status: "discarded" });

    render(<AppShell />);

    const notice = await screen.findByRole("status", {
      name: "Autosave lama",
    });
    expect(
      within(notice).getByText("Autosave lama tidak digunakan."),
    ).toBeInTheDocument();

    fireEvent.click(
      within(notice).getByRole("button", { name: "Hapus Autosave" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: "Autosave lama" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Primary Lebih Baru")).toBeInTheDocument();
    });
  });

  it("shows invalid recovery as an error while preserving the primary project", async () => {
    const primary = project("project-invalid-ui", "Primary Aman", 3);

    getStartupProjectMock.mockResolvedValueOnce({
      status: "loaded",
      project: primary,
      location: { kind: "known-path" },
    });
    getRecoveryStatusMock.mockResolvedValueOnce({
      status: "invalid",
      code: "RECOVERY_INVALID",
      message: "Recovery artifact is invalid or incomplete.",
    });

    render(<AppShell />);

    const notice = await screen.findByRole("alert", {
      name: "Autosave tidak valid",
    });
    expect(
      within(notice).getByText("Autosave pemulihan tidak dapat digunakan."),
    ).toBeInTheDocument();
    expect(screen.getByText("Primary Aman")).toBeInTheDocument();
    expect(
      within(notice).getByRole("button", { name: "Hapus Autosave" }),
    ).toBeEnabled();
  });

  it("makes cancelled Save visible and lets the user retry", async () => {
    saveProjectMock
      .mockResolvedValueOnce({ status: "cancelled" })
      .mockResolvedValueOnce({
        status: "saved",
        projectRevision: 0,
        location: { kind: "known-path" },
      });

    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    const notice = await screen.findByRole("status", {
      name: "Penyimpanan dibatalkan",
    });
    expect(
      within(notice).getByText(
        "Perubahan proyek belum disimpan ke file utama.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(notice).getByRole("button", { name: "Simpan Lagi" }),
    );

    await waitFor(() => {
      expect(saveProjectMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Proyek tersimpan.")).toBeInTheDocument();
      expect(
        screen.queryByRole("status", { name: "Penyimpanan dibatalkan" }),
      ).not.toBeInTheDocument();
    });
  });

  it("makes Save errors visible and actionable without replacing the frozen shell", async () => {
    saveProjectMock
      .mockResolvedValueOnce({
        status: "error",
        code: "PROJECT_WRITE_FAILED",
        message: "Project file could not be saved.",
      })
      .mockResolvedValueOnce({
        status: "saved",
        projectRevision: 0,
        location: { kind: "known-path" },
      });

    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    const notice = await screen.findByRole("alert", {
      name: "Gagal menyimpan proyek",
    });
    expect(
      within(notice).getByText("Proyek gagal disimpan."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(notice).getByRole("button", { name: "Simpan Lagi" }),
    );

    await waitFor(() => {
      expect(saveProjectMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Proyek tersimpan.")).toBeInTheDocument();
    });
  });
});
