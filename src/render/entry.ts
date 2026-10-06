export const RENDER_FOUNDATION_VERSION = "v1" as const;

export interface RenderFoundationDescriptor {
  readonly phase: "foundation";
  readonly version: typeof RENDER_FOUNDATION_VERSION;
}

export function getRenderFoundationDescriptor(): RenderFoundationDescriptor {
  return { phase: "foundation", version: RENDER_FOUNDATION_VERSION };
}
