import { visualLayerSchema, type VisualLayer } from "../../core/domain/visual-scene-schema";

export const starterLayerTypes = [
  { id: "background", name: "Background" },
  { id: "artwork", name: "Artwork" },
  { id: "title", name: "Judul Track" },
  { id: "artist", name: "Artis" },
  { id: "spectrum", name: "Spectrum" },
  { id: "progress", name: "Progress Bar" },
] as const;
export type StarterLayerType = (typeof starterLayerTypes)[number]["id"];

const transform = {
  x: 0.5, y: 0.5, width: 0.55, height: 0.12,
  rotationDeg: 0, opacity: 1, anchor: "center" as const,
};
const textStyle = {
  fontFamily: "Inter", fontSizeRatio: 0.045, fontWeight: "semibold" as const,
  italic: false, align: "center" as const, color: "#FFFFFFFF",
  letterSpacingRatio: 0, lineHeight: 1.2,
};

/** Presentation-only factory for the six approved SCR-002C Layer families. */
export function createStarterLayer(type: StarterLayerType, id: string): VisualLayer {
  const name = starterLayerTypes.find((item) => item.id === type)?.name;
  if (name === undefined) throw new Error("Unknown starter layer type.");
  const common = {
    id, name, visible: true, locked: false,
    transform: { ...transform },
  };
  switch (type) {
    case "background":
      return visualLayerSchema.parse({
        ...common, kind: "background",
        transform: { ...transform, width: 1, height: 1 },
        fill: { type: "solid", color: "#0B1F38FF" },
      });
    case "artwork":
      return visualLayerSchema.parse({
        ...common, kind: "artwork",
        transform: { ...transform, x: 0.27, y: 0.48, width: 0.32, height: 0.56 },
        binding: "active-track-artwork",
      });
    case "title":
    case "artist":
      return visualLayerSchema.parse({
        ...common, kind: "text", role: type,
        transform: {
          ...transform,
          x: 0.72,
          y: type === "title" ? 0.43 : 0.56,
          width: 0.5,
          height: type === "title" ? 0.13 : 0.08,
        },
        style: { ...textStyle, fontSizeRatio: type === "title" ? 0.055 : 0.034 },
      });
    case "spectrum":
      return visualLayerSchema.parse({
        ...common, kind: "spectrum",
        transform: { ...transform, x: 0.71, y: 0.76, width: 0.5, height: 0.13 },
      });
    case "progress":
      return visualLayerSchema.parse({
        ...common, kind: "progress",
        transform: { ...transform, x: 0.5, y: 0.93, width: 0.85, height: 0.025 },
      });
  }
}
