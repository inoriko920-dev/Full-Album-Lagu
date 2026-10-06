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
}));
const getStartupProjectMock = vi.fn<LfaBridge["getStartupProject"]>(
  async () => ({ status: "none" as const }),
);
const getFoundationInfoMock = vi.fn<LfaBridge["getFoundationInfo"]>(async () => ({
  platform: "win32",
  arch: "x64",
  phase: "foundation" as const,
}));

const bridge: LfaBridge = {
  getFoundationInfo: getFoundationInfoMock,
  saveProject: saveProjectMock,
  getStartupProject: getStartupProjectMock,
};

beforeEach(() => {
  Object.defineProperty(window, "lfa", {
    configurable: true,
    value: bridge,
  });
  saveProjectMock.mockClear();
  getStartupProjectMock.mockClear();
  getFoundationInfoMock.mockClear();
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

  it("routes Save through ProjectSession and the typed bridge", async () => {
    render(<AppShell />);

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => {
      expect(saveProjectMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Proyek tersimpan.")).toBeInTheDocument();
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
});