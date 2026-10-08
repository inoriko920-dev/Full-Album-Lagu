import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  NodePreviewAudioLeaseStore,
} from "../../src/main/infrastructure/media/node-preview-audio-lease-store";

const directories: string[] = [];
const services: NodePreviewAudioLeaseStore[] = [];

async function sample(bytes: Uint8Array = Uint8Array.from([0, 1, 2, 3, 4, 5])) {
  const dir = await mkdtemp(join(tmpdir(), "lfa-w06-audio-"));
  directories.push(dir);
  const sourcePath = join(dir, "track.mp3");
  await writeFile(sourcePath, bytes);
  const gateway = new NodePreviewAudioLeaseStore();
  services.push(gateway);
  const token = await gateway.issueTrustedGrant({
    projectId: "project-A",
    assetId: "audio-A",
    ownerWebContentsId: 7,
    sourcePath,
  });
  return { gateway, token, sourcePath, bytes };
}

async function readBytes(stream: AsyncIterable<Buffer>) {
  const parts: Buffer[] = [];
  for await (const part of stream) parts.push(part);
  return Buffer.concat(parts);
}

afterEach(async () => {
  for (const gateway of services.splice(0)) gateway.close();
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("T11-W06-02 main-owned audio lease gateway", () => {
  it("streams only requested bytes via main-controlled token and 206 headers", async () => {
    const { gateway, token, bytes } = await sample();
    const result = await gateway.openRange({
      projectId: "project-A",
      ownerWebContentsId: 7,
      token,
      rangeHeader: "bytes=2-4",
    });
    expect(result.status).toBe(206);
    if (result.status !== 206) throw new Error("expected partial audio");
    expect(result.headers).toMatchObject({
      "Content-Type": "audio/mpeg",
      "Content-Range": "bytes 2-4/6",
      "Content-Length": "3",
      "Cache-Control": "no-store",
      "Accept-Ranges": "bytes",
    });
    expect(await readBytes(result.stream)).toEqual(Buffer.from(bytes.slice(2, 5)));
  });

  it("serves full media with 200 and no Content-Range", async () => {
    const { gateway, token, bytes } = await sample();
    const result = await gateway.openRange({
      projectId: "project-A",
      ownerWebContentsId: 7,
      token,
    });
    expect(result.status).toBe(200);
    if (result.status !== 200) throw new Error("expected full audio");
    expect(result.headers["Content-Range"]).toBeUndefined();
    expect(await readBytes(result.stream)).toEqual(Buffer.from(bytes));
  });

  it("never exposes media for an unknown token, wrong project or wrong window", async () => {
    const { gateway, token } = await sample();
    for (const change of [
      { token: "untrusted" },
      { projectId: "project-B" },
      { ownerWebContentsId: 8 },
    ]) {
      expect(
        await gateway.openRange({
          projectId: "project-A",
          ownerWebContentsId: 7,
          token,
          ...change,
        }),
      ).toEqual({ status: 403 });
    }
  });

  it("denies malformed, multiple and impossible ranges instead of leaking full source", async () => {
    const { gateway, token } = await sample();
    for (const rangeHeader of ["bytes=0-1,3-4", "bytes=2-1", "bytes=999-", "nope"]) {
      expect(
        await gateway.openRange({
          projectId: "project-A",
          ownerWebContentsId: 7,
          token,
          rangeHeader,
        }),
      ).toEqual({ status: 416 });
    }
  });

  it("invalidates a token when source bytes have been replaced", async () => {
    const { gateway, token, sourcePath } = await sample();
    await writeFile(sourcePath, Buffer.from("replaced-media-content"));
    expect(
      await gateway.openRange({
        projectId: "project-A",
        ownerWebContentsId: 7,
        token,
      }),
    ).toEqual({ status: 410 });
    expect(
      await gateway.openRange({
        projectId: "project-A",
        ownerWebContentsId: 7,
        token,
      }),
    ).toEqual({ status: 403 });
  });

  it("revokeProject, revokeWindow, and expiry fail closed", async () => {
    const { gateway, token } = await sample();
    gateway.revokeProject("project-B");
    gateway.revokeProject("project-A");
    expect(
      await gateway.openRange({
        token,
        projectId: "project-A",
        ownerWebContentsId: 7,
      }),
    ).toEqual({ status: 403 });

    let time = 1000;
    const other = new NodePreviewAudioLeaseStore(() => time, 10);
    services.push(other);
    const dir = await mkdtemp(join(tmpdir(), "lfa-w06-timeout-"));
    directories.push(dir);
    const sourcePath = join(dir, "audio.wav");
    await writeFile(sourcePath, Buffer.from("abcdef"));
    const token2 = await other.issueTrustedGrant({
      projectId: "project-Z",
      assetId: "audio-Z",
      ownerWebContentsId: 9,
      sourcePath,
    });
    time = 1010;
    expect(
      await other.openRange({
        token: token2,
        projectId: "project-Z",
        ownerWebContentsId: 9,
      }),
    ).toEqual({ status: 403 });
    other.revokeWindow(9);
  });

  it("rejects relative, unsupported and empty source at the main authorization boundary", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lfa-w06-invalid-"));
    directories.push(dir);
    const gateway = new NodePreviewAudioLeaseStore();
    services.push(gateway);
    const sourcePath = join(dir, "track.mp3");
    await writeFile(sourcePath, []);
    await expect(
      gateway.issueTrustedGrant({
        projectId: "p",
        assetId: "a",
        ownerWebContentsId: 1,
        sourcePath,
      }),
    ).rejects.toThrow("non-empty");
    await expect(
      gateway.issueTrustedGrant({
        projectId: "p",
        assetId: "a",
        ownerWebContentsId: 1,
        sourcePath: "track.mp3",
      }),
    ).rejects.toThrow("identity");
    await expect(
      gateway.issueTrustedGrant({
        projectId: "p",
        assetId: "a",
        ownerWebContentsId: 1,
        sourcePath: join(dir, "movie.mp4"),
      }),
    ).rejects.toThrow("only MP3 and WAV");
  });

  it("rejects a symlink to a file outside an issued trusted path", async () => {
    const { gateway, sourcePath } = await sample();
    const link = join(sourcePath, "..", "linked.mp3");
    try {
      await symlink(sourcePath, link, "file");
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        ["EPERM", "EACCES"].includes(String(error.code))
      ) return;
      throw error;
    }
    await expect(
      gateway.issueTrustedGrant({
        projectId: "project-A",
        assetId: "symlinked",
        ownerWebContentsId: 7,
        sourcePath: link,
      }),
    ).rejects.toThrow("symbolic link");
  });

  it("does not mutate source bytes across read and revoked sessions", async () => {
    const { gateway, token, bytes, sourcePath } = await sample();
    const before = await readFile(sourcePath);
    const result = await gateway.openRange({
      projectId: "project-A",
      ownerWebContentsId: 7,
      token,
      rangeHeader: "bytes=-2",
    });
    expect(result.status).toBe(206);
    if (result.status !== 206) throw new Error("expected partial audio");
    expect(await readBytes(result.stream)).toEqual(Buffer.from(bytes.slice(-2)));
    gateway.revokeWindow(7);
    expect(
      await gateway.openRange({
        token,
        projectId: "project-A",
        ownerWebContentsId: 7,
      }),
    ).toEqual({ status: 403 });
    expect(await readFile(sourcePath)).toEqual(before);
  });
});
