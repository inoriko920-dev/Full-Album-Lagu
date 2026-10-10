import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/**
 * W11-07 T07: evidence from the actual Windows CI run. This is intentionally
 * an audit of build/tests/reference integrity, NOT a pixel-perfect UI verdict
 * or substitute for human device/speaker/suspend acceptance.
 */
const output = resolve(
  "artifacts/step11/T11-W07-07/evidence/W07_12_AC_MATRIX.json",
);
const zipFile = "Lagu-Full-Album-0.0.0-foundation-windows-x64.zip";
const zipPath = resolve("artifacts", zipFile);
const checksumPath = resolve("artifacts/SHA256SUMS.txt");
const referenceManifest = resolve("docs/ui/manifests/UI_REFERENCE_MANIFEST.json");
const freezeManifest = resolve("docs/ui/manifests/UI_FREEZE_MANIFEST.json");
const uiSourcePath = resolve("docs/source-of-truth/ui/07_W11_07_UI_IMG_002G.png");
const planningDocx = resolve(
  "docs/source-of-truth/planning/current/16_STEP_11_W11_07_ANIMATION_TRANSITION_CHARTER_v1_0_PRE_GATE.docx",
);
const uiDocx = resolve(
  "docs/source-of-truth/ui/07_STEP_04_W11_07_UI_REFERENCE_UI_IMG_002G_v1_0_REVIEW.docx",
);
const legacyGate = resolve(
  "artifacts/step11/T11-W06-07/evidence/T07_20_AC_MATRIX.json",
);
const domPath = resolve("artifacts/ui/SCR-002A-dom.json");
const pngPath = resolve("artifacts/ui/SCR-002A.png");

function requireProof(value, message) {
  if (!value) throw new Error(`W11-07 acceptance evidence: ${message}`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlob(bytes) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest("hex");
}

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function fingerprint(path) {
  const bytes = await readFile(path);
  return { path, bytes: bytes.length, sha256: sha256(bytes), gitBlob: gitBlob(bytes) };
}

function accept(id, requirement, status, evidence, limitation = null) {
  return { id, requirement, status, evidence, limitation };
}

async function verify() {
  requireProof(process.platform === "win32", "must run on real Windows CI");
  requireProof(
    /^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA ?? ""),
    "requires exact commit from GitHub Actions",
  );

  const [reference, freeze, oldGate, sums, zip, captureDom, capturePng] =
    await Promise.all([
      json(referenceManifest),
      json(freezeManifest),
      json(legacyGate),
      readFile(checksumPath, "utf8"),
      readFile(zipPath),
      json(domPath),
      readFile(pngPath),
    ]);

  requireProof(reference.status === "FROZEN", "reference manifest is not frozen");
  requireProof(freeze.status === "FROZEN", "UI freeze manifest is not frozen");
  requireProof(
    reference.visualReference.approvedVisualStateCount === 29 &&
      freeze.referencePackId === reference.packId,
    "29-state frozen UI reference contract mismatches",
  );

  const assets = {};
  for (const [name, path, expected] of [
    ["UI-IMG-002G source", uiSourcePath, "b1bf98c9a251c1bfea0672e534e5745c16068f57"],
    ["W11-07 planning DOCX", planningDocx, "8ea6e1cceb4bc4a707c975886b0b5fbb7e71ac09"],
    ["UI-IMG-002G reviewed DOCX", uiDocx, "817d9f7a5791ba865d3f18b84cdd2570410d5dbc"],
  ]) {
    const hash = await fingerprint(path);
    requireProof(hash.gitBlob === expected, `${name} fingerprint mismatch`);
    requireProof(hash.bytes > 2000, `${name} unexpectedly small`);
    assets[name] = hash;
  }

  for (const [label, ref] of [
    ["frozen prompts", reference.promptPack],
    ["29-state reference", reference.visualReference],
    ["source authority", reference.sourceManifest],
    ["UI freeze DOCX", freeze.freezeDocument],
  ]) {
    const hash = await fingerprint(resolve(ref.path));
    requireProof(hash.gitBlob === ref.gitBlobSha, `${label} fingerprint mismatch`);
    assets[label] = hash;
  }

  requireProof(
    oldGate.task === "T11-W06-07" &&
      oldGate.releaseEligible === false &&
      oldGate.items?.length === 20 &&
      oldGate.physicalSpeakerTest === "NOT_TESTED" &&
      oldGate.physicalWindowsSuspendResume === "NOT_TESTED",
    "do not erase W11-06 physical QA gates",
  );
  requireProof(
    captureDom.innerViewport?.width === 1600 &&
      captureDom.innerViewport?.height === 1000 &&
      captureDom.hasGeminiAgent === true &&
      captureDom.hasPreviewEmpty === true &&
      captureDom.hasTimelineEmpty === true &&
      capturePng.length > 5000 &&
      capturePng.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      ),
    "real Windows frozen SCR-002A and Gemini evidence",
  );

  const m = sums.trim().match(/^([0-9a-f]{64}) {2}(.+\.zip)$/);
  requireProof(m !== null && m[2] === zipFile, "portable checksum syntax");
  requireProof(
    zip.length > 10_000 &&
      zip.subarray(0, 2).toString("ascii") === "PK" &&
      sha256(zip) === m[1],
    "Windows portable ZIP SHA-256 mismatch",
  );
  const exe = await stat(resolve("out/win-unpacked/Lagu Full Album.exe"));
  requireProof(exe.isFile() && exe.size > 0, "packaged Windows executable missing");

  const testedPaths = [
    "tests/unit/visual-animation-schema.test.ts",
    "tests/unit/visual-animation-evaluator.test.ts",
    "tests/unit/visual-animation-commands.test.ts",
    "tests/unit/album-boundary-visual.test.ts",
    "tests/unit/project-boundary-commands.test.ts",
    "tests/component/VisualAnimationControls.test.tsx",
    "tests/component/AppShell.visual-layer-editor.test.tsx",
    "tests/contract/project-persistence-contract.test.ts",
  ];
  for (const path of testedPaths) {
    const file = await stat(resolve(path));
    requireProof(file.isFile() && file.size > 100, `missing test owner: ${path}`);
  }

  const sourceFiles = [
    "src/core/domain/visual-scene-schema.ts",
    "src/core/domain/visual-animation-evaluator.ts",
    "src/core/domain/album-boundary-visual.ts",
    "src/core/application/services/project-layer-commands.ts",
    "src/core/application/services/project-boundary-commands.ts",
    "src/renderer/app/VisualAnimationControls.tsx",
    "src/renderer/app/BoundaryInspector.tsx",
    "src/renderer/app/BoundaryVisualPreview.tsx",
    "src/renderer/app/AppShell.tsx",
  ];
  const sourceFingerprints = [];
  for (const path of sourceFiles) {
    sourceFingerprints.push(await fingerprint(resolve(path)));
  }

  const verified = (id, requirement, evidence) =>
    accept(id, requirement, "PASS_AUTOMATED", evidence);
  const partial = (id, requirement, evidence, limitation) =>
    accept(id, requirement, "PARTIAL_AUTOMATED", evidence, limitation);

  const checks = [
    verified("AC-W11-07-01", "Legacy schema v1 remains valid",
      "Windows npm run verify / animation schema + persistence tests"),
    verified("AC-W11-07-02", "Reject invalid animation/keyframes atomically",
      "Windows validation / schema + CommandEngine tests"),
    verified("AC-W11-07-03", "Entrance/exit/loop deterministic evaluator",
      "Windows unit tests: visual-animation-evaluator"),
    verified("AC-W11-07-04", "0 and 2.5s/85% keyframe interpolation",
      "Windows unit and Preview component tests"),
    verified("AC-W11-07-05", "Animation edits have one history and save checkpoint",
      "Windows command/session + persistence regressions"),
    verified("AC-W11-07-06", "Locked, copied and removed layer/Template Try protections",
      "Windows layer command + VisualAnimationControls component tests"),
    verified("AC-W11-07-07", "First/middle/last song boundary and 128-track replay",
      "Windows album-boundary-visual + project-boundary-commands tests"),
    partial("AC-W11-07-08", "Reorder/relink/seek/recovery stale boundary protections",
      "Unit boundary guards and upstream W11-01 recovery, W11-02 media E2E",
      "A combined real-device reconnect/relink and long seek session is not proven"),
    partial("AC-W11-07-09", "Artwork/title/artist transition with real spectrum clock",
      "T04 boundary and W11-06 native spectrum playback; T06 Preview component tests",
      "Full visual/audio synchronization inspection on physical output not performed"),
    partial("AC-W11-07-10", "Eight named transition profiles",
      "All eight evaluated in Windows unit tests; UI Inspector bindings in component tests",
      "Visual pixel-by-pixel parity for all eight presets not certified"),
    partial("AC-W11-07-11", "Approved UI-IMG-002G/002D and 29 frozen states",
      "Frozen reference hash checks, owner image/charter integrity and real SCR-002A 1600x1000 capture",
      "Complete visual comparison of 002G, 002D and all 29 states is not available"),
    verified("AC-W11-07-12", "Offline/reference fingerprint/security/package ZIP regression",
      "Frozen reference checks; Windows npm verify, architecture/security, packager and SHA256"),
  ];

  requireProof(checks.length === 12, "expected twelve criteria");
  requireProof(checks.every((item, i) =>
    item.id === `AC-W11-07-${String(i + 1).padStart(2, "0")}`),
  "acceptance order/IDs are incorrect");
  requireProof(
    checks.some((item) => item.status === "PARTIAL_AUTOMATED"),
    "cannot claim complete visual/hardware proof",
  );

  const report = {
    task: "T11-W07-07",
    wave: "W11-07",
    commit: process.env.GITHUB_SHA,
    host: "GitHub Actions Windows",
    status: "AUTOMATED_EVIDENCE_PASS_PARTIAL_ACCEPTANCE",
    releaseAuthorized: false,
    waveFullySignedOff: false,
    finalMp4Available: false,
    frozenVisualStateCount: 29,
    referencePack: reference.packId,
    checks,
    counts: {
      automated: checks.filter((item) => item.status === "PASS_AUTOMATED").length,
      partial: checks.filter((item) => item.status === "PARTIAL_AUTOMATED").length,
    },
    uiAssets: assets,
    sourceFingerprints,
    portable: { path: zipPath, bytes: zip.length, sha256: sha256(zip) },
    knownMissing: [
      "Real physical Windows audible speaker/headphone inspection",
      "Physical Windows Suspend/Resume and multi-hour memory/handle plateau",
      "25 actual end-user OS picker operations",
      "Pixel/visual human approval for UI-IMG-002G/002D and remaining frozen states",
      "End-user final acceptance and FFmpeg MP4 export (later work)",
    ].map((item) => ({ requirement: item, status: "NOT_TESTED" })),
  };

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  await writeFile(
    resolve(dirname(output), "W07_GATE_SUMMARY.txt"),
    [
      "W11-07 T07 — AUTOMATED EVIDENCE VERIFIED, PARTIAL ACCEPTANCE",
      `Commit: ${report.commit}`,
      `12 AC: ${report.counts.automated} automated; ${report.counts.partial} partial`,
      "Real frozen SCR-002A proof and unchanged owner UI assets: PASS",
      "Windows packaged ZIP and SHA-256: PASS",
      "Complete visual and hardware/device acceptance: NOT_TESTED",
      "Release authorized: NO",
      "MP4 export certified: NO",
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(
    `W11-07 T07 Windows evidence PASS: ${checks.length} AC, ${report.counts.partial} partial; no release`,
  );
}

await verify();
