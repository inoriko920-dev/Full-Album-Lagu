import { z } from "zod";

export const mediaKindSchema = z.enum(["audio", "image", "video"]);

export const mediaAvailabilitySchema = z.enum([
  "ready",
  "missing",
  "invalid",
  "unsupported",
]);

export const mediaIssueCodeSchema = z.enum([
  "MEDIA_NOT_FOUND",
  "MEDIA_UNREADABLE",
  "MEDIA_UNSUPPORTED",
  "MEDIA_CORRUPT",
  "MEDIA_DURATION_UNAVAILABLE",
  "MEDIA_PROBE_FAILED",
]);

export const audioMediaMetadataSchema = z
  .object({
    durationMs: z.number().int().positive().optional(),
    title: z.string().trim().min(1).max(500).optional(),
    artist: z.string().trim().min(1).max(500).optional(),
    album: z.string().trim().min(1).max(500).optional(),
    trackNumber: z.number().int().positive().optional(),
    year: z.number().int().min(1000).max(9999).optional(),
    container: z.string().trim().min(1).max(100).optional(),
    codec: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

const mediaAssetReferenceBaseSchema = z
  .object({
    id: z.string().min(1),
    kind: mediaKindSchema,
    required: z.boolean(),
    sourcePath: z.string().min(1),
    fileName: z.string().trim().min(1).max(1024),
    sizeBytes: z.number().int().nonnegative(),
    fingerprint: z.string().min(1).optional(),
    availability: mediaAvailabilitySchema,
    errorCode: mediaIssueCodeSchema.optional(),
    metadata: audioMediaMetadataSchema.optional(),
  })
  .passthrough();

export const mediaAssetReferenceSchema =
  mediaAssetReferenceBaseSchema.superRefine((asset, context) => {
    if (asset.availability === "ready") {
      if (asset.errorCode !== undefined) {
        context.addIssue({
          code: "custom",
          message: "Ready media cannot carry an error code.",
          path: ["errorCode"],
        });
      }

      if (
        asset.kind === "audio" &&
        (asset.metadata?.durationMs === undefined ||
          asset.metadata.durationMs <= 0)
      ) {
        context.addIssue({
          code: "custom",
          message: "Ready audio requires a positive duration.",
          path: ["metadata", "durationMs"],
        });
      }

      return;
    }

    if (asset.errorCode === undefined) {
      context.addIssue({
        code: "custom",
        message: "Unavailable media requires an explicit error code.",
        path: ["errorCode"],
      });
      return;
    }

    if (
      asset.availability === "missing" &&
      asset.errorCode !== "MEDIA_NOT_FOUND"
    ) {
      context.addIssue({
        code: "custom",
        message: "Missing media must use MEDIA_NOT_FOUND.",
        path: ["errorCode"],
      });
    }

    if (
      asset.availability === "unsupported" &&
      asset.errorCode !== "MEDIA_UNSUPPORTED"
    ) {
      context.addIssue({
        code: "custom",
        message: "Unsupported media must use MEDIA_UNSUPPORTED.",
        path: ["errorCode"],
      });
    }

    if (
      asset.availability === "invalid" &&
      (asset.errorCode === "MEDIA_NOT_FOUND" ||
        asset.errorCode === "MEDIA_UNSUPPORTED")
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Invalid media must use unreadable, corrupt, duration, or probe failure.",
        path: ["errorCode"],
      });
    }
  });

export type MediaKind = z.infer<typeof mediaKindSchema>;
export type MediaAvailability = z.infer<typeof mediaAvailabilitySchema>;
export type MediaIssueCode = z.infer<typeof mediaIssueCodeSchema>;
export type AudioMediaMetadata = z.infer<typeof audioMediaMetadataSchema>;
export type MediaAssetReference = z.infer<typeof mediaAssetReferenceSchema>;
