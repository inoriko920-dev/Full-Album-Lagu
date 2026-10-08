import type { ProjectDocument } from "../../core/domain/project-document";
import { HtmlMediaPlaybackDriver } from "./html-media-playback-driver";

interface W06Evidence {
  readonly mainIssuedGrant: true;
  readonly pauseSeekNextPrevious: true;
  readonly relinkRevoked: true;
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

async function run(
  imported: ProjectDocument,
  batchId: string,
): Promise<W06Evidence> {
  const wav = imported.mediaAssets?.find(
    (asset) => asset.availability === "ready" && asset.fileName.toLowerCase().endsWith(".wav"),
  );
  const mp3 = imported.mediaAssets?.find(
    (asset) => asset.availability === "ready" && asset.fileName.toLowerCase().endsWith(".mp3"),
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
  const audioElements: HTMLAudioElement[] = [];
  const driver = new HtmlMediaPlaybackDriver(
    project,
    trusted,
    (request) => window.lfa.requestAudioPreview(request),
    () => {
      const audio = new Audio();
      audio.muted = true;
      audioElements.push(audio);
      return audio;
    },
  );
  try {
    driver.play();
    await waitFor(driver, "playing", "probe-track-0");
    driver.pause();
    if (driver.snapshot.phase !== "paused") throw new Error("Driver Pause failed");

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
    driver.revokeMedia();
    if (driver.snapshot.phase !== "ready") throw new Error("Relink revoke failed");
    driver.play();
    if (driver.snapshot.phase !== "error") throw new Error("Revoke allowed replay");

    driver.switchProject(project, trusted);
    driver.play();
    await waitFor(driver, "playing", "probe-track-0");
    driver.switchProject({ ...project, projectId: "w06-other-project" }, null);
    if (driver.snapshot.phase !== "ready") throw new Error("Switch did not stop");
    await delay(60);
    const stopped = () =>
      audioElements.every((audio) => audio.paused && !audio.hasAttribute("src"));
    if (!stopped()) throw new Error("Ghost media after project switch");
    driver.close();
    await delay(60);
    if (!stopped()) throw new Error("Ghost media after close");
    return {
      mainIssuedGrant: true,
      pauseSeekNextPrevious: true,
      relinkRevoked: true,
      projectSwitchStopped: true,
      closeStopped: true,
      createdElements: audioElements.length,
    };
  } finally {
    driver.close();
  }
}

export function installW06DriverProof(): void {
  Object.assign(window, { __w06DriverProbe: run });
}
