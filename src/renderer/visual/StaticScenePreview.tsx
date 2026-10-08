import type { CSSProperties } from "react";
import type {
  StaticSceneLayer,
  StaticScenePreviewModel,
} from "../../core/domain/static-scene-preview";
import type {
  VisualLayerAnchor,
  VisualLayerTransform,
} from "../../core/domain/visual-scene-schema";
import { TemplateArtwork } from "./TemplateArtwork";
import "./static-scene-preview.css";

export interface StaticScenePreviewProps {
  model: StaticScenePreviewModel;
  onSelectLayer?: (layerId: string) => void;
  /** Local illustrative sample, never a source media asset or encoded in project. */
  templateArtwork?: { templateId: string; category: string } | undefined;
}

const spectrumBarHeights = [
  24, 40, 63, 36, 72, 46, 86, 54, 30, 68, 42, 90, 53, 72, 35, 58, 82, 45, 67,
  39, 26,
];

const anchorOffsets: Record<VisualLayerAnchor, readonly [number, number]> = {
  "top-left": [0, 0],
  "top-center": [-50, 0],
  "top-right": [-100, 0],
  "center-left": [0, -50],
  center: [-50, -50],
  "center-right": [-100, -50],
  "bottom-left": [0, -100],
  "bottom-center": [-50, -100],
  "bottom-right": [-100, -100],
};

function frameStyle(transform: VisualLayerTransform): CSSProperties {
  const [dx, dy] = anchorOffsets[transform.anchor];
  return {
    position: "absolute",
    left: `${transform.x * 100}%`,
    top: `${transform.y * 100}%`,
    width: `${transform.width * 100}%`,
    height: `${transform.height * 100}%`,
    transform: `translate(${dx}%, ${dy}%) rotate(${transform.rotationDeg}deg)`,
    opacity: transform.opacity,
  };
}

function backgroundStyle(
  layer: Extract<StaticSceneLayer, { kind: "background" }>,
): CSSProperties {
  const fill = layer.fill;
  if (fill.type === "solid") return { backgroundColor: fill.color };
  return {
    backgroundImage: `linear-gradient(${fill.angleDeg}deg, ${fill.stops
      .map((stop) => `${stop.color} ${stop.offset * 100}%`)
      .join(", ")})`,
  };
}

function fontWeight(weight: string): number {
  if (weight === "medium") return 500;
  if (weight === "semibold") return 600;
  if (weight === "bold") return 700;
  return 400;
}

function layerContent(
  layer: StaticSceneLayer,
  templateArtwork?: { templateId: string; category: string },
) {
  switch (layer.kind) {
    case "background":
      return null;
    case "artwork":
      return (
        <span
          className="static-scene-preview__artwork"
          role="img"
          aria-label={
            layer.resolvedArtwork.assetId === undefined
              ? "Ilustrasi contoh, bukan artwork asli"
              : "Artwork sumber terhubung, thumbnail belum tersedia"
          }
        >
          {layer.resolvedArtwork.assetId === undefined ? (
            <TemplateArtwork
              templateId={templateArtwork?.templateId ?? "minimal-biru"}
              category={templateArtwork?.category ?? "Minimal"}
              className="static-scene-preview__artwork-illustration"
            />
          ) : (
            <span
              className="static-scene-preview__artwork-mark"
              aria-hidden="true"
            >
              ♫
            </span>
          )}
          <span className="static-scene-preview__artwork-label">
            {layer.resolvedArtwork.assetId === undefined
              ? "Artwork contoh"
              : "Artwork terhubung"}
          </span>
        </span>
      );
    case "text":
      return (
        <span
          className="static-scene-preview__text"
          style={{
            fontFamily: layer.style.fontFamily,
            fontSize: `${layer.style.fontSizeRatio * 100}cqw`,
            fontWeight: fontWeight(layer.style.fontWeight),
            fontStyle: layer.style.italic ? "italic" : "normal",
            textAlign: layer.style.align,
            color: layer.style.color,
            letterSpacing: `${layer.style.letterSpacingRatio * 100}cqw`,
            lineHeight: layer.style.lineHeight,
          }}
        >
          {layer.resolvedText.value}
        </span>
      );
    case "spectrum":
      return (
        <span
          className="static-scene-preview__spectrum"
          aria-label="Spectrum statis"
        >
          {spectrumBarHeights.map((height, index) => (
            <span
              key={index}
              className="static-scene-preview__bar"
              style={{ height: `${height}%` }}
            />
          ))}
        </span>
      );
    case "progress":
      return (
        <span
          className="static-scene-preview__progress"
          aria-label="Progress statis"
        >
          <span className="static-scene-preview__progress-track" />
        </span>
      );
  }
}

/**
 * Static W11-05 canvas surface, ready for later frozen-shell W05-05 wiring.
 * Deliberately not mounted in AppShell to preserve SCR-002A until that task.
 * No filesystem URLs, audio analyzer, playback, timers, render pipeline or AI.
 */
export function StaticScenePreview({
  model,
  onSelectLayer,
  templateArtwork,
}: StaticScenePreviewProps) {
  return (
    <div
      className="static-scene-preview"
      aria-label="Preview visual statis"
      data-track-context={model.trackContext.source}
      data-selected-layer-id={model.selectedLayerId ?? ""}
    >
      {model.layers.map((layer) =>
        !layer.visible ? null : (
          <button
            key={layer.id}
            type="button"
            className={[
              "static-scene-preview__layer",
              `static-scene-preview__layer--${layer.kind}`,
              layer.selected ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-scene-layer-id={layer.id}
            data-layer-locked={String(layer.locked)}
            aria-label={`Pilih layer ${layer.name}`}
            aria-pressed={layer.selected}
            onClick={() => onSelectLayer?.(layer.id)}
            style={{
              ...frameStyle(layer.transform),
              ...(layer.kind === "background" ? backgroundStyle(layer) : {}),
            }}
          >
            {layerContent(layer, templateArtwork)}
            {model.selectionOutline?.layerId === layer.id ? (
              <span
                className="static-scene-preview__selection"
                aria-hidden="true"
              >
                <span className="static-scene-preview__handle static-scene-preview__handle--tl" />
                <span className="static-scene-preview__handle static-scene-preview__handle--tr" />
                <span className="static-scene-preview__handle static-scene-preview__handle--bl" />
                <span className="static-scene-preview__handle static-scene-preview__handle--br" />
              </span>
            ) : null}
          </button>
        ),
      )}
    </div>
  );
}
