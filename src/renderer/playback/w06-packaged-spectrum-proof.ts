import type { ProjectDocument } from "../../core/domain/project-document";
import { HtmlMediaPlaybackDriver } from "./html-media-playback-driver";
import { LiveSpectrumRuntime } from "./live-spectrum-runtime";

/** Real Chromium + user-data-isolated, packaged Windows only; no UI hook. */
export interface W06SpectrumEvidence {
  readonly tone440HzDetected: true;
  readonly silenceNearZero: true;
  readonly pauseZero: true;
  readonly stopZero: true;
  readonly sourceIdentity: true;
  readonly tonePeak: number;
  readonly silencePeak: number;
  readonly attachedElements: number;
  readonly sampledFrames: number;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(
  predicate: () => boolean,
  description: string,
): Promise<void> {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await delay(25);
  }
  throw new Error("T04 spectrum playback timeout: " + description);
}

async function peakDuring(
  driver: HtmlMediaPlaybackDriver,
  durationMs: number,
): Promise<{ peak: number; frames: number }> {
  let peak = 0;
  let frames = 0;
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    if (driver.snapshot.phase !== "playing") {
      throw new Error("T04 real audio stopped unexpectedly");
    }
    const snapshot = driver.sampleSpectrum();
    if (snapshot === null || !snapshot.active) {
      throw new Error("T04 analyser was not attached to playing audio");
    }
    peak = Math.max(peak, ...snapshot.barLevels);
    frames += 1;
    await delay(35);
  }
  return { peak, frames };
}

/**
 * Source identity is measured by wrapping the *native* AudioContext API.
 * Never feed a generated UI waveform or oscillator into the analyser.
 */
export async function runW06SpectrumProof(
  imported: ProjectDocument,
  batchId: string,
): Promise<W06SpectrumEvidence> {
  const names = ["T04 Tone 440Hz.wav", "T04 Silence 2s.wav"];
  const assets = names.map((name) =>
    imported.mediaAssets?.find(
      (asset) => asset.availability === "ready" && asset.fileName === name,
    ),
  );
  if (!assets[0] || !assets[1]) {
    throw new Error("T04 main-probed tone/silence files were not imported");
  }
  const project: ProjectDocument = {
    ...imported,
    tracks: assets.map((asset, index) => ({
      id: "spectrum-probe-" + index,
      title: "Spectrum Probe " + index,
      audioAssetId: asset.id,
      sourcePath: asset.sourcePath,
    })),
  };
  const request = window.lfa.requestAudioPreview;
  if (typeof request !== "function") {
    throw new Error("T04 secure main-owned preview bridge unavailable");
  }
  const audioElements: HTMLAudioElement[] = [];
  const attachedElements: HTMLMediaElement[] = [];
  const runtime = new LiveSpectrumRuntime(() => {
    const real = new AudioContext();
    const original = real.createMediaElementSource.bind(real);
    return new Proxy(real, {
      get(target, key) {
        if (key === "createMediaElementSource") {
          return (element: HTMLMediaElement) => {
            attachedElements.push(element);
            return original(element);
          };
        }
        const value: unknown = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
  const driver = new HtmlMediaPlaybackDriver(
    project,
    { projectId: project.projectId, batchId },
    (input) => request(input),
    () => {
      const audio = new Audio();
      audio.volume = 0.2;
      audioElements.push(audio);
      return audio;
    },
    () => undefined,
    Date.now,
    undefined,
    runtime,
  );
  try {
    driver.play();
    await waitFor(
      () =>
        driver.snapshot.phase === "playing" &&
        driver.snapshot.activeTrackId === "spectrum-probe-0",
      "tone 440 Hz",
    );
    const tone = await peakDuring(driver, 550);
    if (tone.peak < 0.15) {
      throw new Error("Real T04 440 Hz FFT energy missing: " + tone.peak);
    }
    driver.pause();
    const paused = driver.sampleSpectrum();
    if (
      paused === null ||
      paused.active ||
      paused.barLevels.some((n) => n !== 0)
    ) {
      throw new Error("T04 paused FFT must be all zeros");
    }
    driver.next();
    await waitFor(
      () =>
        driver.snapshot.phase === "paused" &&
        driver.snapshot.activeTrackId === "spectrum-probe-1",
      "silent source loading",
    );
    driver.play();
    await waitFor(
      () =>
        driver.snapshot.phase === "playing" &&
        driver.snapshot.activeTrackId === "spectrum-probe-1",
      "silent source playing",
    );
    const silent = await peakDuring(driver, 550);
    if (silent.peak > 0.04) {
      throw new Error("T04 silent waveform produced false FFT: " + silent.peak);
    }
    driver.stop();
    const stopped = driver.sampleSpectrum();
    if (
      stopped === null ||
      stopped.active ||
      stopped.barLevels.some((n) => n !== 0)
    ) {
      throw new Error("T04 stopped FFT must be all zeros");
    }
    const sourceIdentity =
      attachedElements.length === audioElements.length &&
      attachedElements.length === 2 &&
      attachedElements.every(
        (element, index) => element === audioElements[index],
      );
    if (!sourceIdentity) {
      throw new Error("T04 analyser source differed from actual playing media");
    }
    driver.close();
    if (
      audioElements.some(
        (element) => !element.paused || element.hasAttribute("src"),
      )
    ) {
      throw new Error("T04 spectrum left an active audio source after close");
    }
    return {
      tone440HzDetected: true,
      silenceNearZero: true,
      pauseZero: true,
      stopZero: true,
      sourceIdentity: true,
      tonePeak: tone.peak,
      silencePeak: silent.peak,
      attachedElements: attachedElements.length,
      sampledFrames: tone.frames + silent.frames,
    };
  } finally {
    driver.close();
    runtime.close();
  }
}
