import { describe, expect, it } from "vitest";
import {
  LiveSpectrumRuntime,
  projectSpectrumBars,
  SPECTRUM_BAR_COUNT,
  SPECTRUM_FFT_SIZE,
} from "../../src/renderer/playback/live-spectrum-runtime";

describe("W11-06 T04 genuine spectrum frequency projection", () => {
  it("maps silent decoded-frequency data to exact zero for all bars", () => {
    const result = projectSpectrumBars(new Uint8Array(1024));
    expect(result).toHaveLength(SPECTRUM_BAR_COUNT);
    expect(result.every((value) => value === 0)).toBe(true);
  });

  it("reflects real energy in an FFT band without creating random bars", () => {
    const frequency = new Uint8Array(1024);
    // 440 Hz at 44.1 kHz/2048 FFT is approximately bin 20.
    frequency[20] = 255;
    const bars = projectSpectrumBars(frequency);
    expect(bars.some((value) => value === 1)).toBe(true);
    expect(bars.some((value) => value === 0)).toBe(true);
    expect(projectSpectrumBars(frequency)).toEqual(bars);
  });

  it("does not synthesize energy at empty input or invalid bar counts", () => {
    expect(projectSpectrumBars(new Uint8Array(0))).toEqual(
      Array.from({ length: SPECTRUM_BAR_COUNT }, () => 0),
    );
    for (const count of [-1, 0, 1.5, 129, Infinity]) {
      expect(() => projectSpectrumBars(new Uint8Array(1), count)).toThrow();
    }
  });
});

describe("W11-06 T04 live spectrum graph lifecycle", () => {
  it("connects the real playing media through analyser to destination", () => {
    const operations: string[] = [];
    const bins = new Uint8Array(1024);
    bins[20] = 128;
    const analyser = {
      fftSize: 0,
      smoothingTimeConstant: 0,
      frequencyBinCount: bins.length,
      getByteFrequencyData(target: Uint8Array) {
        target.set(bins);
        operations.push("sample");
      },
      connect(destination: unknown) {
        expect(destination).toBe("speaker");
        operations.push("analyser-connect");
      },
      disconnect() {
        operations.push("analyser-disconnect");
      },
    };
    const source = {
      connect(node: unknown) {
        expect(node).toBe(analyser);
        operations.push("source-connect");
      },
      disconnect() {
        operations.push("source-disconnect");
      },
    };
    const context = {
      destination: "speaker",
      createMediaElementSource(element: unknown) {
        expect(element).toBe("playing-audio");
        return source;
      },
      createAnalyser: () => analyser,
      async resume() {
        operations.push("resume");
      },
      async close() {
        operations.push("close");
      },
    };
    const runtime = new LiveSpectrumRuntime(
      () => context as unknown as AudioContext,
    );
    expect(runtime.attach("playing-audio" as unknown as HTMLMediaElement)).toBe(
      true,
    );
    expect(analyser.fftSize).toBe(SPECTRUM_FFT_SIZE);
    expect(runtime.sample("playing")).toMatchObject({ active: true });
    expect(runtime.sample("playing").barLevels.some((value) => value > 0)).toBe(
      true,
    );
    expect(runtime.sample("paused")).toEqual({
      active: false,
      barLevels: Array.from({ length: SPECTRUM_BAR_COUNT }, () => 0),
    });
    runtime.detach();
    expect(runtime.sample("playing").active).toBe(false);
    expect(operations).toContain("source-disconnect");
    expect(operations).toContain("analyser-disconnect");
    expect(operations).toContain("close");
  });

  it("closes an incomplete WebAudio graph without leaking a context", () => {
    let closed = false;
    let disconnected = false;
    const context = {
      createMediaElementSource() {
        return {
          disconnect() {
            disconnected = true;
          },
        };
      },
      createAnalyser() {
        throw new Error("Unavailable analyser");
      },
      async close() {
        closed = true;
      },
    };
    const runtime = new LiveSpectrumRuntime(
      () => context as unknown as AudioContext,
    );
    expect(runtime.attach({} as HTMLMediaElement)).toBe(false);
    expect(disconnected).toBe(true);
    expect(closed).toBe(true);
    expect(
      runtime.sample("playing").barLevels.every((value) => value === 0),
    ).toBe(true);
    runtime.close();
  });

  it("fails closed rather than simulating signal if no audio context exists", () => {
    const runtime = new LiveSpectrumRuntime(() => {
      throw new Error("AudioContext unavailable");
    });
    expect(runtime.attach({} as HTMLMediaElement)).toBe(false);
    expect(runtime.sample("playing").active).toBe(false);
    expect(
      runtime.sample("playing").barLevels.every((value) => value === 0),
    ).toBe(true);
    runtime.close();
  });
});
