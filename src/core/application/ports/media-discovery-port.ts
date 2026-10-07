import type { MediaSourceDescriptor } from "./media-source-port";

export type MediaDiscoveryEntry =
  | {
      kind: "file";
      identityKey: string;
      source: MediaSourceDescriptor;
    }
  | {
      kind: "directory";
      identityKey: string;
      sourcePath: string;
      fileName: string;
    }
  | {
      kind: "other";
      identityKey: string;
      fileName: string;
    }
  | {
      kind: "unreadable";
      fileName: string;
      message: string;
    };

export interface MediaDiscoveryPort {
  inspectPath(sourcePath: string): Promise<MediaDiscoveryEntry>;
  listDirectory(directoryPath: string): Promise<string[]>;
}
