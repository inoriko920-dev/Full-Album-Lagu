import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, resolve } from "node:path";
import { Readable } from "node:stream";
import { planPreviewAudioByteRange } from "./preview-audio-byte-range";

const AUDIO_MIME = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
} as const;

interface TrustedAudioSource {
  readonly projectId: string;
  readonly assetId: string;
  readonly ownerWebContentsId: number;
  /** Main-owned import/probe path; NEVER copy a path from renderer IPC. */
  readonly sourcePath: string;
}

interface AudioGrant {
  readonly projectId: string;
  readonly assetId: string;
  readonly ownerWebContentsId: number;
  readonly canonicalPath: string;
  readonly dev: number;
  readonly ino: number;
  readonly mtimeMs: number;
  readonly sizeBytes: number;
  readonly mime: string;
  expiresAtMs: number;
}

export type PreviewAudioStreamResult =
  | {
      status: 200 | 206;
      headers: Readonly<Record<string, string>>;
      stream: Readable;
    }
  | { status: 403 | 410 }
  | { status: 416; headers: Readonly<Record<string, string>> };

export interface PreviewAudioRequest {
  token: string;
  projectId: string;
  ownerWebContentsId: number;
  rangeHeader?: string;
}

/**
 * Main-process only audio leases. No URL/file path is returned to the renderer.
 * The caller that creates a lease MUST have independently authenticated the
 * source from a main-owned picker/import/probe, not from ProjectDocument IPC.
 * This class does not install an Electron protocol handler or IPC endpoint.
 */
export class NodePreviewAudioLeaseStore {
  private readonly grants = new Map<string, AudioGrant>();
  private readonly active = new Map<string, Set<Readable>>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly ttlMs = 60_000,
  ) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > 300_000) {
      throw new Error("Audio lease timeout must be between 1ms and 5min.");
    }
  }

  async issueTrustedGrant(source: TrustedAudioSource): Promise<string> {
    if (
      !source.projectId ||
      !source.assetId ||
      !Number.isSafeInteger(source.ownerWebContentsId) ||
      source.ownerWebContentsId < 0 ||
      !isAbsolute(source.sourcePath) ||
      source.sourcePath.includes("\0")
    ) {
      throw new Error("Invalid trusted audio grant identity.");
    }

    const extension = extname(source.sourcePath).toLowerCase();
    const mime = AUDIO_MIME[extension as keyof typeof AUDIO_MIME];
    if (mime === undefined) {
      throw new Error("Audio preview supports only MP3 and WAV.");
    }

    const filePath = resolve(source.sourcePath);
    // Reject a final-component symlink without rejecting legitimate Windows
    // canonical path aliases (drive casing, long-path prefix, temp junctions).
    if (!(await lstat(filePath)).isFile()) {
      throw new Error("Audio source cannot traverse a symbolic link.");
    }
    const canonicalPath = await realpath(filePath);
    const info = await stat(canonicalPath);
    if (!info.isFile() || !Number.isSafeInteger(info.size) || info.size <= 0) {
      throw new Error("Audio source must be a non-empty regular file.");
    }

    const token = randomBytes(32).toString("hex");
    this.grants.set(token, {
      projectId: source.projectId,
      assetId: source.assetId,
      ownerWebContentsId: source.ownerWebContentsId,
      canonicalPath,
      dev: info.dev,
      ino: info.ino,
      mtimeMs: info.mtimeMs,
      sizeBytes: info.size,
      mime,
      expiresAtMs: this.now() + this.ttlMs,
    });
    return token;
  }

  async openRange(
    request: PreviewAudioRequest,
  ): Promise<PreviewAudioStreamResult> {
    const grant = this.grants.get(request.token);
    if (
      grant === undefined ||
      grant.projectId !== request.projectId ||
      grant.ownerWebContentsId !== request.ownerWebContentsId ||
      this.now() >= grant.expiresAtMs
    ) {
      return { status: 403 };
    }

    const plan = planPreviewAudioByteRange(
      grant.sizeBytes,
      request.rangeHeader,
    );
    if (plan.status === "invalid" || plan.status === "unsatisfiable") {
      return {
        status: 416,
        headers: {
          "Content-Range": `bytes */${grant.sizeBytes}`,
          "Content-Length": "0",
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      };
    }

    let handle;
    try {
      const canonicalNow = await realpath(grant.canonicalPath);
      const current = await lstat(grant.canonicalPath);
      if (
        !current.isFile() ||
        canonicalNow.toLowerCase() !== grant.canonicalPath.toLowerCase()
      ) {
        this.revoke(request.token);
        return { status: 410 };
      }
      handle = await open(
        grant.canonicalPath,
        constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
      );
      const opened = await handle.stat();
      if (
        !opened.isFile() ||
        opened.size !== grant.sizeBytes ||
        opened.dev !== grant.dev ||
        opened.ino !== grant.ino ||
        opened.mtimeMs !== grant.mtimeMs
      ) {
        await handle.close();
        this.revoke(request.token);
        return { status: 410 };
      }
    } catch {
      if (handle !== undefined) await handle.close().catch(() => undefined);
      this.revoke(request.token);
      return { status: 410 };
    }

    // Parallel browser Range requests share one grant instance. Refresh the
    // deadline in place to avoid invalidating another in-flight request.
    // A concurrent revoke must not resurrect a token while fs.stat awaits.
    if (
      this.grants.get(request.token) !== grant ||
      this.now() >= grant.expiresAtMs
    ) {
      await handle.close();
      return { status: 403 };
    }
    grant.expiresAtMs = this.now() + this.ttlMs;

    const stream = handle.createReadStream({
      start: plan.start,
      end: plan.end,
      autoClose: true,
    });
    const streams = this.active.get(request.token) ?? new Set<Readable>();
    streams.add(stream);
    this.active.set(request.token, streams);
    const onClosed = () => {
      streams.delete(stream);
      if (streams.size === 0) this.active.delete(request.token);
    };
    stream.once("close", onClosed);

    return {
      status: plan.status === "partial" ? 206 : 200,
      headers: {
        "Content-Type": grant.mime,
        "Accept-Ranges": "bytes",
        "Content-Length": String(plan.length),
        ...(plan.status === "partial"
          ? {
              "Content-Range": `bytes ${plan.start}-${plan.end}/${grant.sizeBytes}`,
            }
          : {}),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
      stream,
    };
  }

  revoke(token: string): void {
    this.grants.delete(token);
    for (const stream of this.active.get(token) ?? []) stream.destroy();
    this.active.delete(token);
  }

  revokeProject(projectId: string): void {
    for (const [token, grant] of this.grants) {
      if (grant.projectId === projectId) this.revoke(token);
    }
  }

  revokeWindow(ownerWebContentsId: number): void {
    for (const [token, grant] of this.grants) {
      if (grant.ownerWebContentsId === ownerWebContentsId) this.revoke(token);
    }
  }

  close(): void {
    for (const token of this.grants.keys()) this.revoke(token);
  }
}
