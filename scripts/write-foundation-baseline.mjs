import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const names = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {})
].sort();

const rows = [];
for (const name of names) {
  const metadata = JSON.parse(await readFile(join("node_modules", name, "package.json"), "utf8"));
  rows.push({
    name,
    version: metadata.version,
    license: typeof metadata.license === "string" ? metadata.license : "SEE_PACKAGE"
  });
}

await mkdir("docs/architecture/adr", { recursive: true });
await writeFile(
  "docs/architecture/adr/ADR-0013-foundation-toolchain-baseline.md",
  [
    "# ADR-0013 — Foundation Toolchain Baseline",
    "",
    "Status: ACCEPTED",
    "",
    "S08-T02 resolves the exact Node-side foundation package baseline. Electron remains pinned to the SoundVisualizer-compatible major selected by STEP 06; all top-level npm specs are saved exact and package-lock.json is authoritative.",
    "",
    "## Top-level packages",
    "",
    ...rows.map((row) => `- \`${row.name}@${row.version}\` — ${row.license}`),
    "",
    "Changing the Electron/React/TypeScript pillar or introducing a new framework requires ASTRA review. Normal patch/security updates still require the full foundation gate."
  ].join("\n") + "\n"
);

await writeFile(
  "docs/upstream/FOUNDATION_DEPENDENCIES.md",
  [
    "# Foundation npm dependency register",
    "",
    "Generated from the exact S08-T02 top-level installation. package-lock.json is the transitive dependency authority.",
    "",
    "| Package | Version | Declared license |",
    "| --- | --- | --- |",
    ...rows.map((row) => `| \`${row.name}\` | \`${row.version}\` | ${row.license} |`),
    ""
  ].join("\n")
);
