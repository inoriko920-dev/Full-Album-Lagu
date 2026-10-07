import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";
import {
  visualLayerSchema,
  visualLayerTransformSchema,
  visualTextStyleSchema,
  type VisualLayer,
  type VisualLayerTransform,
  type VisualTextStyle,
} from "../../domain/visual-scene-schema";
import type {
  ProjectCommand,
  ProjectCommandEngineSnapshot,
  ProjectStateToken,
} from "./project-command-engine";

export interface LayerCommandExpectation {
  expectedBaseRevision?: number;
  expectedStateToken?: ProjectStateToken;
}

export interface AddLayerCommandInput extends LayerCommandExpectation {
  layer: VisualLayer;
  toIndex?: number;
}

export interface RemoveLayerCommandInput extends LayerCommandExpectation {
  layerId: string;
}

export interface DuplicateLayerCommandInput extends LayerCommandExpectation {
  layerId: string;
  newLayerId: string;
  toIndex?: number;
}

export interface ReorderLayerCommandInput extends LayerCommandExpectation {
  layerId: string;
  toIndex: number;
}

export interface SetLayerTransformCommandInput extends LayerCommandExpectation {
  layerId: string;
  transform: VisualLayerTransform;
}

export interface LayerCommonPatch {
  name?: string;
  visible?: boolean;
  locked?: boolean;
}

export interface SetLayerCommonCommandInput extends LayerCommandExpectation {
  layerId: string;
  patch: LayerCommonPatch;
}

export interface SetLayerTextStyleCommandInput extends LayerCommandExpectation {
  layerId: string;
  style: VisualTextStyle;
}

function expectationFields(
  input: LayerCommandExpectation,
): Pick<ProjectCommand, "expectedBaseRevision" | "expectedStateToken"> {
  return {
    ...(input.expectedBaseRevision === undefined
      ? {}
      : { expectedBaseRevision: input.expectedBaseRevision }),
    ...(input.expectedStateToken === undefined
      ? {}
      : { expectedStateToken: input.expectedStateToken }),
  };
}

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} must be non-empty.`);
  }
  return normalized;
}

function requireInsertionIndex(index: number, layerCount: number): number {
  if (!Number.isInteger(index)) {
    throw new Error("Layer insertion index must be an integer.");
  }
  if (index < 0 || index > layerCount) {
    throw new Error("Layer insertion index is out of range.");
  }
  return index;
}

function requireReorderIndex(index: number, layerCount: number): number {
  if (!Number.isInteger(index)) {
    throw new Error("Layer reorder index must be an integer.");
  }
  if (index < 0 || index >= layerCount) {
    throw new Error("Layer reorder index is out of range.");
  }
  return index;
}

function currentLayers(project: ProjectDocument): VisualLayer[] {
  return project.visualScene?.layers ?? [];
}

function findLayer(
  project: ProjectDocument,
  layerIdInput: string,
): { layerId: string; layer: VisualLayer; index: number } {
  const layerId = requireNonEmpty(layerIdInput, "Layer ID");
  const layers = currentLayers(project);
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index < 0) {
    throw new Error("Layer target does not exist.");
  }
  const layer = layers[index];
  if (layer === undefined) {
    throw new Error("Layer target could not be resolved.");
  }
  return { layerId, layer, index };
}

function requireUnlocked(layer: VisualLayer): void {
  if (layer.locked) {
    throw new Error("Locked layer cannot be mutated until it is unlocked.");
  }
}

function withLayers(
  project: ProjectDocument,
  layers: readonly VisualLayer[],
): ProjectDocument {
  return projectDocumentSchema.parse({
    ...project,
    visualScene: {
      sceneVersion: 1,
      layers,
    },
  });
}

function normalizeCommonPatch(input: LayerCommonPatch): LayerCommonPatch {
  const allowed = new Set(["name", "visible", "locked"]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      throw new Error("Unknown layer common property.");
    }
  }

  let name: string | undefined;
  if (input.name !== undefined) {
    if (typeof input.name !== "string") {
      throw new Error("Layer name must be text.");
    }
    name = input.name.trim();
    if (name.length === 0 || name.length > 200) {
      throw new Error("Layer name must contain 1 to 200 characters.");
    }
  }

  if (input.visible !== undefined && typeof input.visible !== "boolean") {
    throw new Error("Layer visible state must be boolean.");
  }
  if (input.locked !== undefined && typeof input.locked !== "boolean") {
    throw new Error("Layer locked state must be boolean.");
  }

  return {
    ...(name === undefined ? {} : { name }),
    ...(input.visible === undefined ? {} : { visible: input.visible }),
    ...(input.locked === undefined ? {} : { locked: input.locked }),
  };
}
