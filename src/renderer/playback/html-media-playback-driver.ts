import {
  AlbumPlaybackTransport,
  type PlaybackTransportEffect,
} from "../../core/application/services/album-playback-transport";
import type {
  PreviewAudioIssueRequest,
  PreviewAudioIssueResult,
} from "../../core/contracts/preview-audio-ipc";
import type { PlaybackClockSnapshot } from "../../core/contracts/playback";
import type { ProjectDocument } from "../../core/domain/project-document";

/**
 * Task03: browser playback is driven by a main-issued URL, never by the
 * persisted sourcePath embedded in a ProjectDocument.
 */
export interface TrustedAudioBatch {
  readonly projectId: string;
  readonly batchId: string;
}

export interface MediaElementPort {
  src: string;
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  removeAttribute(name: string): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export type PreviewAudioRequester = (
  request: PreviewAudioIssueRequest,
) => Promise<PreviewAudioIssueResult>;

interface ActiveMedia {
  element: MediaElementPort;
  generation: number;
  disposeListeners: () => void;
}

/**
 * Single renderer-side owner of HTMLAudioElement for T03.
 * Audio instances are never shared between loads: delayed events from a
 * revoked source cannot be mistaken for the newly selected track.
 *
 * The caller must pass a batch ID from a trusted main picker+intake. A loaded
 * saved/relinked project has NO grant and must be reauthorized in main.
 * This service is transport-only; W11-06 T05 will attach frozen UI controls.
 */
const PAUSED_LEASE_REFRESH_MS = 45_000;

export class HtmlMediaPlaybackDriver {
  private readonly transport: AlbumPlaybackTransport;
  private active: ActiveMedia | null = null;
  private closed = false;
  private pausedAtMs: number | null = null;
  private trustedBatch: TrustedAudioBatch | null;

  constructor(
    project: ProjectDocument,
    trustedBatch: TrustedAudioBatch | null,
    private readonly requestAudio: PreviewAudioRequester,
    private readonly createAudio: () => MediaElementPort = () => new Audio(),
    private readonly notify: (snapshot: PlaybackClockSnapshot) => void = () =>
      undefined,
    private readonly nowMs: () => number = Date.now,
  ) {
    this.transport = new AlbumPlaybackTransport(project);
    this.trustedBatch = trustedBatch;
  }

  get snapshot(): PlaybackClockSnapshot {
    return this.transport.snapshot;
  }

  play(): void {
    if (this.closed) return;
    const paused = this.transport.snapshot.phase === "paused";
    const elapsed =
      this.pausedAtMs === null ? 0 : this.nowMs() - this.pausedAtMs;
    if (paused && elapsed >= PAUSED_LEASE_REFRESH_MS) {
      this.perform(this.transport.refreshPausedAndPlay());
      return;
    }
    this.perform(this.transport.play());
  }

  pause(): void {
    if (!this.closed) this.perform(this.transport.pause());
  }

  stop(): void {
    if (!this.closed) this.perform(this.transport.stop());
  }

  seek(albumTimeMs: number): void {
    if (!this.closed) this.perform(this.transport.seek(albumTimeMs));
  }

  next(): void {
    if (!this.closed) this.perform(this.transport.next());
  }

  previous(): void {
    if (!this.closed) this.perform(this.transport.previous());
  }

  switchProject(
    project: ProjectDocument,
    trustedBatch: TrustedAudioBatch | null,
  ): void {
    if (this.closed) return;
    this.trustedBatch = trustedBatch;
    this.perform(this.transport.switchProject(project));
  }

  /**
   * The owning main process must revoke prior grants when an audio source is
   * relinked or invalidated. Clear renderer-side authority immediately too,
   * even while a grant request or media load is still pending.
   */
  revokeMedia(): void {
    if (this.closed) return;
    this.trustedBatch = null;
    this.perform(this.transport.stop());
  }

  close(): void {
    if (this.closed) return;
    this.perform(this.transport.stop());
    this.closed = true;
    this.trustedBatch = null;
  }

  private isActive(element: MediaElementPort, generation: number): boolean {
    return (
      !this.closed &&
      this.active?.element === element &&
      this.active.generation === generation &&
      this.transport.snapshot.generation === generation
    );
  }

  private teardown(): void {
    const active = this.active;
    this.active = null;
    if (active === null) return;
    active.disposeListeners();
    active.element.pause();
    active.element.removeAttribute("src");
    active.element.load();
  }

  private emit(): void {
    this.notify(this.transport.snapshot);
  }

  private perform(effect: PlaybackTransportEffect | null): void {
    if (effect === null) return;
    this.pausedAtMs = effect.kind === "pause" ? this.nowMs() : null;
    if (effect.kind === "load") {
      this.teardown();
      this.emit();
      void this.load(effect);
      return;
    }
    if (effect.kind === "stop") {
      this.teardown();
    } else if (this.active !== null) {
      this.active.generation = effect.generation;
      if (effect.kind === "pause") {
        this.active.element.pause();
      } else {
        const { element } = this.active;
        try {
          void element.play().catch(() => {
            if (!this.isActive(element, effect.generation)) return;
            this.perform(this.transport.onMediaError(effect.generation));
          });
        } catch {
          this.fail(effect.generation);
        }
      }
    }
    this.emit();
  }

  private fail(generation: number): void {
    this.perform(this.transport.onMediaError(generation));
  }

  private async load(
    effect: Extract<PlaybackTransportEffect, { kind: "load" }>,
  ): Promise<void> {
    const bound = this.trustedBatch;
    if (
      bound === null ||
      bound.projectId !== this.transport.snapshot.projectId ||
      !bound.batchId
    ) {
      this.fail(effect.generation);
      return;
    }

    let result: PreviewAudioIssueResult;
    try {
      result = await this.requestAudio({
        projectId: bound.projectId,
        batchId: bound.batchId,
        assetId: effect.assetId,
      });
    } catch {
      this.fail(effect.generation);
      return;
    }

    // A late IPC reply from a stopped, replaced or reloaded project must
    // never create a media element or restart sound.
    if (
      this.closed ||
      this.transport.snapshot.generation !== effect.generation ||
      this.transport.snapshot.phase !== "loading"
    ) {
      return;
    }
    if (
      result.status !== "granted" ||
      !/^lfa-preview:\/\/media\/[0-9a-f]{64}$/.test(result.url)
    ) {
      // Accept only opaque private grants; never raw file or web URLs.
      this.fail(effect.generation);
      return;
    }

    let element: MediaElementPort;
    try {
      element = this.createAudio();
    } catch {
      this.fail(effect.generation);
      return;
    }

    const listen = (type: string, handler: EventListener) => {
      element.addEventListener(type, handler);
      return () => element.removeEventListener(type, handler);
    };
    const cleanups: Array<() => void> = [];
    cleanups.push(
      listen("loadedmetadata", () => {
        if (!this.isActive(element, effect.generation)) return;
        try {
          element.currentTime = effect.localTimeMs / 1000;
        } catch {
          this.fail(effect.generation);
          return;
        }
        this.perform(this.transport.onLoaded(effect.generation));
      }),
    );
    cleanups.push(
      listen("timeupdate", () => {
        const generation = this.active?.generation;
        if (generation === undefined || !this.isActive(element, generation))
          return;
        if (
          this.transport.reportAudioClock(
            generation,
            element.currentTime * 1000,
          )
        ) {
          this.emit();
        }
      }),
    );
    cleanups.push(
      listen("ended", () => {
        const generation = this.active?.generation;
        if (generation === undefined || !this.isActive(element, generation))
          return;
        this.perform(this.transport.onEnded(generation));
      }),
    );
    cleanups.push(
      listen("error", () => {
        const generation = this.active?.generation;
        if (generation === undefined || !this.isActive(element, generation))
          return;
        this.fail(generation);
      }),
    );
    this.active = {
      element,
      generation: effect.generation,
      disposeListeners: () => {
        for (const clean of cleanups) clean();
      },
    };
    try {
      element.src = result.url;
      element.load();
    } catch {
      this.fail(effect.generation);
    }
  }
}
