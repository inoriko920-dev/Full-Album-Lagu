export interface MediaSourceDescriptor {
  sourcePath: string;
  fileName: string;
  sizeBytes: number;
}

export type MediaSourceInspection =
  | {
      status: "found";
      source: MediaSourceDescriptor;
    }
  | {
      status: "missing";
    }
  | {
      status: "unreadable";
      message: string;
    };

export interface MediaSourcePort {
  inspect(sourcePath: string): Promise<MediaSourceInspection>;
}
