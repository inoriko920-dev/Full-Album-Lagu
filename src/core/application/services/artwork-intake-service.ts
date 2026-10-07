import type { ArtworkProbePort } from "../ports/artwork-probe-port";
import type { MediaSourcePort } from "../ports/media-source-port";
import type {
  ArtworkBindingTarget,
  ArtworkImportResult,
} from "../../contracts/artwork-intake";
import type { MediaAssetReference } from "../../domain/media-asset";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";
import { ProjectCommandEngine } from "./project-command-engine";
import { createImportAndBindArtworkBatch } from "./project-artwork-commands";

function nextUniqueAssetId(
  project: ProjectDocument,
  idFactory: () => string,
): string {
  const existing = new Set((project.mediaAssets ?? []).map((asset) => asset.id));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = idFactory().trim();
    if (candidate.length > 0 && !existing.has(candidate)) return candidate;
  }
  throw new Error("Could not allocate a unique artwork asset ID.");
}

export class ArtworkIntakeService {
  constructor(
    private readonly sourcePort: MediaSourcePort,
    private readonly probePort: ArtworkProbePort,
    private readonly idFactory: () => string,
  ) {}

  async importAndBind(
    projectInput: ProjectDocument,
    target: ArtworkBindingTarget,
    selectedPath: string,
  ): Promise<ArtworkImportResult> {
    const project = projectDocumentSchema.parse(projectInput);
    const inspection = await this.sourcePort.inspect(selectedPath);

    if (inspection.status === "missing") {
      return {
        status: "error",
        code: "MEDIA_NOT_FOUND",
        message: "Artwork yang dipilih tidak ditemukan.",
      };
    }
    if (inspection.status === "unreadable") {
      return {
        status: "error",
        code: "MEDIA_UNREADABLE",
        message: "Artwork yang dipilih tidak dapat dibaca.",
      };
    }

    const probe = await this.probePort.probe(inspection.source);
    if (probe.status === "unsupported") {
      return {
        status: "error",
        code: "MEDIA_UNSUPPORTED",
        message: "Artwork hanya mendukung PNG, JPEG/JPG, atau WebP.",
      };
    }
    if (probe.status === "unreadable") {
      return {
        status: "error",
        code: "MEDIA_UNREADABLE",
        message: "Artwork yang dipilih tidak dapat dibaca.",
      };
    }
    if (probe.status === "invalid") {
      return {
        status: "error",
        code: "MEDIA_CORRUPT",
        message: "Isi file artwork tidak sesuai format gambar yang didukung.",
      };
    }

    let assetId: string;
    try {
      assetId = nextUniqueAssetId(project, this.idFactory);
    } catch {
      return {
        status: "error",
        code: "MEDIA_PROBE_FAILED",
        message: "Artwork tidak dapat disiapkan dengan aman.",
      };
    }

    const asset: MediaAssetReference = {
      id: assetId,
      kind: "image",
      required: false,
      sourcePath: inspection.source.sourcePath,
      fileName: inspection.source.fileName,
      sizeBytes: inspection.source.sizeBytes,
      availability: "ready",
    };
    const engine = new ProjectCommandEngine(project);
    const applied = engine.executeBatch(
      createImportAndBindArtworkBatch({ asset, target }),
    );
    if (applied.status !== "applied") {
      return {
        status: "error",
        code: "MEDIA_PROBE_FAILED",
        message: "Artwork tidak dapat diikat ke proyek dengan aman.",
      };
    }

    return {
      status: "imported",
      project: engine.snapshot().project,
      asset: { assetId, fileName: asset.fileName },
    };
  }
}
