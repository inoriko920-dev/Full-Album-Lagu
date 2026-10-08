import {
  projectDocumentSchema,
  type ProjectDocument,
} from "./project-document";
import {
  resolveVisualScene,
  type ResolvedSceneTrackContext,
  type ResolvedVisualLayer,
} from "./visual-scene-projection";
import {
  visualLayerTransformSchema,
  type VisualLayerTransform,
} from "./visual-scene-schema";

export interface StaticScenePreviewOptions {
  selectedTrackId?: string;
  selectedLayerId?: string | null;
  /** Session-only pointer preview. Never persisted or sent to CommandEngine. */
  gesturePreview?: {
    layerId: string;
    transform: VisualLayerTransform;
  };
}

export type StaticSceneLayer = ResolvedVisualLayer & { selected: boolean };

export interface StaticSceneLayerListItem {
  id: string;
  name: string;
  kind: ResolvedVisualLayer["kind"];
  visible: boolean;
  locked: boolean;
  selected: boolean;
}

export interface StaticSceneInspector {
  id: string;
  name: string;
  kind: ResolvedVisualLayer["kind"];
  visible: boolean;
  locked: boolean;
  transform: VisualLayerTransform;
  details:
    | { kind: "background"; fill: Extract<ResolvedVisualLayer, { kind: "background" }>["fill"] }
    | { kind: "artwork"; binding: "active-track-artwork" | "album-artwork"; available: boolean }
    | { kind: "text"; role: Extract<ResolvedVisualLayer, { kind: "text" }>["role"]; style: Extract<ResolvedVisualLayer, { kind: "text" }>["style"]; value: string }
    | { kind: "spectrum" | "progress"; runtimeState: "structural-placeholder" };
}

export interface StaticScenePreviewModel {
  sceneVersion: 1;
  trackContext: ResolvedSceneTrackContext;
  /** Canonical back-to-front layer order; hidden layers stay in the model. */
  layers: StaticSceneLayer[];
  /** Inverse of canonical order for the left-hand Layer list, no z-index state. */
  layerList: StaticSceneLayerListItem[];
  /** Invalid/deleted selections are cleared only in the projection. */
  selectedLayerId: string | null;
  selectionOutline: { layerId: string; transform: VisualLayerTransform } | null;
  inspector: StaticSceneInspector | null;
}

function inspect(layer: StaticSceneLayer): StaticSceneInspector {
  const common = {
    id: layer.id,
    name: layer.name,
    kind: layer.kind,
    visible: layer.visible,
    locked: layer.locked,
    transform: structuredClone(layer.transform),
  };

  if (layer.kind === "background") {
    return { ...common, details: { kind: "background", fill: structuredClone(layer.fill) } };
  }
  if (layer.kind === "artwork") {
    return {
      ...common,
      details: {
        kind: "artwork",
        binding: layer.binding,
        available: layer.resolvedArtwork.assetId !== undefined,
      },
    };
  }
  if (layer.kind === "text") {
    return {
      ...common,
      details: {
        kind: "text",
        role: layer.role,
        style: structuredClone(layer.style),
        value: layer.resolvedText.value,
      },
    };
  }
  return {
    ...common,
    details: { kind: layer.kind, runtimeState: "structural-placeholder" },
  };
}

/**
 * A deterministic, filesystem-free view model for W11-05 static editor Preview.
 * It reuses W11-04 bindings via resolveVisualScene and does not create a second
 * command, project, animation, media, or playback state owner.
 */
export function buildStaticScenePreview(
  projectInput: ProjectDocument,
  options: StaticScenePreviewOptions = {},
): StaticScenePreviewModel {
  const project = projectDocumentSchema.parse(projectInput);
  const resolved = resolveVisualScene(project, options.selectedTrackId);
  const selectedId = options.selectedLayerId ?? null;
  const selectedLayerId =
    selectedId !== null && resolved.layers.some((layer) => layer.id === selectedId)
      ? selectedId
      : null;

  const preview = options.gesturePreview;
  const previewTransform =
    preview !== undefined &&
    preview.layerId === selectedLayerId &&
    resolved.layers.some((layer) => layer.id === preview.layerId && !layer.locked)
      ? visualLayerTransformSchema.parse(structuredClone(preview.transform))
      : null;

  const layers: StaticSceneLayer[] = resolved.layers.map((layer) => ({
    ...structuredClone(layer),
    transform:
      previewTransform !== null && layer.id === selectedLayerId
        ? structuredClone(previewTransform)
        : structuredClone(layer.transform),
    selected: layer.id === selectedLayerId,
  }));

  const selected = layers.find((layer) => layer.id === selectedLayerId);
  const selectedVisible = selected?.visible === true;
  return {
    sceneVersion: 1,
    trackContext: structuredClone(resolved.trackContext),
    layers,
    layerList: layers
      .slice()
      .reverse()
      .map((layer) => ({
        id: layer.id,
        name: layer.name,
        kind: layer.kind,
        visible: layer.visible,
        locked: layer.locked,
        selected: layer.selected,
      })),
    selectedLayerId,
    selectionOutline:
      selected !== undefined && selectedVisible
        ? { layerId: selected.id, transform: structuredClone(selected.transform) }
        : null,
    inspector: selected === undefined ? null : inspect(selected),
  };
}
