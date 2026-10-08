import type { StaticScenePreviewModel } from "../../../core/domain/static-scene-preview";
import {
  visualLayerTransformSchema,
  type VisualLayerTransform,
} from "../../../core/domain/visual-scene-schema";

export interface VisualSelectionSnapshot {
  selectedLayerId: string | null;
  hoveredLayerId: string | null;
  gesturePreview: { layerId: string; transform: VisualLayerTransform } | null;
}

/**
 * UI-session only: no project, persisted selection, CommandEngine or history.
 * The left Layer list and canvas Preview consume the same selectedLayerId.
 */
export class VisualSelectionSession {
  private selectedLayerId: string | null = null;
  private hoveredLayerId: string | null = null;
  private gesturePreview: VisualSelectionSnapshot["gesturePreview"] = null;

  snapshot(): VisualSelectionSnapshot {
    return structuredClone({
      selectedLayerId: this.selectedLayerId,
      hoveredLayerId: this.hoveredLayerId,
      gesturePreview: this.gesturePreview,
    });
  }

  selectFromLayerList(model: StaticScenePreviewModel, layerId: string | null): boolean {
    if (layerId !== null && !model.layerList.some((item) => item.id === layerId)) {
      return false;
    }
    this.selectedLayerId = layerId;
    this.gesturePreview = null;
    return true;
  }

  selectFromCanvas(model: StaticScenePreviewModel, layerId: string): boolean {
    const target = model.layers.find((layer) => layer.id === layerId);
    if (target === undefined || !target.visible) return false;
    // Locked layers can be selected, but cannot be transformed.
    this.selectedLayerId = layerId;
    this.gesturePreview = null;
    return true;
  }

  hover(model: StaticScenePreviewModel, layerId: string | null): void {
    this.hoveredLayerId =
      layerId !== null && model.layers.some((layer) => layer.id === layerId)
        ? layerId
        : null;
  }

  previewGesture(model: StaticScenePreviewModel, input: VisualLayerTransform): boolean {
    const selected = model.layers.find((layer) => layer.id === this.selectedLayerId);
    if (selected === undefined || selected.locked) return false;
    this.gesturePreview = {
      layerId: selected.id,
      transform: visualLayerTransformSchema.parse(structuredClone(input)),
    };
    return true;
  }

  discardGesture(): void {
    this.gesturePreview = null;
  }

  /** Reconciles only session selection on project Open/New, undo or layer remove. */
  reconcile(model: StaticScenePreviewModel): void {
    if (
      this.selectedLayerId !== null &&
      !model.layers.some((layer) => layer.id === this.selectedLayerId)
    ) {
      this.selectedLayerId = null;
      this.gesturePreview = null;
    }
    if (
      this.hoveredLayerId !== null &&
      !model.layers.some((layer) => layer.id === this.hoveredLayerId)
    ) {
      this.hoveredLayerId = null;
    }
  }

  reset(): void {
    this.selectedLayerId = null;
    this.hoveredLayerId = null;
    this.gesturePreview = null;
  }
}
