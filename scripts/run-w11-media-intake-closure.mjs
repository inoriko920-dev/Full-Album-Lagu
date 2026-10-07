import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const root = resolve("artifacts", "step11", "T11-W02-06");
const bootstrap = resolve("dist", "main", "bootstrap.cjs");
const evidenceDir = join(root, "evidence");
const fixturesDir = join(root, "fixtures");
const summaryPath = join(root, "TEST_SUMMARY.json");

function emptyProject(projectId, name) {
  return {
    schemaVersion: 1,
    projectId,
    name,
    revision: 0,
    tracks: [],
  };
}

function makePcmWav(durationMs = 120, frequency = 440) {
  const sampleRate = 8000;
  const channels = 1;
  const bitsPerSample = 16;
  const sampleCount = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = sampleCount * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const sample =
      Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.2;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }

  return buffer;
}

async function seedJson(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createAudioSet(directory, count, digits) {
  await mkdir(directory, { recursive: true });
  const paths = [];

  for (let index = 1; index <= count; index += 1) {
    const number = String(index).padStart(digits, "0");
    const fileName = `${number} Track Ω.wav`;
    const path = join(directory, fileName);
    await writeFile(path, makePcmWav(100 + (index % 5) * 15, 220 + index));
    paths.push(path);
  }

  return paths;
}

async function fingerprint(path) {
  const [bytes, details] = await Promise.all([readFile(path), stat(path)]);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: details.size,
    mtimeMs: details.mtimeMs,
  };
}

async function snapshot(paths) {
  const result = new Map();
  for (const path of paths) {
    result.set(path, await fingerprint(path));
  }
  return result;
}

async function unchanged(before, paths) {
  for (const path of paths) {
    const prior = before.get(path);
    if (!prior) return false;
    const current = await fingerprint(path);
    if (
      prior.sha256 !== current.sha256 ||
      prior.size !== current.size ||
      prior.mtimeMs !== current.mtimeMs
    ) {
      return false;
    }
  }
  return true;
}

async function runElectron(mode, primaryPath, evidencePath, extraArgs = []) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      electronPath,
      [
        bootstrap,
        `--open-project=${primaryPath}`,
        `--w11-probe=${mode}`,
        `--w11-evidence=${evidencePath}`,
        ...extraArgs,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      rejectRun(new Error(`Electron W11-02 probe timed out: ${mode}`));
    }, 90000);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectRun(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        rejectRun(
          new Error(
            `Electron W11-02 probe failed with code ${code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
          ),
        );
        return;
      }
      resolveRun({ stdout, stderr });
    });
  });
}

async function loadEvidence(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

await rm(root, { recursive: true, force: true });
await mkdir(evidenceDir, { recursive: true });
await mkdir(fixturesDir, { recursive: true });

const flowRoot = join(fixturesDir, "Full Flow Space Ω");
const flowAudioRoot = join(flowRoot, "Audio Source Ω");
const flowProjectPath = join(flowRoot, "Album Project Ω.lfa.json");
const flowFiles = await createAudioSet(flowAudioRoot, 24, 2);
const flowBefore = await snapshot(flowFiles);
await seedJson(flowProjectPath, emptyProject("w11-02-flow", "W11-02 Flow Ω"));

const importEvidencePath = join(evidenceDir, "20-plus-import.json");
await runElectron("media-import", flowProjectPath, importEvidencePath, [
  ...flowFiles.map((path) => `--w11-media-file=${path}`),
  `--w11-media-file=${flowFiles[0]}`,
]);
const importEvidence = await loadEvidence(importEvidencePath);
const flowSourcesUnchanged = await unchanged(flowBefore, flowFiles);

const movedRoot = join(flowRoot, "Moved Folder Ω");
await mkdir(movedRoot, { recursive: true });
const movedOriginal = flowFiles[4];
const movedReplacement = join(movedRoot, basename(movedOriginal));
await rename(movedOriginal, movedReplacement);

const relinkEvidencePath = join(evidenceDir, "save-reopen-missing-relink.json");
await runElectron("media-missing-relink", flowProjectPath, relinkEvidencePath, [
  `--w11-relink-folder=${movedRoot}`,
]);
const relinkEvidence = await loadEvidence(relinkEvidencePath);
const savedFlowProject = JSON.parse(await readFile(flowProjectPath, "utf8"));
const movedTrack = savedFlowProject.tracks.find((track) =>
  track.title.startsWith("05 "),
);

const batchRoot = join(fixturesDir, "Batch 100 Plus Ω");
const batchAudioRoot = join(batchRoot, "Audio 105 Ω");
const batchProjectPath = join(batchRoot, "Batch Project Ω.lfa.json");
const batchFiles = await createAudioSet(batchAudioRoot, 105, 3);
const batchBefore = await snapshot(batchFiles);
await seedJson(
  batchProjectPath,
  emptyProject("w11-02-batch-105", "W11-02 Batch 105 Ω"),
);

const batchEvidencePath = join(evidenceDir, "100-plus-import.json");
await runElectron("media-import", batchProjectPath, batchEvidencePath, [
  ...batchFiles.map((path) => `--w11-media-file=${path}`),
]);
const batchEvidence = await loadEvidence(batchEvidencePath);
const batchSourcesUnchanged = await unchanged(batchBefore, batchFiles);

const assertions = {
  twentyPlusPickerUsesOnePipeline:
    importEvidence.selectionStatus === "started" &&
    importEvidence.discoveryStatus === "completed" &&
    importEvidence.intakeStatus === "completed" &&
    importEvidence.saveStatus === "saved" &&
    importEvidence.discovered === 24 &&
    importEvidence.accepted === 24 &&
    importEvidence.trackCount === 24,

  duplicatePhysicalPathDeduped:
    importEvidence.duplicatesSkipped === 1 &&
    importEvidence.discoveryRootsSelected === 25,

  deterministicFilenameOrdering:
    Array.isArray(importEvidence.orderedTitles) &&
    importEvidence.orderedTitles[0]?.startsWith("01 ") &&
    importEvidence.orderedTitles[4]?.startsWith("05 ") &&
    importEvidence.lastTitle?.startsWith("24 "),

  twentyPlusSourceMediaUnchanged: flowSourcesUnchanged,

  saveReopenDetectsRequiredMissingAudio:
    relinkEvidence.startupStatus === "loaded" &&
    relinkEvidence.missingBefore === 1 &&
    relinkEvidence.requiredBlockersBefore === 1 &&
    relinkEvidence.readyBefore === false,

  folderRelinkRepairsMovedAudio:
    relinkEvidence.relinkStatus === "completed" &&
    relinkEvidence.relinkedCount === 1 &&
    relinkEvidence.ambiguousCount === 0 &&
    relinkEvidence.noMatchCount === 0 &&
    relinkEvidence.missingAfter === 0 &&
    relinkEvidence.requiredBlockersAfter === 0 &&
    relinkEvidence.readyAfter === true &&
    relinkEvidence.saveStatus === "saved" &&
    movedTrack?.sourcePath === movedReplacement,

  hundredPlusBatchCompletes:
    batchEvidence.selectionStatus === "started" &&
    batchEvidence.discoveryStatus === "completed" &&
    batchEvidence.intakeStatus === "completed" &&
    batchEvidence.saveStatus === "saved" &&
    batchEvidence.discovered === 105 &&
    batchEvidence.accepted === 105 &&
    batchEvidence.rejected === 0 &&
    batchEvidence.trackCount === 105,

  hundredPlusExposesProgressStatus:
    batchEvidence.discoveryPolls >= 1 &&
    batchEvidence.intakePolls >= 1 &&
    batchEvidence.rendererTicks > 0,

  hundredPlusOrderStable:
    Array.isArray(batchEvidence.orderedTitles) &&
    batchEvidence.orderedTitles[0]?.startsWith("001 ") &&
    batchEvidence.orderedTitles[4]?.startsWith("005 ") &&
    batchEvidence.lastTitle?.startsWith("105 "),

  hundredPlusSourceMediaUnchanged: batchSourcesUnchanged,

  unicodeAndSpacesExercised:
    [flowProjectPath, movedReplacement, batchProjectPath, batchFiles[0]].every(
      (path) => path.includes(" ") && path.includes("Ω"),
    ),

  publicEvidenceContainsNoRawPaths: [
    importEvidence,
    relinkEvidence,
    batchEvidence,
  ].every((item) => !Object.keys(item).some((key) => /path/i.test(key))),
};

const failedAssertions = Object.entries(assertions)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const summary = {
  taskId: "T11-W02-06",
  verdict: failedAssertions.length === 0 ? "PASS" : "FAIL",
  platform: process.platform,
  arch: process.arch,
  node: process.version,
  sourceSha: process.env.SLC_SOURCE_SHA ?? process.env.GITHUB_SHA ?? "local",
  scenarioCount: 3,
  assertions,
  failedAssertions,
  acceptanceCoverage: [
    "20+ picker intake",
    "batch duplicate de-duplication",
    "deterministic ordering",
    "non-destructive source checks",
    "save/reopen missing scan",
    "folder relink moved audio",
    "100+ progressive intake",
    "Unicode/spaces",
    "sanitized public evidence",
  ],
  fixturePathPolicy:
    "spaces + Unicode exercised; raw fixture paths omitted from public evidence",
};

await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");

if (failedAssertions.length > 0) {
  throw new Error(
    `T11-W02-06 failed assertions: ${failedAssertions.join(", ")}`,
  );
}

console.log(JSON.stringify(summary, null, 2));
