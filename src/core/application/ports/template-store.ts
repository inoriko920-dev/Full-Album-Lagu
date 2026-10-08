import type { TemplateDocument } from "../../domain/template-document";

export type TemplateStoreErrorCode =
  | "TEMPLATE_NOT_FOUND"
  | "TEMPLATE_EXISTS"
  | "TEMPLATE_INVALID"
  | "TEMPLATE_READ_FAILED"
  | "TEMPLATE_WRITE_FAILED";

export class TemplateStoreError extends Error {
  constructor(
    public readonly code: TemplateStoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TemplateStoreError";
  }
}

export interface TemplateCatalogEntry {
  templateId: string;
  name: string;
  category: TemplateDocument["category"];
  origin: "built-in" | "user";
  readOnly: boolean;
}

export interface TemplateStore {
  list(): Promise<TemplateCatalogEntry[]>;
  load(templateId: string): Promise<TemplateDocument>;
  saveUserTemplate(template: TemplateDocument): Promise<void>;
}
