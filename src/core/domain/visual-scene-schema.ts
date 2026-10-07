import { z } from "zod";

export const VISUAL_SCENE_VERSION = 1 as const;

export const visualLayerAnchorSchema = z.enum([
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);

export const visualLayerTransformSchema = z
  .object({
    x: z.number().min(-1).max(2),
    y: z.number().min(-1).max(2),
    width: z.number().gt(0).max(2),
    height: z.number().gt(0).max(2),
    rotationDeg: z.number().min(-360).max(360),
    opacity: z.number().min(0).max(1),
    anchor: visualLayerAnchorSchema,
  })
  .strict();

export const visualColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/);

export const visualGradientStopSchema = z
  .object({
    offset: z.number().min(0).max(1),
    color: visualColorSchema,
  })
  .strict();

export const visualBackgroundFillSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("solid"),
      color: visualColorSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("linear-gradient"),
      angleDeg: z.number().min(-360).max(360),
      stops: z
        .array(visualGradientStopSchema)
        .min(2)
        .max(8)
        .superRefine((stops, context) => {
          for (let index = 1; index < stops.length; index += 1) {
            if (stops[index]!.offset <= stops[index - 1]!.offset) {
              context.addIssue({
                code: "custom",
                message: "Gradient stop offsets must be strictly increasing.",
                path: [index, "offset"],
              });
            }
          }
        }),
    })
    .strict(),
]);

export const visualTextRoleSchema = z.enum([
  "title",
  "artist",
  "track-number",
  "progress-text",
  "static",
]);

export const visualTextStyleSchema = z
  .object({
    fontFamily: z.string().trim().min(1).max(120),
    fontSizeRatio: z.number().min(0.005).max(0.5),
    fontWeight: z.enum(["normal", "medium", "semibold", "bold"]),
    italic: z.boolean(),
    align: z.enum(["left", "center", "right"]),
    color: visualColorSchema,
    letterSpacingRatio: z.number().min(-0.05).max(0.2),
    lineHeight: z.number().min(0.5).max(3),
  })
  .strict();

const visualLayerBaseShape = {
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: visualLayerTransformSchema,
};

export const visualBackgroundLayerSchema = z
  .object({
    ...visualLayerBaseShape,
    kind: z.literal("background"),
    fill: visualBackgroundFillSchema,
  })
  .strict();

export const visualArtworkLayerSchema = z
  .object({
    ...visualLayerBaseShape,
    kind: z.literal("artwork"),
    binding: z.enum(["active-track-artwork", "album-artwork"]),
  })
  .strict();

export const visualTextLayerSchema = z
  .object({
    ...visualLayerBaseShape,
    kind: z.literal("text"),
    role: visualTextRoleSchema,
    text: z.string().max(2000).optional(),
    style: visualTextStyleSchema,
  })
  .strict()
  .superRefine((layer, context) => {
    const hasText = layer.text !== undefined;
    if (layer.role === "static") {
      if (!hasText || layer.text!.trim().length === 0) {
        context.addIssue({
          code: "custom",
          message: "Static text layers require non-empty text.",
          path: ["text"],
        });
      }
      return;
    }

    if (hasText) {
      context.addIssue({
        code: "custom",
        message:
          "Dynamic text layers must not persist resolved track-dependent text.",
        path: ["text"],
      });
    }
  });

export const visualSpectrumLayerSchema = z
  .object({
    ...visualLayerBaseShape,
    kind: z.literal("spectrum"),
  })
  .strict();

export const visualProgressLayerSchema = z
  .object({
    ...visualLayerBaseShape,
    kind: z.literal("progress"),
  })
  .strict();

export const visualLayerSchema = z.discriminatedUnion("kind", [
  visualBackgroundLayerSchema,
  visualArtworkLayerSchema,
  visualTextLayerSchema,
  visualSpectrumLayerSchema,
  visualProgressLayerSchema,
]);

export const visualSceneSchema = z
  .object({
    sceneVersion: z.literal(VISUAL_SCENE_VERSION),
    layers: z.array(visualLayerSchema).max(512),
  })
  .strict()
  .superRefine((scene, context) => {
    const ids = new Set<string>();
    scene.layers.forEach((layer, index) => {
      if (ids.has(layer.id)) {
        context.addIssue({
          code: "custom",
          message: "Visual layer IDs must be unique.",
          path: ["layers", index, "id"],
        });
      }
      ids.add(layer.id);
    });
  });

export type VisualLayerAnchor = z.infer<typeof visualLayerAnchorSchema>;
export type VisualLayerTransform = z.infer<typeof visualLayerTransformSchema>;
export type VisualBackgroundFill = z.infer<typeof visualBackgroundFillSchema>;
export type VisualTextRole = z.infer<typeof visualTextRoleSchema>;
export type VisualTextStyle = z.infer<typeof visualTextStyleSchema>;
export type VisualBackgroundLayer = z.infer<
  typeof visualBackgroundLayerSchema
>;
export type VisualArtworkLayer = z.infer<typeof visualArtworkLayerSchema>;
export type VisualTextLayer = z.infer<typeof visualTextLayerSchema>;
export type VisualSpectrumLayer = z.infer<typeof visualSpectrumLayerSchema>;
export type VisualProgressLayer = z.infer<typeof visualProgressLayerSchema>;
export type VisualLayer = z.infer<typeof visualLayerSchema>;
export type VisualScene = z.infer<typeof visualSceneSchema>;
