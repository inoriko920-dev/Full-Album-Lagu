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
import { createStarterLayer } from "../../src/renderer/app/visual-layer-defaults";
import type { TemplateDocument } from "../../src/core/domain/template-document";

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

const minimalTemplate: TemplateDocument = {
  templateSchemaVersion: 1,
  templateId: "minimal-biru",
  name: "Minimal Biru",
  category: "Minimal",
  scene: {
    sceneVersion: 1,
    layers: [
      createStarterLayer("background", "bg"),
      createStarterLayer("title", "title"),
    ],
  },
};
const neonTemplate: TemplateDocument = {
  ...minimalTemplate,
  templateId: "neon-pulse",
  name: "Neon Pulse",
  category: "Neon",
};

describe("T11-W05-06 frozen SCR-003A/B and DLG-008 template workflow", () => {
  beforeEach(() => {
    bridge.listTemplates = async () => ({
      status: "ok",
      entries: [
        {
          templateId: "minimal-biru",
          name: "Minimal Biru",
          category: "Minimal",
          origin: "built-in",
          readOnly: true,
        },
        {
          templateId: "neon-pulse",
          name: "Neon Pulse",
          category: "Neon",
          origin: "built-in",
          readOnly: true,
        },
      ],
    });
    bridge.loadTemplate = async (id) => ({
      status: "ok",
      template: id === "neon-pulse" ? neonTemplate : minimalTemplate,
    });
    bridge.saveTemplate = async (template) => ({
      status: "ok",
      templateId: template.templateId,
    });
  });

  it("opens the local frozen browser and returns to identical Main Editor/Agent context", async () => {
    render(<AppShell />);
    const initialProjectId = shell().getAttribute("data-project-id");
    const beforeRevision = shell().getAttribute("data-project-revision");
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    expect(screen.getByLabelText("Browser Template")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Minimal Biru/ }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Urutan track dan durasi tidak berubah."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kembali ke Editor" }));
    expect(screen.queryByLabelText("Browser Template")).not.toBeInTheDocument();
    expect(shell().getAttribute("data-project-id")).toBe(initialProjectId);
    expect(shell().getAttribute("data-project-revision")).toBe(beforeRevision);
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
    expect(screen.getByLabelText("Album Timeline")).toBeInTheDocument();
  });

  it("Try keeps canonical project clean; Revert is exact; Apply publishes one template history node", async () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Coba Template" }),
      ).toBeEnabled(),
    );
    const revision = shell().getAttribute("data-project-revision");
    fireEvent.click(screen.getByRole("button", { name: "Coba Template" }));
    expect(
      screen.getByText("Mode Coba — perubahan belum disimpan ke proyek."),
    ).toBeInTheDocument();
    expect(shell().getAttribute("data-project-revision")).toBe(revision);
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
    expect(
      screen.getByRole("button", { name: "Terapkan Template" }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Kembali ke Sebelumnya" }),
    );
    expect(
      screen.queryByText("Mode Coba — perubahan belum disimpan ke proyek."),
    ).not.toBeInTheDocument();
    expect(shell().getAttribute("data-project-revision")).toBe(revision);
    fireEvent.click(screen.getByRole("button", { name: "Coba Template" }));
    fireEvent.click(screen.getByRole("button", { name: "Terapkan Template" }));
    await waitFor(() =>
      expect(shell().getAttribute("data-project-revision")).toBe("1"),
    );
    expect(screen.queryByLabelText("Browser Template")).not.toBeInTheDocument();
    expect(shell().getAttribute("data-project-dirty")).toBe("true");
    expect(screen.getByLabelText("Preview visual statis")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Belum ada visual")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByLabelText("Preview visual statis")).toBeInTheDocument();
  });

  it("category and search filter local catalog with no network or new project history", async () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Neon Pulse/ }),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Kategori Template"), {
      target: { value: "Neon" },
    });
    expect(
      screen.queryByRole("button", { name: /Minimal Biru/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Neon Pulse/ }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cari Template"), {
      target: { value: "tidak-ada" },
    });
    expect(screen.getByText("Template tidak ditemukan.")).toBeInTheDocument();
    expect(shell().getAttribute("data-project-revision")).toBe("0");
  });

  it("Save dialog persists visual-only configuration without dirtying the project", async () => {
    const saveCalls: TemplateDocument[] = [];
    bridge.saveTemplate = async (template) => {
      saveCalls.push(template);
      return { status: "ok", templateId: template.templateId };
    };
    getStartupProjectMock.mockResolvedValue({
      status: "loaded",
      project: {
        schemaVersion: 1,
        projectId: "template-source",
        name: "Full Album Rahasia",
        revision: 0,
        tracks: [
          {
            id: "t1",
            title: "Judul Rahasia",
            sourcePath: "C:/secret/audio.mp3",
          },
        ],
        visualScene: minimalTemplate.scene,
      },
      location: { kind: "known-path" },
    });
    render(<AppShell />);
    await waitFor(() =>
      expect(shell().getAttribute("data-project-id")).toBe("template-source"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan Template" }));
    expect(
      screen.getByRole("dialog", { name: "Simpan sebagai Template" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nama Template"), {
      target: { value: "Gaya Favorit" },
    });
    fireEvent.change(screen.getByLabelText("Kategori Simpan"), {
      target: { value: "Premium" },
    });
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Simpan sebagai Template" }),
      ).getByRole("button", { name: "Simpan" }),
    );
    await waitFor(() => expect(saveCalls).toHaveLength(1));
    const serialized = JSON.stringify(saveCalls[0]);
    expect(saveCalls[0]?.category).toBe("Premium");
    expect(serialized).not.toContain("C:/secret/");
    expect(serialized).not.toContain("Judul Rahasia");
    expect(serialized).not.toContain("tracks");
    expect(serialized).not.toContain("Full Album Rahasia");
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
  });

  it("rejects corrupt or missing local template safely", async () => {
    bridge.loadTemplate = async () => ({
      status: "error",
      code: "TEMPLATE_INVALID",
      message: "Template rusak.",
    });
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Template rusak."),
    );
    expect(
      screen.getByRole("button", { name: "Coba Template" }),
    ).toBeDisabled();
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
  });
});
