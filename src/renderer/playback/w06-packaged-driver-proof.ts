import type { ProjectDocument } from "../../core/domain/project-document";
import { HtmlMediaPlaybackDriver } from "./html-media-playback-driver";
import { runW06SpectrumProof } from "./w06-packaged-spectrum-proof";

interface W06Evidence {
  readonly mainIssuedGrant: true;
  readonly pauseSeekNextPrevious: true;
  readonly relinkRevoked: true;
  readonly realMainRelinkAuthorized: true;
  readonly unrelatedAssetDenied: true;
  readonly projectSwitchStopped: true;
  readonly closeStopped: true;
  readonly createdElements: number;
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
      mainIssuedGrant: true,
      pauseSeekNextPrevious: true,
      relinkRevoked: true,
      realMainRelinkAuthorized: true,
      unrelatedAssetDenied: true,
      projectSwitchStopped: true,
      closeStopped: true,
      createdElements: audioElements.length,
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
