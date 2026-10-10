import type { CSSProperties } from "react";
import type { ProjectDocument } from "../../core/domain/project-document";
import {
  buildStaticScenePreview,
  type StaticScenePreviewModel,
} from "../../core/domain/static-scene-preview";
import type { ActiveBoundaryVisualFrame } from "../../core/domain/album-boundary-visual";
import { StaticScenePreview } from "../visual/StaticScenePreview";

/**
 * T06 visual-only composition over the same existing Preview canvas.
 * The incoming project's background/spectrum/progress remain single-owner.
 * Outgoing and incoming artwork/title/artist use precomputed T04 weights;
 * scene/clock/project are never mutated and no new timeline is introduced.
 */
export function BoundaryVisualPreview({
  project,
  frame,
  spectrumLevels,
  progressFraction,
}: {
  project: ProjectDocument;
  frame: ActiveBoundaryVisualFrame;
  spectrumLevels?: readonly number[];
  progressFraction?: number;
}) {
  const base = buildStaticScenePreview(project, { selectedTrackId: frame.toTrackId });
  const from = buildStaticScenePreview(project, { selectedTrackId: frame.fromTrackId });

  const metadataLayers = (model: StaticScenePreviewModel, side: "from" | "to"): StaticScenePreviewModel => {
    const layers = model.layers.filter(
      (layer) => layer.kind === "artwork" ||
        (layer.kind === "text" && (layer.role === "title" || layer.role === "artist")),
    ).map((layer) => {
      const weights = layer.kind === "artwork" ? frame.artworkHandoff
        : layer.kind === "text" && layer.role === "title" ? frame.titleHandoff : frame.artistHandoff;
      const factor = side === "from" ? weights.fromWeight : weights.toWeight;
      return { ...layer, selected: false, transform: {
        ...layer.transform,
        opacity: layer.transform.opacity * factor,
      }};
    });
    return { ...model, layers, selectedLayerId: null, selectionOutline: null, inspector: null };
  };

  const foundation: StaticScenePreviewModel = {
    ...base,
    layers: base.layers.filter((layer) =>
      layer.kind === "background" || layer.kind === "spectrum" || layer.kind === "progress",
    ),
    selectedLayerId: null, selectionOutline: null, inspector: null,
  };
  function sideStyle(side: "incoming" | "outgoing"): CSSProperties {
    const channel = frame.effect[side];
    return {
      transform: `translateX(${channel.offsetX * 100}%) scale(${channel.scale})`,
      filter: `blur(${channel.blur * 12}px)`,
    };
  }

  return (
    <div className="boundary-visual-preview" aria-label="Preview Boundary"
      data-boundary-from={frame.fromTrackId} data-boundary-to={frame.toTrackId}
      data-boundary-progress={frame.progress.toFixed(3)} data-boundary-preset={frame.preset}>
      <div className="boundary-visual-preview__foundation">
        <StaticScenePreview model={foundation}
          {...(spectrumLevels === undefined ? {} : { spectrumLevels })}
          {...(progressFraction === undefined ? {} : { progressFraction })} />
      </div>
      <div className="boundary-visual-preview__side" style={sideStyle("outgoing")}>
        <StaticScenePreview model={metadataLayers(from, "from")} />
      </div>
      <div className="boundary-visual-preview__side" style={sideStyle("incoming")}>
        <StaticScenePreview model={metadataLayers(base, "to")} />
      </div>
      {frame.effect.blackOverlayOpacity > 0 ? (
        <div className="boundary-visual-preview__overlay boundary-visual-preview__overlay--black"
          style={{ opacity: frame.effect.blackOverlayOpacity }} aria-hidden="true" />
      ) : null}
      {frame.effect.whiteOverlayOpacity > 0 ? (
        <div className="boundary-visual-preview__overlay boundary-visual-preview__overlay--white"
          style={{ opacity: frame.effect.whiteOverlayOpacity }} aria-hidden="true" />
      ) : null}
    </div>
  );
}
