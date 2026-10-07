import { z } from "zod";
import { mediaAssetReferenceSchema } from "./media-asset";

export const PROJECT_SCHEMA_VERSION = 1 as const;

export const projectTrackSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    sourcePath: z.string().min(1),
    audioAssetId: z.string().min(1).optional(),
  })
  .passthrough();

export const projectDocumentSchema = z
  .object({
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    projectId: z.string().min(1),
    name: z.string().trim().min(1).max(200),
    revision: z.number().int().nonnegative(),
    tracks: z.array(projectTrackSchema),
    mediaAssets: z.array(mediaAssetReferenceSchema).optional(),
  })
  .passthrough()
  .superRefine((project, context) => {
    const assets = project.mediaAssets ?? [];
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

    if (assetsById.size !== assets.length) {
      context.addIssue({
        code: "custom",
        message: "Media asset IDs must be unique.",
        path: ["mediaAssets"],
      });
    }

    project.tracks.forEach((track, index) => {
      if (track.audioAssetId === undefined) return;

      const asset = assetsById.get(track.audioAssetId);
      if (asset === undefined) {
        context.addIssue({
          code: "custom",
          message: "Track audioAssetId must reference an existing media asset.",
          path: ["tracks", index, "audioAssetId"],
        });
        return;
      }

      if (asset.kind !== "audio") {
        context.addIssue({
          code: "custom",
          message: "Track audioAssetId must reference an audio media asset.",
          path: ["tracks", index, "audioAssetId"],
        });
      }
    });
  });

export type ProjectDocument = z.infer<typeof projectDocumentSchema>;

export function createEmptyProject(projectId: string): ProjectDocument {
  return projectDocumentSchema.parse({
    schemaVersion: PROJECT_SCHEMA_VERSION,
    projectId,
    name: "Proyek Baru",
    revision: 0,
    tracks: [],
  });
}
