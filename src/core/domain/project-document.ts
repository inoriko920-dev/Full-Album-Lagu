import { z } from "zod";
import { mediaAssetReferenceSchema } from "./media-asset";
import {
  visualBoundaryTransitionSchema,
  visualSceneSchema,
} from "./visual-scene-schema";

export const PROJECT_SCHEMA_VERSION = 1 as const;

export const projectTrackBindingSchema = z
  .object({
    titleOverride: z.string().trim().min(1).max(500).optional(),
    artistOverride: z.string().trim().min(1).max(500).optional(),
    albumOverride: z.string().trim().min(1).max(500).optional(),
    yearOverride: z.number().int().min(1000).max(9999).optional(),
    artworkAssetId: z.string().min(1).optional(),
  })
  .strict();

export const projectAlbumPresentationSchema = z
  .object({
    defaultArtworkAssetId: z.string().min(1).optional(),
  })
  .strict();

export const projectTrackSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    sourcePath: z.string().min(1),
    audioAssetId: z.string().min(1).optional(),
    enabled: z.boolean().optional(),
    binding: projectTrackBindingSchema.optional(),
  })
  .passthrough();

export const projectDocumentSchema = z
  .object({
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    projectId: z.string().min(1),
    name: z.string().trim().min(1).max(200),
    revision: z.number().int().nonnegative(),
    albumPresentation: projectAlbumPresentationSchema.optional(),
    visualScene: visualSceneSchema.optional(),
    boundaryTransitions: z
      .array(visualBoundaryTransitionSchema)
      .max(2048)
      .optional(),
    tracks: z.array(projectTrackSchema),
    mediaAssets: z.array(mediaAssetReferenceSchema).optional(),
  })
  .passthrough()
  .superRefine((project, context) => {
    const boundaryPairs = new Set<string>();
    project.boundaryTransitions?.forEach((transition, index) => {
      const pair = JSON.stringify([
        transition.fromTrackId,
        transition.toTrackId,
      ]);
      if (boundaryPairs.has(pair)) {
        context.addIssue({
          code: "custom",
          message:
            "Each directed track pair may have only one boundary transition.",
          path: ["boundaryTransitions", index],
        });
      }
      boundaryPairs.add(pair);
    });

    const assets = project.mediaAssets ?? [];
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

    if (assetsById.size !== assets.length) {
      context.addIssue({
        code: "custom",
        message: "Media asset IDs must be unique.",
        path: ["mediaAssets"],
      });
    }

    const validateArtworkReference = (
      assetId: string | undefined,
      path: (string | number)[],
      messagePrefix: string,
    ) => {
      if (assetId === undefined) return;

      const asset = assetsById.get(assetId);
      if (asset === undefined) {
        context.addIssue({
          code: "custom",
          message: `${messagePrefix} must reference an existing media asset.`,
          path,
        });
        return;
      }

      if (asset.kind !== "image") {
        context.addIssue({
          code: "custom",
          message: `${messagePrefix} must reference an image media asset.`,
          path,
        });
      }
    };

    validateArtworkReference(
      project.albumPresentation?.defaultArtworkAssetId,
      ["albumPresentation", "defaultArtworkAssetId"],
      "Album defaultArtworkAssetId",
    );

    project.tracks.forEach((track, index) => {
      if (track.audioAssetId !== undefined) {
        const asset = assetsById.get(track.audioAssetId);
        if (asset === undefined) {
          context.addIssue({
            code: "custom",
            message:
              "Track audioAssetId must reference an existing media asset.",
            path: ["tracks", index, "audioAssetId"],
          });
        } else if (asset.kind !== "audio") {
          context.addIssue({
            code: "custom",
            message: "Track audioAssetId must reference an audio media asset.",
            path: ["tracks", index, "audioAssetId"],
          });
        }
      }

      validateArtworkReference(
        track.binding?.artworkAssetId,
        ["tracks", index, "binding", "artworkAssetId"],
        "Track artworkAssetId",
      );
    });
  });

export type ProjectTrackBinding = z.infer<typeof projectTrackBindingSchema>;
export type ProjectAlbumPresentation = z.infer<
  typeof projectAlbumPresentationSchema
>;
export type ProjectTrack = z.infer<typeof projectTrackSchema>;
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
