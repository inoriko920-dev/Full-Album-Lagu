import type { PlaybackClockSnapshot } from "../../core/contracts/playback";
import {
  resolveAlbumPlaybackPosition,
  type AlbumPlaybackPosition,
} from "../../core/domain/album-timeline";
import type { ProjectDocument } from "../../core/domain/project-document";

/**
 * A driver can briefly publish the OLD track at its exact end while its
 * album time already belongs to the next half-open track interval.
 * Never use that mixed snapshot to draw new-track artwork, keyframes,
 * spectrum, or boundary effects. This does not change the audio clock.
 */
export function resolveAuthoritativePreviewPosition(
  project: ProjectDocument,
  clock: PlaybackClockSnapshot,
  available: boolean,
): Extract<AlbumPlaybackPosition, { status: "resolved" }> | null {
  if (
    !available ||
    clock.projectId !== project.projectId ||
    (clock.phase !== "playing" && clock.phase !== "paused")
  ) {
    return null;
  }

  const mapped = resolveAlbumPlaybackPosition(project, clock.albumTimeMs);
  if (
    mapped.status !== "resolved" ||
    mapped.trackId !== clock.activeTrackId ||
    !Number.isFinite(clock.localTimeMs) ||
    Math.abs(mapped.localTimeMs - clock.localTimeMs) > 1
  ) {
    return null;
  }
  return mapped;
}
