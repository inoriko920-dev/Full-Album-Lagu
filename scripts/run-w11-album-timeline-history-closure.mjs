import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const root = resolve("artifacts", "step11", "T11-W03-06");
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

function makePcmWav(durationMs = 2000, frequency = 440) {
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

async function createAudioSet(directory, count, durationMs, digits) {
  await mkdir(directory, { recursive: true });
  const paths = [];

  for (let index = 1; index <= count; index += 1) {
    const number = String(index).padStart(digits, "0");
    const fileName = `${number} Track Ω.wav`;
    const path = join(directory, fileName);
    await writeFile(path, makePcmWav(durationMs, 220 + index));
    paths.push(path);
  }

  return paths;
}

async function readyProject(projectId, name, paths, durationMs) {
  const mediaAssets = [];
  const tracks = [];

  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index];
    const details = await stat(path);
    const number = String(index + 1).padStart(3, "0");
    const assetId = `scale-asset-${number}`;
    const trackId = `scale-track-${number}`;

    mediaAssets.push({
      id: assetId,
      kind: "audio",
      required: true,
      sourcePath: path,
      fileName: basename(path),
      sizeBytes: details.size,
      availability: "ready",
      metadata: { durationMs },
    });
    tracks.push({
      id: trackId,
      title: `${number} Scale Track Ω`,
      sourcePath: path,
      audioAssetId: assetId,
    });
  }

  return {
    schemaVersion: 1,
    projectId,
    name,
    revision: 0,
    mediaAssets,
    tracks,
  };
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

function formatTimelineTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function timelineLabels(project) {
  let cursorMs = 0;
  return project.tracks.map((track) => {
    if (track.enabled === false) {
      return { trackId: track.id, timing: "Nonaktif", disabled: true };
    }

    const asset = project.mediaAssets?.find(
      (candidate) => candidate.id === track.audioAssetId,
    );
    const durationMs = asset?.metadata?.durationMs;
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return {
        trackId: track.id,
        timing: "Durasi belum tersedia",
        disabled: false,
      };
    }

    const startMs = cursorMs;
    cursorMs += Math.round(durationMs);
    return {
      trackId: track.id,
      timing: `${formatTimelineTime(startMs)} – ${formatTimelineTime(cursorMs)}`,
      disabled: false,
    };
  });
}

function sameTimeline(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  return expected.every((item, index) => {
    const current = actual[index];
    return (
      current?.trackId === item.trackId &&
      current?.timing === item.timing &&
      current?.disabled === item.disabled
    );
  });
}

function sameOrder(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function enabledFor(snapshotValue, trackId) {
  return snapshotValue?.enabled?.find((item) => item.trackId === trackId)
    ?.enabled;
}

function containsRawPathKey(value) {
  if (Array.isArray(value)) return value.some(containsRawPathKey);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) => /(^|_)path($|_)/i.test(key) || containsRawPathKey(child),
  );
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
      rejectRun(new Error(`Electron W11-03 probe timed out: ${mode}`));
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
            `Electron W11-03 probe failed with code ${code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
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

const flowRoot = join(fixturesDir, "Album Timeline Full Flow Ω");
const flowAudioRoot = join(flowRoot, "Audio Source Ω");
const flowProjectPath = join(flowRoot, "Album Project Ω.lfa.json");
const flowFiles = await createAudioSet(flowAudioRoot, 12, 2000, 2);
const flowBefore = await snapshot(flowFiles);
await seedJson(
  flowProjectPath,
  emptyProject("w11-03-closure-flow", "W11-03 Closure Flow Ω"),
);

const importEvidencePath = join(evidenceDir, "01-import.json");
await runElectron("media-import", flowProjectPath, importEvidencePath, [
  ...flowFiles.map((path) => `--w11-media-file=${path}`),
]);
const importEvidence = await loadEvidence(importEvidencePath);
const importedProject = JSON.parse(await readFile(flowProjectPath, "utf8"));
const importedOrder = importedProject.tracks.map((track) => track.id);
const importedIdentities = new Map(
  importedProject.tracks.map((track) => [
    track.id,
    {
      audioAssetId: track.audioAssetId,
      sourcePath: track.sourcePath,
    },
  ]),
);

const flowEvidencePath = join(evidenceDir, "02-timeline-history-flow.json");
await runElectron(
  "timeline-history-flow",
  flowProjectPath,
  flowEvidencePath,
);
const flowEvidence = await loadEvidence(flowEvidencePath);
const savedProject = JSON.parse(await readFile(flowProjectPath, "utf8"));
const expectedSavedOrder = [
  importedOrder[0],
  importedOrder[2],
  importedOrder[1],
  ...importedOrder.slice(3),
];
const expectedSavedTimeline = timelineLabels(savedProject);
const secondId = flowEvidence.secondId;

const reopenEvidencePath = join(evidenceDir, "03-reopen.json");
await runElectron(
  "timeline-history-reopen",
  flowProjectPath,
  reopenEvidencePath,
);
const reopenEvidence = await loadEvidence(reopenEvidencePath);
const flowSourcesUnchanged = await unchanged(flowBefore, flowFiles);

const scaleRoot = join(fixturesDir, "Scale 128 Tracks Ω");
const scaleAudioRoot = join(scaleRoot, "Audio Source 128 Ω");
const scaleProjectPath = join(scaleRoot, "Scale Project 128 Ω.lfa.json");
const scaleFiles = await createAudioSet(scaleAudioRoot, 128, 120, 3);
const scaleBefore = await snapshot(scaleFiles);
const scaleProject = await readyProject(
  "w11-03-scale-128",
  "W11-03 Scale 128 Ω",
  scaleFiles,
  1000,
);
await seedJson(scaleProjectPath, scaleProject);

const scaleEvidencePath = join(evidenceDir, "04-scale-128-history-flow.json");
const scaleStartedAt = Date.now();
await runElectron(
  "timeline-history-flow",
  scaleProjectPath,
  scaleEvidencePath,
);
const scaleElapsedMs = Date.now() - scaleStartedAt;
const scaleEvidence = await loadEvidence(scaleEvidencePath);
const scaleSavedProject = JSON.parse(await readFile(scaleProjectPath, "utf8"));
const scaleSourcesUnchanged = await unchanged(scaleBefore, scaleFiles);

const stableIdentity = savedProject.tracks.every((track) => {
  const original = importedIdentities.get(track.id);
  return (
    original !== undefined &&
    original.audioAssetId === track.audioAssetId &&
    original.sourcePath === track.sourcePath
  );
});

const publicEvidence = [
  importEvidence,
  flowEvidence,
  reopenEvidence,
  scaleEvidence,
];

const assertions = {
  importLoadPipelinePasses:
    importEvidence.startupStatus === "loaded" &&
    importEvidence.selectionStatus === "started" &&
    importEvidence.discoveryStatus === "completed" &&
    importEvidence.intakeStatus === "completed" &&
    importEvidence.saveStatus === "saved" &&
    importEvidence.trackCount === 12,

  loadedProjectStartsCleanWithoutHistory:
    flowEvidence.initial?.projectSource === "loaded" &&
    flowEvidence.initial?.dirty === false &&
    flowEvidence.initial?.canUndo === false &&
    flowEvidence.initial?.canRedo === false &&
    sameOrder(flowEvidence.initial?.mediaOrder, importedOrder) &&
    sameOrder(flowEvidence.initial?.timelineOrder, importedOrder),

  selectionAndZoomAreSessionOnly:
    flowEvidence.sessionOnly?.selectedTrackId === flowEvidence.firstId &&
    flowEvidence.sessionOnly?.timelineZoom === 125 &&
    flowEvidence.sessionOnly?.dirty === false &&
    flowEvidence.sessionOnly?.projectRevision ===
      flowEvidence.initial?.projectRevision,

  reorderUsesCanonicalOrder:
    sameOrder(flowEvidence.reordered?.mediaOrder, expectedSavedOrder) &&
    sameOrder(flowEvidence.reordered?.timelineOrder, expectedSavedOrder) &&
    flowEvidence.reordered?.projectRevision ===
      flowEvidence.initial?.projectRevision + 1 &&
    flowEvidence.reordered?.dirty === true,

  disableExcludesTrackAndRecalculatesBoundaries:
    enabledFor(flowEvidence.disabled, secondId) === false &&
    sameTimeline(flowEvidence.disabled?.timeline, expectedSavedTimeline) &&
    flowEvidence.disabled?.projectRevision ===
      flowEvidence.initial?.projectRevision + 2 &&
    flowEvidence.disabled?.dirty === true,

  saveCreatesLogicalCleanCheckpoint:
    flowEvidence.saved?.dirty === false &&
    flowEvidence.saved?.projectRevision ===
      flowEvidence.initial?.projectRevision + 2 &&
    flowEvidence.saved?.canUndo === true,

  undoRedoSavedCheckpointTruth:
    flowEvidence.postSaveCommand?.dirty === true &&
    flowEvidence.postSaveCommand?.projectRevision ===
      flowEvidence.saved?.projectRevision + 1 &&
    enabledFor(flowEvidence.postSaveCommand, secondId) === true &&
    flowEvidence.undoToSaved?.dirty === false &&
    flowEvidence.undoToSaved?.projectRevision ===
      flowEvidence.saved?.projectRevision + 2 &&
    enabledFor(flowEvidence.undoToSaved, secondId) === false &&
    flowEvidence.undoToSaved?.canRedo === true &&
    flowEvidence.redoAway?.dirty === true &&
    flowEvidence.redoAway?.projectRevision ===
      flowEvidence.saved?.projectRevision + 3 &&
    enabledFor(flowEvidence.redoAway, secondId) === true &&
    flowEvidence.finalState?.dirty === false &&
    flowEvidence.finalState?.projectRevision ===
      flowEvidence.saved?.projectRevision + 4 &&
    enabledFor(flowEvidence.finalState, secondId) === false,

  savedProjectPersistsReorderAndDisabledState:
    sameOrder(
      savedProject.tracks.map((track) => track.id),
      expectedSavedOrder,
    ) &&
    savedProject.tracks.find((track) => track.id === secondId)?.enabled ===
      false &&
    savedProject.revision === flowEvidence.saved?.projectRevision,

  reopenRestoresPersistedStateAndResetsHistory:
    reopenEvidence.initial?.projectSource === "loaded" &&
    reopenEvidence.initial?.dirty === false &&
    reopenEvidence.initial?.canUndo === false &&
    reopenEvidence.initial?.canRedo === false &&
    reopenEvidence.initial?.selectedTrackId === "" &&
    reopenEvidence.initial?.timelineZoom === 100 &&
    sameOrder(reopenEvidence.initial?.mediaOrder, expectedSavedOrder) &&
    sameOrder(reopenEvidence.initial?.timelineOrder, expectedSavedOrder) &&
    sameTimeline(reopenEvidence.initial?.timeline, expectedSavedTimeline),

  trackAndMediaIdentityStable: stableIdentity,

  sourceMediaUnchanged: flowSourcesUnchanged,

  hundredPlusUiHistoryDeterministic:
    scaleEvidence.initial?.mediaOrder?.length === 128 &&
    scaleEvidence.initial?.timelineOrder?.length === 128 &&
    scaleEvidence.reordered?.mediaOrder?.length === 128 &&
    scaleEvidence.disabled?.timeline?.length === 128 &&
    scaleEvidence.saved?.dirty === false &&
    scaleEvidence.postSaveCommand?.dirty === true &&
    scaleEvidence.undoToSaved?.dirty === false &&
    scaleEvidence.redoAway?.dirty === true &&
    scaleEvidence.finalState?.dirty === false &&
    scaleSavedProject.tracks.length === 128,

  hundredPlusCompletesWithinProbeBudget: scaleElapsedMs < 60000,

  hundredPlusSourceMediaUnchanged: scaleSourcesUnchanged,

  unicodeAndSpacesExercised: [
    basename(flowProjectPath),
    basename(flowFiles[0]),
    basename(scaleProjectPath),
    basename(scaleFiles[0]),
  ].every((name) => name.includes(" ") && name.includes("Ω")),

  publicEvidenceHasNoRawPathKeys: publicEvidence.every(
    (item) => !containsRawPathKey(item),
  ),

  publicEvidenceHasNoProviderSecrets: publicEvidence.every((item) => {
    const serialized = JSON.stringify(item).toLowerCase();
    return (
      !serialized.includes("api_key") &&
      !serialized.includes("apikey") &&
      !serialized.includes("bearer ") &&
      !serialized.includes("gemini_api")
    );
  }),
};

const failedAssertions = Object.entries(assertions)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const summary = {
  taskId: "T11-W03-06",
  wave: "W11-03",
  verdict: failedAssertions.length === 0 ? "PASS" : "FAIL",
  platform: process.platform,
  arch: process.arch,
  node: process.version,
  sourceSha: process.env.SLC_SOURCE_SHA ?? process.env.GITHUB_SHA ?? "local",
  scenarioCount: 4,
  trackCounts: {
    fullFlow: 12,
    scale: 128,
  },
  scaleElapsedMs,
  assertions,
  failedAssertions,
  acceptanceCoverage: {
    "AC-W11-03-01": "schema/legacy round-trip in canonical verify + persisted disabled state in closure",
    "AC-W11-03-02": "derived boundary projection in canonical verify + closure timeline labels",
    "AC-W11-03-03": "UI reorder -> Save -> process restart/reopen",
    "AC-W11-03-04": "closure boundary labels after reorder/disable",
    "AC-W11-03-05": "disabled track excluded; source fingerprints unchanged",
    "AC-W11-03-06": "re-enable/Undo/Redo state restoration + canonical readiness tests",
    "AC-W11-03-07": "track/audio/source identities stable across closure flow",
    "AC-W11-03-08": "selection + zoom session-only before project mutation",
    "AC-W11-03-09": "architecture gate + shared ProjectSessionHistory/CommandEngine",
    "AC-W11-03-10": "canonical command/no-op tests in Windows verify",
    "AC-W11-03-11": "closure Undo/Redo semantic restoration",
    "AC-W11-03-12": "canonical divergent branch tests in Windows verify",
    "AC-W11-03-13": "canonical atomic batch tests in Windows verify",
    "AC-W11-03-14": "manual/template/auto-susun/ai contract tests in Windows verify",
    "AC-W11-03-15": "closure Save checkpoint -> dirty command -> Undo clean -> Redo dirty",
    "AC-W11-03-16": "reopen history reset + canonical recovery/passive-scan regressions",
    "AC-W11-03-17": "frozen UI/component regression + canonical SCR-002A gate",
    "AC-W11-03-18": "128-track live renderer/history closure scenario + Windows unit stress",
    "AC-W11-03-19": "architecture/secrets/paths gates + sanitized closure evidence",
    "AC-W11-03-20": "canonical STEP10/W11-01/W11-02/UI/package/smoke/ZIP workflow",
  },
  fixturePathPolicy:
    "spaces + Unicode exercised; raw fixture paths omitted from public evidence",
};

await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");

if (failedAssertions.length > 0) {
  throw new Error(
    `T11-W03-06 failed assertions: ${failedAssertions.join(", ")}`,
  );
}

console.log(JSON.stringify(summary, null, 2));
