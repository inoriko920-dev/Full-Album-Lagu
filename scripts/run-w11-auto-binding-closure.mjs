import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const root = resolve("artifacts", "step11", "T11-W04-06");
const bootstrap = resolve("dist", "main", "bootstrap.cjs");
const evidenceDir = join(root, "evidence");
const fixturesDir = join(root, "fixtures");
const summaryPath = join(root, "TEST_SUMMARY.json");
const fingerprintsPath = join(root, "SOURCE_FINGERPRINTS.json");

function makePcmWav(durationMs = 500, frequency = 440) {
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
      Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.18;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }
  return buffer;
}

function pngBytes() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
}

async function seedJson(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fingerprint(path) {
  const [bytes, details] = await Promise.all([readFile(path), stat(path)]);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: details.size,
    mtimeMs: details.mtimeMs,
  };
}

async function snapshotLabeled(entries) {
  const result = {};
  for (const [label, path] of entries) {
    result[label] = await fingerprint(path);
  }
  return result;
}

function fingerprintsEqual(before, after) {
  const labels = Object.keys(before);
  return (
    labels.length === Object.keys(after).length &&
    labels.every((label) => {
      const a = before[label];
      const b = after[label];
      return (
        b !== undefined &&
        a.sha256 === b.sha256 &&
        a.size === b.size &&
        a.mtimeMs === b.mtimeMs
      );
    })
  );
}

async function createProjectFixture({
  rootDir,
  count,
  projectId,
  projectName,
  initialOrder,
  durationMs,
}) {
  const audioDir = join(rootDir, "Audio Source Ω");
  await mkdir(audioDir, { recursive: true });
  const mediaAssets = [];
  const tracksByNumber = new Map();
  const sourceEntries = [];

  for (let number = 1; number <= count; number += 1) {
    const digits = count >= 100 ? 3 : 2;
    const token = String(number).padStart(digits, "0");
    const sourcePath = join(audioDir, `${token} Source Track Ω.wav`);
    await writeFile(
      sourcePath,
      makePcmWav(durationMs, 180 + (number % 120)),
    );
    const details = await stat(sourcePath);
    const idToken = String(number).padStart(3, "0");
    const assetId = `audio-${idToken}`;
    const trackId = `track-${idToken}`;
    mediaAssets.push({
      id: assetId,
      kind: "audio",
      required: true,
      sourcePath,
      fileName: basename(sourcePath),
      sizeBytes: details.size,
      availability: "ready",
      metadata: {
        durationMs,
        title: `Metadata Title ${idToken} Ω`,
        artist: `Metadata Artist ${idToken} Ω`,
        album: "Closure Metadata Album Ω",
        trackNumber: number,
        year: 2020 + (number % 7),
      },
    });
    tracksByNumber.set(number, {
      id: trackId,
      title: `Track Fallback ${idToken} Ω`,
      sourcePath,
      audioAssetId: assetId,
      ...(number === 5 ? { enabled: false } : {}),
      ...(number === 7
        ? { binding: { titleOverride: "Preserved Manual 007 Ω" } }
        : {}),
    });
    sourceEntries.push([`audio-${idToken}`, sourcePath]);
  }

  const order =
    initialOrder ??
    Array.from({ length: count }, (_, index) => count - index);
  const tracks = order.map((number) => tracksByNumber.get(number));
  const project = {
    schemaVersion: 1,
    projectId,
    name: projectName,
    revision: 0,
    mediaAssets: [...mediaAssets].reverse(),
    tracks,
  };
  return { project, sourceEntries };
}

function sortedTrackIds(count) {
  return Array.from(
    { length: count },
    (_, index) => `track-${String(index + 1).padStart(3, "0")}`,
  );
}

function sameOrder(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function containsRawPathKey(value) {
  if (Array.isArray(value)) return value.some(containsRawPathKey);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) => /(^|_)path($|_)/i.test(key) || containsRawPathKey(child),
  );
}

async function runElectron(mode, projectPath, evidencePath, extraArgs = []) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      electronPath,
      [
        bootstrap,
        `--open-project=${projectPath}`,
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
      rejectRun(new Error(`Electron W11-04 probe timed out: ${mode}`));
    }, 120000);

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
            `Electron W11-04 probe failed with code ${code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
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

function referencedImage(project, trackId) {
  const track = project.tracks.find((item) => item.id === trackId);
  const artworkId = track?.binding?.artworkAssetId;
  if (!artworkId) return null;
  return project.mediaAssets?.find((asset) => asset.id === artworkId) ?? null;
}

await rm(root, { recursive: true, force: true });
await mkdir(evidenceDir, { recursive: true });
await mkdir(fixturesDir, { recursive: true });

const flowRoot = join(fixturesDir, "Auto Binding Full Flow Ω");
const flowProjectPath = join(flowRoot, "W04 Full Flow Project Ω.lfa.json");
const flowOrder = [3, 1, 2, 6, 4, 5, 9, 7, 8, 12, 10, 11];
const flowFixture = await createProjectFixture({
  rootDir: flowRoot,
  count: 12,
  projectId: "w11-04-closure-flow",
  projectName: "W11-04 Closure Flow Ω",
  initialOrder: flowOrder,
  durationMs: 700,
});
await seedJson(flowProjectPath, flowFixture.project);
const trackArtworkPath = join(flowRoot, "Track Cover Ω.png");
await writeFile(trackArtworkPath, pngBytes());
const flowSources = [
  ...flowFixture.sourceEntries,
  ["track-artwork", trackArtworkPath],
];
const flowBefore = await snapshotLabeled(flowSources);

const flowEvidencePath = join(evidenceDir, "01-auto-binding-flow.json");
await runElectron("auto-binding-flow", flowProjectPath, flowEvidencePath, [
  `--w11-artwork-file=${trackArtworkPath}`,
]);
const flowEvidence = await loadEvidence(flowEvidencePath);
const savedFlowProject = JSON.parse(await readFile(flowProjectPath, "utf8"));
const flowAfter = await snapshotLabeled(flowSources);
const expectedFlowOrder = sortedTrackIds(12);

const reopenEvidencePath = join(evidenceDir, "02-reopen.json");
await runElectron(
  "auto-binding-reopen",
  flowProjectPath,
  reopenEvidencePath,
);
const reopenEvidence = await loadEvidence(reopenEvidencePath);

const missingRoot = join(fixturesDir, "Optional Artwork Missing Relink Ω");
const missingProjectPath = join(
  missingRoot,
  "Optional Artwork Project Ω.lfa.json",
);
const missingFixture = await createProjectFixture({
  rootDir: missingRoot,
  count: 3,
  projectId: "w11-04-artwork-relink",
  projectName: "W11-04 Artwork Relink Ω",
  initialOrder: [1, 2, 3],
  durationMs: 500,
});
const movedArtworkDir = join(missingRoot, "Moved Artwork Ω");
await mkdir(movedArtworkDir, { recursive: true });
const replacementArtworkPath = join(movedArtworkDir, "Moved Cover Ω.png");
await writeFile(replacementArtworkPath, pngBytes());
const replacementStat = await stat(replacementArtworkPath);
const nonexistentOriginal = join(
  missingRoot,
  "Original Artwork Ω",
  "Moved Cover Ω.png",
);
missingFixture.project.mediaAssets.push({
  id: "artwork-missing",
  kind: "image",
  required: false,
  sourcePath: nonexistentOriginal,
  fileName: "Moved Cover Ω.png",
  sizeBytes: replacementStat.size,
  availability: "ready",
});
missingFixture.project.albumPresentation = {
  defaultArtworkAssetId: "artwork-missing",
};
await seedJson(missingProjectPath, missingFixture.project);
const missingSources = [
  ...missingFixture.sourceEntries,
  ["replacement-artwork", replacementArtworkPath],
];
const missingBefore = await snapshotLabeled(missingSources);

const missingEvidencePath = join(evidenceDir, "03-artwork-missing-relink.json");
await runElectron(
  "artwork-missing-relink",
  missingProjectPath,
  missingEvidencePath,
  [`--w11-relink-file=${replacementArtworkPath}`],
);
const missingEvidence = await loadEvidence(missingEvidencePath);
const savedMissingProject = JSON.parse(
  await readFile(missingProjectPath, "utf8"),
);
const missingAfter = await snapshotLabeled(missingSources);

const scaleRoot = join(fixturesDir, "Auto Susun Scale 128 Ω");
const scaleProjectPath = join(scaleRoot, "Scale 128 Project Ω.lfa.json");
const scaleFixture = await createProjectFixture({
  rootDir: scaleRoot,
  count: 128,
  projectId: "w11-04-scale-128",
  projectName: "W11-04 Scale 128 Ω",
  durationMs: 120,
});
await seedJson(scaleProjectPath, scaleFixture.project);
const scaleBefore = await snapshotLabeled(scaleFixture.sourceEntries);
const scaleEvidencePath = join(evidenceDir, "04-auto-arrange-scale-128.json");
const scaleStartedAt = Date.now();
await runElectron(
  "auto-arrange-stress",
  scaleProjectPath,
  scaleEvidencePath,
);
const scaleElapsedMs = Date.now() - scaleStartedAt;
const scaleEvidence = await loadEvidence(scaleEvidencePath);
const scaleAfter = await snapshotLabeled(scaleFixture.sourceEntries);
const expectedScaleOrder = sortedTrackIds(128);

const trackArtwork = referencedImage(savedFlowProject, "track-002");
const preservedManual = savedFlowProject.tracks.find(
  (track) => track.id === "track-007",
);
const preservedDisabled = savedFlowProject.tracks.find(
  (track) => track.id === "track-005",
);
const targetTrack = savedFlowProject.tracks.find(
  (track) => track.id === "track-002",
);
const missingArtwork = savedMissingProject.mediaAssets?.find(
  (asset) => asset.id === "artwork-missing",
);

const fingerprintEvidence = {
  fullFlow: {
    before: flowBefore,
    after: flowAfter,
    unchanged: fingerprintsEqual(flowBefore, flowAfter),
  },
  optionalArtworkRelink: {
    before: missingBefore,
    after: missingAfter,
    unchanged: fingerprintsEqual(missingBefore, missingAfter),
  },
  scale128: {
    before: scaleBefore,
    after: scaleAfter,
    unchanged: fingerprintsEqual(scaleBefore, scaleAfter),
  },
};
await writeFile(
  fingerprintsPath,
  JSON.stringify(fingerprintEvidence, null, 2),
  "utf8",
);

const assertions = {
  fullFlowStartsClean:
    flowEvidence.startupStatus === "loaded" &&
    flowEvidence.initial?.dirty === false &&
    flowEvidence.initial?.canUndo === false &&
    flowEvidence.initial?.canRedo === false &&
    flowEvidence.initial?.geminiPresent === true,

  metadataDraftIsSessionOnly:
    flowEvidence.draft?.projectRevision ===
      flowEvidence.initial?.projectRevision &&
    flowEvidence.draft?.dirty === false &&
    flowEvidence.draft?.titleOverride === "Closure Manual Title Ω" &&
    flowEvidence.draft?.artistOverride === "Closure Artist Ω",

  metadataApplyIsOneHistoryStep:
    flowEvidence.metadataApplied?.projectRevision ===
      flowEvidence.initial?.projectRevision + 1 &&
    flowEvidence.metadataApplied?.dirty === true &&
    flowEvidence.metadataApplied?.canUndo === true,

  autoArrangeDeterministic:
    sameOrder(flowEvidence.autoApplied?.mediaOrder, expectedFlowOrder) &&
    sameOrder(flowEvidence.autoApplied?.timelineOrder, expectedFlowOrder) &&
    flowEvidence.autoApplied?.projectRevision ===
      flowEvidence.initial?.projectRevision + 2 &&
    flowEvidence.autoApplied?.autoArrangeState === "applied",

  autoArrangeRepeatedRunIsNoop:
    flowEvidence.autoNoop?.projectRevision ===
      flowEvidence.autoApplied?.projectRevision &&
    flowEvidence.autoNoop?.autoArrangeState === "noop" &&
    sameOrder(flowEvidence.autoNoop?.mediaOrder, expectedFlowOrder),

  autoArrangePreservesDisabledAndManualBinding:
    preservedDisabled?.enabled === false &&
    preservedManual?.binding?.titleOverride === "Preserved Manual 007 Ω",

  artworkImportBindIsAtomicAndOptional:
    flowEvidence.artworkApplied?.projectRevision ===
      flowEvidence.initial?.projectRevision + 3 &&
    flowEvidence.artworkApplied?.artworkText?.includes("Track Cover Ω.png") &&
    trackArtwork?.kind === "image" &&
    trackArtwork?.required === false &&
    trackArtwork?.availability === "ready",

  savePersistsCanonicalState:
    flowEvidence.saved?.dirty === false &&
    sameOrder(savedFlowProject.tracks.map((track) => track.id), expectedFlowOrder) &&
    targetTrack?.binding?.titleOverride === "Closure Manual Title Ω" &&
    targetTrack?.binding?.artistOverride === "Closure Artist Ω" &&
    targetTrack?.binding?.albumOverride === "Closure Album Ω" &&
    targetTrack?.binding?.yearOverride === 2026 &&
    trackArtwork?.fileName === "Track Cover Ω.png" &&
    !JSON.stringify(savedFlowProject).includes("resolvedPresentation"),

  undoRedoCheckpointSemantics:
    flowEvidence.postSaveMutation?.dirty === true &&
    flowEvidence.undoToSaved?.dirty === false &&
    flowEvidence.undoToSaved?.canRedo === true &&
    flowEvidence.undoToSaved?.inspectorText?.includes("Closure Manual Title Ω") &&
    flowEvidence.redoAway?.dirty === true &&
    !flowEvidence.redoAway?.inspectorText?.includes("Closure Manual Title Ω") &&
    flowEvidence.finalState?.dirty === false &&
    flowEvidence.finalState?.inspectorText?.includes("Closure Manual Title Ω") &&
    flowEvidence.finalState?.artworkText?.includes("Track Cover Ω.png"),

  reopenPersistsStateAndResetsHistory:
    reopenEvidence.initial?.projectSource === "loaded" &&
    reopenEvidence.initial?.dirty === false &&
    reopenEvidence.initial?.canUndo === false &&
    reopenEvidence.initial?.canRedo === false &&
    sameOrder(reopenEvidence.initial?.mediaOrder, expectedFlowOrder) &&
    reopenEvidence.initial?.titleOverride === "Closure Manual Title Ω" &&
    reopenEvidence.initial?.artistOverride === "Closure Artist Ω" &&
    reopenEvidence.initial?.artworkText?.includes("Track Cover Ω.png") &&
    reopenEvidence.initial?.geminiPresent === true,

  optionalArtworkMissingIsNonblocking:
    missingEvidence.beforeReady === true &&
    missingEvidence.beforeBlockers === 0 &&
    missingEvidence.beforeMissingCount >= 1 &&
    missingEvidence.missingWasOptional === true,

  optionalArtworkRelinkPreservesBinding:
    missingEvidence.relinkStatus === "relinked" &&
    missingEvidence.afterReady === true &&
    missingEvidence.afterBlockers === 0 &&
    missingEvidence.afterMissingCount === 0 &&
    missingEvidence.bindingPreserved === true &&
    missingEvidence.relinkedAvailability === "ready" &&
    missingEvidence.relinkedRequired === false &&
    missingEvidence.savedStatus === "saved" &&
    savedMissingProject.albumPresentation?.defaultArtworkAssetId ===
      "artwork-missing" &&
    missingArtwork?.availability === "ready" &&
    missingArtwork?.required === false,

  fullFlowSourcesUnchanged: fingerprintEvidence.fullFlow.unchanged,
  relinkSourcesUnchanged: fingerprintEvidence.optionalArtworkRelink.unchanged,

  scale128Deterministic:
    scaleEvidence.initial?.mediaOrder?.length === 128 &&
    sameOrder(scaleEvidence.applied?.mediaOrder, expectedScaleOrder) &&
    sameOrder(scaleEvidence.applied?.timelineOrder, expectedScaleOrder) &&
    scaleEvidence.applied?.projectRevision ===
      scaleEvidence.initial?.projectRevision + 1 &&
    scaleEvidence.noop?.projectRevision ===
      scaleEvidence.applied?.projectRevision &&
    scaleEvidence.noop?.autoArrangeState === "noop",

  scale128Responsive:
    scaleEvidence.elapsedMs < 15000 && scaleElapsedMs < 60000,

  scale128SourcesUnchanged: fingerprintEvidence.scale128.unchanged,

  unicodeAndSpacesExercised: [
    basename(flowProjectPath),
    basename(trackArtworkPath),
    basename(missingProjectPath),
    basename(replacementArtworkPath),
    basename(scaleProjectPath),
  ].every((name) => name.includes(" ") && name.includes("Ω")),

  publicEvidenceHasNoRawPathKeys: [
    flowEvidence,
    reopenEvidence,
    missingEvidence,
    scaleEvidence,
  ].every((item) => !containsRawPathKey(item)),

  publicEvidenceHasNoProviderSecrets: [
    flowEvidence,
    reopenEvidence,
    missingEvidence,
    scaleEvidence,
  ].every((item) => {
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
  taskId: "T11-W04-06",
  wave: "W11-04",
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
  scaleProbeElapsedMs: scaleEvidence.elapsedMs,
  scaleProcessElapsedMs: scaleElapsedMs,
  assertions,
  failedAssertions,
  acceptanceCoverage: {
    "AC-W11-04-01":
      "canonical schema-v1 regression suite + real W04 save/reopen closure",
    "AC-W11-04-02":
      "canonical artwork reference/round-trip tests + closure persisted artwork ref",
    "AC-W11-04-03":
      "resolver/provenance regression suite + closure explicit override projection",
    "AC-W11-04-04":
      "pure resolver regression and closure confirms no resolvedPresentation persistence",
    "AC-W11-04-05":
      "12-track and 128-track live deterministic Auto Susun with reversed media-array ordering",
    "AC-W11-04-06":
      "repeat Auto Susun is live renderer no-op with no revision increment",
    "AC-W11-04-07":
      "closure preserves disabled state/manual binding + canonical identity/source tests",
    "AC-W11-04-08":
      "live Auto Susun increments one revision and enters one global history step",
    "AC-W11-04-09":
      "canonical stale/tampered plan atomic rejection tests in Windows verify",
    "AC-W11-04-10":
      "real main-owned PNG intake through UI/IPC; optional image source fingerprint unchanged",
    "AC-W11-04-11":
      "canonical priority/clear tests + closure selected-track artwork binding",
    "AC-W11-04-12":
      "real missing optional artwork scan remains ready with zero blockers then relinks",
    "AC-W11-04-13":
      "real UI artwork import+bind joins global history; canonical Undo/Redo atomic tests",
    "AC-W11-04-14":
      "live draft non-dirty then one metadata Apply history step",
    "AC-W11-04-15":
      "canonical metadata relink integration regression in Windows verify",
    "AC-W11-04-16":
      "real Save/reopen persists sorted order, overrides and artwork binding cleanly",
    "AC-W11-04-17":
      "live frozen Media/Inspector/Timeline flow + Gemini rail present + exact SCR-002A gate",
    "AC-W11-04-18":
      "live saved-checkpoint Undo/Redo restores manual binding semantics with monotonic revisions",
    "AC-W11-04-19":
      "128-track live renderer Auto Susun deterministic/no-op within responsiveness budget",
    "AC-W11-04-20":
      "SHA-256/size/mtime unchanged for audio and image sources across full flow/relink/scale",
    "AC-W11-04-21":
      "architecture/secrets/portable-path gates + sanitized provider-free closure evidence",
    "AC-W11-04-22":
      "canonical STEP10/W11-01/W11-02/W11-03/UI/package/smoke/ZIP workflow plus W11-04 closure",
  },
  fixturePathPolicy:
    "spaces + Unicode exercised; raw fixture paths omitted from public probe evidence",
};

await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");

if (failedAssertions.length > 0) {
  throw new Error(
    `T11-W04-06 failed assertions: ${failedAssertions.join(", ")}`,
  );
}

console.log(JSON.stringify(summary, null, 2));
