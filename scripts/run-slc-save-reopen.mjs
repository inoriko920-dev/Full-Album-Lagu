import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const root = resolve("artifacts", "slc", "SLC-010-001");
const projectDirectory = join(root, "Project Space Ω");
const projectPath = join(projectDirectory, "Proyek Baru.lfa.json");
const saveEvidence = join(root, "save-renderer.json");
const reopenEvidence = join(root, "reopen-renderer.json");
const cancelEvidence = join(root, "cancel-renderer.json");
const testSummary = join(root, "TEST_SUMMARY.json");
const buildManifest = join(root, "BUILD_MANIFEST.json");
const bootstrap = resolve("dist", "main", "bootstrap.cjs");

async function runElectron(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(electronPath, [bootstrap, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      rejectRun(new Error(`Electron SLC timed out: ${args.join(" ")}`));
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
            `Electron SLC failed with code ${code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
          ),
        );
        return;
      }
      resolveRun({ stdout, stderr });
    });
  });
}

await rm(root, { recursive: true, force: true });
await mkdir(projectDirectory, { recursive: true });

await runElectron([
  `--slc-save-path=${projectPath}`,
  "--slc-probe=save",
  `--slc-evidence=${saveEvidence}`,
]);

const savedRaw = await readFile(projectPath, "utf8");
const savedProject = JSON.parse(savedRaw);
const projectSha256 = createHash("sha256").update(savedRaw).digest("hex");
const saveProbe = JSON.parse(await readFile(saveEvidence, "utf8"));

await runElectron([
  `--open-project=${projectPath}`,
  "--slc-probe=open",
  `--slc-evidence=${reopenEvidence}`,
]);

const reopenProbe = JSON.parse(await readFile(reopenEvidence, "utf8"));

await runElectron([
  "--slc-save-cancel",
  "--slc-probe=save-cancel",
  `--slc-evidence=${cancelEvidence}`,
]);

const cancelProbe = JSON.parse(await readFile(cancelEvidence, "utf8"));

const assertions = {
  savedFileExists: true,
  schemaVersion: savedProject.schemaVersion === 1,
  sameProjectIdAfterReopen:
    saveProbe.projectId === savedProject.projectId &&
    reopenProbe.projectId === savedProject.projectId,
  sameProjectNameAfterReopen: reopenProbe.projectName === savedProject.name,
  sameRevisionAfterReopen:
    reopenProbe.projectRevision === savedProject.revision,
  tracksRoundTrip:
    Array.isArray(savedProject.tracks) && savedProject.tracks.length === 0,
  saveRendererState: saveProbe.persistenceState === "saved",
  reopenRendererState: reopenProbe.projectSource === "loaded",
  cancelledSaveState: cancelProbe.persistenceState === "cancelled",
  unicodeSpacePathExercised:
    projectPath.includes(" ") && projectPath.includes("Ω"),
};

const failed = Object.entries(assertions).filter(([, passed]) => !passed);
const summary = {
  slcId: "SLC-010-001",
  verdict: failed.length === 0 ? "PASS" : "FAIL",
  platform: process.platform,
  arch: process.arch,
  node: process.version,
  gitSha: process.env.GITHUB_SHA ?? "local",
  projectPathKind: "fixture path with spaces and Unicode",
  projectSha256,
  projectBytes: Buffer.byteLength(savedRaw),
  assertions,
  failedAssertions: failed.map(([name]) => name),
};

await writeFile(testSummary, JSON.stringify(summary, null, 2), "utf8");
await writeFile(
  buildManifest,
  JSON.stringify(
    {
      slcId: "SLC-010-001",
      gitSha: process.env.GITHUB_SHA ?? "local",
      platform: process.platform,
      arch: process.arch,
      electronBinary: "devDependency electron",
      output: {
        relativePath: "Project Space Ω/Proyek Baru.lfa.json",
        sha256: projectSha256,
        bytes: Buffer.byteLength(savedRaw),
      },
    },
    null,
    2,
  ),
  "utf8",
);

if (failed.length > 0) {
  throw new Error(
    `SLC-010-001 failed assertions: ${failed
      .map(([name]) => name)
      .join(", ")}`,
  );
}

console.log(JSON.stringify(summary, null, 2));
