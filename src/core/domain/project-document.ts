import { z } from "zod";

export const PROJECT_SCHEMA_VERSION = 1 as const;

export const projectTrackSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    sourcePath: z.string().min(1),
  })
  .passthrough();

export const projectDocumentSchema = z
  .object({
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    projectId: z.string().min(1),
    name: z.string().trim().min(1).max(200),
    revision: z.number().int().nonnegative(),
    tracks: z.array(projectTrackSchema),
  })
  .passthrough();

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
