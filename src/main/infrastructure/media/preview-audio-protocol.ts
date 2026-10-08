import { Readable } from "node:stream";
import type { NodePreviewAudioLeaseStore } from "./node-preview-audio-lease-store";

/**
 * Dedicated, non-http app-private preview URL. Tokens are 256-bit secrets.
 * Register a protocol handler ONLY in a dedicated Electron session that
 * belongs to the authorized window, never as a global unscoped file server.
 */
export const PREVIEW_AUDIO_SCHEME = "lfa-preview" as const;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export interface PreviewAudioProtocolContext {
  readonly projectId: string;
  readonly ownerWebContentsId: number;
}

function noStoreResponse(status: 403 | 405 | 410): Response {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function parseToken(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== `${PREVIEW_AUDIO_SCHEME}:` ||
      url.hostname !== "media" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      !/^\/[0-9a-f]{64}$/.test(url.pathname)
    ) {
      return null;
    }
    const token = url.pathname.slice(1);
    return TOKEN_PATTERN.test(token) ? token : null;
  } catch {
    return null;
  }
}

/**
 * Pure HTTP Response adapter for a separately authorized main-owned stream.
 * This adapter does NOT mint tokens, accept a path, or expose a new IPC method.
 * Future Electron protocol registration must bind the context to the actual
 * current window/session identity in MAIN (not to untrusted request params).
 */
export async function createPreviewAudioProtocolResponse(
  request: Request,
  context: PreviewAudioProtocolContext,
  store: NodePreviewAudioLeaseStore,
): Promise<Response> {
  if (request.method !== "GET") return noStoreResponse(405);

  const token = parseToken(request.url);
  if (token === null) return noStoreResponse(403);

  const rangeHeader = request.headers.get("range");
  const result = await store.openRange({
    token,
    projectId: context.projectId,
    ownerWebContentsId: context.ownerWebContentsId,
    ...(rangeHeader === null ? {} : { rangeHeader }),
  });

  if (result.status === 416) {
    return new Response(null, {
      status: 416,
      headers: result.headers,
    });
  }
  if (!("stream" in result)) {
    return noStoreResponse(result.status);
  }

  // Pipe the original read-only FileHandle stream; never concatenate an
  // entire album into an IPC byte array or a memory-resident Blob.
  return new Response(Readable.toWeb(result.stream) as unknown as BodyInit, {
    status: result.status,
    headers: result.headers,
  });
}
