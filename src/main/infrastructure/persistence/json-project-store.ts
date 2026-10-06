import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { ZodError } from "zod";
import {
  ProjectStoreError,
  type ProjectStore,
} from "../../../core/application/ports/project-store";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../../core/domain/project-document";

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export class JsonProjectStore implements ProjectStore {
  async save(path: string, project: ProjectDocument): Promise<void> {
    const validated = projectDocumentSchema.parse(project);
    const directory = dirname(path);
    const temporaryPath = join(
      directory,
      `.${basename(path)}.${process.pid}.${Date.now()}.tmp`,
    );

    await mkdir(directory, { recursive: true });

    try {
      await writeFile(
        temporaryPath,
        `${JSON.stringify(validated, null, 2)}\n`,
        "utf8",
      );
      await rename(temporaryPath, path);
    } catch {
      await unlink(temporaryPath).catch(() => undefined);
      throw new ProjectStoreError(
        "PROJECT_WRITE_FAILED",
        "Project file could not be written.",
      );
    }
  }

  async load(path: string): Promise<ProjectDocument> {
    let raw: string;

    try {
      raw = await readFile(path, "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        throw new ProjectStoreError(
          "PROJECT_NOT_FOUND",
          "Project file was not found.",
        );
      }
      throw new ProjectStoreError(
        "PROJECT_READ_FAILED",
        "Project file could not be read.",
      );
    }

    try {
      return projectDocumentSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        throw new ProjectStoreError(
          "PROJECT_INVALID",
          "Project file is invalid or incompatible.",
        );
      }
      throw error;
    }
  }
}
