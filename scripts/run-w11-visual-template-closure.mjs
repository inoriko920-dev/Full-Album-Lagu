import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const root = resolve("artifacts", "step11", "T11-W05-07");
const fixtures = join(root, "fixtures");
const evidence = join(root, "evidence");
const captures = join(root, "screenshots");
const userData = join(fixtures, "isolated-user-data");
const bootstrap = resolve("dist", "main", "bootstrap.cjs");
const projectOnePath = join(fixtures, "Closure Album One Ω.lfa.json");
const projectTwoPath = join(fixtures, "Closure Album Two Ω.lfa.json");

function pcmWav() {
  const rate = 8000, count = 6400;
  const data = Buffer.alloc(44 + count * 2);
  data.write("RIFF", 0, "ascii");
  data.writeUInt32LE(36 + count * 2, 4);
  data.write("WAVEfmt ", 8, "ascii");
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36, "ascii");
  data.writeUInt32LE(count * 2, 40);
  for (let index = 0; index < count; index += 1)
    data.writeInt16LE(Math.round(5000 * Math.sin((2 * Math.PI * 440 * index) / rate)), 44 + index * 2);
  return data;
}
async function snap(path) {
  const [content, info] = await Promise.all([readFile(path), stat(path)]);
  return {
    sha256: createHash("sha256").update(content).digest("hex"),
    size: info.size,
    mtimeMs: info.mtimeMs,
  };
}
function assert(condition, reason) {
  if (!condition) throw new Error(reason);
}
async function launch(mode, project) {
  const output = join(captures, `${mode}.png`);
  await new Promise((finish, fail) => {
    const child = spawn(electronPath, [
      bootstrap, `--open-project=${project}`, `--w05-capture=${mode}`,
      `--w05-screenshot=${output}`, `--w05-user-data=${userData}`,
    ], {
      cwd: process.cwd(),
      env: { ...process.env, LFA_W05_TEST: "1", ELECTRON_DISABLE_SECURITY_WARNINGS: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      fail(new Error(`W05 Electron ${mode} timed out`));
    }, 120000);
    child.stdout.on("data", part => { stdout += String(part); });
    child.stderr.on("data", part => { stderr += String(part); });
    child.once("error", error => { clearTimeout(timer); fail(error); });
    child.once("exit", code => {
      clearTimeout(timer);
      if (code !== 0) fail(new Error(`W05 Electron ${mode} exit ${code}: ${stdout}\n${stderr}`));
      else finish();
    });
  });
  const state = JSON.parse(await readFile(output.replace(/\.png$/i, "-dom.json"), "utf8"));
  assert(state.mode === mode, `Unexpected W05 screen result: ${mode}`);
  assert(state.frozen.hasGemini && state.frozen.hasAlbumTimeline && state.frozen.hasLeftTabs,
    `Frozen Main Editor shell drift in ${mode}`);
  if (mode.startsWith("SCR-") || mode === "DLG-008") {
    assert(state.viewport?.width === 1600 && state.viewport?.height === 1000, `Invalid frozen ${mode} viewport`);
    assert(state.capture?.width === 1600 && state.capture?.height === 1000, `Invalid frozen ${mode} PNG size`);
    assert((await stat(output)).size > 2000, `Empty ${mode} evidence image`);
  }
  return state;
}

await rm(root, { recursive: true, force: true });
await Promise.all([mkdir(fixtures, { recursive: true }), mkdir(evidence, { recursive: true }), mkdir(captures, { recursive: true }), mkdir(userData, { recursive: true })]);
const media = [
  ["audio-one", join(fixtures, "Track Original A Ω.wav")],
  ["audio-two", join(fixtures, "Track Original B Ω.wav")],
  ["artwork", join(fixtures, "Artwork Original Ω.png")],
];
await writeFile(media[0][1], pcmWav());
await writeFile(media[1][1], pcmWav());
await writeFile(media[2][1], Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==", "base64"));
const beforeSources = {};
for (const [id, path] of media) beforeSources[id] = await snap(path);
const builtin = JSON.parse(await readFile(resolve("resources", "templates", "catalog.json"), "utf8"));
const minimal = builtin.find(entry => entry.templateId === "minimal-biru");
assert(minimal?.scene?.layers?.length === 6, "Canonical Minimal Biru template is missing");

const base = {
  schemaVersion: 1, name: "W05 Closure Album", revision: 0,
  tracks: [
    { id: "track-a", title: "Original Audio A", sourcePath: media[0][1] },
    { id: "track-b", title: "Original Audio B", sourcePath: media[1][1] },
  ],
};
const one = { ...base, projectId: "w05-closure-project", visualScene: minimal.scene };
const two = {
  schemaVersion: 1, projectId: "w05-second-project", name: "W05 Different Album",
  revision: 0, tracks: [{ id: "track-second", title: "Different Project Selected Title", sourcePath: media[1][1] }],
  visualScene: { sceneVersion: 1, layers: [] },
};
await writeFile(projectOnePath, JSON.stringify(one, null, 2), "utf8");
await writeFile(projectTwoPath, JSON.stringify(two, null, 2), "utf8");

const evidenceStates = {};
for (const mode of ["SCR-002C", "SCR-003A", "SCR-003B", "DLG-008"]) {
  evidenceStates[mode] = await launch(mode, projectOnePath);
}
assert(evidenceStates["SCR-002C"].layerCount === 6, "Frozen SCR-002C six layer inventory missing");
assert(evidenceStates["SCR-003A"].catalogCount >= 9, "Frozen SCR-003A starter catalog missing");
assert(evidenceStates["SCR-003B"].hasTrialBanner && evidenceStates["SCR-003B"].afterRevision === 0 && evidenceStates["SCR-003B"].afterDirty === "false", "Frozen SCR-003B trial damaged project");
assert(evidenceStates["DLG-008"].hasSaveDialog, "Frozen DLG-008 save dialog missing");

evidenceStates.FLOW = await launch("FLOW", projectOnePath);
const afterOne = JSON.parse(await readFile(projectOnePath, "utf8"));
assert(afterOne.revision > 0, "First project template Apply/Save did not persist");
assert(JSON.stringify(afterOne.tracks) === JSON.stringify(one.tracks), "First project playlist/order changed");

evidenceStates.FLOW_SECOND = await launch("FLOW_SECOND", projectTwoPath);
const afterTwo = JSON.parse(await readFile(projectTwoPath, "utf8"));
assert(afterTwo.revision > 0 && afterTwo.visualScene?.layers?.length > 0, "Second project visual template was not applied/saved");
assert(JSON.stringify(afterTwo.tracks) === JSON.stringify(two.tracks), "Second project audio playlist changed");
assert(!JSON.stringify(afterTwo.visualScene).includes("Original Audio A"), "First project resolved title leaked into second project");
const afterSources = {};
for (const [id, path] of media) afterSources[id] = await snap(path);
assert(JSON.stringify(beforeSources) === JSON.stringify(afterSources), "Protected source SHA/size/mtime changed");

const safeStates = Object.fromEntries(Object.entries(evidenceStates).map(([name, state]) => [name, {
  mode: state.mode, frozen: state.frozen, beforeRevision: state.beforeRevision,
  afterRevision: state.afterRevision ?? state.lastRevision,
  afterDirty: state.afterDirty, layerCount: state.layerCount ?? null,
  catalogCount: state.catalogCount ?? null, hasTrialBanner: state.hasTrialBanner ?? null,
  hasSaveDialog: state.hasSaveDialog ?? null,
}]));
const report = {
  task: "T11-W05-07", status: "PASS", platform: process.platform, arch: process.arch,
  screenshots: ["SCR-002C", "SCR-003A", "SCR-003B", "DLG-008"],
  projectFlow: { firstSaved: afterOne.revision > 0, secondProjectSaved: afterTwo.revision > 0, playlistsUnchanged: true, dynamicBindingNotPersisted: true },
  sourceFingerprint: { before: beforeSources, after: afterSources, unchanged: true },
  renderer: safeStates,
};
await writeFile(join(evidence, "W05_07_WINDOWS_FLOW.json"), JSON.stringify(report, null, 2), "utf8");
console.log("T11-W05-07 real Electron UI + Save/Reopen/cross-project + source fingerprints PASS");
