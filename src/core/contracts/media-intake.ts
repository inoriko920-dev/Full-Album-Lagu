import { z } from "zod";
import { mediaIssueCodeSchema, mediaKindSchema } from "../domain/media-asset";

const mediaOperationErrorCodeSchema = z.enum([
  "MEDIA_SELECTION_CANCELLED",
  "MEDIA_DISCOVERY_FAILED",
  "MEDIA_IMPORT_CANCELLED",
  "RELINK_CANCELLED",
  "RELINK_NO_MATCH",
  "RELINK_AMBIGUOUS",
  "RELINK_FAILED",
]);

export const mediaPublicErrorCodeSchema = z.union([
  mediaIssueCodeSchema,
  mediaOperationErrorCodeSchema,
]);

export const mediaItemStatusSchema = z.enum([
  "ready",
  "missing",
  "invalid",
  "unsupported",
  "cancelled",
]);

export const mediaItemReportSchema = z
  .object({
    assetId: z.string().min(1).optional(),
    fileName: z.string().trim().min(1).max(1024),
    kind: mediaKindSchema,
    status: mediaItemStatusSchema,
    code: mediaPublicErrorCodeSchema.optional(),
    message: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const mediaBatchProgressSchema = z
  .object({
    discovered: z.number().int().nonnegative(),
    processed: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.processed > value.discovered) {
      context.addIssue({
        code: "custom",
        message: "Processed media cannot exceed discovered media.",
        path: ["processed"],
      });
    }

    if (value.accepted + value.rejected > value.processed) {
      context.addIssue({
        code: "custom",
        message: "Accepted and rejected totals cannot exceed processed media.",
        path: ["accepted"],
      });
    }
  });

const mediaBatchSummarySchema = z
  .object({
    discovered: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    cancelled: z.number().int().nonnegative(),
    items: z.array(mediaItemReportSchema),
  })
  .strict();

export const mediaBatchResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("completed"),
      summary: mediaBatchSummarySchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("cancelled"),
      code: z.literal("MEDIA_IMPORT_CANCELLED"),
      summary: mediaBatchSummarySchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      code: mediaPublicErrorCodeSchema,
      message: z.string().trim().min(1).max(1000),
      summary: mediaBatchSummarySchema.optional(),
    })
    .strict(),
]);

export const relinkCandidateSummarySchema = z
  .object({
    fileName: z.string().trim().min(1).max(1024),
    sizeBytes: z.number().int().nonnegative(),
    durationMs: z.number().int().positive().optional(),
  })
  .strict();

export const mediaRelinkResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("relinked"),
      assetId: z.string().min(1),
      fileName: z.string().trim().min(1).max(1024),
    })
    .strict(),
  z
    .object({
      status: z.literal("cancelled"),
      code: z.literal("RELINK_CANCELLED"),
      assetId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("no-match"),
      code: z.literal("RELINK_NO_MATCH"),
      assetId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("ambiguous"),
      code: z.literal("RELINK_AMBIGUOUS"),
      assetId: z.string().min(1),
      candidates: z.array(relinkCandidateSummarySchema).min(2),
    })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      code: z.literal("RELINK_FAILED"),
      assetId: z.string().min(1),
      message: z.string().trim().min(1).max(1000),
    })
    .strict(),
]);

export type MediaPublicErrorCode = z.infer<typeof mediaPublicErrorCodeSchema>;
export type MediaItemReport = z.infer<typeof mediaItemReportSchema>;
export type MediaBatchProgress = z.infer<typeof mediaBatchProgressSchema>;
export type MediaBatchResult = z.infer<typeof mediaBatchResultSchema>;
export type RelinkCandidateSummary = z.infer<
  typeof relinkCandidateSummarySchema
>;
export type MediaRelinkResult = z.infer<typeof mediaRelinkResultSchema>;
