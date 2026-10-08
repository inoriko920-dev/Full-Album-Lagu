/**
 * T11-W06-04: real audio-frequency data from the HTMLMediaElement actually
 * playing in the preview. No random, clock-driven or template-generated bars.
 * T11-W06-05 owns integration with the frozen editor spectrum layer.
 */
export const SPECTRUM_FFT_SIZE = 2048;
export const SPECTRUM_BAR_COUNT = 32;

export type SpectrumPhase = "playing" | "paused" | "stopped";

/**
 * Pure frequency-bin reduction. Uses the highest observed energy in each
 * logarithmically spaced band; silence maps to all-zero bars.
 * The caller must supply real AnalyserNode.getByteFrequencyData() bytes.
 */
export function projectSpectrumBars(
  frequencyBins: Uint8Array,
  barCount = SPECTRUM_BAR_COUNT,
): readonly number[] {
  if (!Number.isInteger(barCount) || barCount < 1 || barCount > 128) {
    throw new Error("Spectrum bar count must be an integer from 1 to 128.");
  }
  const total = frequencyBins.length;
  if (total === 0) return Array.from({ length: barCount }, () => 0);
  return Array.from({ length: barCount }, (_, band) => {
    const lower = Math.min(
      total - 1,
      Math.max(0, Math.floor(Math.pow(total + 1, band / barCount)) - 1),
    );
    const upper = Math.min(
      total,
      Math.max(
        lower + 1,
        Math.floor(Math.pow(total + 1, (band + 1) / barCount)),
      ),
    );
    let peak = 0;
    for (let bin = lower; bin < upper; bin += 1) {
      peak = Math.max(peak, frequencyBins[bin] ?? 0);
    }
    return peak / 255;
  });
}

export interface SpectrumSnapshot {
  readonly active: boolean;
  readonly barLevels: readonly number[];
}

/**
 * WebAudio analyser is connected in-line to the output destination so real
 * audible playback is preserved (it is NOT an independent sound generator).
 * New tracks use new HTMLMediaElements and hence new MediaElementSourceNodes.
 */
export class LiveSpectrumRuntime {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private frequencyBins = new Uint8Array(0);
  private readonly empty = Array.from(
    { length: SPECTRUM_BAR_COUNT },
    () => 0,
  );

  constructor(
    private readonly createContext: () => AudioContext = () =>
      new AudioContext(),
  ) {}

  attach(element: HTMLMediaElement): boolean {
    this.detach();
    let context: AudioContext;
    try {
      context = this.createContext();
      const source = context.createMediaElementSource(element);
      const analyser = context.createAnalyser();
      analyser.fftSize = SPECTRUM_FFT_SIZE;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      analyser.connect(context.destination);
      this.context = context;
      this.source = source;
      this.analyser = analyser;
      this.frequencyBins = new Uint8Array(analyser.frequencyBinCount);
      void context.resume().catch(() => undefined);
      return true;
    } catch {
      // No bars are displayed if WebAudio cannot be attached.
      // A new media element is required to retry a previously bound source.
      return false;
    }
  }

  sample(phase: SpectrumPhase): SpectrumSnapshot {
    const analyser = this.analyser;
    if (phase !== "playing" || analyser === null) {
      return { active: false, barLevels: this.empty };
    }
    analyser.getByteFrequencyData(this.frequencyBins);
    return {
      active: true,
      barLevels: projectSpectrumBars(this.frequencyBins),
    };
  }

  detach(): void {
    this.source?.disconnect();
    this.analyser?.disconnect();
    if (this.context !== null) {
      void this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.source = null;
    this.analyser = null;
    this.frequencyBins = new Uint8Array(0);
  }

  close(): void {
    this.detach();
  }
}
