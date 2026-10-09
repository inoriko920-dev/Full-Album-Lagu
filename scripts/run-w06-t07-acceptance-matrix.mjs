import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// T07 is an evidence gate, not a substitute for listening on real hardware.
// Never silently convert physical NOT_TESTED into PASS based on green CI.
const decoderPath = resolve(
  "artifacts/step11/T11-W06-02/evidence/WIN_PACKAGED_PREVIEW_AUDIO.json",
);
const uiPath = resolve(
  "artifacts/step11/T11-W06-05/evidence/T05_WINDOWS_UI_SUMMARY.json",
);
const output = resolve(
  "artifacts/step11/T11-W06-07/evidence/T07_20_AC_MATRIX.json",
);

const requireEvidence = (condition, message) => {
  if (!condition) throw new Error(`T07 evidence failure: ${message}`);
};

const [decoder, ui] = await Promise.all(
  [decoderPath, uiPath].map(async (file) => {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    requireEvidence(parsed && typeof parsed === "object", file);
    return parsed;
  }),
);
requireEvidence(decoder.success === true, "packaged decoder");
for (const codec of ["wav", "mp3"]) {
  const audio = decoder[codec];
  requireEvidence(
    audio?.nativePlayback === true &&
      audio?.decoded === true &&
      audio?.range206 === true &&
      audio?.range416 === true &&
      audio?.crossProjectBlocked === true &&
      audio?.playbackProgressMs >= 25,
    `packaged ${codec} playback or private protocol`,
  );
}
requireEvidence(
  decoder.spectrum?.tone440HzDetected === true &&
    decoder.spectrum?.silenceNearZero === true &&
    decoder.spectrum?.pauseZero === true &&
    decoder.spectrum?.stopZero === true &&
    decoder.spectrum?.sourceIdentity === true,
  "real decoded-audio FFT",
);
const driver = decoder.driver;
requireEvidence(
  driver?.corruptSourceBlocked === true &&
    driver?.unsupportedFileRejected === true &&
    driver?.mainIssuedGrant === true &&
    driver?.pauseSeekNextPrevious === true &&
    driver?.relinkRevoked === true &&
    driver?.realMainRelinkAuthorized === true &&
    driver?.unrelatedAssetDenied === true &&
    driver?.projectSwitchStopped === true &&
    driver?.closeStopped === true &&
    driver?.simulatedSuspendRevoked === true &&
    driver?.resumeStayedStopped === true &&
    driver?.explicitlyReauthorizedPlayback === true,
  "trust lifecycle, invalid media or simulated power recovery",
);
requireEvidence(
  driver.restartStress?.completedCycles === 300 &&
    driver.restartStress?.createdElements === 300 &&
    driver.restartStress?.allMediaReleased === true &&
    driver.restartStress?.projectUnchanged === true,
  "300 native packaged WAV Play/Stop cycles",
);
requireEvidence(
  decoder.t06RendererMemory?.idleAfterStop?.length === 3,
  "actual Windows renderer post-stop memory snapshots",
);
requireEvidence(
  ui?.task === "T11-W06-05" &&
    ui?.status === "PASS" &&
    Array.isArray(ui.results) &&
    ui.results.length === 2,
  "approved editor UI summary",
);
for (const tracks of [3, 128]) {
  const item = ui.results.find((entry) => entry.trackCount === tracks);
  requireEvidence(
    item?.success === true &&
      item?.realPackagedUi === true &&
      item?.sourceFilesUnchanged === true &&
      Array.isArray(item?.checks) &&
      item.checks.includes("Play") &&
      item.checks.includes("Pause") &&
      item.checks.includes("Next") &&
      item.checks.includes("Previous") &&
      item.checks.includes("Mute"),
    `packaged editor ${tracks}-track playback evidence`,
  );
}

// Strict distinction: implementation, CI proof and HUMAN/physical validation.
const verified = (id, proof) => ({
  id,
  status: "VERIFIED",
  scope: "AUTOMATED_WINDOWS_CI_ONLY",
  proof,
});
const partial = (id, proof, missing) => ({
  id,
  status: "IMPLEMENTED",
  scope: "PARTIAL_AUTOMATED",
  proof,
  missing,
});
const withheld = (id, reason) => ({
  id,
  status: "NOT_TESTED",
  scope: "PHYSICAL_OR_FINAL_VALIDATION",
  reason,
});

const items = [
  partial("AC-W11-06-01", "Main-authorized import, disabled/untrusted playback checks", "Missing-file interaction on physical Windows"),
  partial("AC-W11-06-02", "Canonical projectAlbumTimeline unit and editor CI", "Independent end-user order observation"),
  partial("AC-W11-06-03", "One canonical album time mapper and no persisted playlist", "Final human project inspection"),
  withheld("AC-W11-06-04", "Actual speaker-audible MP3/WAV playback and physical Stop/Resume require device validation"),
  verified("AC-W11-06-05", "Packaged seek + editor track-boundary controls"),
  verified("AC-W11-06-06", "Packaged Next skips disabled track; controller Ended regressions"),
  partial("AC-W11-06-07", "Active playback metadata resolver component regressions", "Final human visual metadata check"),
  verified("AC-W11-06-08", "Real Windows timecode, pause, frozen progress and live playhead"),
  verified("AC-W11-06-09", "Real decoded 440Hz/silence FFT and pause/stop zero"),
  verified("AC-W11-06-10", "Playback project history and source fingerprint assertions"),
  verified("AC-W11-06-11", "Malformed WAV and unsupported file fail closed in packaged Windows"),
  verified("AC-W11-06-12", "Main scoped grant; invalid project, asset and stale token rejection"),
  verified("AC-W11-06-13", "Bounded stream 206/416, large sparse range unit regressions"),
  verified("AC-W11-06-14", "100 delayed grants and generation-guard security regressions"),
  partial("AC-W11-06-15", "Native Stop/Close, relink and simulated Suspend cleanup", "Actual Windows Suspend/Resume + full project recovery on real hardware"),
  verified("AC-W11-06-16", "Approved spectrum and progress layer visualization preserved"),
  verified("AC-W11-06-17", "Frozen editor UI/preview, permanent Gemini rail and 1600×1000 screen"),
  withheld("AC-W11-06-18", "128 tracks and 300 start/stop are automated, but prolonged bounded Windows memory/handles require final device stress"),
  verified("AC-W11-06-19", "Upstream CI validates prior waves, frozen UI, integrity and architecture before this step"),
  withheld("AC-W11-06-20", "Physical audio speaker and complete 20-AC portable final DoD not yet signed off"),
];

requireEvidence(items.length === 20, "exactly 20 numbered acceptance criteria");
requireEvidence(
  items.some((row) => row.status === "NOT_TESTED") &&
    items.every((row, index) => row.id.endsWith(String(index + 1).padStart(2, "0"))),
  "never waive final physical gates",
);

const counts = Object.fromEntries(
  ["VERIFIED", "IMPLEMENTED", "NOT_TESTED"].map((status) => [
    status,
    items.filter((item) => item.status === status).length,
  ]),
);
const report = {
  task: "T11-W06-07",
  wave: "W11-06",
  status: "BLOCKED",
  releaseEligible: false,
  physicalSpeakerTest: "NOT_TESTED",
  physicalWindowsSuspendResume: "NOT_TESTED",
  multiHourMemoryAndHandles: "NOT_TESTED",
  noFinalMp4ExportClaim: true,
  commit: process.env.GITHUB_SHA ?? "local",
  baselineEvidence: {
    decoder: decoderPath,
    editor: uiPath,
    packagedTrackCounts: [3, 128],
    realWavPlayStopCycles: 300,
    codecs: ["MP3", "WAV"],
  },
  counts,
  items,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(
  `T07 acceptance evidence created: ${items.length} AC; VERIFIED ${counts.VERIFIED}, IMPLEMENTED ${counts.IMPLEMENTED}, NOT_TESTED ${counts.NOT_TESTED}. Final release BLOCKED.`,
);
