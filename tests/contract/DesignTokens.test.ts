import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokenSource = readFileSync("src/renderer/ui/tokens.css", "utf8");

describe("frozen UI design tokens", () => {
  it.each([
    "--primary",
    "--primary-hover",
    "--app-bg",
    "--surface",
    "--subtle-surface",
    "--text-primary",
    "--text-secondary",
    "--border",
    "--focus",
    "--panel-radius",
    "--control-radius",
    "--toolbar-height",
    "--control-height",
    "--icon-button-size",
  ])("defines %s", (token) => {
    expect(tokenSource).toContain(`${token}:`);
  });
});
