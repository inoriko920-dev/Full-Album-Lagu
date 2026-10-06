export type ProjectPathState =
  | { kind: "unsaved" }
  | { kind: "known-path"; path: string };

export class ProjectPathSession {
  #currentPath: string | null = null;

  getState(): ProjectPathState {
    return this.#currentPath === null
      ? { kind: "unsaved" }
      : { kind: "known-path", path: this.#currentPath };
  }

  getCurrentPath(): string | null {
    return this.#currentPath;
  }

  setKnownPath(path: string): void {
    const normalizedPath = path.trim();
    if (normalizedPath.length === 0) {
      throw new Error("Project path must not be empty.");
    }

    this.#currentPath = normalizedPath;
  }

  clear(): void {
    this.#currentPath = null;
  }
}
