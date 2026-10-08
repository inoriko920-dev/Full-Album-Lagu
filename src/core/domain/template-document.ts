import { z } from "zod";
import { visualSceneSchema } from "./visual-scene-schema";

export const TEMPLATE_SCHEMA_VERSION = 1 as const;

export const templateCategorySchema = z.enum([
  "Minimal",
  "Premium",
  "Neon",
  "Ambient",
  "Classic Album",
  "Dark",
  "Light",
  "Retro",
  "Motion",
]);

export const templateIdSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/);

function containsPrivatePath(value: unknown): boolean {
  if (typeof value === "string") {
    return (
      /[a-z]:[\\/]/i.test(value) ||
      /\\\\[^\\/\s]+[\\/]/.test(value) ||
      /(?:^|\s)\/(?:users|home|mnt|media|volumes)\//i.test(value) ||
      /file:\/\//i.test(value)
    );
  }
  if (Array.isArray(value)) {
    return value.some(containsPrivatePath);
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(containsPrivatePath);
  }
  return false;
}

export const templateDocumentSchema = z
  .object({
    templateSchemaVersion: z.literal(TEMPLATE_SCHEMA_VERSION),
    templateId: templateIdSchema,
    name: z.string().trim().min(1).max(120),
    category: templateCategorySchema,
    scene: visualSceneSchema,
  })
  .strict()
  .superRefine((template, context) => {
    if (containsPrivatePath(template)) {
      context.addIssue({
        code: "custom",
        message: "Templates cannot contain absolute media paths or file URLs.",
        path: ["scene"],
      });
    }
  });

export type TemplateCategory = z.infer<typeof templateCategorySchema>;
export type TemplateDocument = z.infer<typeof templateDocumentSchema>;
