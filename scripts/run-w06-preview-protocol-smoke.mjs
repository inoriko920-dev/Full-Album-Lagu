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
    }, 90_000);
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
  const after = await Promise.all(audioPaths.map(fingerprint));
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error("Preview audio process modified source file fingerprints.");
  }
  console.log("T11-W06-02 packaged Windows audio decode PASS");
  console.log(JSON.stringify({ ...launch, report }, null, 2));
}

await main();
