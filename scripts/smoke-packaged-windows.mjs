import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

if (process.platform !== "win32") {
  console.error("Packaged Windows smoke can only run on Windows.");
  process.exit(2);
}

const executable = resolve("out", "win-unpacked", "Lagu Full Album.exe");

try {
  await access(executable);
} catch {
  console.error(`Packaged executable not found: ${executable}`);
  process.exit(3);
}

const templateCatalogPath = resolve(
  "out",
  "win-unpacked",
  "resources",
  "templates",
  "catalog.json",
);
try {
  const templates = JSON.parse(await readFile(templateCatalogPath, "utf8"));
  if (
    !Array.isArray(templates) ||
    templates.length !== 9 ||
    !templates.some((entry) => entry.templateId === "minimal-biru")
  ) {
    throw new Error("Packaged template catalog is missing required starters.");
  }
} catch (error) {
  console.error(
    "Packaged template resource verification failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(7);
}

const result = spawnSync(executable, ["--smoke-test"], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30000,
});

if (result.error) {
  console.error("Packaged smoke launch failed:", result.error.message);
  process.exit(4);
}

if (result.signal) {
  console.error(`Packaged smoke terminated by signal: ${result.signal}`);
  process.exit(5);
}

if (result.status !== 0) {
  console.error(`Packaged smoke returned exit code ${String(result.status)}.`);
  if (result.stdout) console.error(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exit(6);
}

console.log(`Packaged Windows smoke PASS: ${executable}`);
