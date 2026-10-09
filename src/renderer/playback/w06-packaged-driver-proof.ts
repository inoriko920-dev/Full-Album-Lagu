import type { ProjectDocument } from "../../core/domain/project-document";
import {
  HtmlMediaPlaybackDriver,
  type PreviewAudioRequester,
} from "./html-media-playback-driver";
import { runW06SpectrumProof } from "./w06-packaged-spectrum-proof";

interface W06Evidence {
  readonly corruptSourceBlocked: true;
  readonly unsupportedFileRejected: true;
  readonly mainIssuedGrant: true;
  readonly pauseSeekNextPrevious: true;
  readonly relinkRevoked: true;
  readonly realMainRelinkAuthorized: true;
  readonly unrelatedAssetDenied: true;
  readonly projectSwitchStopped: true;
  readonly closeStopped: true;
  readonly simulatedSuspendRevoked: true;
  readonly resumeStayedStopped: true;
  readonly explicitlyReauthorizedPlayback: true;
  readonly createdElements: number;
  readonly restartStress: {
    readonly completedCycles: number;
    readonly createdElements: number;
    readonly elapsedMs: number;
    readonly rounds: readonly {
      readonly completedCycles: 100;
      readonly createdElements: 100;
      readonly elapsedMs: number;
    }[];
    readonly allMediaReleased: true;
    readonly projectUnchanged: true;
  };
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(
  driver: HtmlMediaPlaybackDriver,
  phase: "playing" | "paused",
  trackId: string,
): Promise<void> {
  const expires = Date.now() + 4000;
  while (Date.now() < expires) {
    const current = driver.snapshot;
    if (current.phase === "error" || current.phase === "blocked") {
      throw new Error("Packaged driver error: " + current.phase);
    }
    if (current.phase === phase && current.activeTrackId === trackId) return;
    await delay(10);
  }
  throw new Error("Packaged driver timed out: " + phase + " " + trackId);
}

function requirePhase(
  driver: HtmlMediaPlaybackDriver,
  expected: "ready" | "paused" | "error",
): void {
  if (driver.snapshot.phase !== expected) {
    throw new Error("Expected playback phase " + expected);
  }
}

/**
 * T06 packaged-Windows stress: use 2-second native WAV decoder/protocol media
 * and the same real HTMLMediaPlaybackDriver in three separate rounds of 100 start/stop cycles.
 * Avoid mock audio, synthetic grant URLs or renderer filesystem privileges.
 */
async function run300PackagedRestarts(
  imported: ProjectDocument,
  batchId: string,
  requestPreview: PreviewAudioRequester,
): Promise<W06Evidence["restartStress"]> {
  const tone = imported.mediaAssets?.find(
    (asset) =>
      asset.availability === "ready" && asset.fileName === "T04 Tone 440Hz.wav",
  );
  if (!tone) throw new Error("T06 real stress tone WAV was not imported");
  const project: ProjectDocument = {
    ...imported,
    tracks: [
      {
        id: "stress-track",
        title: "T06 Real Restart Stress",
        audioAssetId: tone.id,
        sourcePath: tone.sourcePath,
      },
    ],
  };
  const original = JSON.stringify(project);
  // Do NOT retain hundreds of stopped Audio references in the probe:
  // retaining them would itself distort any process-memory leak analysis.
  const currentMedia: { element?: HTMLAudioElement } = {};
  let createdElements = 0;
  const driver = new HtmlMediaPlaybackDriver(
    project,
    { projectId: project.projectId, batchId },
    requestPreview,
    () => {
      const audio = new Audio();
      audio.muted = true;
      currentMedia.element = audio;
      createdElements += 1;
      return audio;
    },
  );
  const startedAt = performance.now();
  const rounds: Array<{
    completedCycles: 100;
    createdElements: 100;
    elapsedMs: number;
  }> = [];
  try {
    for (let round = 0; round < 3; round += 1) {
      const beforeRound = createdElements;
      const roundStartedAt = performance.now();
      for (let cycle = 0; cycle < 100; cycle += 1) {
        delete currentMedia.element;
        driver.play();
        await waitFor(driver, "playing", "stress-track");
        const element = currentMedia.element;
        if (!element || createdElements !== beforeRound + cycle + 1) {
          throw new Error("T06 unexpected media instance at cycle " + cycle);
        }
        driver.stop();
        requirePhase(driver, "ready");
        if (!element.paused || element.hasAttribute("src")) {
          throw new Error("T06 audio survived Stop at cycle " + cycle);
        }
        // No outstanding strong references across the next cycle.
        delete currentMedia.element;
      }
      if (
        createdElements !== beforeRound + 100 ||
        JSON.stringify(project) !== original
      ) {
        throw new Error("T06 restart round leaked playback or mutated project");
      }
      rounds.push({
        completedCycles: 100,
        createdElements: 100,
        elapsedMs: Math.round(performance.now() - roundStartedAt),
      });
      // Give Chromium decoder teardown and process-memory sampling a chance
      // to run between rounds. Do not assert garbage collection took place.
      await delay(75);
    }
    requirePhase(driver, "ready");
    if (createdElements !== 300 || rounds.length !== 3) {
      throw new Error("T06 300-cycle real WAV stress was incomplete");
    }
    return {
      completedCycles: 300,
      createdElements,
      elapsedMs: Math.round(performance.now() - startedAt),
      rounds,
      allMediaReleased: true,
      projectUnchanged: true,
    };
  } finally {
    delete currentMedia.element;
    driver.close();
  }
}

async function run(
  imported: ProjectDocument,
  batchId: string,
): Promise<W06Evidence> {
  const wav = imported.mediaAssets?.find(
    (asset) =>
      asset.availability === "ready" &&
      asset.fileName.toLowerCase().endsWith(".wav"),
  );
  const mp3 = imported.mediaAssets?.find(
    (asset) =>
      asset.availability === "ready" &&
      asset.fileName.toLowerCase().endsWith(".mp3"),
  );
  if (!wav || !mp3) throw new Error("No trusted WAV/MP3 imported for driver");
  const project: ProjectDocument = {
    ...imported,
    tracks: [wav, mp3].map((asset, i) => ({
      id: "probe-track-" + i,
      title: "Probe Track " + i,
      audioAssetId: asset.id,
      sourcePath: asset.sourcePath,
    })),
  };
  const trusted = { projectId: project.projectId, batchId };
  const requestPreview = window.lfa.requestAudioPreview;
  if (typeof requestPreview !== "function") {
    throw new Error("Main-owned audio preview bridge is unavailable");
  }
  // Main's completed batch report is the authority for rejected files.
  // An unsupported file is deliberately absent from ProjectDocument, even
  // though it was discovered and probed by the real packaged Windows intake.
  const intake = await window.lfa.getMediaIntakeStatus(batchId);
  if (intake.status !== "completed") {
    throw new Error("T06 completed import evidence is unavailable");
  }
  const corruptReport = intake.summary.items.find(
    (item) => item.fileName === "T06 Corrupt Audio.wav",
  );
  const unsupportedReport = intake.summary.items.find(
    (item) => item.fileName === "T06 Unsupported Notes.txt",
  );
  if (
    !corruptReport ||
    !["invalid", "unsupported"].includes(corruptReport.status) ||
    unsupportedReport?.status !== "unsupported"
  ) {
    throw new Error(
      "T06 expected rejected media evidence: " +
        JSON.stringify({
          corrupt: corruptReport,
          unsupported: unsupportedReport,
        }),
    );
  }
  if (
    imported.mediaAssets?.some(
      (asset) =>
        (asset.fileName === "T06 Corrupt Audio.wav" ||
          asset.fileName === "T06 Unsupported Notes.txt") &&
        asset.availability === "ready",
    )
  ) {
    throw new Error("T06 rejected fixture incorrectly became playable audio");
  }
  const deniedCorrupt = await requestPreview({
    projectId: imported.projectId,
    batchId,
    assetId: corruptReport.assetId ?? "t06-rejected-media-without-asset",
  });
  if (deniedCorrupt.status !== "blocked") {
    throw new Error("T06 corrupt WAV received a private playback lease");
  }

  const restartStress = await run300PackagedRestarts(
    imported,
    batchId,
    (request) => requestPreview(request),
  );
  const audioElements: HTMLAudioElement[] = [];
  const driver = new HtmlMediaPlaybackDriver(
    project,
    trusted,
    (request) => requestPreview(request),
    () => {
      const audio = new Audio();
      audio.muted = true;
      audioElements.push(audio);
      return audio;
    },
    () => undefined,
    Date.now,
    (handler) =>
      window.lfa.onPlaybackPowerChange?.(handler) ?? (() => undefined),
  );
  try {
    driver.play();
    await waitFor(driver, "playing", "probe-track-0");
    driver.pause();
    requirePhase(driver, "paused");

    driver.seek(100);
    await waitFor(driver, "paused", "probe-track-0");
    if (Math.abs(driver.snapshot.localTimeMs - 100) > 10) {
      throw new Error("Driver Seek position invalid");
    }
    driver.next();
    await waitFor(driver, "paused", "probe-track-1");
    driver.previous();
    await waitFor(driver, "paused", "probe-track-0");

    driver.play();
    await waitFor(driver, "playing", "probe-track-0");

    // A real OS-picker-backed relink in Electron main must reauthorize ONLY
    // the replacement WAV. Persisted project paths never mint a token.
    const oldGrant = await requestPreview({
      projectId: project.projectId,
      batchId,
      assetId: wav.id,
    });
    if (oldGrant.status !== "granted") {
      throw new Error("Original trusted WAV grant unavailable");
    }
    const relink = await window.lfa.relinkMediaAsset({
      project,
      assetId: wav.id,
    });
    if (relink.status !== "relinked" || !relink.previewBatchId) {
      throw new Error("Main-validated relink did not return preview authority");
    }
    const newBatch = relink.previewBatchId;
    const newlyAuthorized = await requestPreview({
      projectId: project.projectId,
      batchId: newBatch,
      assetId: wav.id,
    });
    if (newlyAuthorized.status !== "granted") {
      throw new Error("Relinked WAV was not authorized by main");
    }
    const staleResponse = await fetch(oldGrant.url);
    if (staleResponse.status !== 403) {
      throw new Error("Old main-owned preview token survived relink");
    }
    const forbidden = await requestPreview({
      projectId: project.projectId,
      batchId: newBatch,
      assetId: mp3.id,
    });
    if (forbidden.status !== "blocked") {
      throw new Error("Relink unexpectedly authorized another audio asset");
    }

    driver.revokeMedia();
    requirePhase(driver, "ready");
    driver.play();
    requirePhase(driver, "error");

    driver.switchProject(relink.project, {
      projectId: project.projectId,
      batchId: newBatch,
    });
    driver.play();
    await waitFor(driver, "playing", "probe-track-0");

    // Renderer-side simulation only: the Windows runner must NOT put the OS
    // to sleep. Assert that the real packaged HTMLMediaElement is torn down
    // and Resume never silently restarts a previously authorized source.
    driver.onSystemPower("suspend");
    requirePhase(driver, "ready");
    const stopped = () =>
      audioElements.every(
        (audio) => audio.paused && !audio.hasAttribute("src"),
      );
    if (!stopped()) throw new Error("T06 audio survived renderer Suspend");
    driver.onSystemPower("resume");
    await delay(70);
    requirePhase(driver, "ready");
    if (!stopped()) throw new Error("T06 Resume resurrected the audio");
    driver.play();
    requirePhase(driver, "error");

    // Explicit reauthorization after resume is required. This models the
    // trusted intake flow, not a real Windows Suspend/Resume hardware event.
    driver.switchProject(relink.project, {
      projectId: project.projectId,
      batchId: newBatch,
    });
    driver.play();
    await waitFor(driver, "playing", "probe-track-0");

    driver.switchProject({ ...project, projectId: "w06-other-project" }, null);
    requirePhase(driver, "ready");
    await delay(60);
    if (!stopped()) throw new Error("Ghost media after project switch");
    driver.close();
    await delay(60);
    if (!stopped()) throw new Error("Ghost media after close");
    return {
      corruptSourceBlocked: true,
      unsupportedFileRejected: true,
      mainIssuedGrant: true,
      pauseSeekNextPrevious: true,
      relinkRevoked: true,
      realMainRelinkAuthorized: true,
      unrelatedAssetDenied: true,
      projectSwitchStopped: true,
      closeStopped: true,
      simulatedSuspendRevoked: true,
      resumeStayedStopped: true,
      explicitlyReauthorizedPlayback: true,
      createdElements: audioElements.length,
      restartStress,
    };
  } finally {
    driver.close();
  }
}

export function installW06DriverProof(): void {
  Object.assign(window, {
    __w06DriverProbe: run,
    __w06SpectrumProbe: runW06SpectrumProof,
  });
}
