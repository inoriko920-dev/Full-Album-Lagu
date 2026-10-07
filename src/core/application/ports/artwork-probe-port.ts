import type { MediaSourceDescriptor } from "./media-source-port";

export type ArtworkFormat = "png" | "jpeg" | "webp";

export type ArtworkProbeResult =
  | { status: "ready"; format: ArtworkFormat }
  | { status: "unsupported"; message: string }
  | { status: "invalid"; message: string }
  | { status: "unreadable"; message: string };

export interface ArtworkProbePort {
  probe(source: MediaSourceDescriptor): Promise<ArtworkProbeResult>;
}
