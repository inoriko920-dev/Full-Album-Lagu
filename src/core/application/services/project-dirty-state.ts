import type { ProjectStateToken } from "./project-command-engine";

function isValidStateToken(value: string): boolean {
  return value.trim().length > 0;
}

export function isProjectDirty(
  currentStateToken: ProjectStateToken,
  savedStateToken: ProjectStateToken | null,
): boolean {
  if (!isValidStateToken(currentStateToken)) {
    throw new Error("Current project state token must be non-empty.");
  }

  if (savedStateToken !== null && !isValidStateToken(savedStateToken)) {
    throw new Error("Saved project state token must be non-empty when set.");
  }

  return savedStateToken === null || currentStateToken !== savedStateToken;
}
