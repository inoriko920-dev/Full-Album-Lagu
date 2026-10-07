import { z } from "zod";
import { projectDocumentSchema } from "../domain/project-document";

export const PROJECT_AUTOSAVE_CHANNEL = "project:autosave-recovery" as const;
export const PROJECT_RECOVERY_STATUS_CHANNEL =
  "project:get-recovery-status" as const;
export const PROJECT_RECOVERY_ACCEPT_CHANNEL =
  "project:accept-recovery" as const;
export const PROJECT_RECOVERY_DISCARD_CHANNEL =
  "project:discard-recovery" as const;

export const recoveryErrorCodeSchema = z.enum([
  "RECOVERY_INVALID",
  "RECOVERY_STALE",
  "AUTOSAVE_WRITE_FAILED",
]);

export const recoverySnapshotSchema = z
  .object({
    recoverySchemaVersion: z.literal(1),
    generation: z.number().int().positive(),
    capturedAt: z.string().datetime(),
    savedRevision: z.number().int().nonnegative(),
    project: projectDocumentSchema,
  })
  .strict();

export const autosaveRecoveryRequestSchema = z
  .object({
    project: projectDocumentSchema,
    savedRevision: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.savedRevision > value.project.revision) {
      context.addIssue({
        code: "custom",
        message: "Saved revision cannot be newer than the project revision.",
        path: ["savedRevision"],
      });
    }
  });

export const autosaveRecoveryResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("saved"),
      generation: z.number().int().positive(),
      projectRevision: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      status: z.literal("skipped"),
      reason: z.literal("clean"),
    })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      code: z.enum(["RECOVERY_INVALID", "AUTOSAVE_WRITE_FAILED"]),
      message: z.string().min(1),
    })
    .strict(),
]);

export const recoveryStatusRequestSchema = z
  .object({
    primaryProject: projectDocumentSchema,
  })
  .strict();

export const recoveryStatusResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("none") }).strict(),
  z
    .object({
      status: z.literal("available"),
      generation: z.number().int().positive(),
      project: projectDocumentSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal("stale"),
      code: z.literal("RECOVERY_STALE"),
      message: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("invalid"),
      code: z.literal("RECOVERY_INVALID"),
      message: z.string().min(1),
    })
    .strict(),
]);

export const recoveryAcceptRequestSchema = recoveryStatusRequestSchema;

export const recoveryAcceptResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("recovered"),
      generation: z.number().int().positive(),
      project: projectDocumentSchema,
    })
    .strict(),
  z.object({ status: z.literal("none") }).strict(),
  z
    .object({
      status: z.literal("stale"),
      code: z.literal("RECOVERY_STALE"),
      message: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      code: z.literal("RECOVERY_INVALID"),
      message: z.string().min(1),
    })
    .strict(),
]);

export const recoveryDiscardRequestSchema = z
  .object({
    projectId: z.string().min(1),
  })
  .strict();

export const recoveryDiscardResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("discarded") }).strict(),
  z.object({ status: z.literal("none") }).strict(),
  z
    .object({
      status: z.literal("error"),
      code: z.enum(["RECOVERY_INVALID", "AUTOSAVE_WRITE_FAILED"]),
      message: z.string().min(1),
    })
    .strict(),
]);

export type RecoveryErrorCode = z.infer<typeof recoveryErrorCodeSchema>;
export type RecoverySnapshot = z.infer<typeof recoverySnapshotSchema>;
export type AutosaveRecoveryRequest = z.infer<
  typeof autosaveRecoveryRequestSchema
>;
export type AutosaveRecoveryResult = z.infer<
  typeof autosaveRecoveryResultSchema
>;
export type RecoveryStatusRequest = z.infer<typeof recoveryStatusRequestSchema>;
export type RecoveryStatusResult = z.infer<typeof recoveryStatusResultSchema>;
export type RecoveryAcceptRequest = z.infer<typeof recoveryAcceptRequestSchema>;
export type RecoveryAcceptResult = z.infer<typeof recoveryAcceptResultSchema>;
export type RecoveryDiscardRequest = z.infer<
  typeof recoveryDiscardRequestSchema
>;
export type RecoveryDiscardResult = z.infer<
  typeof recoveryDiscardResultSchema
>;
