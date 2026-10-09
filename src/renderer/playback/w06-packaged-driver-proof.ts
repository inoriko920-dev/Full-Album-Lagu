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
  readonly createdElements: number;
  readonly restartStress: {
    readonly completedCycles: number;
    readonly createdElements: number;
    readonly elapsedMs: number;
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
 * and the same real HTMLMediaPlaybackDriver in 100 consecutive start/stop cycles.
 * Avoid mock audio, synthetic grant URLs or renderer filesystem privileges.
 */
async function run100PackagedRestarts(
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
  const elements: HTMLAudioElement[] = [];
  const driver = new HtmlMediaPlaybackDriver(
    project,
    { projectId: project.projectId, batchId },
    requestPreview,
    () => {
      const audio = new Audio();
      audio.muted = true;
      elements.push(audio);
      return audio;
    },
  );
  const startedAt = performance.now();
  try {
    for (let cycle = 0; cycle < 100; cycle += 1) {
      driver.play();
      await waitFor(driver, "playing", "stress-track");
      const element = elements[cycle];
      if (!element || elements.length !== cycle + 1) {
        throw new Error("T06 unexpected media instance on cycle " + cycle);
      }
      driver.stop();
      requirePhase(driver, "ready");
      if (!element.paused || element.hasAttribute("src")) {
        throw new Error("T06 live audio survived Stop at cycle " + cycle);
      }
    }
    if (
      elements.length !== 100 ||
      elements.some((audio) => !audio.paused || audio.hasAttribute("src"))
    ) {
      throw new Error("T06 audio element leak after 100 restarts");
    }
    if (JSON.stringify(project) !== original) {
      throw new Error("T06 playback mutated the project document");
    }
    return {
      completedCycles: 100,
      createdElements: elements.length,
      elapsedMs: Math.round(performance.now() - startedAt),
      allMediaReleased: true,
      projectUnchanged: true,
    };
  } finally {
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
  // Both inputs went through the *actual* Windows main picker and metadata
  // probe. A corrupted WAV stays visible as invalid but must NEVER be granted.
  const corrupt = imported.mediaAssets?.find(
    (asset) => asset.fileName === "T06 Corrupt Audio.wav",
  );
  if (
    !corrupt ||
    corrupt.availability !== "invalid" ||
    corrupt.errorCode !== "MEDIA_CORRUPT"
  ) {
    throw new Error("T06 corrupted WAV passed the real Windows metadata probe");
  }
  if (
    imported.mediaAssets?.some(
      (asset) => asset.fileName === "T06 Unsupported Notes.txt",
    )
  ) {
    throw new Error("T06 unsupported text file was imported as an audio asset");
  }
  const deniedCorrupt = await requestPreview({
    projectId: imported.projectId,
    batchId,
    assetId: corrupt.id,
  });
  if (deniedCorrupt.status !== "blocked") {
    throw new Error("T06 invalid WAV received a private playback lease");
  }

  const restartStress = await run100PackagedRestarts(
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
    driver.switchProject({ ...project, projectId: "w06-other-project" }, null);
    requirePhase(driver, "ready");
    await delay(60);
    const stopped = () =>
      audioElements.every(
        (audio) => audio.paused && !audio.hasAttribute("src"),
      );
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
