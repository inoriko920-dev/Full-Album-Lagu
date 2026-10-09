import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const evidenceRoot = resolve("artifacts", "step11", "T11-W06-07", "evidence");
const audioEvidence = resolve(
  "artifacts",
  "step11",
  "T11-W06-02",
  "evidence",
  "WIN_PACKAGED_PREVIEW_AUDIO.json",
);
const handleEvidence = resolve(
  "artifacts",
  "step11",
  "T11-W06-02",
  "evidence",
  "WIN_RENDERER_HANDLES.json",
);
const editorEvidence = resolve(
  "artifacts",
  "step11",
  "T11-W06-05",
  "evidence",
  "T05_WINDOWS_UI_SUMMARY.json",
);
const zipFilename = "Lagu-Full-Album-0.0.0-foundation-windows-x64.zip";
const zipPath = resolve("artifacts", zipFilename);
const checksumPath = resolve("artifacts", "SHA256SUMS.txt");
const executable = resolve("out", "win-unpacked", "Lagu Full Album.exe");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function demand(condition, description) {
  if (!condition) {
    throw new Error(
      `T07 automated acceptance evidence invalid: ${description}`,
    );
  }
}

const checks = [];

function record(name, evidence, condition) {
  demand(condition, name);
  checks.push({ name, status: "PASS_AUTOMATED", evidence });
}

async function validate() {
  demand(
    process.platform === "win32",
    "a genuine Windows CI runner is required",
  );

  const [audio, handles, editor, zip, sums, exe] = await Promise.all([
    readJson(audioEvidence),
    readJson(handleEvidence),
    readJson(editorEvidence),
    readFile(zipPath),
    readFile(checksumPath, "utf8"),
    stat(executable),
  ]);

  record(
    "Native packaged MP3/WAV decode, playback, seek and trusted byte ranges",
    "WIN_PACKAGED_PREVIEW_AUDIO.json",
    audio.success === true &&
      ["mp3", "wav"].every((kind) => {
        const track = audio[kind];
        return (
          track?.decoded === true &&
          track.nativePlayback === true &&
          track.range206 === true &&
          track.range416 === true &&
          track.crossProjectBlocked === true &&
          Number.isFinite(track.playbackProgressMs) &&
          track.playbackProgressMs >= 25 &&
          Number.isFinite(track.seekPositionMs) &&
          track.seekPositionMs >= 0
        );
      }),
  );

  record(
    "Decoder rejection and non-destructive private audio lifecycle",
    "WIN_PACKAGED_PREVIEW_AUDIO.json",
    audio.driver?.corruptSourceBlocked === true &&
      audio.driver.unsupportedFileRejected === true &&
      audio.driver.relinkRevoked === true &&
      audio.driver.projectSwitchStopped === true &&
      audio.driver.closeStopped === true &&
      audio.driver.simulatedSuspendRevoked === true &&
      audio.driver.resumeStayedStopped === true &&
      audio.driver.explicitlyReauthorizedPlayback === true,
  );

  record(
    "Real decoded 440 Hz FFT, silence and Pause/Stop zero state",
    "WIN_PACKAGED_PREVIEW_AUDIO.json",
    audio.spectrum?.tone440HzDetected === true &&
      audio.spectrum.silenceNearZero === true &&
      audio.spectrum.pauseZero === true &&
      audio.spectrum.stopZero === true &&
      audio.spectrum.tonePeak >= 0.15 &&
      audio.spectrum.silencePeak <= 0.04,
  );

  record(
    "300 real packaged WAV restart cycles with cleanup and unchanged project",
    "WIN_PACKAGED_PREVIEW_AUDIO.json",
    audio.driver?.restartStress?.completedCycles === 300 &&
      audio.driver.restartStress.allMediaReleased === true &&
      audio.driver.restartStress.projectUnchanged === true &&
      audio.driver.restartStress.rounds?.length === 3 &&
      audio.driver.restartStress.rounds.every(
        (round) => round.completedCycles === 100,
      ),
  );

  record(
    "Windows memory/handle samples (not leak-free)",
    "WIN_PACKAGED_PREVIEW_AUDIO.json; WIN_RENDERER_HANDLES.json",
    audio.t06RendererMemory?.source ===
      "Electron app.getAppMetrics / Windows OS" &&
      audio.t06RendererMemory.idleAfterStop?.length === 3 &&
      handles.source ===
        "Windows Get-Process HandleCount (external CI harness)" &&
      handles.pid === audio.t06RendererMemory.baseline?.pid &&
      handles.activeCount >= 8 &&
      handles.idleCount >= 3,
  );

  demand(editor.task === "T11-W06-05", "prior editor probe identity");
  demand(editor.status === "PASS", "prior editor probe summary status");
  demand(editor.results?.length === 2, "both editor track counts");
  for (const count of [3, 128]) {
    const item = editor.results.find((result) => result.trackCount === count);
    demand(
      item?.success === true &&
        item.realPackagedUi === true &&
        item.sourceFilesUnchanged === true &&
        typeof item.screenshot === "string" &&
        item.screenshot.length > 0,
      `${count}-track editor, source immutability and screenshot evidence`,
    );
    const png = await readFile(item.screenshot);
    record(
      `${count}-track packaged editor and real screenshot`,
      `T05_WINDOWS_UI_SUMMARY.json / ${count}-track PNG`,
      png.length > 5000 &&
        png
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    );
  }

  const expectedSum = sums.trim().match(/^([0-9a-f]{64}) {2}(.+\.zip)$/);
  record(
    "Portable Windows folder ZIP and exact SHA-256 checksum",
    "artifacts/SHA256SUMS.txt; foundation Windows x64 ZIP",
    exe.isFile() &&
      exe.size > 0 &&
      zip.length > 4 &&
      zip.subarray(0, 2).toString("ascii") === "PK" &&
      expectedSum !== null &&
      expectedSum[2] === zipFilename &&
      createHash("sha256").update(zip).digest("hex") === expectedSum[1],
  );

  const result = {
    task: "T11-W06-07",
    stage: "automated-evidence-consolidation",
    source: "GitHub Actions Windows packaged executable and CI test artifacts",
    automatedGate: "PASS",
    checks,
    acceptanceMatrix: "AC-W11-06-01..20 needs per-AC final signoff",
    physicalGates: [
      "Actual audible sound through physical speakers/headphones (AC04)",
      "Real hardware suspend/resume and multi-hour resource plateau (AC15/18)",
      "25 real Windows picker UI interactions",
      "User/device portable playback signoff and final 20-AC closure (AC20)",
    ].map((requirement) => ({ requirement, status: "NOT_TESTED" })),
    waveClosure: "BLOCKED_PHYSICAL_VALIDATION",
    releaseAuthorized: false,
    mp4Available: false,
  };
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(
    resolve(evidenceRoot, "T07_WINDOWS_AUTOMATED_ACCEPTANCE.json"),
    JSON.stringify(result, null, 2) + "\n",
    "utf8",
  );
  console.log(
    `T11-W06-07 automated evidence PASS (${checks.length} checks); physical gates NOT_TESTED; NO RELEASE`,
  );
}

await validate();
