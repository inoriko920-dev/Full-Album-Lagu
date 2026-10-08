import { z } from "zod";
import { mediaIssueCodeSchema, mediaKindSchema } from "../domain/media-asset";
import { projectDocumentSchema } from "../domain/project-document";
import { mediaRelinkResultSchema } from "./media-intake";

export const MEDIA_MISSING_SCAN_CHANNEL = "media:scan-missing" as const;
export const MEDIA_RELINK_SINGLE_CHANNEL = "media:relink-single" as const;
export const MEDIA_RELINK_FOLDER_CHANNEL = "media:relink-folder" as const;

export const missingMediaScanRequestSchema = z
  .object({
    project: projectDocumentSchema,
  })
  .strict();

export const missingMediaScanItemSchema = z
  .object({
    assetId: z.string().min(1),
    fileName: z.string().trim().min(1).max(1024),
    kind: mediaKindSchema,
    required: z.boolean(),
    availability: z.enum(["missing", "invalid"]),
    code: mediaIssueCodeSchema,
  })
  .strict();

export const mediaReadinessBlockerSchema = z
  .object({
    assetId: z.string().min(1),
    fileName: z.string().trim().min(1).max(1024),
    kind: mediaKindSchema,
    code: z.enum([
      "REQUIRED_MEDIA_MISSING",
      "REQUIRED_MEDIA_INVALID",
      "REQUIRED_MEDIA_UNSUPPORTED",
    ]),
  })
  .strict();

export const missingMediaScanResultSchema = z
  .object({
    status: z.literal("scanned"),
    project: projectDocumentSchema,
    items: z.array(missingMediaScanItemSchema),
    readiness: z
      .object({
        ready: z.boolean(),
        blockers: z.array(mediaReadinessBlockerSchema),
      })
      .strict(),
  })
  .strict();

export const singleRelinkRequestSchema = z
  .object({
    project: projectDocumentSchema,
    assetId: z.string().min(1),
  })
  .strict();

export const singleRelinkOperationResultSchema = z.discriminatedUnion(
  "status",
  [
    z
      .object({
        status: z.literal("relinked"),
        previewBatchId: z.string().min(1).max(150).optional(),
        project: projectDocumentSchema,
        result: mediaRelinkResultSchema,
      })
      .strict(),
    z
      .object({
        status: z.literal("cancelled"),
        result: mediaRelinkResultSchema,
      })
      .strict(),
    z
      .object({
        status: z.literal("error"),
        result: mediaRelinkResultSchema,
      })
      .strict(),
  ],
);

export const folderRelinkRequestSchema = z
  .object({
    project: projectDocumentSchema,
  })
  .strict();

export const folderRelinkOperationResultSchema = z.discriminatedUnion(
  "status",
  [
    z
      .object({
        status: z.literal("completed"),
        previewBatchId: z.string().min(1).max(150).optional(),
        project: projectDocumentSchema,
        results: z.array(mediaRelinkResultSchema),
      })
      .strict(),
    z
      .object({
        status: z.literal("cancelled"),
        code: z.literal("RELINK_CANCELLED"),
      })
      .strict(),
    z
      .object({
        status: z.literal("error"),
        code: z.literal("RELINK_FAILED"),
        message: z.string().trim().min(1).max(1000),
      })
      .strict(),
  ],
);

export type MissingMediaScanRequest = z.infer<
  typeof missingMediaScanRequestSchema
>;
export type MissingMediaScanResult = z.infer<
  typeof missingMediaScanResultSchema
>;
export type SingleRelinkRequest = z.infer<typeof singleRelinkRequestSchema>;
export type SingleRelinkOperationResult = z.infer<
  typeof singleRelinkOperationResultSchema
>;
export type FolderRelinkRequest = z.infer<typeof folderRelinkRequestSchema>;
export type FolderRelinkOperationResult = z.infer<
  typeof folderRelinkOperationResultSchema
>;
