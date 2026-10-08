/**
 * W11-06 runtime transport contract. No project or history persistence.
 * T11-W06-01 introduces only these typed phases. Playback/controller code
 * and secure media streaming are separately gated T11-W06-02/03.
 */
export const PLAYBACK_PHASES = [
  "idle",
  "ready",
  "loading",
  "playing",
  "paused",
  "seeking",
  "finished",
  "blocked",
  "error",
] as const;

export type PlaybackPhase = (typeof PLAYBACK_PHASES)[number];

export interface PlaybackClockSnapshot {
  readonly phase: PlaybackPhase;
  readonly generation: number;
  readonly projectId: string;
  readonly activeTrackId: string | null;
  readonly albumTimeMs: number;
  readonly localTimeMs: number;
}
