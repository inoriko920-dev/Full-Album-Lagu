/** OS power lifecycle delivery from Electron main; never renderer authority. */
export const PLAYBACK_POWER_CHANNEL = "playback:os-power-state" as const;

export type PlaybackPowerState = "suspend" | "resume";
