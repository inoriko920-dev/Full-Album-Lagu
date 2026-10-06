import type { FoundationInfo } from "./foundation-info";
import type {
  OpenProjectResult,
  SaveProjectRequest,
  SaveProjectResult,
  StartupProjectResult,
} from "./project-persistence";

export interface LfaBridge {
  getFoundationInfo(): Promise<FoundationInfo>;
  saveProject(request: SaveProjectRequest): Promise<SaveProjectResult>;
  saveProjectAs(request: SaveProjectRequest): Promise<SaveProjectResult>;
  openProject(): Promise<OpenProjectResult>;
  getStartupProject(): Promise<StartupProjectResult>;
}
