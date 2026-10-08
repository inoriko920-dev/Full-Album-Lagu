import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlaybackPowerState } from "../../src/core/contracts/playback-power";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { useAlbumPreviewPlayback } from "../../src/renderer/state/use-album-preview-playback";

const originalBridge = Object.getOwnPropertyDescriptor(window, "lfa");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalBridge) {
    Object.defineProperty(window, "lfa", originalBridge);
  } else {
    Reflect.deleteProperty(window, "lfa");
  }
});

function fixture(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "power-editor",
    name: "Editor Power Lifecycle",
    revision: 0,
    mediaAssets: [
      {
        id: "asset-a",
        kind: "audio",
        required: true,
        sourcePath: "C:/Untrusted/audio.wav",
        fileName: "audio.wav",
        sizeBytes: 4000,
        availability: "ready",
        metadata: { durationMs: 2000 },
      },
    ],
    tracks: [
      {
        id: "track-a",
        title: "Track A",
        sourcePath: "C:/Untrusted/audio.wav",
        audioAssetId: "asset-a",
      },
    ],
  };
}

class FakeAudio {
  static created: FakeAudio[] = [];
  src = "";
  currentTime = 0;
  volume = 1;
  crossOrigin: string | null = null;
  playCount = 0;
  pauseCount = 0;
  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor() {
    FakeAudio.created.push(this);
  }

  async play(): Promise<void> {
    this.playCount += 1;
  }

  pause(): void {
    this.pauseCount += 1;
  }

  load(): void {}

  removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }

  addEventListener(type: string, listener: EventListener): void {
    const callbacks = this.listeners.get(type) ?? new Set<EventListener>();
    callbacks.add(listener);
    this.listeners.set(type, callbacks);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }
}

describe("T11-W06-05 renderer Suspend/Resume delivery", () => {
  it("stops the live editor audio on main Suspend, never resumes it, and unsubscribes", async () => {
    FakeAudio.created = [];
    vi.stubGlobal("Audio", FakeAudio);
    const subscribers = new Set<(state: PlaybackPowerState) => void>();
    const unsubscribe = vi.fn();
    const onPlaybackPowerChange = vi.fn(
      (listener: (state: PlaybackPowerState) => void) => {
        subscribers.add(listener);
        return () => {
          subscribers.delete(listener);
          unsubscribe();
        };
      },
    );
    const requestAudioPreview = vi.fn(async () => ({
      status: "granted" as const,
      url: "lfa-preview://media/" + "a".repeat(64),
    }));
    Object.defineProperty(window, "lfa", {
      configurable: true,
      value: { onPlaybackPowerChange, requestAudioPreview },
    });
    const project = fixture();
    const before = structuredClone(project);
    const batch = { projectId: project.projectId, batchId: "picked-batch" };
    const { result, unmount } = renderHook(() =>
      useAlbumPreviewPlayback(project, batch),
    );

    expect(onPlaybackPowerChange).toHaveBeenCalledTimes(1);
    expect(subscribers.size).toBe(1);
    await act(async () => {
      result.current.playPause();
      await Promise.resolve();
      await Promise.resolve();
    });
    const first = FakeAudio.created[0];
    expect(first).toBeDefined();
    expect(first?.src).toMatch(/^lfa-preview:\/\/media\/[0-9a-f]{64}$/);
    await act(async () => {
      first!.emit("loadedmetadata");
      await Promise.resolve();
    });
    expect(result.current.clock.phase).toBe("playing");
    expect(first?.playCount).toBe(1);

    act(() => {
      for (const notify of subscribers) notify("suspend");
    });
    expect(result.current.clock.phase).toBe("ready");
    expect(first?.src).toBe("");
    expect(first?.pauseCount).toBeGreaterThan(0);

    act(() => {
      for (const notify of subscribers) notify("resume");
    });
    expect(result.current.clock.phase).toBe("ready");
    expect(first?.playCount).toBe(1);

    act(() => {
      result.current.playPause();
    });
    expect(result.current.clock.phase).toBe("error");
    expect(FakeAudio.created).toHaveLength(1);
    expect(requestAudioPreview).toHaveBeenCalledTimes(1);
    expect(project).toEqual(before);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(subscribers.size).toBe(0);
  });
});
