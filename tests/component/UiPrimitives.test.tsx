import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppIcon } from "../../src/renderer/ui/AppIcon";
import { ActionButton, IconButton } from "../../src/renderer/ui/controls";

afterEach(() => cleanup());

describe("shared UI primitives", () => {
  it("renders the frozen toolbar primary class contract", () => {
    render(
      <ActionButton
        variant="toolbarPrimary"
        label="Render"
        icon="render"
      />,
    );
    const button = screen.getByRole("button", { name: "Render" });
    expect(button).toHaveClass("toolbar-button", "toolbar-button--primary");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("preserves disabled icon-button semantics", () => {
    render(<IconButton icon="play" play disabled aria-label="Putar" />);
    const button = screen.getByRole("button", { name: "Putar" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("icon-button", "icon-button--play");
  });

  it("keeps decorative icons out of the accessibility tree", () => {
    const { container } = render(<AppIcon name="gemini" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
