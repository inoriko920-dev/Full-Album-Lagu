import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize, relative, resolve } from "node:path";

const root = resolve("src");
const sourceExt = new Set([".ts", ".tsx"]);
const files = [];

async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (sourceExt.has(extname(entry.name))) files.push(full);
  }
}
await walk(root);

const importPattern = /(?:import|export)\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g;
const violations = [];
const graph = new Map();
const repoPath = (file) => normalize(relative(process.cwd(), file)).replaceAll("\\", "/");

function resolveRelative(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(fromFile, "..", specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find((candidate) => files.some((known) => normalize(known) === normalize(candidate))) ?? null;
}

for (const file of files) {
  const path = repoPath(file);
  const text = await readFile(file, "utf8");
  const deps = [];
  let match;

  while ((match = importPattern.exec(text))) {
    const specifier = match[1];
    const target = resolveRelative(file, specifier);
    if (target) deps.push(target);

    if (path.startsWith("src/renderer/") &&
        (specifier === "electron" || specifier.startsWith("node:") || specifier.startsWith("@google/genai") ||
         (target && repoPath(target).startsWith("src/main/")))) {
      violations.push(`${path}: renderer forbidden import ${specifier}`);
    }

    if (path.startsWith("src/core/domain/") &&
        (specifier === "react" || specifier === "electron" || specifier.startsWith("node:") ||
         specifier.startsWith("@google/genai") ||
         (target && (repoPath(target).startsWith("src/main/") || repoPath(target).startsWith("src/renderer/"))))) {
      violations.push(`${path}: domain forbidden import ${specifier}`);
    }

    if (path.startsWith("src/main/infrastructure/") && target && repoPath(target).startsWith("src/renderer/")) {
      violations.push(`${path}: infrastructure cannot import renderer ${specifier}`);
    }

    if (path.startsWith("src/preload/") && target && repoPath(target).startsWith("src/main/infrastructure/")) {
      violations.push(`${path}: preload cannot import main infrastructure ${specifier}`);
    }

    if (specifier === "node:child_process" && !path.startsWith("src/main/infrastructure/tools/")) {
      violations.push(`${path}: child_process belongs to ToolProcessGateway owner`);
    }
  }
  graph.set(file, deps);
}

const visiting = new Set();
const visited = new Set();
function visit(file, stack) {
  if (visiting.has(file)) {
    const cycleStart = stack.indexOf(file);
    violations.push(`circular dependency: ${[...stack.slice(cycleStart), file].map(repoPath).join(" -> ")}`);
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  stack.push(file);
  for (const dep of graph.get(file) ?? []) visit(dep, stack);
  stack.pop();
  visiting.delete(file);
  visited.add(file);
}
for (const file of files) visit(file, []);

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(`Architecture check passed for ${files.length} source files.`);
