import { z } from "zod";
import { mediaIssueCodeSchema } from "../domain/media-asset";
import { projectDocumentSchema } from "../domain/project-document";

export const ARTWORK_PICK_AND_BIND_CHANNEL = "artwork:pick-and-bind" as const;

export const artworkBindingTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("album-default") }).strict(),
  z
    .object({
      kind: z.literal("track"),
      trackId: z.string().trim().min(1),
    })
    .strict(),
]);

export const artworkImportRequestSchema = z
  .object({
    project: projectDocumentSchema,
    target: artworkBindingTargetSchema,
  })
  .strict();

export const artworkImportResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("imported"),
      project: projectDocumentSchema,
      asset: z
        .object({
          assetId: z.string().min(1),
          fileName: z.string().trim().min(1).max(1024),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      status: z.literal("cancelled"),
      code: z.literal("MEDIA_SELECTION_CANCELLED"),
    })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      code: mediaIssueCodeSchema,
      message: z.string().trim().min(1).max(1000),
    })
    .strict(),
]);

export type ArtworkBindingTarget = z.infer<typeof artworkBindingTargetSchema>;
export type ArtworkImportRequest = z.infer<typeof artworkImportRequestSchema>;
export type ArtworkImportResult = z.infer<typeof artworkImportResultSchema>;
