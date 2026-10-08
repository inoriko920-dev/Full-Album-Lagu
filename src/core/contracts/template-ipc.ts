import { z } from "zod";
import {
  templateCategorySchema,
  templateDocumentSchema,
  templateIdSchema,
} from "../domain/template-document";

export const TEMPLATE_LIST_CHANNEL = "lfa:template:list" as const;
export const TEMPLATE_LOAD_CHANNEL = "lfa:template:load" as const;
export const TEMPLATE_SAVE_CHANNEL = "lfa:template:save" as const;

export const templateCatalogEntrySchema = z
  .object({
    templateId: templateIdSchema,
    name: z.string().min(1).max(120),
    category: templateCategorySchema,
    origin: z.enum(["built-in", "user"]),
    readOnly: z.boolean(),
  })
  .strict();
export const templateListResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("ok"),
      entries: z.array(templateCatalogEntrySchema).max(2000),
    })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      code: z.string().max(64),
      message: z.string().max(300),
    })
    .strict(),
]);
export const templateLoadRequestSchema = z
  .object({ templateId: templateIdSchema })
  .strict();
export const templateLoadResultSchema = z.discriminatedUnion("status", [
  z
    .object({ status: z.literal("ok"), template: templateDocumentSchema })
    .strict(),
  z
    .object({
      status: z.literal("error"),
      code: z.string().max(64),
      message: z.string().max(300),
    })
    .strict(),
]);
export const templateSaveRequestSchema = z
  .object({ template: templateDocumentSchema })
  .strict();
export const templateSaveResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), templateId: templateIdSchema }).strict(),
  z
    .object({
      status: z.literal("error"),
      code: z.string().max(64),
      message: z.string().max(300),
    })
    .strict(),
]);
export type TemplateListResult = z.infer<typeof templateListResultSchema>;
export type TemplateLoadResult = z.infer<typeof templateLoadResultSchema>;
export type TemplateSaveResult = z.infer<typeof templateSaveResultSchema>;
