import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodePreviewAudioLeaseStore } from "../../src/main/infrastructure/media/node-preview-audio-lease-store";
import {
  createPreviewAudioProtocolResponse,
  PREVIEW_AUDIO_SCHEME,
} from "../../src/main/infrastructure/media/preview-audio-protocol";

const tmp: string[] = [];
const stores: NodePreviewAudioLeaseStore[] = [];

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "lfa-preview-proto-"));
  tmp.push(directory);
  const sourcePath = join(directory, "track.wav");
  await writeFile(sourcePath, Buffer.from([82, 73, 70, 70, 0, 1, 2, 3]));
  const store = new NodePreviewAudioLeaseStore();
  stores.push(store);
  const token = await store.issueTrustedGrant({
    projectId: "trusted-project",
    assetId: "trusted-asset",
    ownerWebContentsId: 7,
    sourcePath,
  });
  const context = {
    projectId: "trusted-project",
    ownerWebContentsId: 7,
  };
  const makeRequest = (range?: string) =>
    new Request(`${PREVIEW_AUDIO_SCHEME}://media/${token}`, {
      ...(range === undefined ? {} : { headers: { Range: range } }),
    });
  return { token, store, context, makeRequest };
}

afterEach(async () => {
  for (const store of stores.splice(0)) store.close();
  await Promise.all(
    tmp.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("W11-06 private audio protocol HTTP response adapter", () => {
  it("returns exact byte-range 206 with real bytes and secure headers", async () => {
    const { store, context, makeRequest } = await fixture();
    const response = await createPreviewAudioProtocolResponse(
      makeRequest("bytes=4-5"),
      context,
      store,
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 4-5/8");
    expect(response.headers.get("Content-Length")).toBe("2");
    expect(response.headers.get("Content-Type")).toBe("audio/wav");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from([0, 1]),
    );
  });

  it("allows a real full stream without allocating a project-sized IPC blob", async () => {
    const { store, context, makeRequest } = await fixture();
    const response = await createPreviewAudioProtocolResponse(
      makeRequest(),
      context,
      store,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Range")).toBeNull();
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from([82, 73, 70, 70, 0, 1, 2, 3]),
    );
  });

  it("returns HTTP 416 and the standards-compatible unsatisfied range", async () => {
    const { store, context, makeRequest } = await fixture();
    const response = await createPreviewAudioProtocolResponse(
      makeRequest("bytes=900-"),
      context,
      store,
    );
    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */8");
    expect(response.body).toBeNull();
  });

  it("rejects malformed URLs, path traversal, query strings and methods", async () => {
    const { token, store, context } = await fixture();
    for (const url of [
      `${PREVIEW_AUDIO_SCHEME}://media/not-a-token`,
      `${PREVIEW_AUDIO_SCHEME}://media/${token}/extra`,
      `${PREVIEW_AUDIO_SCHEME}://media/${token}?path=C:%5Csecret`,
      `${PREVIEW_AUDIO_SCHEME}://media/${token}#fragment`,
      `file:///C:/Music/${token}`,
      `https://media/${token}`,
    ]) {
      const response = await createPreviewAudioProtocolResponse(
        new Request(url),
        context,
        store,
      );
      expect(response.status).toBe(403);
    }
    expect(
      (
        await createPreviewAudioProtocolResponse(
          new Request(`${PREVIEW_AUDIO_SCHEME}://media/${token}`, {
            method: "POST",
          }),
          context,
          store,
        )
      ).status,
    ).toBe(405);
  });

  it("rejects another project/window even with a valid token", async () => {
    const { store, context, makeRequest } = await fixture();
    for (const untrusted of [
      { ...context, projectId: "another-project" },
      { ...context, ownerWebContentsId: 99 },
    ]) {
      const response = await createPreviewAudioProtocolResponse(
        makeRequest(),
        untrusted,
        store,
      );
      expect(response.status).toBe(403);
    }
  });

  it("rejects revoked access and does not reveal file paths", async () => {
    const { token, store, context, makeRequest } = await fixture();
    store.revoke(token);
    const response = await createPreviewAudioProtocolResponse(
      makeRequest(),
      context,
      store,
    );
    expect(response.status).toBe(403);
    expect(response.body).toBeNull();
    expect([...response.headers.values()].join(" ")).not.toContain("tmp");
  });
});
