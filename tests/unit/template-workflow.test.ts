import { describe, expect, it } from "vitest";
import { ProjectSessionHistory } from "../../src/core/application/services/project-session-history";
import {
  createTemplateFromProject,
  TemplateTrialSession,
} from "../../src/core/application/services/template-workflow-service";
import { templateDocumentSchema } from "../../src/core/domain/template-document";
import { resolveVisualScene } from "../../src/core/domain/visual-scene-projection";
import type { ProjectDocument } from "../../src/core/domain/project-document";
import type { VisualScene } from "../../src/core/domain/visual-scene-schema";

const scene: VisualScene = {
  sceneVersion: 1,
  layers: [
    {
      id: "title",
      kind: "text",
      name: "Judul Track",
      visible: true,
      locked: false,
      transform: {
        x: 0.5,
        y: 0.5,
        width: 0.8,
        height: 0.2,
        rotationDeg: 0,
        opacity: 1,
        anchor: "center",
      },
      role: "title",
      style: {
        fontFamily: "Inter",
        fontSizeRatio: 0.05,
        fontWeight: "semibold",
        italic: false,
        align: "center",
        color: "#FFFFFFFF",
        letterSpacingRatio: 0,
        lineHeight: 1.2,
      },
    },
  ],
};

function fixture(id: string, song: string): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: id,
    name: "Full Album",
    revision: 0,
    tracks: [
      {
        id: "song-1",
        title: song,
        sourcePath: "C:/music/secret-track.wav",
      },
    ],
    visualScene: structuredClone(scene),
  };
}

const details = {
  templateId: "uji-template",
  name: "Uji Template",
  category: "Minimal" as const,
};

describe("T11-W05-03 template schema and safety", () => {
  it("stores only visual scene data and removes project-specific paths", () => {
    const project = fixture("source-project", "Lagu Rahasia");
    const template = createTemplateFromProject(project, details);

    expect(templateDocumentSchema.parse(template)).toEqual(template);
    expect(JSON.stringify(template)).not.toContain("secret-track.wav");
    expect(JSON.stringify(template)).not.toContain("source-project");
    expect(JSON.stringify(template)).not.toContain("Lagu Rahasia");
    expect(template.scene.layers[0]).toMatchObject({
      kind: "text",
      role: "title",
    });
  });

  it("rejects incompatible and corrupt templates and absolute file paths", () => {
    const template = createTemplateFromProject(
      fixture("s", "Track"),
      details,
    );
    expect(() =>
      templateDocumentSchema.parse({
        ...template,
        templateSchemaVersion: 2,
      }),
    ).toThrow();

    expect(() =>
      templateDocumentSchema.parse({
        ...template,
        tracks: [{ sourcePath: "C:/music/private.wav" }],
      }),
    ).toThrow();

    expect(() =>
      templateDocumentSchema.parse({
        ...template,
        scene: {
          sceneVersion: 1,
          layers: [
            ...template.scene.layers,
            { ...template.scene.layers[0], id: "duplicate", extra: "x" },
          ],
        },
      }),
    ).toThrow();

    expect(() =>
      templateDocumentSchema.parse({
        ...template,
        name: "C:\\private\\cover.png",
      }),
    ).toThrow();
  });
});

describe("T11-W05-03 non-destructive trial and history", () => {
  it("Try is non-dirty and Revert restores exact project", () => {
    const session = new ProjectSessionHistory(fixture("alpha", "Lagu A"));
    const initial = session.snapshot();
    const template = createTemplateFromProject(initial.project, details);
    const trial = new TemplateTrialSession(initial, template);
    const preview = trial.previewProject();

    expect(preview.visualScene).toEqual(template.scene);
    expect(trial.revert()).toEqual(initial.project);
    expect(session.snapshot()).toEqual(initial);
    expect(session.snapshot().undoDepth).toBe(0);
    expect(session.snapshot().dirty).toBe(false);
  });

  it("Apply is one atomic template-origin history node and Undo/Redo works", () => {
    const initialProject = fixture("alpha", "Lagu A");
    initialProject.visualScene = { sceneVersion: 1, layers: [] };
    const session = new ProjectSessionHistory(initialProject);
    const template = createTemplateFromProject(
      fixture("other", "Lagu B"),
      details,
    );
    const trial = new TemplateTrialSession(session.snapshot(), template);
    const before = session.snapshot();

    expect(trial.apply(session)).toMatchObject({
      status: "applied",
      entry: { origin: "template", kind: "template.apply" },
    });
    expect(session.snapshot()).toMatchObject({
      project: { revision: 1 },
      undoDepth: 1,
      dirty: true,
    });
    expect(session.snapshot().project.visualScene).toEqual(template.scene);
    expect(session.snapshot().project.tracks).toEqual(before.project.tracks);

    expect(session.undo().status).toBe("applied");
    expect(session.snapshot().dirty).toBe(false);
    expect(session.snapshot().project.visualScene).toEqual(
      before.project.visualScene,
    );
    expect(session.redo().status).toBe("applied");
    expect(session.snapshot().project.visualScene).toEqual(template.scene);
  });

  it("stale template apply rejects without partial mutation", () => {
    const session = new ProjectSessionHistory(fixture("alpha", "A"));
    const template = createTemplateFromProject(
      fixture("beta", "B"),
      details,
    );
    const trial = new TemplateTrialSession(session.snapshot(), template);
    const before = session.snapshot();
    expect(
      session.execute({
        kind: "project.rename",
        label: "Rename",
        origin: "manual",
        apply: (project) => ({ ...project, name: "Edited" }),
      }).status,
    ).toBe("applied");
    const changed = session.snapshot();

    expect(trial.apply(session)).toEqual({
      status: "rejected",
      code: "STALE_REVISION",
    });
    expect(session.snapshot()).toEqual(changed);
    expect(session.snapshot().project.visualScene).toEqual(
      before.project.visualScene,
    );
  });

  it("same template resolves a second project's track dynamically", () => {
    const template = createTemplateFromProject(
      fixture("first", "FIRST"),
      details,
    );
    const second = new ProjectSessionHistory(fixture("second", "SECOND"));
    const trial = new TemplateTrialSession(second.snapshot(), template);
    expect(trial.apply(second).status).toBe("noop");
    const resolved = resolveVisualScene(second.snapshot().project);
    expect(resolved.layers[0]).toMatchObject({
      resolvedKind: "text",
      resolvedText: { value: "SECOND" },
    });
  });
});
