import "@testing-library/jest-dom/vitest";
import {
  act,
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

  it("keeps the Browser open and the project clean if the catalog IPC throws synchronously", async () => {
    bridge.listTemplates = () => {
      throw new Error("Synchronous preload bridge failure");
    };
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Gagal membaca katalog template lokal.",
      ),
    );
    expect(screen.getByLabelText("Browser Template")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Coba Template" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kembali ke Editor" }));
    expect(screen.queryByLabelText("Browser Template")).not.toBeInTheDocument();
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
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
      ).getByRole("button", { name: "Simpan Template" }),
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

  it("ignores a late initial listing after a successful post-save catalog refresh", async () => {
    const initialListing = bridge.listTemplates!;
    let listings = 0;
    let releaseInitial = () => {};
    let saves = 0;
    bridge.listTemplates = () => {
      listings += 1;
      if (listings === 1) {
        return new Promise<Awaited<ReturnType<typeof initialListing>>>(
          (resolve) => {
            releaseInitial = () => {
              void initialListing().then(resolve);
            };
          },
        );
      }
      return initialListing().then((result) => {
        if (result.status === "error") return result;
        return {
          status: "ok" as const,
          entries: [
            ...result.entries,
            {
              templateId: "fresh-after-save",
              name: "Template Baru",
              category: "Minimal" as const,
              origin: "user" as const,
              readOnly: false,
            },
          ],
        };
      });
    };
    bridge.saveTemplate = async (template) => {
      saves += 1;
      return { status: "ok", templateId: template.templateId };
    };
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() => expect(listings).toBe(1));
    fireEvent.click(screen.getByRole("button", { name: "Simpan Template" }));
    fireEvent.change(screen.getByLabelText("Nama Template"), {
      target: { value: "Template Baru" },
    });
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Simpan sebagai Template" }),
      ).getByRole("button", { name: "Simpan Template" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Template Baru/ }),
      ).toBeInTheDocument(),
    );
    expect(listings).toBe(2);
    expect(saves).toBe(1);
    await act(async () => {
      releaseInitial();
      await Promise.resolve();
    });
    expect(
      screen.getByRole("button", { name: /Template Baru/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Template tersimpan secara lokal."),
    ).toBeInTheDocument();
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
  });

  it("preserves catalog warning after a pending template load", async () => {
    const originalListing = bridge.listTemplates!;
    let listingCalls = 0;
    let loadCalls = 0;
    let releaseLoad = () => {};
    type LoadedTemplate = { status: "ok"; template: TemplateDocument };
    const pendingLoad = new Promise<LoadedTemplate>((resolve) => {
      releaseLoad = () => {
        resolve({ status: "ok", template: minimalTemplate });
      };
    });
    const saved: TemplateDocument[] = [];
    bridge.listTemplates = async () => {
      listingCalls += 1;
      if (listingCalls === 1) return originalListing();
      return {
        status: "error" as const,
        code: "TEMPLATE_READ_FAILED" as const,
        message: "Catalog refresh failed",
      };
    };
    bridge.loadTemplate = () => {
      loadCalls += 1;
      return pendingLoad;
    };
    bridge.saveTemplate = async (template) => {
      saved.push(template);
      return { status: "ok", templateId: template.templateId };
    };

    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() => expect(loadCalls).toBe(1));
    fireEvent.click(screen.getByRole("button", { name: "Simpan Template" }));
    fireEvent.change(screen.getByLabelText("Nama Template"), {
      target: { value: "Template Baru" },
    });
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Simpan sebagai Template" }),
      ).getByRole("button", { name: "Simpan Template" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Template berhasil disimpan, tetapi daftar template belum dapat diperbarui.",
      ),
    );
    await act(async () => {
      releaseLoad();
      await Promise.resolve();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Template berhasil disimpan, tetapi daftar template belum dapat diperbarui.",
    );
    expect(screen.getByRole("button", { name: "Coba Template" })).toBeEnabled();
    expect(
      screen.getByText("Template tersimpan secara lokal."),
    ).toBeInTheDocument();
    expect(saved).toHaveLength(1);
    expect(listingCalls).toBe(2);
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
  });

  it("reports catalog refresh failure without contradicting a successful local template save", async () => {
    const initialListing = bridge.listTemplates!;
    let listings = 0;
    const saved: TemplateDocument[] = [];
    bridge.listTemplates = async () => {
      listings += 1;
      if (listings === 1) return initialListing();
      throw new Error("Temporary catalog read failure");
    };
    bridge.saveTemplate = async (template) => {
      saved.push(template);
      return { status: "ok", templateId: template.templateId };
    };
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Minimal Biru/ }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Simpan Template" }));
    const dialog = screen.getByRole("dialog", {
      name: "Simpan sebagai Template",
    });
    fireEvent.change(screen.getByLabelText("Nama Template"), {
      target: { value: "Template Aman" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Simpan Template" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Template berhasil disimpan, tetapi daftar template belum dapat diperbarui.",
      ),
    );
    expect(saved).toHaveLength(1);
    expect(listings).toBe(2);
    expect(
      screen.getByText("Template tersimpan secara lokal."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Gagal menyimpan template lokal."),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
  });

  it("retries a failed selected template load without changing the project", async () => {
    let attempts = 0;
    bridge.loadTemplate = async () => {
      attempts += 1;
      return attempts === 1
        ? {
            status: "error" as const,
            code: "TEMPLATE_READ_FAILED" as const,
            message: "Gagal memuat sementara.",
          }
        : { status: "ok" as const, template: minimalTemplate };
    };
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Gagal memuat sementara.",
      ),
    );
    const tryButton = screen.getByRole("button", { name: "Coba Template" });
    expect(tryButton).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Minimal Biru/ }));
    await waitFor(() => expect(tryButton).toBeEnabled());
    expect(attempts).toBe(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
  });

  it("keeps one pending load when the same selected template is clicked repeatedly", async () => {
    let attempts = 0;
    let releaseFirst = () => {};
    bridge.loadTemplate = async () => {
      attempts += 1;
      if (attempts === 1) {
        await new Promise<void>((resolve) => {
          releaseFirst = () => resolve();
        });
        return {
          status: "error" as const,
          code: "TEMPLATE_READ_FAILED" as const,
          message: "Muat ulang tersedia.",
        };
      }
      return { status: "ok" as const, template: minimalTemplate };
    };
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() => expect(attempts).toBe(1));
    const card = screen.getByRole("button", { name: /Minimal Biru/ });
    fireEvent.click(card);
    fireEvent.click(card);
    fireEvent.click(card);
    expect(attempts).toBe(1);
    expect(
      screen.getByRole("button", { name: "Coba Template" }),
    ).toBeDisabled();

    releaseFirst();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Muat ulang tersedia.",
      ),
    );
    fireEvent.click(card);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Coba Template" }),
      ).toBeEnabled(),
    );
    expect(attempts).toBe(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
  });

  it("recovers a synchronous template-load bridge failure on same-card retry", async () => {
    let attempts = 0;
    bridge.loadTemplate = () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("Synchronous template preload failure");
      }
      return Promise.resolve({
        status: "ok" as const,
        template: minimalTemplate,
      });
    };
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Template tidak dapat dimuat.",
      ),
    );
    const tryButton = screen.getByRole("button", { name: "Coba Template" });
    expect(tryButton).toBeDisabled();
    expect(screen.getByLabelText("Browser Template")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Minimal Biru/ }));
    await waitFor(() => expect(tryButton).toBeEnabled());
    expect(attempts).toBe(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

describe("T11-W05-07 live renderer wave stress and frozen safety", () => {
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
        ...Array.from({ length: 100 }, (_, i) => ({
          templateId: `stress-${String(i).padStart(3, "0")}`,
          name: `Stress Template ${String(i).padStart(3, "0")}`,
          category: "Minimal" as const,
          origin: "user" as const,
          readOnly: false,
        })),
      ],
    });
    bridge.loadTemplate = async (id) => ({
      status: "ok",
      template: { ...minimalTemplate, templateId: id },
    });
    bridge.saveTemplate = async (template) => ({
      status: "ok",
      templateId: template.templateId,
    });
  });

  it("projects 128 actual scene layers into frozen AppShell and supports selection and one history edit", async () => {
    const layers = Array.from({ length: 128 }, (_, i) => ({
      ...createStarterLayer("title", `stress-layer-${i}`),
      name: `Layer Stress ${String(i).padStart(3, "0")}`,
    }));
    getStartupProjectMock.mockResolvedValue({
      status: "loaded",
      project: {
        schemaVersion: 1,
        projectId: "stress-live",
        name: "Stress Live",
        revision: 0,
        tracks: [],
        visualScene: { sceneVersion: 1, layers },
      },
      location: { kind: "known-path" },
    });
    render(<AppShell />);
    await waitFor(() =>
      expect(shell().getAttribute("data-project-id")).toBe("stress-live"),
    );
    openLayerTab();
    expect(
      screen.getByLabelText("Daftar layer").querySelectorAll("[data-layer-id]"),
    ).toHaveLength(128);
    expect(
      screen
        .getByLabelText("Preview visual statis")
        .querySelectorAll("[data-scene-layer-id]"),
    ).toHaveLength(128);
    fireEvent.click(
      screen.getByRole("button", { name: "Pilih Layer Stress 063" }),
    );
    expect(shell().getAttribute("data-selected-layer-id")).toBe(
      "stress-layer-63",
    );
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
    fireEvent.click(screen.getByRole("tab", { name: "Inspector" }));
    fireEvent.change(screen.getByLabelText("Perataan"), {
      target: { value: "right" },
    });
    expect(shell().getAttribute("data-project-dirty")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
  }, 30000);

  it("filters and trials 100 user templates locally without freezing or mutating canonical history", async () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    const grid = await screen.findByLabelText("Daftar Template");
    await waitFor(() =>
      expect(within(grid).getAllByRole("button")).toHaveLength(101),
    );
    fireEvent.change(screen.getByLabelText("Cari Template"), {
      target: { value: "Stress Template 099" },
    });
    expect(within(grid).getAllByRole("button")).toHaveLength(1);
    fireEvent.click(
      within(grid).getByRole("button", { name: /Stress Template 099/ }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Coba Template" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Coba Template" }));
    expect(
      screen.getByText("Mode Coba — perubahan belum disimpan ke proyek."),
    ).toBeInTheDocument();
    const trialGallery = screen.getByLabelText("Pilihan Template Mode Coba");
    expect(
      within(trialGallery).getByText("Stress Template 099"),
    ).toBeInTheDocument();
    expect(
      trialGallery.querySelectorAll(".template-trial-overlay__gallery-card"),
    ).toHaveLength(6);
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
    fireEvent.click(
      screen.getByRole("button", { name: "Kembali ke Sebelumnya" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Kembali ke Editor" }));
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
  }, 30000);
});

describe("T11-W05-07 frozen remediation: editor-hosted Trial, scoped Save and categorized gallery", () => {
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

  it("shows trial projected inside real Main Editor without replacing Album Timeline or right Gemini rail", async () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Coba Template" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Coba Template" }));
    expect(screen.getByLabelText("Mode Coba Template")).toBeInTheDocument();
    expect(screen.queryByLabelText("Browser Template")).not.toBeInTheDocument();
    expect(shell()).toHaveClass("app-shell--template-trial");
    expect(screen.getByLabelText("Preview visual statis")).toBeInTheDocument();
    expect(screen.getByLabelText("Album Timeline")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Media" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
    fireEvent.click(
      screen.getByRole("button", { name: "Kembali ke Sebelumnya" }),
    );
    expect(shell()).not.toHaveClass("app-shell--template-trial");
    expect(screen.getByLabelText("Browser Template")).toBeInTheDocument();
    expect(screen.getByText("Belum ada visual")).toBeInTheDocument();
  });

  it("keeps frozen category rail responsive and limits Save as Template to checked visual families", async () => {
    const saved: TemplateDocument[] = [];
    bridge.saveTemplate = async (template) => {
      saved.push(template);
      return { status: "ok", templateId: template.templateId };
    };
    getStartupProjectMock.mockResolvedValue({
      status: "loaded",
      project: {
        schemaVersion: 1,
        projectId: "scope-source",
        name: "Album Uji",
        revision: 0,
        tracks: [],
        visualScene: {
          sceneVersion: 1,
          layers: [
            createStarterLayer("background", "bg"),
            createStarterLayer("title", "title"),
            createStarterLayer("spectrum", "spectrum"),
            createStarterLayer("progress", "progress"),
          ],
        },
      },
      location: { kind: "known-path" },
    });
    render(<AppShell />);
    await waitFor(() =>
      expect(shell().getAttribute("data-project-id")).toBe("scope-source"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Template" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Minimal Biru/ }),
      ).toBeInTheDocument(),
    );
    const tryButton = screen.getByRole("button", { name: "Coba Template" });
    await waitFor(() => expect(tryButton).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /Minimal Biru/ }));
    expect(tryButton).toBeEnabled();
    expect(screen.getByLabelText("Detail Template")).toHaveTextContent(
      "Minimal Biru",
    );
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Navigasi Kategori Template" }),
      ).getByRole("button", { name: "Neon" }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Detail Template").textContent).toContain(
        "Neon Pulse",
      );
    });
    expect(
      screen.queryByRole("button", { name: /Minimal Biru/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cari Template"), {
      target: { value: "Tidak ditemukan" },
    });
    expect(
      screen.getByRole("button", { name: "Coba Template" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Cari Template"), {
      target: { value: "" },
    });
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Navigasi Kategori Template" }),
      ).getByRole("button", { name: "Semua" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Simpan Template" }));
    const dialog = screen.getByRole("dialog", {
      name: "Simpan sebagai Template",
    });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByLabelText("Pratinjau Template Disimpan"),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("button", { name: /Minimal Biru/ })
        .querySelector(
          'svg[aria-label="Ilustrasi contoh template, bukan artwork asli"]',
        ),
    ).not.toBeNull();
    expect(dialog.textContent).toContain("kredensial AI");
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Layer visual" }),
    );
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Spectrum" }));
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Progress Bar" }),
    );
    fireEvent.change(screen.getByLabelText("Nama Template"), {
      target: { value: "Teks Saja" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Simpan Template" }),
    );
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]!.scene.layers.map((layer) => layer.kind)).toEqual(["text"]);
    expect(shell().getAttribute("data-project-revision")).toBe("0");
    expect(shell().getAttribute("data-project-dirty")).toBe("false");
  });

  it("renders selected layer and Inspector simultaneously in frozen left Layer tab", async () => {
    getStartupProjectMock.mockResolvedValue({
      status: "loaded",
      project: {
        schemaVersion: 1,
        projectId: "layer-combined",
        name: "Layer Layout",
        revision: 0,
        tracks: [],
        visualScene: {
          sceneVersion: 1,
          layers: [createStarterLayer("title", "title-visible")],
        },
      },
      location: { kind: "known-path" },
    });
    render(<AppShell />);
    await waitFor(() =>
      expect(shell().getAttribute("data-project-id")).toBe("layer-combined"),
    );
    openLayerTab();
    fireEvent.click(screen.getByRole("button", { name: "Pilih Judul Track" }));
    expect(screen.getByLabelText("Layer dan Properti")).toBeInTheDocument();
    expect(screen.getByLabelText("Daftar layer")).toBeInTheDocument();
    expect(screen.getByLabelText("Nama Layer")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Gemini Agent" }),
    ).toBeInTheDocument();
  });
});


describe("T11-W07-06 real AppShell boundary Inspector and Preview", () => {
  function arrangeTwoSongs() {
    getStartupProjectMock.mockResolvedValue({
      status: "loaded",
      project: {
        schemaVersion: 1,
        projectId: "real-boundary-editor",
        name: "Album boundary",
        revision: 0,
        tracks: [
          { id: "song-a", title: "First", sourcePath: "first.wav", audioAssetId: "audio-a" },
          { id: "song-b", title: "Second", sourcePath: "second.wav", audioAssetId: "audio-b" },
        ],
        mediaAssets: [
          { id: "audio-a", kind: "audio", required: true, sourcePath: "first.wav", fileName: "first.wav", sizeBytes: 300, availability: "ready", metadata: { durationMs: 1000, artist: "Artist A" } },
          { id: "audio-b", kind: "audio", required: true, sourcePath: "second.wav", fileName: "second.wav", sizeBytes: 300, availability: "ready", metadata: { durationMs: 2000, artist: "Artist B" } },
        ],
        visualScene: {
          sceneVersion: 1,
          layers: [
            createStarterLayer("artwork", "artwork"),
            createStarterLayer("title", "title"),
            createStarterLayer("artist", "artist"),
          ],
        },
      },
      location: { kind: "known-path" },
    });
  }

  it("selects actual boundary, edits one transition, Undo/Redo and displays two-track Preview", async () => {
    arrangeTwoSongs();
    render(<AppShell />);
    await waitFor(() => expect(shell()).toHaveAttribute("data-project-id", "real-boundary-editor"));
    const select = screen.getByRole("button", { name: "Pilih boundary song-a ke song-b" });
    expect(select).toBeInTheDocument();
    fireEvent.click(select);
    expect(screen.getByRole("tab", { name: "Inspector" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Inspector Boundary")).toHaveTextContent("First");
    expect(screen.getByLabelText("Inspector Boundary")).toHaveTextContent("Second");
    expect(screen.getByLabelText("Jenis Transisi")).toHaveValue("");
    const revision = shell().getAttribute("data-project-revision");
    fireEvent.change(screen.getByLabelText("Jenis Transisi"), { target: { value: "crossfade" } });
    expect(shell()).toHaveAttribute("data-project-dirty", "true");
    expect(shell().getAttribute("data-project-revision")).not.toBe(revision);
    expect(screen.getByLabelText("Jenis Transisi")).toHaveValue("crossfade");
    expect(screen.getByLabelText("Preview Boundary", { selector: ".boundary-visual-preview" })).toHaveAttribute("data-boundary-from", "song-a");
    expect(screen.getByLabelText("Preview Boundary", { selector: ".boundary-visual-preview" })).toHaveAttribute("data-boundary-to", "song-b");
    fireEvent.change(screen.getByLabelText("Durasi Transisi"), { target: { value: "0.6" } });
    expect(screen.getByLabelText("Durasi Transisi")).toHaveValue(0.6);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Durasi Transisi")).toHaveValue(0.8);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Jenis Transisi")).toHaveValue("");
    expect(shell()).toHaveAttribute("data-project-dirty", "false");
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByLabelText("Jenis Transisi")).toHaveValue("crossfade");
    expect(screen.getByRole("complementary", { name: "Gemini Agent" })).toBeInTheDocument();
    expect(screen.getByLabelText("Album Timeline")).toBeInTheDocument();
  }, 30000);

  it("clears boundary selection when the user selects a track instead", async () => {
    arrangeTwoSongs();
    render(<AppShell />);
    await waitFor(() => expect(shell()).toHaveAttribute("data-project-id", "real-boundary-editor"));
    fireEvent.click(screen.getByRole("button", { name: "Pilih boundary song-a ke song-b" }));
    expect(screen.getByLabelText("Inspector Boundary")).toBeInTheDocument();
    const track = document.querySelector('button[data-timeline-track-id="song-a"]');
    expect(track).not.toBeNull();
    fireEvent.click(track!);
    expect(screen.queryByLabelText("Inspector Boundary")).not.toBeInTheDocument();
    expect(shell()).toHaveAttribute("data-project-dirty", "false");
  });
});
