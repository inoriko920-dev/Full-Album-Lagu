import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve("artifacts", "step11", "T11-W06-02");
const fixtures = join(root, "fixtures");
const evidence = join(root, "evidence", "WIN_PACKAGED_PREVIEW_AUDIO.json");
const executable = resolve("out", "win-unpacked", "Lagu Full Album.exe");

async function fingerprint(path) {
  const [bytes, metadata] = await Promise.all([readFile(path), stat(path)]);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: metadata.size,
    mtimeMs: metadata.mtimeMs,
  };
}

/** Self-generated deterministic mono PCM tone/silence; no external music. */
function synthesizePcmWav(hz = 0, seconds = 2) {
  const rate = 44_100;
  const samples = rate * seconds;
  const output = Buffer.allocUnsafe(44 + samples * 2);
  output.write("RIFF", 0);
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WAVEfmt ", 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(rate, 24);
  output.writeUInt32LE(rate * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36);
  output.writeUInt32LE(samples * 2, 40);
  for (let sample = 0; sample < samples; sample += 1) {
    const value =
      hz === 0
        ? 0
        : Math.round(13_107 * Math.sin((2 * Math.PI * hz * sample) / rate));
    output.writeInt16LE(value, 44 + sample * 2);
  }
  return output;
}

async function prepareAudioFiles() {
  const contents = await readFile(
    resolve("tests", "fixtures", "synthetic-audio-fixtures.ts"),
    "utf8",
  );
  await mkdir(fixtures, { recursive: true });
  const paths = [];
  for (const [index, kind] of ["wav", "mp3"].entries()) {
    const match = contents.match(new RegExp(`\\b${kind}: "([A-Za-z0-9+/=]+)"`));
    if (match?.[1] === undefined) {
      throw new Error(`Missing synthetic ${kind} audio fixture`);
    }
    const path = join(fixtures, `${index + 1} Test Silence.${kind}`);
    await writeFile(path, Buffer.from(match[1], "base64"));
    paths.push(path);
  }
  for (const [name, hz] of [
    ["T04 Tone 440Hz.wav", 440],
    ["T04 Silence 2s.wav", 0],
  ]) {
    const path = join(fixtures, name);
    await writeFile(path, synthesizePcmWav(hz));
    paths.push(path);
  }
  // Must be discovered as a WAV, but fail the genuine main-owned parser.
  const corrupt = join(fixtures, "T06 Corrupt Audio.wav");
  await writeFile(corrupt, Buffer.from("This is not a RIFF WAVE audio file."));
  paths.push(corrupt);
  // Discovery accepts this root, while intake must exclude non-audio assets.
  const unsupported = join(fixtures, "T06 Unsupported Notes.txt");
  await writeFile(unsupported, Buffer.from("Not a supported audio file."));
  paths.push(unsupported);
  return paths;
}

async function launchPackaged(paths) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      executable,
      [
        "--w06-probe=decode",
        `--w06-evidence=${evidence}`,
        `--w06-user-data=${join(root, "user-data")}`,
        ...paths.map((path) => `--w11-media-file=${path}`),
        `--w11-relink-file=${paths[0]}`,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          LFA_W06_TEST: "1",
          ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
        },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      rejectRun(new Error("Timed out waiting for packaged audio decoder"));
    }, 180_000);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        rejectRun(
          new Error(
            `Packaged audio probe failed (exit ${code}): ${stderr.slice(-2500)} ${stdout.slice(-1500)}`,
          ),
        );
        return;
      }
      resolveRun({ stdout: stdout.slice(-500), stderr: stderr.slice(-500) });
    });
  });
}

async function main() {
  if (process.platform !== "win32") {
    throw new Error("Real packaged codec smoke must run on Windows.");
  }
  const audioPaths = await prepareAudioFiles();
  await mkdir(join(root, "user-data"), { recursive: true });
  const before = await Promise.all(audioPaths.map(fingerprint));
  const launch = await launchPackaged(audioPaths);
  const report = JSON.parse(await readFile(evidence, "utf8"));
  if (!report.success || !report.wav?.decoded || !report.mp3?.decoded) {
    throw new Error("Packaged Windows failed MP3/WAV preview decoding.");
  }
  for (const [index, kind] of ["wav", "mp3"].entries()) {
    const result = report[kind];
    const expectedBytes = before[index]?.size;
    if (
      !Number.isSafeInteger(result?.streamedBytes) ||
      result.streamedBytes <= 0 ||
      result.streamedBytes !== expectedBytes ||
      result.range206 !== true ||
      result.range416 !== true ||
      result.crossProjectBlocked !== true ||
      result.nativePlayback !== true ||
      !Number.isFinite(result.playbackProgressMs) ||
      result.playbackProgressMs < 25 ||
      !Number.isFinite(result.seekPositionMs) ||
      result.seekPositionMs < 0
    ) {
      throw new Error(
        `Invalid real ${kind} stream proof: ${result?.streamedBytes} vs ${expectedBytes}`,
      );
    }
  }
  if (
    report.driver?.corruptSourceBlocked !== true ||
    report.driver?.unsupportedFileRejected !== true ||
    report.driver?.mainIssuedGrant !== true ||
    report.driver?.pauseSeekNextPrevious !== true ||
    report.driver?.relinkRevoked !== true ||
    report.driver?.realMainRelinkAuthorized !== true ||
    report.driver?.unrelatedAssetDenied !== true ||
    report.driver?.projectSwitchStopped !== true ||
    report.driver?.closeStopped !== true ||
    report.driver?.createdElements < 4 ||
    report.driver?.restartStress?.completedCycles !== 100 ||
    report.driver?.restartStress?.createdElements !== 100 ||
    report.driver?.restartStress?.allMediaReleased !== true ||
    report.driver?.restartStress?.projectUnchanged !== true ||
    !Number.isFinite(report.driver?.restartStress?.elapsedMs) ||
    report.driver?.restartStress?.elapsedMs <= 0
  ) {
    throw new Error("Real packaged T03 HtmlMediaPlaybackDriver proof failed.");
  }
  if (
    report.spectrum?.tone440HzDetected !== true ||
    report.spectrum?.silenceNearZero !== true ||
    report.spectrum?.pauseZero !== true ||
    report.spectrum?.stopZero !== true ||
    report.spectrum?.sourceIdentity === false ||
    report.spectrum?.tonePeak < 0.15 ||
    report.spectrum?.silencePeak > 0.04
  ) {
    throw new Error("Real packaged Windows FFT tone/silence proof failed.");
  }
  const memory = report.t06RendererMemory;
  if (
    memory?.source !== "Electron app.getAppMetrics / Windows OS" ||
    memory?.units !== "KiB" ||
    memory?.baseline?.pid !== memory?.afterAllProbes?.pid ||
    !Number.isSafeInteger(memory?.baseline?.workingSetKiB) ||
    memory.baseline.workingSetKiB <= 0 ||
    !Number.isSafeInteger(memory?.afterAllProbes?.workingSetKiB) ||
    memory.afterAllProbes.workingSetKiB <= 0 ||
    !Number.isSafeInteger(memory?.afterAllProbes?.peakWorkingSetKiB) ||
    memory.afterAllProbes.peakWorkingSetKiB <
      memory.afterAllProbes.workingSetKiB
  ) {
    throw new Error("T06 real Windows renderer memory measurement unavailable");
  }
  const after = await Promise.all(audioPaths.map(fingerprint));
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error("Preview audio process modified source file fingerprints.");
  }
  console.log("T11-W06-02 packaged Windows audio decode PASS");
  console.log("T11-W06-06 packaged 100-cycle real WAV playback PASS");
  console.log(JSON.stringify({ ...launch, report }, null, 2));
}

await main();
