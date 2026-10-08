import type { TemplateStore } from "../ports/template-store";
import {
  projectDocumentSchema,
  type ProjectDocument,
} from "../../domain/project-document";
import {
  templateCategorySchema,
  templateDocumentSchema,
  templateIdSchema,
  type TemplateCategory,
  type TemplateDocument,
} from "../../domain/template-document";
import {
  visualSceneSchema,
  type VisualScene,
} from "../../domain/visual-scene-schema";
import type {
  ProjectCommand,
  ProjectCommandEngineSnapshot,
  ProjectCommandExecutionResult,
  ProjectStateToken,
} from "./project-command-engine";
import type { ProjectSessionHistory } from "./project-session-history";

export interface SaveTemplateInput {
  templateId: string;
  name: string;
  category: TemplateCategory;
}

function copyScene(scene: VisualScene): VisualScene {
  return visualSceneSchema.parse(structuredClone(scene));
}

export function createTemplateFromProject(
  projectInput: ProjectDocument,
  input: SaveTemplateInput,
): TemplateDocument {
  const project = projectDocumentSchema.parse(projectInput);
  const scene = project.visualScene ?? {
    sceneVersion: 1,
    layers: [],
  };

  return templateDocumentSchema.parse({
    templateSchemaVersion: 1,
    templateId: templateIdSchema.parse(input.templateId),
    name: input.name,
    category: templateCategorySchema.parse(input.category),
    scene: copyScene(scene),
  });
}

export async function saveTemplateFromProject(
  store: TemplateStore,
  project: ProjectDocument,
  input: SaveTemplateInput,
): Promise<TemplateDocument> {
  const template = createTemplateFromProject(project, input);
  await store.saveUserTemplate(template);
  return templateDocumentSchema.parse(structuredClone(template));
}

export class TemplateTrialSession {
  private readonly projectId: string;
  private readonly baseProject: ProjectDocument;
  private readonly baseRevision: number;
  private readonly baseStateToken: ProjectStateToken;
  private readonly candidateScene: VisualScene;
  private readonly templateName: string;

  constructor(
    snapshot: Pick<ProjectCommandEngineSnapshot, "project" | "stateToken">,
    templateInput: TemplateDocument,
  ) {
    const project = projectDocumentSchema.parse(snapshot.project);
    const template = templateDocumentSchema.parse(templateInput);
    if (snapshot.stateToken.trim().length === 0) {
      throw new Error("Template trial requires a valid state token.");
    }

    this.projectId = project.projectId;
    this.baseProject = structuredClone(project);
    this.baseRevision = project.revision;
    this.baseStateToken = snapshot.stateToken;
    this.candidateScene = copyScene(template.scene);
    this.templateName = template.name;
  }

  previewProject(): ProjectDocument {
    return projectDocumentSchema.parse({
      ...structuredClone(this.baseProject),
      visualScene: copyScene(this.candidateScene),
    });
  }

  revert(): ProjectDocument {
    return projectDocumentSchema.parse(structuredClone(this.baseProject));
  }

  createApplyCommand(): ProjectCommand {
    const expectedProjectId = this.projectId;
    const scene = copyScene(this.candidateScene);

    return {
      kind: "template.apply",
      label: `Terapkan template ${this.templateName}`,
      origin: "template",
      expectedBaseRevision: this.baseRevision,
      expectedStateToken: this.baseStateToken,
      apply: (project) => {
        if (project.projectId !== expectedProjectId) {
          throw new Error("Template trial belongs to another project.");
        }
        return projectDocumentSchema.parse({
          ...project,
          visualScene: copyScene(scene),
        });
      },
    };
  }

  apply(session: ProjectSessionHistory): ProjectCommandExecutionResult {
    return session.execute(this.createApplyCommand());
  }
}
