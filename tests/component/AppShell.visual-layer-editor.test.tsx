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
const importArtworkMock = vi.fn<LfaBridge["importArtwork"]>(async () => ({
  status: "cancelled" as const,
  code: "MEDIA_SELECTION_CANCELLED" as const,
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
  importArtwork: importArtworkMock,
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

beforeEach(() => {
  Object.defineProperty(window, "lfa", { configurable: true, value: bridge });
  saveProjectMock.mockClear();
  getStartupProjectMock.mockReset();
  getStartupProjectMock.mockResolvedValue({ status: "none" });
});
afterEach(cleanup);

function openLayerTab() {
  fireEvent.click(screen.getByRole("tab", { name: "Layer" }));
}
function addLayer(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Tambah" }));
  fireEvent.click(
    within(screen.getByLabelText("Tambah jenis layer")).getByRole("button", {
      name,
    }),
  );
}
function shell() {
  return document.querySelector("main.app-shell") as HTMLElement;
}

describe("T11-W05-05 frozen SCR-002C manual visual editor integration", () => {
  it("keeps SCR-002A unchanged when no visualScene and preserves right Gemini/Album Timeline", async () => {
    render(<AppShell />);
    await waitFor(() => expect(getStartupProjectMock).toHaveBeenCalled());
    expect(screen.getByText("Belum ada visual")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Album Timeline")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Inspector" })).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Preview visual statis"),
    ).not.toBeInTheDocument();
  });

  it("adds all six frozen layer families, synchronizes list/canvas by stable ID and protects project history", async () => {
    render(<AppShell />);
    openLayerTab();
    for (const name of [
      "Background",
      "Artwork",
      "Judul Track",
      "Artis",
      "Spectrum",
      "Progress Bar",
    ]) {
      addLayer(name);
    }
    await waitFor(() =>
      expect(shell().getAttribute("data-project-revision")).toBe("6"),
    );
    expect(
      screen.getByLabelText("Daftar layer").querySelectorAll("[data-layer-id]"),
    ).toHaveLength(6);
    const preview = screen.getByLabelText("Preview visual statis");
    expect(preview.querySelectorAll("[data-scene-layer-id]")).toHaveLength(6);
    expect(
      preview.querySelectorAll(".static-scene-preview__bar").length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      within(preview).getByRole("button", { name: "Pilih layer Judul Track" }),
    );
    expect(
      screen.getByRole("button", { name: "Pilih Judul Track" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(shell().getAttribute("data-project-revision")).toBe("6");
    expect(shell().getAttribute("data-selected-layer-id")).not.toBe("");
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));
    expect(screen.getByLabelText("Nama Layer")).toHaveValue("Judul Track");
    expect(screen.getByLabelText("Font")).toBeInTheDocument();
  });

  it("coalesces continuous transform Preview into exactly one undoable history node", async () => {
    render(<AppShell />);
    openLayerTab();
    addLayer("Judul Track");
    await waitFor(() =>
      expect(shell().getAttribute("data-selected-layer-id")).not.toBe(""),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));
    const x = screen.getByLabelText("Posisi X");
    const revision = Number(shell().getAttribute("data-project-revision"));
    fireEvent.change(x, { target: { value: "0.66" } });
    fireEvent.change(x, { target: { value: "0.80" } });
    expect(shell().getAttribute("data-project-revision")).toBe(
      String(revision),
    );
    expect(
      (
        screen
          .getByLabelText("Preview visual statis")
          .querySelector("[data-scene-layer-id]") as HTMLElement
      )?.getAttribute("style"),
    ).toContain("80%");
    fireEvent.pointerUp(x);
    await waitFor(() =>
      expect(shell().getAttribute("data-project-revision")).toBe(
        String(revision + 1),
      ),
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Posisi X")).toHaveValue("0.72");
    expect(shell().getAttribute("data-project-dirty")).toBe("true"); // The add is still unsaved.
  });

  it("locked layers are selectable, not mutable; explicit unlock restores controls", async () => {
    render(<AppShell />);
    openLayerTab();
    addLayer("Background");
    await waitFor(() =>
      expect(shell().getAttribute("data-selected-layer-id")).not.toBe(""),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));
    fireEvent.click(screen.getByLabelText("Layer terkunci"));
    expect(screen.getByLabelText("Posisi X")).toBeDisabled();
    expect(screen.getByLabelText("Layer terlihat")).toBeDisabled();
    const revision = shell().getAttribute("data-project-revision");
    fireEvent.click(screen.getByLabelText("Layer terkunci"));
    expect(screen.getByLabelText("Posisi X")).toBeEnabled();
    expect(shell().getAttribute("data-project-revision")).not.toBe(revision);
  });

  it("static-text editing and style are committed through canonical Undo/Redo", async () => {
    render(<AppShell />);
    openLayerTab();
    addLayer("Judul Track");
    await waitFor(() =>
      expect(shell().getAttribute("data-selected-layer-id")).not.toBe(""),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));
    fireEvent.change(screen.getByLabelText("Perataan"), {
      target: { value: "right" },
    });
    expect(screen.getByLabelText("Perataan")).toHaveValue("right");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Perataan")).toHaveValue("center");
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByLabelText("Perataan")).toHaveValue("right");
  });
});
