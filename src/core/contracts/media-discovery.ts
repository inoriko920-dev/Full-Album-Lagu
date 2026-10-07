import { z } from "zod";

export const MEDIA_PICK_AUDIO_FILES_CHANNEL = "media:pick-audio-files" as const;
export const MEDIA_PICK_FOLDER_CHANNEL = "media:pick-folder" as const;
export const MEDIA_DISCOVER_DROPPED_CHANNEL = "media:discover-dropped" as const;
export const MEDIA_DISCOVERY_STATUS_CHANNEL =
  "media:get-discovery-status" as const;
export const MEDIA_DISCOVERY_CANCEL_CHANNEL = "media:cancel-discovery" as const;

export const mediaDiscoveryPathRequestSchema = z
  .object({
    paths: z.array(z.string().min(1)).min(1).max(10000),
  })
  .strict();

export const mediaDiscoveryStatusRequestSchema = z
  .object({
    batchId: z.string().min(1),
  })
  .strict();

export const mediaDiscoveryCancelRequestSchema =
  mediaDiscoveryStatusRequestSchema;

export const mediaDiscoveryStartResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("started"),
      batchId: z.string().min(1),
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
      code: z.literal("MEDIA_DISCOVERY_FAILED"),
      message: z.string().trim().min(1).max(1000),
    })
    .strict(),
]);

export const mediaDiscoveryProgressSchema = z
  .object({
    rootsTotal: z.number().int().nonnegative(),
    rootsProcessed: z.number().int().nonnegative(),
    directoriesVisited: z.number().int().nonnegative(),
    filesDiscovered: z.number().int().nonnegative(),
    duplicatesSkipped: z.number().int().nonnegative(),
    pendingEntries: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((progress, context) => {
    if (progress.rootsProcessed > progress.rootsTotal) {
      context.addIssue({
        code: "custom",
        message: "Processed roots cannot exceed selected roots.",
        path: ["rootsProcessed"],
      });
    }
  });

export const mediaDiscoveryItemSchema = z
  .object({
    discoveryId: z.string().min(1),
    fileName: z.string().trim().min(1).max(1024),
    sizeBytes: z.number().int().nonnegative(),
  })
  .strict();

export const mediaDiscoveryIssueSchema = z
  .object({
    fileName: z.string().trim().min(1).max(1024),
    code: z.literal("MEDIA_DISCOVERY_FAILED"),
    message: z.string().trim().min(1).max(1000),
  })
  .strict();

export const mediaDiscoverySummarySchema = z
  .object({
    rootsSelected: z.number().int().nonnegative(),
    directoriesVisited: z.number().int().nonnegative(),
    filesDiscovered: z.number().int().nonnegative(),
    duplicatesSkipped: z.number().int().nonnegative(),
    issues: z.array(mediaDiscoveryIssueSchema),
    items: z.array(mediaDiscoveryItemSchema),
  })
  .strict()
  .superRefine((summary, context) => {
    if (summary.filesDiscovered !== summary.items.length) {
      context.addIssue({
        code: "custom",
        message: "filesDiscovered must equal the number of public items.",
        path: ["filesDiscovered"],
      });
    }
  });

export const mediaDiscoveryStatusResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("discovering"),
      batchId: z.string().min(1),
      progress: mediaDiscoveryProgressSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("completed"),
      batchId: z.string().min(1),
      summary: mediaDiscoverySummarySchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("cancelled"),
      batchId: z.string().min(1),
      code: z.literal("MEDIA_IMPORT_CANCELLED"),
      summary: mediaDiscoverySummarySchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      batchId: z.string().min(1),
      code: z.literal("MEDIA_DISCOVERY_FAILED"),
      message: z.string().trim().min(1).max(1000),
      summary: mediaDiscoverySummarySchema.optional(),
    })
    .strict(),
]);

export const mediaDiscoveryCancelResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("cancel-requested"),
      batchId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("not-running"),
      batchId: z.string().min(1),
    })
    .strict(),
]);

export type MediaDiscoveryPathRequest = z.infer<
  typeof mediaDiscoveryPathRequestSchema
>;
export type MediaDiscoveryStartResult = z.infer<
  typeof mediaDiscoveryStartResultSchema
>;
export type MediaDiscoveryProgress = z.infer<
  typeof mediaDiscoveryProgressSchema
>;
export type MediaDiscoveryItem = z.infer<typeof mediaDiscoveryItemSchema>;
export type MediaDiscoveryIssue = z.infer<typeof mediaDiscoveryIssueSchema>;
export type MediaDiscoverySummary = z.infer<typeof mediaDiscoverySummarySchema>;
export type MediaDiscoveryStatusResult = z.infer<
  typeof mediaDiscoveryStatusResultSchema
>;
export type MediaDiscoveryCancelResult = z.infer<
  typeof mediaDiscoveryCancelResultSchema
>;
