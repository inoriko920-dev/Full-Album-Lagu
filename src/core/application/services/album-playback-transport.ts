import {
  projectAlbumTimeline,
  resolveAlbumPlaybackPosition,
  type AlbumPlaybackPosition,
} from "../../domain/album-timeline";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";
import type { PlaybackClockSnapshot, PlaybackPhase } from "../../contracts/playback";

export type PlaybackTransportEffect =
  | {
      kind: "load";
      generation: number;
      assetId: string;
      trackId: string;
      localTimeMs: number;
      autoPlay: boolean;
    }
  | { kind: "resume" | "pause" | "stop"; generation: number };

/**
 * Task03-A: one pure, ephemeral transport coordinator (no FS, UI or audio).
 * The future media adapter MUST ignore aborted/stale generations and must
 * confirm load completion before playing. No ProjectDocument mutation occurs.
 */
export class AlbumPlaybackTransport {
  private project: ProjectDocument;
  private state: PlaybackClockSnapshot;
  private loaded = false;
  private pendingAutoPlay = false;

  constructor(projectInput: ProjectDocument) {
    this.project = projectDocumentSchema.parse(projectInput);
    this.state = {
      phase: "ready",
      generation: 0,
      projectId: this.project.projectId,
      activeTrackId: null,
      albumTimeMs: 0,
      localTimeMs: 0,
    };
  }

  get snapshot(): PlaybackClockSnapshot {
    return { ...this.state };
  }

  private update(
    phase: PlaybackPhase,
    changes: Partial<PlaybackClockSnapshot> = {},
  ): void {
    this.state = {
      ...this.state,
      ...changes,
      phase,
    };
  }

  private nextGeneration(): number {
    const next = this.state.generation + 1;
    this.state = { ...this.state, generation: next };
    return next;
  }

  private map(
    albumTimeMs: number,
    autoPlay: boolean,
  ): PlaybackTransportEffect {
    const generation = this.nextGeneration();
    this.loaded = false;
    this.pendingAutoPlay = autoPlay;
    const mapped = resolveAlbumPlaybackPosition(this.project, albumTimeMs);
    if (mapped.status !== "resolved") {
      this.update(mapped.status === "finished" ? "finished" : "blocked", {
        activeTrackId: null,
        albumTimeMs: mapped.status === "finished" ? mapped.albumTimeMs : 0,
        localTimeMs: 0,
      });
      return { kind: "stop", generation };
    }
    return this.load(generation, mapped);
  }

  private load(
    generation: number,
    mapped: Extract<AlbumPlaybackPosition, { status: "resolved" }>,
  ): PlaybackTransportEffect {
    this.update("loading", {
      activeTrackId: mapped.trackId,
      albumTimeMs: mapped.albumTimeMs,
      localTimeMs: mapped.localTimeMs,
    });
    return {
      kind: "load",
      generation,
      assetId: mapped.audioAssetId,
      trackId: mapped.trackId,
      localTimeMs: mapped.localTimeMs,
      autoPlay: this.pendingAutoPlay,
    };
  }

  play(): PlaybackTransportEffect | null {
    if (this.state.phase === "playing" || this.state.phase === "loading") {
      return null;
    }
    if (this.state.phase === "paused" && this.loaded) {
      const generation = this.nextGeneration();
      this.update("playing");
      return { kind: "resume", generation };
    }
    const position = this.state.phase === "finished" ? 0 : this.state.albumTimeMs;
    return this.map(position, true);
  }

  pause(): PlaybackTransportEffect | null {
    if (this.state.phase !== "playing" && this.state.phase !== "loading") {
      return null;
    }
    const generation = this.nextGeneration();
    this.pendingAutoPlay = false;
    this.update("paused");
    return { kind: "pause", generation };
  }

  stop(): PlaybackTransportEffect {
    const generation = this.nextGeneration();
    this.loaded = false;
    this.pendingAutoPlay = false;
    this.update("ready", {
      activeTrackId: null,
      albumTimeMs: 0,
      localTimeMs: 0,
    });
    return { kind: "stop", generation };
  }

  seek(albumTimeMs: number): PlaybackTransportEffect {
    const autoPlay =
      this.state.phase === "playing" || this.state.phase === "loading";
    return this.map(albumTimeMs, autoPlay);
  }

  /**
   * Load completion is a request to play, not a call to audio.play().
   * A stale event is ignored even when projectId happens to match.
   */
  onLoaded(generation: number): PlaybackTransportEffect | null {
    if (
      generation !== this.state.generation ||
      this.state.phase !== "loading"
    ) {
      return null;
    }
    this.loaded = true;
    this.update(this.pendingAutoPlay ? "playing" : "paused");
    return this.pendingAutoPlay
      ? { kind: "resume", generation }
      : { kind: "pause", generation };
  }

  reportAudioClock(generation: number, localTimeMs: number): boolean {
    if (
      generation !== this.state.generation ||
      this.state.phase !== "playing" ||
      !Number.isFinite(localTimeMs) ||
      localTimeMs < 0
    ) {
      return false;
    }
    const projection = projectAlbumTimeline(this.project);
    const current = projection.items.find(
      (item) => item.trackId === this.state.activeTrackId,
    );
    if (
      current?.status !== "resolved" ||
      current.startMs === undefined ||
      current.durationMs === undefined
    ) {
      return false;
    }
    const bounded = Math.min(localTimeMs, current.durationMs);
    this.update("playing", {
      albumTimeMs: current.startMs + bounded,
      localTimeMs: bounded,
    });
    return true;
  }

  onEnded(generation: number): PlaybackTransportEffect | null {
    if (
      generation !== this.state.generation ||
      this.state.phase !== "playing"
    ) {
      return null;
    }
    const current = projectAlbumTimeline(this.project).items.find(
      (item) => item.trackId === this.state.activeTrackId,
    );
    return current?.endMs === undefined
      ? this.stop()
      : this.map(current.endMs, true);
  }

  next(): PlaybackTransportEffect {
    const items = projectAlbumTimeline(this.project).items.filter(
      (item) => item.enabled && item.status === "resolved",
    );
    const currentIndex = items.findIndex(
      (item) => item.trackId === this.state.activeTrackId,
    );
    const next = items[currentIndex + 1];
    if (next?.startMs === undefined) {
      const total = projectAlbumTimeline(this.project).totalDurationMs;
      return this.map(total ?? Number.NaN, false);
    }
    return this.map(
      next.startMs,
      this.state.phase === "playing" || this.state.phase === "loading",
    );
  }

  previous(): PlaybackTransportEffect {
    const items = projectAlbumTimeline(this.project).items.filter(
      (item) => item.enabled && item.status === "resolved",
    );
    const currentIndex = items.findIndex(
      (item) => item.trackId === this.state.activeTrackId,
    );
    const target =
      this.state.localTimeMs > 3000
        ? items[currentIndex]
        : items[Math.max(0, currentIndex - 1)];
    return this.map(
      target?.startMs ?? 0,
      this.state.phase === "playing" || this.state.phase === "loading",
    );
  }

  switchProject(projectInput: ProjectDocument): PlaybackTransportEffect {
    const project = projectDocumentSchema.parse(projectInput);
    const generation = this.nextGeneration();
    this.project = project;
    this.loaded = false;
    this.pendingAutoPlay = false;
    this.state = {
      phase: "ready",
      generation,
      projectId: project.projectId,
      activeTrackId: null,
      albumTimeMs: 0,
      localTimeMs: 0,
    };
    return { kind: "stop", generation };
  }
}
