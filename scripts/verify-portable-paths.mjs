import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["src", "resources"];
const rootFiles = ["vite.config.ts", "electron-builder.yml"];
const allowedExt = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".yml",
  ".yaml",
  ".css",
]);
const drivePattern = new RegExp(String.raw`\b[A-Za-z]:[\\/]`);
const userHomePattern = new RegExp(String.raw`(?:/Users/|/home/)[^\s"'\x60]+`);
const findings = [];

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (allowedExt.has(extname(entry.name))) files.push(full);
  }
  return files;
}

const files = [];
for (const root of roots) files.push(...(await collect(root)));
files.push(...rootFiles);

for (const file of files) {
  const text = await readFile(file, "utf8");
  if (drivePattern.test(text) || userHomePattern.test(text))
    findings.push(file);
}

if (findings.length > 0) {
  console.error("Portable path check failed:", findings);
  process.exit(1);
}

console.log(`Portable path check passed for ${files.length} foundation files.`);
