import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "../../src/renderer/app/AppShell";

describe("AppShell", () => {
  it("renders the frozen SCR-002A empty editor shell", () => {
    render(<AppShell />);

    expect(screen.getByText("Proyek Baru")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Impor Audio" })).toBeEnabled();
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
});
