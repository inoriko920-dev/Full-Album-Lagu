import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["src", "tests", "scripts", "resources"];
const rootFiles = [
  "package.json",
  "vite.config.ts",
  "eslint.config.js",
  "electron-builder.yml",
];
const allowedExt = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".css",
]);

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

const googleKey = new RegExp(["AI", "za", "[0-9A-Za-z_-]{30,}"].join(""), "g");
const privateKeyHeader = new RegExp(
  ["BEGIN", " PRIVATE", " KEY"].join(""),
  "g",
);
const findings = [];

for (const file of files) {
  const text = await readFile(file, "utf8");
  if (googleKey.test(text) || privateKeyHeader.test(text)) findings.push(file);
  googleKey.lastIndex = 0;
  privateKeyHeader.lastIndex = 0;
}

if (findings.length > 0) {
  console.error("Potential secret material found:", findings);
  process.exit(1);
}

console.log(`Secret scan passed for ${files.length} foundation text files.`);
