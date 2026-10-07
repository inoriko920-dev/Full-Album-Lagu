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

export function createLayerAddCommand(
  input: AddLayerCommandInput,
): ProjectCommand {
  const layer = visualLayerSchema.parse(structuredClone(input.layer));

  return {
    kind: "layer.add",
    label: `Tambah layer ${layer.name}`,
    origin: "manual",
    ...expectationFields(input),
    apply: (project) => {
      const layers = currentLayers(project);
      if (layers.some((candidate) => candidate.id === layer.id)) {
        throw new Error("Layer ID already exists.");
      }

      const toIndex =
        input.toIndex === undefined
          ? layers.length
          : requireInsertionIndex(input.toIndex, layers.length);

      const nextLayers = [...layers];
      nextLayers.splice(toIndex, 0, structuredClone(layer));
      return withLayers(project, nextLayers);
    },
  };
}

export function createLayerRemoveCommand(
  input: RemoveLayerCommandInput,
): ProjectCommand {
  return {
    kind: "layer.remove",
    label: `Hapus layer ${input.layerId}`,
    origin: "manual",
    ...expectationFields(input),
    apply: (project) => {
      const { layer, index } = findLayer(project, input.layerId);
      requireUnlocked(layer);

      const nextLayers = [...currentLayers(project)];
      nextLayers.splice(index, 1);
      return withLayers(project, nextLayers);
    },
  };
}

export function createLayerDuplicateCommand(
  input: DuplicateLayerCommandInput,
): ProjectCommand {
  return {
    kind: "layer.duplicate",
    label: `Duplikat layer ${input.layerId}`,
    origin: "manual",
    ...expectationFields(input),
    apply: (project) => {
      const { layer, index } = findLayer(project, input.layerId);
      requireUnlocked(layer);

      const newLayerId = requireNonEmpty(input.newLayerId, "New layer ID");
      const layers = currentLayers(project);
      if (layers.some((candidate) => candidate.id === newLayerId)) {
        throw new Error("Duplicate layer ID already exists.");
      }

      const toIndex =
        input.toIndex === undefined
          ? index + 1
          : requireInsertionIndex(input.toIndex, layers.length);

      const duplicated = visualLayerSchema.parse({
        ...structuredClone(layer),
        id: newLayerId,
      });

      const nextLayers = [...layers];
      nextLayers.splice(toIndex, 0, duplicated);
      return withLayers(project, nextLayers);
    },
  };
}

export function createLayerReorderCommand(
  input: ReorderLayerCommandInput,
): ProjectCommand {
  return {
    kind: "layer.reorder",
    label: `Pindahkan layer ${input.layerId}`,
    origin: "manual",
    ...expectationFields(input),
    apply: (project) => {
      const { layer, index } = findLayer(project, input.layerId);
      requireUnlocked(layer);

      const layers = currentLayers(project);
      const toIndex = requireReorderIndex(input.toIndex, layers.length);
      if (index === toIndex) return project;

      const nextLayers = [...layers];
      const [moved] = nextLayers.splice(index, 1);
      if (moved === undefined) {
        throw new Error("Layer reorder target could not be resolved.");
      }
      nextLayers.splice(toIndex, 0, moved);
      return withLayers(project, nextLayers);
    },
  };
}

export function createLayerSetTransformCommand(
  input: SetLayerTransformCommandInput,
): ProjectCommand {
  const transform = visualLayerTransformSchema.parse(
    structuredClone(input.transform),
  );

  return {
    kind: "layer.set-transform",
    label: `Ubah transform layer ${input.layerId}`,
    origin: "manual",
    ...expectationFields(input),
    apply: (project) => {
      const { layer, index } = findLayer(project, input.layerId);
      requireUnlocked(layer);

      const nextLayers = [...currentLayers(project)];
      nextLayers[index] = visualLayerSchema.parse({
        ...layer,
        transform,
      });
      return withLayers(project, nextLayers);
    },
  };
}

export function createLayerSetCommonCommand(
  input: SetLayerCommonCommandInput,
): ProjectCommand {
  const patch = normalizeCommonPatch(input.patch);

  return {
    kind: "layer.set-common",
    label: `Ubah properti layer ${input.layerId}`,
    origin: "manual",
    ...expectationFields(input),
    apply: (project) => {
      const { layer, index } = findLayer(project, input.layerId);
      const patchKeys = Object.keys(patch);

      if (patchKeys.length === 0) return project;

      if (layer.locked) {
        const explicitUnlockOnly =
          patchKeys.length === 1 && patch.locked === false;
        if (!explicitUnlockOnly) {
          throw new Error(
            "Locked layer only accepts an explicit unlock mutation.",
          );
        }
      }

      const nextLayer = visualLayerSchema.parse({
        ...layer,
        ...patch,
      });
      const nextLayers = [...currentLayers(project)];
      nextLayers[index] = nextLayer;
      return withLayers(project, nextLayers);
    },
  };
}

export function createLayerSetTextStyleCommand(
  input: SetLayerTextStyleCommandInput,
): ProjectCommand {
  const style = visualTextStyleSchema.parse(structuredClone(input.style));

  return {
    kind: "layer.set-text-style",
    label: `Ubah style teks layer ${input.layerId}`,
    origin: "manual",
    ...expectationFields(input),
    apply: (project) => {
      const { layer, index } = findLayer(project, input.layerId);
      requireUnlocked(layer);
      if (layer.kind !== "text") {
        throw new Error("Layer text style target must be a text layer.");
      }

      const nextLayer = visualLayerSchema.parse({
        ...layer,
        style,
      });
      const nextLayers = [...currentLayers(project)];
      nextLayers[index] = nextLayer;
      return withLayers(project, nextLayers);
    },
  };
}

export class LayerTransformGestureSession {
  private previewTransform: VisualLayerTransform;
  private readonly layerId: string;
  private readonly expectedBaseRevision: number;
  private readonly expectedStateToken: ProjectStateToken;

  constructor(
    snapshot: Pick<ProjectCommandEngineSnapshot, "project" | "stateToken">,
    layerIdInput: string,
  ) {
    const project = projectDocumentSchema.parse(snapshot.project);
    const { layer, layerId } = findLayer(project, layerIdInput);
    requireUnlocked(layer);

    this.layerId = layerId;
    this.expectedBaseRevision = project.revision;
    this.expectedStateToken = snapshot.stateToken;
    this.previewTransform = structuredClone(layer.transform);
  }

  preview(transformInput: VisualLayerTransform): VisualLayerTransform {
    const transform = visualLayerTransformSchema.parse(
      structuredClone(transformInput),
    );
    this.previewTransform = transform;
    return structuredClone(this.previewTransform);
  }

  currentPreview(): VisualLayerTransform {
    return structuredClone(this.previewTransform);
  }

  createCommitCommand(): ProjectCommand {
    return createLayerSetTransformCommand({
      layerId: this.layerId,
      transform: this.previewTransform,
      expectedBaseRevision: this.expectedBaseRevision,
      expectedStateToken: this.expectedStateToken,
    });
  }
}
