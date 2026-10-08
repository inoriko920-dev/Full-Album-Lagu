import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { buildStaticScenePreview } from "../../src/core/domain/static-scene-preview";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import { StaticScenePreview } from "../../src/renderer/visual/StaticScenePreview";

const transform = { x: 0.25, y: 0.35, width: 0.4, height: 0.3, rotationDeg: 17, opacity: 0.7, anchor: "top-left" as const };

function fixture(): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: "component-preview",
    name: "Album",
    revision: 0,
    tracks: [{ id: "track-1", title: "Lagu Aktif", sourcePath: "audio-ref" }],
    visualScene: {
      sceneVersion: 1,
      layers: [
        {
          id: "background",
          name: "Background",
          kind: "background",
          visible: true,
          locked: true,
          transform: { ...transform, x: 0, y: 0, width: 1, height: 1, rotationDeg: 0, opacity: 1 },
          fill: { type: "solid", color: "#101820FF" },
        },
        {
          id: "artwork",
          name: "Artwork",
          kind: "artwork",
          binding: "active-track-artwork",
          visible: true,
          locked: false,
          transform: { ...transform },
        },
        {
          id: "title",
          name: "Judul Track",
          kind: "text",
          role: "title",
          style: {
            fontFamily: "Inter",
            fontSizeRatio: 0.05,
            fontWeight: "semibold",
            italic: false,
            align: "center",
            color: "#FFFFFFFF",
            letterSpacingRatio: 0.01,
            lineHeight: 1.2,
          },
          visible: true,
          locked: false,
          transform: { ...transform },
        },
        {
          id: "spectrum",
          name: "Spectrum",
          kind: "spectrum",
          visible: true,
          locked: false,
          transform: { ...transform },
        },
        {
          id: "progress",
          name: "Progress Bar",
          kind: "progress",
          visible: false,
          locked: false,
          transform: { ...transform },
        },
      ],
    },
  };
}

describe("T11-W05-04 static visual renderer", () => {
  it("renders title binding, artwork placeholder and geometry, with no direct filesystem URL", () => {
    const model = buildStaticScenePreview(fixture(), { selectedLayerId: "title" });
    const { container } = render(<StaticScenePreview model={model} />);
    const canvas = screen.getByLabelText("Preview visual statis");
    const title = screen.getByRole("button", { name: "Pilih layer Judul Track" });

    expect(canvas.getAttribute("data-track-context")).toBe("first-enabled");
    expect(title).toHaveTextContent("Lagu Aktif");
    expect(title).toHaveAttribute("aria-pressed", "true");
    expect(title).toHaveAttribute("data-scene-layer-id", "title");
    expect(title.getAttribute("style")).toContain("translate(0%, 0%) rotate(17deg)");
    expect(title.getAttribute("style")).toContain("left: 25%");
    expect(title.getAttribute("style")).toContain("opacity: 0.7");
    expect(within(title).getByText("Lagu Aktif")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Placeholder artwork" })).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelectorAll("video")).toHaveLength(0);
    expect(container.querySelectorAll("audio")).toHaveLength(0);
    expect(container.querySelectorAll(".static-scene-preview__handle")).toHaveLength(4);
  });

  it("projects all five supported layer families, skips hidden layers and never simulates playback", () => {
    const project = fixture();
    project.visualScene!.layers[4]!.visible = true;
    const model = buildStaticScenePreview(project);
    const { container, rerender } = render(<StaticScenePreview model={model} />);

    expect(container.querySelectorAll("[data-scene-layer-id]")).toHaveLength(5);
    expect(container.querySelectorAll(".static-scene-preview__bar")).toHaveLength(21);
    expect(screen.getByLabelText("Progress statis")).toBeInTheDocument();
    expect(container.querySelectorAll(".static-scene-preview__selection")).toHaveLength(0);

    rerender(
      <StaticScenePreview
        model={buildStaticScenePreview(fixture(), { selectedLayerId: "progress" })}
      />,
    );
    expect(screen.queryByRole("button", { name: "Pilih layer Progress Bar" })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".static-scene-preview__selection")).toHaveLength(0);
  });

  it("dispatches selection by stable ID including a locked layer, without editing canonical project", () => {
    const project = fixture();
    const original = structuredClone(project);
    const select = vi.fn();
    const view = buildStaticScenePreview(project);
    const { rerender, container } = render(
      <StaticScenePreview model={view} onSelectLayer={select} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pilih layer Background" }));
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith("background");
    rerender(
      <StaticScenePreview
        model={buildStaticScenePreview(project, { selectedLayerId: "background" })}
        onSelectLayer={select}
      />,
    );
    expect(screen.getByRole("button", { name: "Pilih layer Background" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelectorAll(".static-scene-preview__selection")).toHaveLength(1);
    expect(project).toEqual(original);
  });

  it("shows deterministic static Preview with 128 layers and selection projection", () => {
    const project = fixture();
    const original = project.visualScene!.layers[2]!;
    project.visualScene!.layers = Array.from({ length: 128 }, (_, i) => ({
      ...structuredClone(original),
      id: `layer-${i}`,
      name: `Judul-${i}`,
    }));
    const model = buildStaticScenePreview(project, { selectedLayerId: "layer-80" });
    const { container } = render(<StaticScenePreview model={model} />);
    expect(container.querySelectorAll("[data-scene-layer-id]")).toHaveLength(128);
    expect(container.querySelectorAll(".static-scene-preview__selection")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Pilih layer Judul-80" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector("[data-scene-layer-id='layer-127']")).not.toBeNull();
  });
});
