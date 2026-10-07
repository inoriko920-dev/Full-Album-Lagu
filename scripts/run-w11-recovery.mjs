import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const root = resolve("artifacts", "step11", "T11-W01-03");
const bootstrap = resolve("dist", "main", "bootstrap.cjs");
const evidenceDir = join(root, "evidence");
const fixturesDir = join(root, "fixtures");
const recoveryDir = join(root, "recovery-store");
const summaryPath = join(root, "TEST_SUMMARY.json");

function project(projectId, name, revision) {
  return {
    schemaVersion: 1,
    projectId,
    name,
    revision,
    tracks: [],
  };
}

function recoveryArtifactPath(projectId) {
  const key = createHash("sha256").update(projectId, "utf8").digest("hex");
  return join(recoveryDir, `${key}.recovery.json`);
}

async function seed(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function load(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function runElectron(mode, primaryPath, evidencePath) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      electronPath,
      [
        bootstrap,
        `--open-project=${primaryPath}`,
        `--w11-recovery-dir=${recoveryDir}`,
        `--w11-probe=${mode}`,
        `--w11-evidence=${evidencePath}`,
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
      rejectRun(new Error(`Electron recovery probe timed out: ${mode}`));
    }, 30000);

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
            `Electron recovery probe failed with code ${code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
          ),
        );
        return;
      }
      resolveRun({ stdout, stderr });
    });
  });
}

async function probe(mode, primaryPath) {
  const evidencePath = join(evidenceDir, `${mode}.json`);
  await runElectron(mode, primaryPath, evidencePath);
  return JSON.parse(await readFile(evidencePath, "utf8"));
}

await rm(root, { recursive: true, force: true });
await mkdir(evidenceDir, { recursive: true });
await mkdir(fixturesDir, { recursive: true });
await mkdir(recoveryDir, { recursive: true });

const primaryPath = join(
  fixturesDir,
  "Project Space Ω",
  "Primary Project Ω.lfa.json",
);
const primary = project("recovery-main", "Primary Ω", 2);
await seed(primaryPath, primary);

const autosave = await probe("recovery-autosave", primaryPath);
const primaryAfterAutosave = await load(primaryPath);
const recoveryArtifact = await load(recoveryArtifactPath(primary.projectId));
const detected = await probe("recovery-detect", primaryPath);
const accepted = await probe("recovery-accept", primaryPath);
const primaryAfterAccept = await load(primaryPath);
const discarded = await probe("recovery-discard", primaryPath);
const detectedAfterDiscard = await probe("recovery-detect", primaryPath);
const primaryAfterDiscard = await load(primaryPath);

await probe("recovery-autosave", primaryPath);
const newerPrimary = project("recovery-main", "Primary Lebih Baru Ω", 4);
await seed(primaryPath, newerPrimary);
const stale = await probe("recovery-detect", primaryPath);
const primaryAfterStale = await load(primaryPath);

const corruptPath = join(
  fixturesDir,
  "Corrupt Space Ω",
  "Corrupt Project Ω.lfa.json",
);
const corruptPrimary = project("recovery-corrupt-e2e", "Corrupt Primary Ω", 1);
await seed(corruptPath, corruptPrimary);
await writeFile(
  recoveryArtifactPath(corruptPrimary.projectId),
  "{ broken recovery",
  "utf8",
);
const corrupt = await probe("recovery-detect", corruptPath);
const primaryAfterCorrupt = await load(corruptPath);

const assertions = {
  autosaveCreatesSeparateGeneration:
    autosave.autosaveStatus === "saved" &&
    autosave.generation === 1 &&
    recoveryArtifact.recoverySchemaVersion === 1 &&
    recoveryArtifact.savedRevision === 2 &&
    recoveryArtifact.project.revision === 3,

  autosaveDoesNotOverwritePrimary:
    primaryAfterAutosave.revision === 2 &&
    primaryAfterAutosave.name === "Primary Ω",

  startupDetectsNewerRecovery:
    detected.recoveryStatus === "available" &&
    detected.recoveryRevision === 3 &&
    detected.generation === 1,

  acceptReturnsRecoveryWithoutPrimaryWrite:
    accepted.acceptStatus === "recovered" &&
    accepted.recoveryRevision === 3 &&
    primaryAfterAccept.revision === 2,

  discardRemovesOnlyRecovery:
    discarded.discardStatus === "discarded" &&
    detectedAfterDiscard.recoveryStatus === "none" &&
    primaryAfterDiscard.revision === 2,

  staleRecoveryFailsSafe:
    stale.recoveryStatus === "stale" &&
    stale.recoveryCode === "RECOVERY_STALE" &&
    primaryAfterStale.revision === 4,

  corruptRecoveryFailsSafe:
    corrupt.recoveryStatus === "invalid" &&
    corrupt.recoveryCode === "RECOVERY_INVALID" &&
    primaryAfterCorrupt.revision === 1,

  publicEvidenceContainsNoRawPaths: [
    autosave,
    detected,
    accepted,
    discarded,
    detectedAfterDiscard,
    stale,
    corrupt,
  ].every((item) => !Object.keys(item).some((key) => /path/i.test(key))),
};

const failedAssertions = Object.entries(assertions)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const summary = {
  taskId: "T11-W01-03",
  verdict: failedAssertions.length === 0 ? "PASS" : "FAIL",
  platform: process.platform,
  arch: process.arch,
  node: process.version,
  sourceSha: process.env.SLC_SOURCE_SHA ?? process.env.GITHUB_SHA ?? "local",
  scenarioCount: 7,
  assertions,
  failedAssertions,
  evidencePolicy:
    "recovery artifacts remain separate; raw fixture paths omitted from evidence",
};

await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");

if (failedAssertions.length > 0) {
  throw new Error(
    `T11-W01-03 failed assertions: ${failedAssertions.join(", ")}`,
  );
}

console.log(JSON.stringify(summary, null, 2));
