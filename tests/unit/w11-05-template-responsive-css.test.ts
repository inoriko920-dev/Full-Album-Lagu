import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("W11-05 responsive Template Browser CSS", () => {
  it("keeps the <=900px stacked grid independent of the 901-1024px layout", () => {
    const stylesheet = readFileSync(
      resolve(process.cwd(), "src/renderer/app/template-browser.css"),
      "utf8",
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 900px\) \{\s*\.template-browser__body \{\s*grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 901px\) and \(max-width: 1024px\) \{\s*\.template-browser__body \{\s*grid-template-columns: 140px minmax\(300px, 1fr\) minmax\(300px, 40%\);/,
    );
    expect(stylesheet).not.toMatch(/@media \(max-width: 1024px\)/);
  });
});
