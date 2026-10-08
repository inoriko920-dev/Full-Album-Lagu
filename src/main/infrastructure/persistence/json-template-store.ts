import { randomUUID } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, join } from "node:path";
import {
  TemplateStoreError,
  type TemplateCatalogEntry,
  type TemplateStore,
} from "../../../core/application/ports/template-store";
import {
  templateDocumentSchema,
  templateIdSchema,
  type TemplateDocument,
} from "../../../core/domain/template-document";

const MAX_BUILT_IN_CATALOG_BYTES = 2 * 1024 * 1024;
const MAX_USER_TEMPLATE_BYTES = 8 * 1024 * 1024;

function nodeCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? String((error as NodeJS.ErrnoException).code)
    : undefined;
}

function validateTemplate(value: unknown): TemplateDocument {
  const parsed = templateDocumentSchema.safeParse(value);
  if (!parsed.success) {
    throw new TemplateStoreError(
      "TEMPLATE_INVALID",
      "Template is malformed or incompatible.",
    );
  }
  return parsed.data;
}

async function readTemplateFile(path: string): Promise<TemplateDocument> {
  let raw: string;
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.size > MAX_USER_TEMPLATE_BYTES) {
      throw new TemplateStoreError(
        "TEMPLATE_INVALID",
        "Template file is invalid.",
      );
    }
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof TemplateStoreError) throw error;
    if (nodeCode(error) === "ENOENT") {
      throw new TemplateStoreError("TEMPLATE_NOT_FOUND", "Template not found.");
    }
    throw new TemplateStoreError(
      "TEMPLATE_READ_FAILED",
      "Template could not be read.",
    );
  }

  try {
    return validateTemplate(JSON.parse(raw));
  } catch (error) {
    if (error instanceof TemplateStoreError) throw error;
    throw new TemplateStoreError(
      "TEMPLATE_INVALID",
      "Template JSON is invalid.",
    );
  }
}

function asCatalogEntry(
  template: TemplateDocument,
  origin: TemplateCatalogEntry["origin"],
): TemplateCatalogEntry {
  return {
    templateId: template.templateId,
    name: template.name,
    category: template.category,
    origin,
    readOnly: origin === "built-in",
  };
}

export class JsonTemplateStore implements TemplateStore {
  constructor(
    private readonly builtInCatalogPath: () => string,
    private readonly userRoot: () => string,
  ) {}

  private async readBuiltIns(): Promise<TemplateDocument[]> {
    const path = this.builtInCatalogPath();
    let raw: string;
    try {
      const metadata = await lstat(path);
      if (!metadata.isFile() || metadata.size > MAX_BUILT_IN_CATALOG_BYTES) {
        throw new TemplateStoreError(
          "TEMPLATE_INVALID",
          "Built-in template catalog is invalid.",
        );
      }
      raw = await readFile(path, "utf8");
    } catch (error) {
      if (error instanceof TemplateStoreError) throw error;
      throw new TemplateStoreError(
        "TEMPLATE_READ_FAILED",
        "Built-in template catalog is unavailable.",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new TemplateStoreError(
        "TEMPLATE_INVALID",
        "Built-in template catalog contains invalid JSON.",
      );
    }

    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 100) {
      throw new TemplateStoreError(
        "TEMPLATE_INVALID",
        "Built-in catalog is invalid.",
      );
    }
    const templates = parsed.map(validateTemplate);
    const ids = templates.map((entry) => entry.templateId);
    if (new Set(ids).size !== ids.length) {
      throw new TemplateStoreError(
        "TEMPLATE_INVALID",
        "Built-in template IDs repeat.",
      );
    }
    return templates;
  }

  async list(): Promise<TemplateCatalogEntry[]> {
    const builtIns = await this.readBuiltIns();
    const reserved = new Set(builtIns.map((template) => template.templateId));
    const entries = builtIns.map((template) =>
      asCatalogEntry(template, "built-in"),
    );
    let fileNames: string[];

    try {
      fileNames = (await readdir(this.userRoot()))
        .filter((name) => name.endsWith(".template.json"))
        .sort((a, b) => a.localeCompare(b, "en-US"));
    } catch (error) {
      if (nodeCode(error) === "ENOENT") return entries;
      throw new TemplateStoreError(
        "TEMPLATE_READ_FAILED",
        "User template catalog could not be listed.",
      );
    }

    for (const fileName of fileNames) {
      const id = fileName.slice(0, -".template.json".length);
      if (!templateIdSchema.safeParse(id).success || reserved.has(id)) continue;
      try {
        const template = await readTemplateFile(
          join(this.userRoot(), fileName),
        );
        if (template.templateId !== id) continue;
        entries.push(asCatalogEntry(template, "user"));
      } catch {
        // A corrupt individual user file cannot hide all other valid templates.
      }
    }
    return entries;
  }

  async load(templateIdInput: string): Promise<TemplateDocument> {
    const templateId = templateIdSchema.parse(templateIdInput);
    const builtIns = await this.readBuiltIns();
    const builtIn = builtIns.find((item) => item.templateId === templateId);
    if (builtIn !== undefined)
      return validateTemplate(structuredClone(builtIn));

    const userTemplate = await readTemplateFile(
      join(this.userRoot(), `${templateId}.template.json`),
    );
    if (userTemplate.templateId !== templateId) {
      throw new TemplateStoreError(
        "TEMPLATE_INVALID",
        "Template file and document identities disagree.",
      );
    }
    return userTemplate;
  }

  async saveUserTemplate(input: TemplateDocument): Promise<void> {
    const template = validateTemplate(input);
    const reserved = await this.readBuiltIns();
    if (reserved.some((item) => item.templateId === template.templateId)) {
      throw new TemplateStoreError(
        "TEMPLATE_EXISTS",
        "Built-in templates cannot be overwritten.",
      );
    }

    const payload = `${JSON.stringify(template, null, 2)}\n`;
    // Never acknowledge a save that the guarded reader would later reject.
    if (Buffer.byteLength(payload, "utf8") > MAX_USER_TEMPLATE_BYTES) {
      throw new TemplateStoreError(
        "TEMPLATE_INVALID",
        "Template exceeds the maximum supported file size.",
      );
    }

    const root = this.userRoot();
    const target = join(root, `${template.templateId}.template.json`);
    const temporary = join(
      root,
      `.${basename(target)}.${process.pid}.${randomUUID()}.tmp`,
    );

    try {
      await mkdir(root, { recursive: true });
      await writeFile(temporary, payload, {
        encoding: "utf8",
        flag: "wx",
      });
      // Same-directory hard link creates the final file without replacing an
      // existing user template. The temporary file is removed in finally.
      await link(temporary, target);
    } catch (error) {
      if (nodeCode(error) === "EEXIST") {
        throw new TemplateStoreError(
          "TEMPLATE_EXISTS",
          "Template ID already exists.",
        );
      }
      throw new TemplateStoreError(
        "TEMPLATE_WRITE_FAILED",
        "User template could not be saved.",
      );
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  }
}
