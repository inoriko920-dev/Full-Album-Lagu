import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../src/core/domain/project-document";
import { buildStaticScenePreview } from "../../src/core/domain/static-scene-preview";
import { VisualAnimationControls } from "../../src/renderer/app/VisualAnimationControls";
import type { ProjectSessionView } from "../../src/renderer/state/project-session/use-project-session";
import { StaticScenePreview } from "../../src/renderer/visual/StaticScenePreview";
import type { VisualLayerAnimation } from "../../src/core/domain/visual-scene-schema";

const transform = {
  x: 0.5,
  y: 0.5,
  width: 0.4,
  height: 0.4,
  rotationDeg: 0,
  opacity: 1,
  anchor: "center" as const,
};

function project(
  animation?: VisualLayerAnimation,
  locked = false,
): ProjectDocument {
  return projectDocumentSchema.parse({
    schemaVersion: 1,
    projectId: "visual-animation-controls-test",
    name: "Album",
    revision: 0,
    tracks: [],
    visualScene: {
      sceneVersion: 1,
      layers: [
        {
          id: "artwork",
          name: "Artwork",
          kind: "artwork",
          visible: true,
          locked,
          binding: "active-track-artwork",
          transform,
          ...(animation === undefined ? {} : { animation }),
        },
      ],
    },
  });
}

function setup(
  animation?: VisualLayerAnimation,
  locked = false,
  trial = false,
) {
  const spy = vi.fn<
    (...args: [string, VisualLayerAnimation | undefined]) => boolean
  >(() => true);
  const session = {
    templateTrialProject: trial ? project() : null,
    setVisualLayerAnimation: spy,
  } as unknown as ProjectSessionView;
  const layer = buildStaticScenePreview(project(animation, locked), {
    selectedLayerId: "artwork",
  }).layers[0]!;
  const view = render(
    <VisualAnimationControls layer={layer} session={session} />,
  );
  return { ...view, spy };
}

afterEach(cleanup);

describe("W11-07 T05 Inspector UI-IMG-002G animation controls", () => {
  it("shows four approved groups, all without modifying a legacy layer until edited", () => {
    const { spy } = setup();
    for (const title of [
      "Animasi Masuk",
      "Animasi Keluar",
      "Animasi Loop",
      "Keyframe Manual",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Preset Animasi Masuk")).toHaveValue("");
    expect(screen.getByLabelText("Preset Animasi Keluar")).toHaveValue("");
    expect(screen.getByLabelText("Preset Animasi Loop")).toHaveValue("");
    expect(screen.getByLabelText("Properti Keyframe")).toHaveValue("opacity");
    expect(screen.getByText("Posisi, skala, dan opasitas")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("stores the approved Zoom In 0.8sec Ease Out entrance through the official setter", () => {
    const { spy } = setup();
    fireEvent.change(screen.getByLabelText("Preset Animasi Masuk"), {
      target: { value: "zoom-in" },
    });
    expect(spy).toHaveBeenCalledWith("artwork", {
      entrance: { preset: "zoom-in", durationMs: 800, easing: "ease-out" },
    });
  });

  it("saves only the agreed Fade Out exit and Slow Zoom loop settings", () => {
    const exit = setup();
    fireEvent.change(screen.getByLabelText("Preset Animasi Keluar"), {
      target: { value: "fade-out" },
    });
    expect(exit.spy).toHaveBeenCalledWith("artwork", {
      exit: { preset: "fade-out", durationMs: 600, easing: "ease-out" },
    });
    exit.unmount();
    const loop = setup();
    fireEvent.change(screen.getByLabelText("Preset Animasi Loop"), {
      target: { value: "slow-zoom" },
    });
    expect(loop.spy).toHaveBeenCalledWith("artwork", {
      loop: {
        preset: "slow-zoom",
        durationMs: 8000,
        enabled: true,
        intensity: "subtle",
      },
    });
  });

  it("adds the 2.5s 85% opacity keyframe with no implicit first keyframe", () => {
    const { spy } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Tambah Keyframe" }));
    expect(spy).toHaveBeenCalledWith("artwork", {
      keyframes: [
        {
          property: "opacity",
          points: [{ timeMs: 2500, value: 0.85 }],
        },
      ],
    });
  });

  it("adds 0s and updates 2.5s keys in ordered nonduplicating tracks", () => {
    const existing: VisualLayerAnimation = {
      keyframes: [
        {
          property: "opacity",
          points: [{ timeMs: 2500, value: 0.85 }],
        },
      ],
    };
    const { spy } = setup(existing);
    fireEvent.change(screen.getByLabelText("Waktu Keyframe (dtk)"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Nilai Keyframe"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah Keyframe" }));
    expect(spy).toHaveBeenCalledWith("artwork", {
      keyframes: [
        {
          property: "opacity",
          points: [
            { timeMs: 0, value: 1 },
            { timeMs: 2500, value: 0.85 },
          ],
        },
      ],
    });
  });

  it.each([
    ["85.5%", 0.855],
    ["33.33%", 0.3333],
  ])("preserves an existing fractional opacity %s when selecting and re-saving its keyframe", (_label, opacity) => {
    const animation: VisualLayerAnimation = {
      keyframes: [
        {
          property: "opacity",
          points: [{ timeMs: 2500, value: opacity }],
        },
      ],
    };
    const { spy } = setup(animation);

    // Selecting an existing diamond must not round the editor display.
    fireEvent.click(screen.getByRole("button", { name: "Keyframe 2,5 detik" }));
    expect(screen.getByLabelText("Nilai Keyframe")).toHaveValue(opacity * 100);
    expect(spy).not.toHaveBeenCalled();

    // Saving without changing its value must not silently corrupt the project.
    fireEvent.click(screen.getByRole("button", { name: "Tambah Keyframe" }));
    expect(spy).toHaveBeenCalledWith("artwork", animation);
  });

  it("deletes only matching keys and preserves the other properties", () => {
    const existing: VisualLayerAnimation = {
      keyframes: [
        {
          property: "opacity",
          points: [
            { timeMs: 0, value: 1 },
            { timeMs: 2500, value: 0.85 },
          ],
        },
        { property: "scale", points: [{ timeMs: 0, value: 1.1 }] },
      ],
    };
    const { spy } = setup(existing);
    fireEvent.click(screen.getByRole("button", { name: "Hapus Keyframe" }));
    expect(spy).toHaveBeenCalledWith("artwork", {
      keyframes: [
        { property: "scale", points: [{ timeMs: 0, value: 1.1 }] },
        { property: "opacity", points: [{ timeMs: 0, value: 1 }] },
      ],
    });
  });

  it("rejects out-of-bounds manual keyframes before calling ProjectSession", () => {
    const { spy } = setup();
    fireEvent.change(screen.getByLabelText("Nilai Keyframe"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah Keyframe" }));
    expect(screen.getByRole("alert")).toHaveTextContent("tidak valid");
    expect(spy).not.toHaveBeenCalled();
  });

  it("disables mutations for locked layers and an active template Try state", () => {
    const locked = setup(undefined, true);
    expect(screen.getByLabelText("Preset Animasi Masuk")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Tambah Keyframe" }),
    ).toBeDisabled();
    locked.unmount();
    const trial = setup(undefined, false, true);
    expect(screen.getByLabelText("Preset Animasi Masuk")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Tambah Keyframe" }),
    ).toBeDisabled();
    expect(trial.spy).not.toHaveBeenCalled();
  });

  it("removes absent and last preset to preserve legacy no-animation schema", () => {
    const current: VisualLayerAnimation = {
      entrance: { preset: "zoom-in", durationMs: 800, easing: "ease-out" },
    };
    const { spy } = setup(current);
    fireEvent.change(screen.getByLabelText("Preset Animasi Masuk"), {
      target: { value: "" },
    });
    expect(spy).toHaveBeenCalledWith("artwork", undefined);
  });

  it("renders committed animation geometry from the real per-track local clock", () => {
    const animation: VisualLayerAnimation = {
      keyframes: [
        {
          property: "opacity",
          points: [
            { timeMs: 0, value: 1 },
            { timeMs: 2500, value: 0.85 },
          ],
        },
      ],
    };
    const model = buildStaticScenePreview(project(animation), {
      selectedLayerId: "artwork",
    });
    const { rerender } = render(
      <StaticScenePreview
        model={model}
        animationTimeMs={1250}
        animationDurationMs={5000}
      />,
    );
    const art = screen.getByRole("button", { name: "Pilih layer Artwork" });
    expect(art).toHaveStyle({ opacity: "0.925" });
    expect(art).toHaveAttribute("aria-pressed", "true");
    rerender(
      <StaticScenePreview
        model={model}
        animationTimeMs={2500}
        animationDurationMs={5000}
      />,
    );
    expect(art).toHaveStyle({ opacity: "0.85" });
    rerender(<StaticScenePreview model={model} />);
    expect(art).toHaveStyle({ opacity: "1" });
  });
});
