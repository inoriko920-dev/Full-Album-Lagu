import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const root = resolve("artifacts", "step11", "T11-W01-02");
const bootstrap = resolve("dist", "main", "bootstrap.cjs");
const evidenceDir = join(root, "evidence");
const fixturesDir = join(root, "fixtures");
const summaryPath = join(root, "TEST_SUMMARY.json");

function project(projectId, name, revision = 0) {
  return {
    schemaVersion: 1,
    projectId,
    name,
    revision,
    tracks: [],
  };
}

async function seed(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function load(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

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
      rejectRun(new Error(`Electron W11 probe timed out: ${args.join(" ")}`));
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
            `Electron W11 probe failed with code ${code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
          ),
        );
        return;
      }
      resolveRun({ stdout, stderr });
    });
  });
}

async function runScenario(name, setup) {
  const scenarioRoot = join(fixturesDir, name, "Project Space Ω");
  const currentPath = join(scenarioRoot, "Current Project Ω.lfa.json");
  const alternatePath = join(
    scenarioRoot,
    "Folder Dengan Spasi Ω",
    "Alternate Project Ω.lfa.json",
  );
  const missingPath = join(
    scenarioRoot,
    "Missing Folder Ω",
    "Missing Project Ω.lfa.json",
  );
  const evidencePath = join(evidenceDir, `${name}.json`);

  const currentProject = project(`current-${name}`, `Current ${name} Ω`);
  const alternateProject = project(
    `alternate-${name}`,
    `Alternate ${name} Ω`,
    4,
  );

  await seed(currentPath, currentProject);
  if (setup.seedAlternate) {
    await seed(alternatePath, alternateProject);
  }

  const args = [
    `--open-project=${currentPath}`,
    `--w11-probe=${setup.mode}`,
    `--w11-evidence=${evidencePath}`,
    ...setup.args({ currentPath, alternatePath, missingPath }),
  ];

  await runElectron(args);

  return {
    currentPath,
    alternatePath,
    missingPath,
    currentProject,
    alternateProject,
    evidence: JSON.parse(await readFile(evidencePath, "utf8")),
  };
}

await rm(root, { recursive: true, force: true });
await mkdir(evidenceDir, { recursive: true });
await mkdir(fixturesDir, { recursive: true });

const knownSave = await runScenario("known-save", {
  mode: "known-save",
  seedAlternate: false,
  args: () => ["--w11-save-as-cancel"],
});
const knownSaveFile = await load(knownSave.currentPath);

const saveAsValid = await runScenario("save-as-valid", {
  mode: "save-as-valid",
  seedAlternate: false,
  args: ({ alternatePath }) => [
    `--w11-save-as-path=${alternatePath}`,
  ],
});
const saveAsValidCurrent = await load(saveAsValid.currentPath);
const saveAsValidAlternate = await load(saveAsValid.alternatePath);

const saveAsCancel = await runScenario("save-as-cancel", {
  mode: "save-as-cancel",
  seedAlternate: false,
  args: () => ["--w11-save-as-cancel"],
});
const saveAsCancelCurrent = await load(saveAsCancel.currentPath);

const openCancel = await runScenario("open-cancel", {
  mode: "open-cancel",
  seedAlternate: false,
  args: () => ["--w11-open-cancel", "--w11-save-as-cancel"],
});
const openCancelCurrent = await load(openCancel.currentPath);

const openValid = await runScenario("open-valid", {
  mode: "open-valid",
  seedAlternate: true,
  args: ({ alternatePath }) => [
    `--w11-open-path=${alternatePath}`,
    "--w11-save-as-cancel",
  ],
});
const openValidCurrent = await load(openValid.currentPath);
const openValidAlternate = await load(openValid.alternatePath);

const openError = await runScenario("open-error", {
  mode: "open-error",
  seedAlternate: false,
  args: ({ missingPath }) => [
    `--w11-open-path=${missingPath}`,
    "--w11-save-as-cancel",
  ],
});
const openErrorCurrent = await load(openError.currentPath);

const assertions = {
  knownPathSaveBypassesSaveAs:
    knownSave.evidence.saveStatus === "saved" &&
    knownSave.evidence.location === "known-path" &&
    knownSaveFile.revision === 1 &&
    knownSaveFile.name === "Known Save Ω",

  saveAsWritesNewPathThenKnownSaveStaysThere:
    saveAsValid.evidence.saveAsStatus === "saved" &&
    saveAsValid.evidence.saveStatus === "saved" &&
    saveAsValidCurrent.revision === 0 &&
    saveAsValidAlternate.revision === 2 &&
    saveAsValidAlternate.name === "Save As Then Save Ω",

  saveAsCancelPreservesCurrentPath:
    saveAsCancel.evidence.saveAsStatus === "cancelled" &&
    saveAsCancel.evidence.saveStatus === "saved" &&
    saveAsCancelCurrent.revision === 1 &&
    saveAsCancelCurrent.name === "After Save As Cancel Ω",

  openCancelPreservesCurrentProject:
    openCancel.evidence.openStatus === "cancelled" &&
    openCancel.evidence.saveStatus === "saved" &&
    openCancelCurrent.revision === 1 &&
    openCancelCurrent.name === "After Open Cancel Ω",

  validOpenMovesKnownPath:
    openValid.evidence.openStatus === "opened" &&
    openValid.evidence.saveStatus === "saved" &&
    openValid.evidence.openedProjectId === openValid.alternateProject.projectId &&
    openValidCurrent.revision === 0 &&
    openValidAlternate.revision === 5 &&
    openValidAlternate.name === "Opened Then Saved Ω",

  openErrorIsSanitizedAndPreservesCurrentPath:
    openError.evidence.openStatus === "error" &&
    openError.evidence.openCode === "PROJECT_NOT_FOUND" &&
    openError.evidence.saveStatus === "saved" &&
    openErrorCurrent.revision === 1 &&
    openErrorCurrent.name === "After Open Error Ω",

  unicodeAndSpacesExercised:
    [
      knownSave.currentPath,
      saveAsValid.alternatePath,
      openValid.alternatePath,
      openError.missingPath,
    ].every((path) => path.includes(" ") && path.includes("Ω")),

  publicEvidenceContainsNoRawPaths:
    [
      knownSave.evidence,
      saveAsValid.evidence,
      saveAsCancel.evidence,
      openCancel.evidence,
      openValid.evidence,
      openError.evidence,
    ].every((item) => !Object.keys(item).some((key) => /path/i.test(key))),
};

const failedAssertions = Object.entries(assertions)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const summary = {
  taskId: "T11-W01-02",
  verdict: failedAssertions.length === 0 ? "PASS" : "FAIL",
  platform: process.platform,
  arch: process.arch,
  node: process.version,
  sourceSha: process.env.SLC_SOURCE_SHA ?? process.env.GITHUB_SHA ?? "local",
  scenarioCount: 6,
  assertions,
  failedAssertions,
  fixturePathPolicy: "spaces + Unicode exercised; raw fixture paths omitted",
};

await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");

if (failedAssertions.length > 0) {
  throw new Error(
    `T11-W01-02 failed assertions: ${failedAssertions.join(", ")}`,
  );
}

console.log(JSON.stringify(summary, null, 2));