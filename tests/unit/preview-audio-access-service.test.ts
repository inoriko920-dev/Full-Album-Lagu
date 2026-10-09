import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodePreviewAudioLeaseStore } from "../../src/main/infrastructure/media/node-preview-audio-lease-store";
import {
  PreviewAudioAccessService,
  type TrustedIntakeLookup,
} from "../../src/main/infrastructure/media/preview-audio-access-service";
import { createPreviewAudioProtocolResponse } from "../../src/main/infrastructure/media/preview-audio-protocol";

const directories: string[] = [];
const services: PreviewAudioAccessService[] = [];

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "lfa-w06-access-"));
  directories.push(directory);
  const sourcePath = join(directory, "real-track.wav");
  await writeFile(sourcePath, Buffer.from("RIFF1234"));
  const source = {
    sourcePath,
    fileName: "real-track.wav",
    sizeBytes: 8,
  };
  const lookup: TrustedIntakeLookup = {
    getTrustedAudioSource(batch, project, asset) {
      return project === "project-1" &&
        ((batch === "intake-1" && asset === "asset-ready") ||
          (batch === "intake-2" && asset === "asset-second"))
        ? source
        : null;
    },
  };
  const store = new NodePreviewAudioLeaseStore();
  const service = new PreviewAudioAccessService(store, lookup);
  services.push(service);
  return { service, store, source };
}

afterEach(async () => {
  for (const service of services.splice(0)) service.close();
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe("W11-06 main-owned preview grant authorization", () => {
  it("issues only from a main-picked discovery and completed valid intake", async () => {
    const { service, store } = await fixture();
    service.trustPickerDiscovery(7, "picked-1");
    expect(service.bindIntake(7, "picked-1", "intake-1", "project-1")).toBe(
      true,
    );
    const uri = await service.issue({
      ownerWebContentsId: 7,
      batchId: "intake-1",
      projectId: "project-1",
      assetId: "asset-ready",
    });
    expect(uri).toMatch(/^lfa-preview:\/\/media\/[0-9a-f]{64}$/);
    if (uri === null) throw new Error("Expected authorized token");
    const response = await createPreviewAudioProtocolResponse(
      new Request(uri, { headers: { Range: "bytes=0-3" } }),
      { projectId: "project-1", ownerWebContentsId: 7 },
      store,
    );
    expect(response.status).toBe(206);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from("RIFF"),
    );
  });

  it("rejects forged renderer dropped-file and wrong picker owners", async () => {
    const { service } = await fixture();
    expect(service.bindIntake(7, "drop-1", "intake-1", "project-1")).toBe(
      false,
    );
    service.trustPickerDiscovery(7, "picked-1");
    expect(service.bindIntake(8, "picked-1", "intake-1", "project-1")).toBe(
      false,
    );
    expect(
      await service.issue({
        ownerWebContentsId: 7,
        batchId: "intake-1",
        projectId: "project-1",
        assetId: "asset-ready",
      }),
    ).toBeNull();
  });

  it("denies another window, project, asset, and non-current intake", async () => {
    const { service } = await fixture();
    service.trustPickerDiscovery(7, "picked-1");
    service.bindIntake(7, "picked-1", "intake-1", "project-1");
    for (const altered of [
      { ownerWebContentsId: 8 },
      { projectId: "project-2" },
      { batchId: "fake-batch" },
      { assetId: "asset-not-ready" },
    ]) {
      expect(
        await service.issue({
          ownerWebContentsId: 7,
          batchId: "intake-1",
          projectId: "project-1",
          assetId: "asset-ready",
          ...altered,
        }),
      ).toBeNull();
    }
  });

  it("keeps older same-project ready imports addressable but revokes old streams", async () => {
    const { service, store } = await fixture();
    service.trustPickerDiscovery(7, "picked-1");
    expect(service.bindIntake(7, "picked-1", "intake-1", "project-1")).toBe(
      true,
    );
    const oldToken = await service.issue({
      ownerWebContentsId: 7,
      batchId: "intake-1",
      projectId: "project-1",
      assetId: "asset-ready",
    });
    if (oldToken === null) throw new Error("Missing first import token");

    service.trustPickerDiscovery(7, "picked-2");
    expect(service.bindIntake(7, "picked-2", "intake-2", "project-1")).toBe(
      true,
    );
    const revoked = await createPreviewAudioProtocolResponse(
      new Request(oldToken),
      { projectId: "project-1", ownerWebContentsId: 7 },
      store,
    );
    expect(revoked.status).toBe(403);

    for (const [batchId, assetId] of [
      ["intake-1", "asset-ready"],
      ["intake-2", "asset-second"],
    ] as const) {
      const url = await service.issue({
        ownerWebContentsId: 7,
        batchId,
        projectId: "project-1",
        assetId,
      });
      expect(url).toMatch(/^lfa-preview:\/\/media\/[0-9a-f]{64}$/);
      if (url === null) throw new Error("Missing renewed grant");
      const response = await createPreviewAudioProtocolResponse(
        new Request(url, { headers: { Range: "bytes=0-3" } }),
        { projectId: "project-1", ownerWebContentsId: 7 },
        store,
      );
      expect(response.status).toBe(206);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(
        Buffer.from("RIFF"),
      );
    }

    service.trustPickerDiscovery(7, "picked-other");
    service.bindIntake(7, "picked-other", "other-intake", "different");
    expect(
      await service.issue({
        ownerWebContentsId: 7,
        batchId: "intake-1",
        projectId: "project-1",
        assetId: "asset-ready",
      }),
    ).toBeNull();
  });

  it("revokes issued tokens and their stream on a window/project change", async () => {
    const { service, store } = await fixture();
    service.trustPickerDiscovery(7, "picked-1");
    service.bindIntake(7, "picked-1", "intake-1", "project-1");
    const uri = await service.issue({
      ownerWebContentsId: 7,
      batchId: "intake-1",
      projectId: "project-1",
      assetId: "asset-ready",
    });
    if (uri === null) throw new Error("Expected authorized token");
    expect(service.context(7)?.projectId).toBe("project-1");
    service.revokeWindow(7);
    expect(service.context(7)).toBeNull();
    const response = await createPreviewAudioProtocolResponse(
      new Request(uri),
      { projectId: "project-1", ownerWebContentsId: 7 },
      store,
    );
    expect(response.status).toBe(403);
  });

  it("revokes previous project tokens before binding another trusted intake", async () => {
    const { service } = await fixture();
    service.trustPickerDiscovery(7, "picked-1");
    service.bindIntake(7, "picked-1", "intake-1", "project-1");
    service.trustPickerDiscovery(7, "picked-2");
    expect(service.bindIntake(7, "picked-2", "intake-2", "project-2")).toBe(
      true,
    );
    expect(service.context(7)?.projectId).toBe("project-2");
    expect(
      await service.issue({
        ownerWebContentsId: 7,
        batchId: "intake-1",
        projectId: "project-1",
        assetId: "asset-ready",
      }),
    ).toBeNull();
  });

  it("reauthorizes only a main-picked and probed replacement audio source", async () => {
    const { service, store, source } = await fixture();
    const previewBatchId = service.trustRelinkedSources(7, "reopened", [
      { assetId: "relinked-only", source },
    ]);
    expect(previewBatchId).toMatch(/^relink-[0-9a-f]{40}$/);
    if (previewBatchId === null) throw new Error("Missing relink proof");
    const token = await service.issue({
      ownerWebContentsId: 7,
      batchId: previewBatchId,
      projectId: "reopened",
      assetId: "relinked-only",
    });
    expect(token).toMatch(/^lfa-preview:\/\/media\/[0-9a-f]{64}$/);
    if (token === null) throw new Error("Expected relink token");
    const response = await createPreviewAudioProtocolResponse(
      new Request(token, { headers: { Range: "bytes=0-3" } }),
      { projectId: "reopened", ownerWebContentsId: 7 },
      store,
    );
    expect(response.status).toBe(206);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from("RIFF"),
    );
    for (const request of [
      {
        ownerWebContentsId: 8,
        projectId: "reopened",
        assetId: "relinked-only",
      },
      { ownerWebContentsId: 7, projectId: "other", assetId: "relinked-only" },
      { ownerWebContentsId: 7, projectId: "reopened", assetId: "not-relinked" },
    ]) {
      expect(
        await service.issue({ batchId: previewBatchId, ...request }),
      ).toBeNull();
    }
  });

  it("revokes old import and relink grants on replacement and close", async () => {
    const { service, store, source } = await fixture();
    service.trustPickerDiscovery(7, "picked-1");
    service.bindIntake(7, "picked-1", "intake-1", "project-1");
    const former = await service.issue({
      ownerWebContentsId: 7,
      batchId: "intake-1",
      projectId: "project-1",
      assetId: "asset-ready",
    });
    const batch = service.trustRelinkedSources(7, "project-1", [
      { assetId: "asset-replaced", source },
    ]);
    expect(batch).not.toBeNull();
    expect(
      await service.issue({
        ownerWebContentsId: 7,
        batchId: "intake-1",
        projectId: "project-1",
        assetId: "asset-ready",
      }),
    ).toBeNull();
    if (former === null || batch === null) throw new Error("Missing tokens");
    const formerResponse = await createPreviewAudioProtocolResponse(
      new Request(former),
      { projectId: "project-1", ownerWebContentsId: 7 },
      store,
    );
    expect(formerResponse.status).toBe(403);
    service.revokeWindow(7);
    expect(
      await service.issue({
        ownerWebContentsId: 7,
        batchId: batch,
        projectId: "project-1",
        assetId: "asset-replaced",
      }),
    ).toBeNull();
  });
  it("T06: preserves 25 main-picked same-project batches but revokes old tokens", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lfa-w06-25-batches-"));
    directories.push(dir);
    const sourcePath = join(dir, "source.wav");
    await writeFile(sourcePath, Buffer.from("RIFF1234"));
    const releases: string[] = [];
    const lookup: TrustedIntakeLookup = {
      getTrustedAudioSource(batchId, projectId, assetId) {
        const index = Number(batchId.replace("intake-", ""));
        return projectId === "album-many" &&
          Number.isSafeInteger(index) &&
          index >= 0 &&
          index < 25 &&
          assetId === `asset-${index}`
          ? { sourcePath, fileName: "source.wav", sizeBytes: 8 }
          : null;
      },
      releaseTrustedAudioBatch(batchId) {
        releases.push(batchId);
      },
    };
    const store = new NodePreviewAudioLeaseStore();
    const service = new PreviewAudioAccessService(store, lookup);
    services.push(service);

    let firstToken: string | null = null;
    for (let index = 0; index < 25; index += 1) {
      const picked = `picked-${index}`;
      const batchId = `intake-${index}`;
      service.trustPickerDiscovery(7, picked);
      expect(service.bindIntake(7, picked, batchId, "album-many")).toBe(true);
      const token = await service.issue({
        ownerWebContentsId: 7,
        projectId: "album-many",
        batchId,
        assetId: `asset-${index}`,
      });
      expect(token).toMatch(/^lfa-preview:\/\/media\/[0-9a-f]{64}$/);
      if (index === 0) firstToken = token;
    }

    if (firstToken === null) throw new Error("Missing original grant");
    const stale = await createPreviewAudioProtocolResponse(
      new Request(firstToken),
      { projectId: "album-many", ownerWebContentsId: 7 },
      store,
    );
    expect(stale.status).toBe(403);
    expect(releases).toHaveLength(0);

    for (const index of [0, 1, 12, 23, 24]) {
      const token = await service.issue({
        ownerWebContentsId: 7,
        projectId: "album-many",
        batchId: `intake-${index}`,
        assetId: `asset-${index}`,
      });
      if (!token) throw new Error("Older trusted batch was orphaned");
      const response = await createPreviewAudioProtocolResponse(
        new Request(token, { headers: { Range: "bytes=0-3" } }),
        { projectId: "album-many", ownerWebContentsId: 7 },
        store,
      );
      expect(response.status).toBe(206);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(
        Buffer.from("RIFF"),
      );
      expect(
        await service.issue({
          ownerWebContentsId: 8,
          projectId: "album-many",
          batchId: `intake-${index}`,
          assetId: `asset-${index}`,
        }),
      ).toBeNull();
    }

    service.trustPickerDiscovery(7, "picked-other-project");
    expect(
      service.bindIntake(
        7,
        "picked-other-project",
        "new-project",
        "album-next",
      ),
    ).toBe(true);
    expect(
      await service.issue({
        ownerWebContentsId: 7,
        projectId: "album-many",
        batchId: "intake-0",
        assetId: "asset-0",
      }),
    ).toBeNull();
    expect(releases).toHaveLength(25);
    expect(new Set(releases).size).toBe(25);
  });
it("T06: fences in-flight grants during same-project reimport", async () => {
    const { source } = await fixture();
    const control: {
      readonlyStarted?: () => void;
      release?: () => void;
    } = {};
    const started = new Promise<void>((resolve) => {
      control.readonlyStarted = resolve;
    });
    const delay = new Promise<void>((resolve) => {
      control.release = resolve;
    });
    class DelayedGrantStore extends NodePreviewAudioLeaseStore {
      override async issueTrustedGrant(
        request: Parameters<NodePreviewAudioLeaseStore["issueTrustedGrant"]>[0],
      ): Promise<string> {
        const token = await super.issueTrustedGrant(request);
        control.readonlyStarted?.();
        await delay;
        return token;
      }
    }
    const store = new DelayedGrantStore();
    const service = new PreviewAudioAccessService(store, {
      getTrustedAudioSource(batch, project, asset) {
        return project === "project-1" &&
          (batch === "intake-1" || batch === "intake-2") &&
          asset === "asset-ready"
          ? source
          : null;
      },
    });
    services.push(service);
    service.trustPickerDiscovery(7, "picked-1");
    expect(service.bindIntake(7, "picked-1", "intake-1", "project-1")).toBe(
      true,
    );
    const staleGrant = service.issue({
      ownerWebContentsId: 7,
      batchId: "intake-1",
      projectId: "project-1",
      assetId: "asset-ready",
    });
    // The old lease has ALREADY been allocated by main, but the asynchronous
    // response has not returned to its caller when a new picker import begins.
    await started;
    service.trustPickerDiscovery(7, "picked-2");
    expect(service.bindIntake(7, "picked-2", "intake-2", "project-1")).toBe(
      true,
    );
    control.release?.();
    expect(await staleGrant).toBeNull();
    // Batch #1 remains discoverable for new grants in this album, but its
    // original in-flight token can never cross the import authority epoch.
    const refreshed = await service.issue({
      ownerWebContentsId: 7,
      batchId: "intake-1",
      projectId: "project-1",
      assetId: "asset-ready",
    });
    expect(refreshed).toMatch(/^lfa-preview:\/\/media\/[0-9a-f]{64}$/);
    if (refreshed === null) throw new Error("Expected fresh audio authority");
    const response = await createPreviewAudioProtocolResponse(
      new Request(refreshed, { headers: { Range: "bytes=0-3" } }),
      { projectId: "project-1", ownerWebContentsId: 7 },
      store,
    );
    expect(response.status).toBe(206);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from("RIFF"),
    );
  });

});
