import type { FoundationInfo } from "./foundation-info";
import type {
  SaveProjectRequest,
  SaveProjectResult,
  StartupProjectResult,
} from "./project-persistence";

export interface LfaBridge {
  getFoundationInfo(): Promise<FoundationInfo>;
  saveProject(request: SaveProjectRequest): Promise<SaveProjectResult>;
  getStartupProject(): Promise<StartupProjectResult>;
}
