import { z } from "zod";
import { projectDocumentSchema } from "../domain/project-document";
import {
  mediaBatchProgressSchema,
  mediaBatchSummarySchema,
  mediaPublicErrorCodeSchema,
} from "./media-intake";

export const MEDIA_INTAKE_START_CHANNEL = "media:start-intake" as const;
export const MEDIA_INTAKE_STATUS_CHANNEL = "media:get-intake-status" as const;
export const MEDIA_INTAKE_CANCEL_CHANNEL = "media:cancel-intake" as const;

export const mediaIntakeStartRequestSchema = z
  .object({
    discoveryBatchId: z.string().min(1),
    project: projectDocumentSchema,
  })
  .strict();

export const mediaIntakeStartResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("started"),
      batchId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      code: mediaPublicErrorCodeSchema,
      message: z.string().trim().min(1).max(1000),
    })
    .strict(),
]);

export const mediaIntakeStatusRequestSchema = z
  .object({
    batchId: z.string().min(1),
  })
  .strict();

export const mediaIntakeCancelRequestSchema = mediaIntakeStatusRequestSchema;

export const mediaIntakeStatusResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("probing"),
      batchId: z.string().min(1),
      progress: mediaBatchProgressSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("committing"),
      batchId: z.string().min(1),
      progress: mediaBatchProgressSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("completed"),
      batchId: z.string().min(1),
      progress: mediaBatchProgressSchema,
      summary: mediaBatchSummarySchema,
      project: projectDocumentSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("cancelled"),
      batchId: z.string().min(1),
      code: z.literal("MEDIA_IMPORT_CANCELLED"),
      progress: mediaBatchProgressSchema,
      summary: mediaBatchSummarySchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      batchId: z.string().min(1),
      code: mediaPublicErrorCodeSchema,
      message: z.string().trim().min(1).max(1000),
      progress: mediaBatchProgressSchema.optional(),
      summary: mediaBatchSummarySchema.optional(),
    })
    .strict(),
]);

export const mediaIntakeCancelResultSchema = z.discriminatedUnion("status", [
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

export type MediaIntakeStartRequest = z.infer<
  typeof mediaIntakeStartRequestSchema
>;
export type MediaIntakeStartResult = z.infer<
  typeof mediaIntakeStartResultSchema
>;
export type MediaIntakeStatusResult = z.infer<
  typeof mediaIntakeStatusResultSchema
>;
export type MediaIntakeCancelResult = z.infer<
  typeof mediaIntakeCancelResultSchema
>;
