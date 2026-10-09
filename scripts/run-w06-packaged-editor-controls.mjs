import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve("artifacts", "step11", "T11-W06-05");
const executable = resolve("out", "win-unpacked", "Lagu Full Album.exe");

function makeWav(frequency, durationSeconds = 4) {
  const sampleRate = 8000;
  const sampleCount = sampleRate * durationSeconds;
  const result = Buffer.alloc(44 + sampleCount * 2);
  result.write("RIFF", 0, "ascii");
  result.writeUInt32LE(result.length - 8, 4);
  result.write("WAVEfmt ", 8, "ascii");
  result.writeUInt32LE(16, 16);
  result.writeUInt16LE(1, 20);
  result.writeUInt16LE(1, 22);
  result.writeUInt32LE(sampleRate, 24);
  result.writeUInt32LE(sampleRate * 2, 28);
  result.writeUInt16LE(2, 32);
  result.writeUInt16LE(16, 34);
  result.write("data", 36, "ascii");
  result.writeUInt32LE(sampleCount * 2, 40);
  for (let i = 0; i < sampleCount; i++) {
    result.writeInt16LE(
      Math.round(10000 * Math.sin((2 * Math.PI * frequency * i) / sampleRate)),
      44 + i * 2,
    );
  }
  return result;
}

async function fingerprint(file) {
  const bytes = await readFile(file);
  const metadata = await stat(file);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: metadata.size,
    mtimeMs: metadata.mtimeMs,
  };
}

async function testAlbum(count) {
  const fixtureDir = join(root, "fixtures", String(count));
  const evidenceDir = join(root, "evidence");
  const userDataDir = join(root, "user-data", String(count));
  await Promise.all(
    [fixtureDir, evidenceDir, userDataDir].map((dir) =>
      mkdir(dir, { recursive: true }),
    ),
  );
  const files = [];
  for (let i = 1; i <= count; i++) {
    const file = join(fixtureDir, String(i).padStart(3, "0") + " WAV Test.wav");
    await writeFile(file, makeWav(220 + i));
    files.push(file);
  }
  const before = await Promise.all(files.map(fingerprint));
  const evidenceName = "WINDOWS_PACKAGED_EDITOR_" + count + ".json";
  const evidence = join(evidenceDir, evidenceName);
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      executable,
      [
        "--w06-probe=editor",
        "--w06-evidence=" + evidence,
        "--w06-expected-tracks=" + count,
        "--w06-user-data=" + userDataDir,
        ...files.map((file) => "--w11-media-file=" + file),
      ],
      {
        cwd: process.cwd(),
        windowsHide: true,
        env: {
          ...process.env,
          LFA_W06_TEST: "1",
          ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      const message = "T05 packaged editor " + count + " tracks timed out";
      rejectRun(new Error(message));
    }, 160_000);
    child.stdout.on("data", (part) => {
      output = (output + String(part)).slice(-9000);
    });
    child.stderr.on("data", (part) => {
      output = (output + String(part)).slice(-9000);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectRun(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const message = [
          "Packaged editor",
          count,
          "tracks exit",
          code,
          output,
        ].join(" ");
        rejectRun(new Error(message));
      } else {
        resolveRun();
      }
    });
  });
  const report = JSON.parse(await readFile(evidence, "utf8"));
  if (
    report.success !== true ||
    report.expectedTracks !== count ||
    report.imported?.tracks !== count ||
    report.frozenShellPresent !== true ||
    report.lastTrackSelected !== true ||
    report.dedicatedSeekSliderPresent !== false ||
    report.seekViaTimelineVerified !== true ||
    report.disabledSeekRejected !== true ||
    report.seekDidNotDirtyProject !== true ||
    report.seekSeconds !== (count - 2) * 4 + 2 ||
    !(report.resumedSeekSeconds >= report.seekSeconds - 1) ||
    report.appliedFrozenSpectrumTemplate !== true ||
    report.liveProgressVerified !== true ||
    report.pausedSpectrumZero !== true ||
    report.capturedWhilePlaying !== true ||
    !(report.liveSpectrumPeakPercent > 2) ||
    !(report.captureSpectrumPeakPercent > 2) ||
    report.capture?.width !== 1600 ||
    report.capture?.height !== 1000 ||
    report.zoom !== "125"
  ) {
    const message = "Incomplete T05 Windows UI evidence for " + count;
    throw new Error(message);
  }
  if ((await stat(evidence + ".png")).size < 5000) {
    throw new Error("Packaged editor screenshot missing or empty");
  }
  const after = await Promise.all(files.map(fingerprint));
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(
      "Source WAV SHA/size/mtime changed during packaged playback",
    );
  }
  return {
    trackCount: count,
    success: true,
    realPackagedUi: true,
    sourceFilesUnchanged: true,
    screenshot: evidence + ".png",
    evidence,
    checks: report.controls,
    packagedTimelineSeek: {
      verified: report.seekViaTimelineVerified,
      seconds: report.seekSeconds,
      resumedSeconds: report.resumedSeekSeconds,
      disabledRejected: report.disabledSeekRejected,
      noDirty: report.seekDidNotDirtyProject,
    },
  };
}

if (process.platform !== "win32") {
  throw new Error("W11-06-05 real packaged UI closure runs on Windows only.");
}

const results = [];
for (const count of [3, 128]) {
  results.push(await testAlbum(count));
}
await writeFile(
  join(root, "evidence", "T05_WINDOWS_UI_SUMMARY.json"),
  JSON.stringify({ task: "T11-W06-05", status: "PASS", results }, null, 2),
  "utf8",
);
console.log("W11-06-05 real packaged editor transport + 128-track UI PASS");
