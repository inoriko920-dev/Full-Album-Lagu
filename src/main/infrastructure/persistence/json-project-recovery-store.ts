import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { ZodError } from "zod";
import {
  ProjectRecoveryStoreError,
  type ProjectRecoveryStore,
} from "../../../core/application/ports/project-recovery-store";
import {
  recoverySnapshotSchema,
  type RecoverySnapshot,
} from "../../../core/contracts/project-recovery";

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export type RecoveryRootProvider = () => string;

export class JsonProjectRecoveryStore implements ProjectRecoveryStore {
  constructor(private readonly recoveryRoot: RecoveryRootProvider) {}

  async save(projectId: string, snapshot: RecoverySnapshot): Promise<void> {
    const validated = recoverySnapshotSchema.parse(snapshot);
    const path = this.getArtifactPath(projectId);
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
      throw new ProjectRecoveryStoreError(
        "AUTOSAVE_WRITE_FAILED",
        "Recovery artifact could not be written.",
      );
    }
  }

  async load(projectId: string): Promise<RecoverySnapshot | null> {
    const path = this.getArtifactPath(projectId);
    let raw: string;

    try {
      raw = await readFile(path, "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return null;
      }
      throw new ProjectRecoveryStoreError(
        "RECOVERY_INVALID",
        "Recovery artifact could not be read.",
      );
    }

    try {
      return recoverySnapshotSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        throw new ProjectRecoveryStoreError(
          "RECOVERY_INVALID",
          "Recovery artifact is invalid or incomplete.",
        );
      }
      throw error;
    }
  }

  async remove(projectId: string): Promise<boolean> {
    const path = this.getArtifactPath(projectId);

    try {
      await unlink(path);
      return true;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return false;
      }
      throw new ProjectRecoveryStoreError(
        "AUTOSAVE_WRITE_FAILED",
        "Recovery artifact could not be discarded.",
      );
    }
  }

  private getArtifactPath(projectId: string): string {
    const key = createHash("sha256").update(projectId, "utf8").digest("hex");
    return join(this.recoveryRoot(), `${key}.recovery.json`);
  }
}
