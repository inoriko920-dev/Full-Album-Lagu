import type {
  AudioMediaMetadata,
  MediaIssueCode,
} from "../../domain/media-asset";
import type { MediaSourceDescriptor } from "./media-source-port";

type InvalidProbeCode = Exclude<
  MediaIssueCode,
  "MEDIA_NOT_FOUND" | "MEDIA_UNSUPPORTED"
>;

export type MediaProbeResult =
  | {
      status: "ready";
      metadata: AudioMediaMetadata & { durationMs: number };
    }
  | {
      status: "unsupported";
      code: "MEDIA_UNSUPPORTED";
      message: string;
    }
  | {
      status: "invalid";
      code: InvalidProbeCode;
      message: string;
    };

export interface MediaProbePort {
  probe(source: MediaSourceDescriptor): Promise<MediaProbeResult>;
}
