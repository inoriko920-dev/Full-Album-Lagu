import { z } from "zod";

export const projectLocationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unsaved") }).strict(),
  z.object({ kind: z.literal("known-path") }).strict(),
]);

export type ProjectLocation = z.infer<typeof projectLocationSchema>;
