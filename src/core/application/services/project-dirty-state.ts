export function isProjectDirty(
  currentRevision: number,
  savedRevision: number,
): boolean {
  if (
    !Number.isInteger(currentRevision) ||
    currentRevision < 0 ||
    !Number.isInteger(savedRevision) ||
    savedRevision < 0
  ) {
    throw new Error("Project revisions must be non-negative integers.");
  }

  return currentRevision !== savedRevision;
}
