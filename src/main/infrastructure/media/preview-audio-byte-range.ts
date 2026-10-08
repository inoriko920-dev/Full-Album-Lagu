/**
 * Bounded, single-range HTTP byte planning for the future main-owned audio
 * preview gateway. This layer does not resolve paths or issue media grants.
 * Multi-range requests intentionally fail closed until explicitly supported.
 */
export type PreviewAudioByteRange =
  | { status: "full"; start: number; end: number; length: number }
  | { status: "partial"; start: number; end: number; length: number }
  | { status: "unsatisfiable" }
  | { status: "invalid" };

export function planPreviewAudioByteRange(
  sizeBytes: number,
  rangeHeader?: string,
): PreviewAudioByteRange {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) {
    return { status: "invalid" };
  }

  if (rangeHeader === undefined) {
    return {
      status: "full",
      start: 0,
      end: sizeBytes === 0 ? 0 : sizeBytes - 1,
      length: sizeBytes,
    };
  }

  if (rangeHeader.length > 128) return { status: "invalid" };
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (match === null) return { status: "invalid" };

  const first = match[1] ?? "";
  const last = match[2] ?? "";
  if (first === "" && last === "") return { status: "invalid" };
  if (sizeBytes === 0) return { status: "unsatisfiable" };

  const parseBound = (text: string): number | undefined => {
    if (!/^\d+$/.test(text)) return undefined;
    const value = Number(text);
    return Number.isSafeInteger(value) ? value : undefined;
  };

  if (first === "") {
    const suffixLength = parseBound(last);
    if (suffixLength === undefined) return { status: "invalid" };
    if (suffixLength === 0) return { status: "unsatisfiable" };
    const start = Math.max(0, sizeBytes - suffixLength);
    return {
      status: "partial",
      start,
      end: sizeBytes - 1,
      length: sizeBytes - start,
    };
  }

  const start = parseBound(first);
  if (start === undefined) return { status: "invalid" };
  if (start >= sizeBytes) return { status: "unsatisfiable" };

  let end = sizeBytes - 1;
  if (last !== "") {
    const requestedEnd = parseBound(last);
    if (requestedEnd === undefined) return { status: "invalid" };
    if (requestedEnd < start) return { status: "unsatisfiable" };
    end = Math.min(end, requestedEnd);
  }

  return { status: "partial", start, end, length: end - start + 1 };
}
