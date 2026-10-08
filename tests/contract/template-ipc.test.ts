import { describe, expect, it } from "vitest";
import {
  templateListResultSchema,
  templateLoadRequestSchema,
  templateLoadResultSchema,
  templateSaveRequestSchema,
  templateSaveResultSchema,
} from "../../src/core/contracts/template-ipc";

const template = {
  templateSchemaVersion: 1 as const,
  templateId: "local-safe",
  name: "Lokal Aman",
  category: "Minimal" as const,
  scene: { sceneVersion: 1 as const, layers: [] },
};

describe("T11-W05-06 strict local template IPC trust boundary", () => {
  it("accepts finite local catalog entries and rejects extras or arbitrary paths", () => {
    expect(templateListResultSchema.parse({
      status: "ok", entries: [
        { templateId: "local-safe", name: "Lokal Aman", category: "Minimal", origin: "user", readOnly: false },
      ],
    })).toMatchObject({ status: "ok", entries: [{ templateId: "local-safe" }] });
    expect(() => templateListResultSchema.parse({
      status: "ok", entries: [
        { templateId: "local-safe", name: "Lokal Aman", category: "Minimal", origin: "network", readOnly: false },
      ],
    })).toThrow();
    expect(() => templateListResultSchema.parse({ status: "ok", entries: [], absolutePath: "C:/private" })).toThrow();
  });

  it("load can request only validated template ID, not a filesystem traversal", () => {
    expect(templateLoadRequestSchema.parse({ templateId: "local-safe" })).toEqual({ templateId: "local-safe" });
    expect(() => templateLoadRequestSchema.parse({ templateId: "../../secrets" })).toThrow();
    expect(() => templateLoadRequestSchema.parse({ templateId: "C:/foo" })).toThrow();
    expect(() => templateLoadRequestSchema.parse({ templateId: "safe", options: { path: "secret" } })).toThrow();
  });

  it("save permits visual-only schema v1 and rejects protected project payloads", () => {
    expect(templateSaveRequestSchema.parse({ template }).template).toEqual(template);
    expect(() => templateSaveRequestSchema.parse({
      template: { ...template, tracks: [{ sourcePath: "C:/user/audio.mp3" }] },
    })).toThrow();
    expect(() => templateSaveRequestSchema.parse({
      template: { ...template, name: "C:/home/private.wav" },
    })).toThrow();
    expect(() => templateSaveRequestSchema.parse({
      template: { ...template, templateSchemaVersion: 2 },
    })).toThrow();
  });

  it("load and save responses preserve strict versioned documents and errors", () => {
    expect(templateLoadResultSchema.parse({ status: "ok", template }).status).toBe("ok");
    expect(templateLoadResultSchema.parse({
      status: "error", code: "TEMPLATE_INVALID", message: "Gagal",
    })).toMatchObject({ status: "error", code: "TEMPLATE_INVALID" });
    expect(templateSaveResultSchema.parse({
      status: "ok", templateId: "local-safe",
    })).toMatchObject({ status: "ok", templateId: "local-safe" });
    expect(() => templateSaveResultSchema.parse({
      status: "ok", templateId: "not/path",
    })).toThrow();
  });
});
