import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectDocument } from "../../core/domain/project-document";
import { projectAlbumTimeline } from "../../core/domain/album-timeline";
import type { PlaybackClockSnapshot } from "../../core/contracts/playback";
import {
  HtmlMediaPlaybackDriver,
  type TrustedAudioBatch,
} from "../playback/html-media-playback-driver";
import {
  LiveSpectrumRuntime,
  SPECTRUM_BAR_COUNT,
} from "../playback/live-spectrum-runtime";

const SILENCE = Object.freeze(
  Array.from({ length: SPECTRUM_BAR_COUNT }, () => 0),
);

/**
 * UI-only playback state. Never calls CommandEngine or writes ProjectDocument.
 * The saved project sourcePath is NOT accepted as media authorization.
 */
export function useAlbumPreviewPlayback(
  project: ProjectDocument,
  trustedBatch: TrustedAudioBatch | null,
) {
  const driverRef = useRef<HtmlMediaPlaybackDriver | null>(null);
  const [clock, setClock] = useState<PlaybackClockSnapshot>({
    phase: "ready",
    generation: 0,
    projectId: project.projectId,
    activeTrackId: null,
    albumTimeMs: 0,
    localTimeMs: 0,
  });
  const [spectrum, setSpectrum] = useState<readonly number[]>(SILENCE);
  const [muted, setMuted] = useState(false);
  const volumeRef = useRef(1);
  const total = useMemo(
    () => projectAlbumTimeline(project).totalDurationMs ?? 0,
    [project],
  );
  const available =
    trustedBatch?.projectId === project.projectId &&
    project.tracks.some((track) => track.enabled !== false) &&
    typeof window.lfa.requestAudioPreview === "function";

  useEffect(() => {
    let current = true;
    const runtime = new LiveSpectrumRuntime();
    const request = window.lfa.requestAudioPreview;
    const driver = new HtmlMediaPlaybackDriver(
      project,
      trustedBatch,
      request === undefined
        ? async () => ({ status: "blocked" as const })
        : (value) => request(value),
      undefined,
      (next) => {
        if (current) setClock(next);
      },
      undefined,
      // Deliver Electron main's OS Suspend/Resume event to the active driver.
      window.lfa.onPlaybackPowerChange,
      runtime,
    );
    driverRef.current = driver;
    driver.setVolume(volumeRef.current);
    // Renderer state is an external driver snapshot, not a React-derived
    // effect cascade. Publish it after the effect has completed.
    queueMicrotask(() => {
      if (!current) return;
      setClock(driver.snapshot);
      setSpectrum(SILENCE);
    });
    return () => {
      current = false;
      driver.close();
      runtime.close();
      if (driverRef.current === driver) driverRef.current = null;
    };
  }, [project, trustedBatch]);

  useEffect(() => {
    if (clock.phase !== "playing") return;
    const timer = window.setInterval(() => {
      const sampled = driverRef.current?.sampleSpectrum();
      if (sampled !== null && sampled !== undefined) {
        setSpectrum(sampled.barLevels);
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [clock.phase]);

  return {
    clock,
    spectrum: clock.phase === "playing" ? spectrum : SILENCE,
    total,
    available,
    muted,
    toggleMute: () => {
      const nextMuted = !muted;
      const nextVolume = nextMuted ? 0 : 1;
      if (available && driverRef.current?.setVolume(nextVolume)) {
        volumeRef.current = nextVolume;
        setMuted(nextMuted);
      }
    },
    playPause: () => {
      const driver = driverRef.current;
      if (!driver || !available) return;
      if (
        driver.snapshot.phase === "playing" ||
        driver.snapshot.phase === "loading"
      ) {
        driver.pause();
      } else {
        driver.play();
      }
    },
    previous: () => {
      if (available) driverRef.current?.previous();
    },
    next: () => {
      if (available) driverRef.current?.next();
    },
    seek: (albumTimeMs: number) => {
      if (available) driverRef.current?.seek(albumTimeMs);
    },
  };
}
