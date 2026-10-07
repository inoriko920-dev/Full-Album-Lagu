import type { ProjectDocument } from "./project-document";

export type MediaReadinessBlockerCode =
  | "REQUIRED_MEDIA_MISSING"
  | "REQUIRED_MEDIA_INVALID"
  | "REQUIRED_MEDIA_UNSUPPORTED";

export interface MediaReadinessBlocker {
  assetId: string;
  fileName: string;
  kind: "audio" | "image" | "video";
  code: MediaReadinessBlockerCode;
}

export interface ProjectMediaReadiness {
  ready: boolean;
  blockers: MediaReadinessBlocker[];
}

export function getProjectMediaReadiness(
  project: ProjectDocument,
): ProjectMediaReadiness {
  const blockers = (project.mediaAssets ?? [])
    .filter((asset) => asset.required && asset.availability !== "ready")
    .map<MediaReadinessBlocker>((asset) => ({
      assetId: asset.id,
      fileName: asset.fileName,
      kind: asset.kind,
      code:
        asset.availability === "missing"
          ? "REQUIRED_MEDIA_MISSING"
          : asset.availability === "unsupported"
            ? "REQUIRED_MEDIA_UNSUPPORTED"
            : "REQUIRED_MEDIA_INVALID",
    }));

  return {
    ready: blockers.length === 0,
    blockers,
  };
}
