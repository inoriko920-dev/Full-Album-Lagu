import { z } from "zod";
import { projectDocumentSchema } from "../domain/project-document";

export const PROJECT_SAVE_CHANNEL = "project:save" as const;
export const PROJECT_STARTUP_CHANNEL = "project:get-startup" as const;

export const saveProjectRequestSchema = z.object({
  project: projectDocumentSchema,
});

export const projectPersistenceErrorCodeSchema = z.enum([
  "PROJECT_INVALID",
  "PROJECT_NOT_FOUND",
  "PROJECT_READ_FAILED",
  "PROJECT_WRITE_FAILED",
]);

export const saveProjectResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("saved"),
    projectRevision: z.number().int().nonnegative(),
  }),
  z.object({
    status: z.literal("cancelled"),
  }),
  z.object({
    status: z.literal("error"),
    code: projectPersistenceErrorCodeSchema,
    message: z.string().min(1),
  }),
]);

export const startupProjectResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("none"),
  }),
  z.object({
    status: z.literal("loaded"),
    project: projectDocumentSchema,
  }),
  z.object({
    status: z.literal("error"),
    code: projectPersistenceErrorCodeSchema,
    message: z.string().min(1),
  }),
]);

export type SaveProjectRequest = z.infer<typeof saveProjectRequestSchema>;
export type SaveProjectResult = z.infer<typeof saveProjectResultSchema>;
export type StartupProjectResult = z.infer<typeof startupProjectResultSchema>;
export type ProjectPersistenceErrorCode = z.infer<
  typeof projectPersistenceErrorCodeSchema
>;
