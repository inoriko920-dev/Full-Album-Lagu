import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  resolveAlbumBoundaryVisualFrame,
  type ActiveBoundaryVisualFrame,
} from "../../src/core/domain/album-boundary-visual";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../src/core/domain/project-document";
import type { VisualBoundaryTransition } from "../../src/core/domain/visual-scene-schema";
import { BoundaryVisualPreview } from "../../src/renderer/app/BoundaryVisualPreview";

const presets: VisualBoundaryTransition["preset"][] = [
  "crossfade",
  "fade-through-black-blur",
  "slide",
  "zoom",
  "dissolve",
  "light-glitch",
  "soft-flash",
  "premium-album-change",
];

const transform = {
  x: 0.5,
  y: 0.5,
  width: 0.55,
  height: 0.32,
  rotationDeg: 0,
  opacity: 1,
  anchor: "center" as const,
};
const font = {
  fontFamily: "Arial",
  fontSizeRatio: 0.05,
  fontWeight: "semibold" as const,
  italic: false,
  align: "center" as const,
  color: "#ffffff",
  letterSpacingRatio: 0,
  lineHeight: 1.25,
};

function album(
  preset: VisualBoundaryTransition["preset"],
  artworkHandoff: VisualBoundaryTransition["artworkHandoff"] = "during-transition",
  titleHandoff: VisualBoundaryTransition["titleHandoff"] = "at-boundary",
): ProjectDocument {
  return projectDocumentSchema.parse({
    schemaVersion: 1,
    projectId: "w07-ac10-live-preview",
    name: "Preset Quality Regression",
    revision: 7,
    tracks: [
      {
        id: "track-a",
        title: "First Song",
        sourcePath: "a.wav",
        audioAssetId: "audio-a",
      },
      {
        id: "track-b",
        title: "Second Song",
        sourcePath: "b.wav",
        audioAssetId: "audio-b",
      },
    ],
    mediaAssets: [
      {
        id: "audio-a",
        kind: "audio",
        required: true,
        sourcePath: "a.wav",
        fileName: "a.wav",
        sizeBytes: 100,
        availability: "ready",
        metadata: {
          durationMs: 1000,
          title: "First Song",
          artist: "First Artist",
        },
      },
      {
        id: "audio-b",
        kind: "audio",
        required: true,
        sourcePath: "b.wav",
        fileName: "b.wav",
        sizeBytes: 100,
        availability: "ready",
        metadata: {
          durationMs: 2000,
          title: "Second Song",
          artist: "Second Artist",
        },
      },
    ],
    boundaryTransitions: [{
      fromTrackId: "track-a",
      toTrackId: "track-b",
      preset,
      durationMs: 800,
      easing: "linear",
      artworkHandoff,
      titleHandoff,
    }],
    visualScene: {
      sceneVersion: 1,
      layers: [
        {
          id: "background",
          name: "Background",
          kind: "background",
          visible: true,
          locked: true,
          transform: { ...transform, width: 1, height: 1 },
          fill: { type: "solid", color: "#142232" },
        },
        {
          id: "artwork",
          name: "Artwork",
          kind: "artwork",
          visible: true,
          locked: false,
          binding: "active-track-artwork",
          transform,
        },
        {
          id: "title",
          name: "Title",
          kind: "text",
          role: "title",
          visible: true,
          locked: false,
          style: font,
          transform,
        },
        {
          id: "artist",
          name: "Artist",
          kind: "text",
          role: "artist",
          visible: true,
          locked: false,
          style: font,
          transform,
        },
        {
          id: "spectrum",
          name: "Spectrum",
          kind: "spectrum",
          visible: true,
          locked: false,
          transform,
        },
        {
          id: "progress",
          name: "Progress",
          kind: "progress",
          visible: true,
          locked: false,
          transform,
        },
      ],
    },
  });
}

function frame(project: ProjectDocument, time: number): ActiveBoundaryVisualFrame {
  const projected = resolveAlbumBoundaryVisualFrame(project, time);
  if (projected.status !== "active") {
    throw new Error(`Expected a real active boundary frame at ${time}ms, found ${projected.status}`);
  }
  return projected;
}

function parts(element: HTMLElement) {
  const layers = element.querySelectorAll<HTMLElement>(
    ".boundary-visual-preview__side",
  );
  expect(layers).toHaveLength(2);
  return { from: layers[0]!, to: layers[1]! };
}

function artworkOpacity(side: HTMLElement): number {
  const layer = side.querySelector<HTMLElement>(
    ".static-scene-preview__layer--artwork",
  );
  expect(layer).not.toBeNull();
  return Number(layer!.style.opacity);
}

afterEach(cleanup);

describe("W11-07 AC10 real React Preview preset output regressions", () => {
  it.each(presets)("renders distinct real CSS effect channels for %s", (preset) => {
    const project = album(preset);
    const original = structuredClone(project);
    const atMidpoint = frame(project, 1400);
    const { container } = render(
      <BoundaryVisualPreview project={project} frame={atMidpoint}
        spectrumLevels={[0.4, 0.7]} progressFraction={0.5}/>,
    );
    const preview = container.querySelector<HTMLElement>(".boundary-visual-preview")!;
    expect(preview).toHaveAttribute("data-boundary-preset", preset);
    expect(preview).toHaveAttribute("data-boundary-from", "track-a");
    expect(preview).toHaveAttribute("data-boundary-to", "track-b");
    expect(preview).toHaveAttribute("data-boundary-progress", "0.500");

    const { from, to } = parts(preview);
    expect(from.textContent).toContain("First Song");
    expect(from.textContent).toContain("First Artist");
    expect(to.textContent).toContain("Second Song");
    expect(to.textContent).toContain("Second Artist");
    expect(artworkOpacity(from)).toBeCloseTo(atMidpoint.effect.outgoing.opacity);
    expect(artworkOpacity(to)).toBeCloseTo(atMidpoint.effect.incoming.opacity);
    expect(from.style.transform).toBe(
      `translateX(${atMidpoint.effect.outgoing.offsetX * 100}%) scale(${atMidpoint.effect.outgoing.scale})`,
    );
    expect(to.style.transform).toBe(
      `translateX(${atMidpoint.effect.incoming.offsetX * 100}%) scale(${atMidpoint.effect.incoming.scale})`,
    );
    expect(from.style.filter).toContain(`blur(${atMidpoint.effect.outgoing.blur * 12}px)`);
    expect(to.style.filter).toContain(`blur(${atMidpoint.effect.incoming.blur * 12}px)`);
    expect(preview.querySelectorAll(".boundary-visual-preview__foundation .static-scene-preview__layer--background")).toHaveLength(1);
    expect(preview.querySelectorAll(".boundary-visual-preview__foundation .static-scene-preview__spectrum")).toHaveLength(1);
    expect(preview.querySelectorAll(".boundary-visual-preview__side .static-scene-preview__spectrum")).toHaveLength(0);
    expect(preview.querySelectorAll(".boundary-visual-preview__foundation .static-scene-preview__progress")).toHaveLength(1);
    expect(preview.querySelectorAll(".boundary-visual-preview__side .static-scene-preview__progress")).toHaveLength(0);

    const black = preview.querySelector<HTMLElement>(".boundary-visual-preview__overlay--black");
    const white = preview.querySelector<HTMLElement>(".boundary-visual-preview__overlay--white");
    expect(black === null ? 0 : Number(black.style.opacity)).toBeCloseTo(atMidpoint.effect.blackOverlayOpacity);
    expect(white === null ? 0 : Number(white.style.opacity)).toBeCloseTo(atMidpoint.effect.whiteOverlayOpacity);

    expect(project).toEqual(original);
    expect(project.revision).toBe(7);
  });

  it("distinguishes dissolve from crossfade away from the midpoint", () => {
    const crossfade = frame(album("crossfade"), 1200);
    const dissolve = frame(album("dissolve"), 1200);
    expect(crossfade.effect.incoming.opacity).toBeCloseTo(0.25);
    expect(dissolve.effect.incoming.opacity).toBeCloseTo(0.15625);
    expect(dissolve.effect.incoming.opacity).toBeLessThan(crossfade.effect.incoming.opacity);
    const project = album("dissolve");
    const { container } = render(<BoundaryVisualPreview project={project} frame={frame(project, 1200)}/>);
    const incoming = container.querySelectorAll<HTMLElement>(".boundary-visual-preview__side")[1]!;
    expect(artworkOpacity(incoming)).toBeCloseTo(0.15625);
  });

  it("applies at-boundary title and artist handoffs independently of artwork blending", () => {
    const project = album("fade-through-black-blur");
    const { container } = render(
      <BoundaryVisualPreview project={project} frame={frame(project, 1400)} />,
    );
    const preview = container.querySelector<HTMLElement>(".boundary-visual-preview")!;
    const { from, to } = parts(preview);
    for (const role of ["title", "artist"]) {
      const outgoing = from.querySelector<HTMLElement>(
        `[data-scene-layer-id="${role}"]`,
      );
      const incoming = to.querySelector<HTMLElement>(
        `[data-scene-layer-id="${role}"]`,
      );
      expect(outgoing).toHaveStyle({ opacity: "0" });
      expect(incoming).toHaveStyle({ opacity: "1" });
    }
    expect(preview.querySelector(".boundary-visual-preview__overlay--black")).not.toBeNull();
  });

  it("uses configured at-boundary artwork and during-transition title handoffs", () => {
    const project = album("crossfade", "at-boundary", "during-transition");
    const { container } = render(
      <BoundaryVisualPreview project={project} frame={frame(project, 1200)} />,
    );
    const { from, to } = parts(container);
    expect(artworkOpacity(from)).toBe(0);
    expect(artworkOpacity(to)).toBe(1);
    expect(Number(from.querySelector<HTMLElement>('[data-scene-layer-id="title"]')!.style.opacity)).toBeCloseTo(0.75);
    expect(Number(to.querySelector<HTMLElement>('[data-scene-layer-id="title"]')!.style.opacity)).toBeCloseTo(0.25);
  });

  it("renders light glitch and premium zoom/blur from the actual preset parameters", () => {
    for (const preset of ["light-glitch", "premium-album-change"] as const) {
      const project = album(preset);
      const snapshot = frame(project, 1400);
      const { container, unmount } = render(
        <BoundaryVisualPreview project={project} frame={snapshot}/>,
      );
      const { from, to } = parts(container);
      if (preset === "light-glitch") {
        expect(snapshot.effect.glitchAmount).toBeGreaterThan(0);
        expect(from.style.filter).toContain("contrast(1.");
        expect(to.style.filter).toContain("contrast(1.");
        expect(from.style.transform).not.toBe("translateX(0%) scale(1)");
      } else {
        expect(snapshot.effect.outgoing.blur).toBeGreaterThan(0);
        expect(from.style.filter).not.toContain("blur(0px)");
        expect(from.style.transform).toContain("scale(1.04)");
        expect(container.querySelector(".boundary-visual-preview__overlay--white")).not.toBeNull();
      }
      unmount();
    }
  });

  it("repeated seek forward and backward never changes the sampled Preview presentation", () => {
    const project = album("slide");
    const saved = structuredClone(project);
    const sampleOrder = [1000, 1400, 1750, 1200, 1400, 1000, 1400];
    const snapshots = sampleOrder.map(time => {
      const current = frame(project, time);
      const { container, unmount } = render(
        <BoundaryVisualPreview project={project} frame={current}/>,
      );
      const preview = container.querySelector<HTMLElement>(".boundary-visual-preview")!;
      const { from, to } = parts(preview);
      const result = {
        fromTransform: from.style.transform,
        toTransform: to.style.transform,
        fromOpacity: artworkOpacity(from),
        toOpacity: artworkOpacity(to),
      };
      unmount();
      return result;
    });
    expect(snapshots[1]).toEqual(snapshots[4]);
    expect(snapshots[1]).toEqual(snapshots[6]);
    expect(snapshots[0]).toEqual({
      fromTransform: "translateX(0%) scale(1)",
      toTransform: "translateX(100%) scale(1)",
      fromOpacity: 1,
      toOpacity: 0,
    });
    expect(project).toEqual(saved);
  });
});
