import {
  projectDocumentSchema,
  type ProjectDocument,
  type ProjectTrack,
} from "./project-document";
import {
  type TrackPresentationProvenance,
  resolveTrackPresentation,
} from "./track-presentation";
import {
  type VisualArtworkLayer,
  type VisualBackgroundLayer,
  type VisualProgressLayer,
  type VisualScene,
  type VisualSpectrumLayer,
  type VisualTextLayer,
} from "./visual-scene-schema";

export type ResolvedSceneTrackContextSource =
  "selected" | "first-enabled" | "none";

export interface ResolvedSceneTrackContext {
  source: ResolvedSceneTrackContextSource;
  trackId?: string;
}

export type ResolvedVisualTextProvenance =
  TrackPresentationProvenance | "static" | "structural-placeholder";

export interface ResolvedVisualText {
  value: string;
  provenance: ResolvedVisualTextProvenance;
}

export interface ResolvedVisualArtwork {
  assetId?: string;
  provenance: TrackPresentationProvenance;
}

export interface ResolvedBackgroundLayer extends VisualBackgroundLayer {
  resolvedKind: "background";
}

export interface ResolvedArtworkLayer extends VisualArtworkLayer {
  resolvedKind: "artwork";
  resolvedArtwork: ResolvedVisualArtwork;
}

export interface ResolvedTextLayer extends VisualTextLayer {
  resolvedKind: "text";
  resolvedText: ResolvedVisualText;
}

export interface ResolvedSpectrumLayer extends VisualSpectrumLayer {
  resolvedKind: "spectrum";
  runtimeState: "structural-placeholder";
}

export interface ResolvedProgressLayer extends VisualProgressLayer {
  resolvedKind: "progress";
  runtimeState: "structural-placeholder";
}

export type ResolvedVisualLayer =
  | ResolvedBackgroundLayer
  | ResolvedArtworkLayer
  | ResolvedTextLayer
  | ResolvedSpectrumLayer
  | ResolvedProgressLayer;

export interface ResolvedVisualScene {
  sceneVersion: 1;
  trackContext: ResolvedSceneTrackContext;
  layers: ResolvedVisualLayer[];
}

function resolveTrackContext(
  project: ProjectDocument,
  selectedTrackId?: string,
): { context: ResolvedSceneTrackContext; track?: ProjectTrack } {
  if (selectedTrackId !== undefined) {
    const selected = project.tracks.find(
      (track) => track.id === selectedTrackId,
    );
    if (selected !== undefined) {
      return {
        context: { source: "selected", trackId: selected.id },
        track: selected,
      };
    }
  }

  const firstEnabled = project.tracks.find((track) => track.enabled !== false);
  if (firstEnabled !== undefined) {
    return {
      context: { source: "first-enabled", trackId: firstEnabled.id },
      track: firstEnabled,
    };
  }

  return { context: { source: "none" } };
}

function resolveTextLayer(
  layer: VisualTextLayer,
  presentation: ReturnType<typeof resolveTrackPresentation> | undefined,
): ResolvedTextLayer {
  if (layer.role === "static") {
    return {
      ...layer,
      resolvedKind: "text",
      resolvedText: {
        value: layer.text ?? "",
        provenance: "static",
      },
    };
  }

  if (presentation === undefined) {
    return {
      ...layer,
      resolvedKind: "text",
      resolvedText: {
        value: "",
        provenance: "structural-placeholder",
      },
    };
  }

  if (layer.role === "title") {
    return {
      ...layer,
      resolvedKind: "text",
      resolvedText: presentation.title,
    };
  }

  if (layer.role === "artist") {
    return {
      ...layer,
      resolvedKind: "text",
      resolvedText: presentation.artist,
    };
  }

  if (layer.role === "track-number") {
    return {
      ...layer,
      resolvedKind: "text",
      resolvedText: {
        value: String(presentation.trackNumber.value),
        provenance: presentation.trackNumber.provenance,
      },
    };
  }

  return {
    ...layer,
    resolvedKind: "text",
    resolvedText: {
      value: "",
      provenance: "structural-placeholder",
    },
  };
}

function resolveArtworkLayer(
  project: ProjectDocument,
  layer: VisualArtworkLayer,
  presentation: ReturnType<typeof resolveTrackPresentation> | undefined,
): ResolvedArtworkLayer {
  if (layer.binding === "album-artwork") {
    const assetId = project.albumPresentation?.defaultArtworkAssetId;
    return {
      ...layer,
      resolvedKind: "artwork",
      resolvedArtwork:
        assetId === undefined
          ? { provenance: "placeholder" }
          : { assetId, provenance: "album-default" },
    };
  }

  return {
    ...layer,
    resolvedKind: "artwork",
    resolvedArtwork: presentation?.artwork ?? { provenance: "placeholder" },
  };
}

export function resolveVisualScene(
  projectInput: ProjectDocument,
  selectedTrackId?: string,
): ResolvedVisualScene {
  const project = projectDocumentSchema.parse(projectInput);
  const scene: VisualScene = project.visualScene ?? {
    sceneVersion: 1,
    layers: [],
  };
  const { context, track } = resolveTrackContext(project, selectedTrackId);
  const presentation =
    track === undefined
      ? undefined
      : resolveTrackPresentation(project, track.id);

  const layers: ResolvedVisualLayer[] = scene.layers.map((layer) => {
    if (layer.kind === "background") {
      return {
        ...layer,
        resolvedKind: "background",
      };
    }

    if (layer.kind === "artwork") {
      return resolveArtworkLayer(project, layer, presentation);
    }

    if (layer.kind === "text") {
      return resolveTextLayer(layer, presentation);
    }

    if (layer.kind === "spectrum") {
      return {
        ...layer,
        resolvedKind: "spectrum",
        runtimeState: "structural-placeholder",
      };
    }

    return {
      ...layer,
      resolvedKind: "progress",
      runtimeState: "structural-placeholder",
    };
  });

  return {
    sceneVersion: 1,
    trackContext: context,
    layers,
  };
}
