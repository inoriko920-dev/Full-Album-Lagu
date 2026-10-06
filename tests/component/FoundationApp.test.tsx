import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FoundationApp } from "../../src/renderer/app/FoundationApp";

describe("FoundationApp", () => {
  beforeEach(() => {
    window.lfa = {
      getFoundationInfo: vi.fn().mockResolvedValue({
        platform: "win32",
        arch: "x64",
        phase: "foundation",
      }),
    };
  });

  it("renders a foundation-only shell and resolves the preload contract", async () => {
    render(<FoundationApp />);
    expect(
      screen.getByRole("heading", { name: "Lagu Full Album" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("win32 / x64")).toBeInTheDocument();
    expect(screen.getByText("disabled")).toBeInTheDocument();
  });
});
