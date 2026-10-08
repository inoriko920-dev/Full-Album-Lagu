import { describe, expect, it } from "vitest";
import { planPreviewAudioByteRange } from "../../src/main/infrastructure/media/preview-audio-byte-range";

describe("T11-W06-02 audio preview single-range protocol (bounded)", () => {
  it("returns exact full-body bounds for a valid size", () => {
    expect(planPreviewAudioByteRange(16)).toEqual({
      status: "full",
      start: 0,
      end: 15,
      length: 16,
    });
    expect(planPreviewAudioByteRange(0)).toEqual({
      status: "full",
      start: 0,
      end: 0,
      length: 0,
    });
  });

  it("supports an explicit inclusive first/last byte window", () => {
    expect(planPreviewAudioByteRange(16, "bytes=2-5")).toEqual({
      status: "partial",
      start: 2,
      end: 5,
      length: 4,
    });
    expect(planPreviewAudioByteRange(16, "bytes=0-0")).toMatchObject({
      start: 0,
      end: 0,
      length: 1,
    });
  });

  it("supports a range from start to EOF", () => {
    expect(planPreviewAudioByteRange(16, "bytes=10-")).toEqual({
      status: "partial",
      start: 10,
      end: 15,
      length: 6,
    });
  });

  it("supports suffix ranges and clamps to file length", () => {
    expect(planPreviewAudioByteRange(16, "bytes=-5")).toEqual({
      status: "partial",
      start: 11,
      end: 15,
      length: 5,
    });
    expect(planPreviewAudioByteRange(16, "bytes=-100")).toMatchObject({
      status: "partial",
      start: 0,
      end: 15,
      length: 16,
    });
  });

  it("clips a requested end beyond EOF instead of reading extra bytes", () => {
    expect(planPreviewAudioByteRange(16, "bytes=15-999")).toEqual({
      status: "partial",
      start: 15,
      end: 15,
      length: 1,
    });
  });

  it("rejects missing bytes and backwards/excessive offsets", () => {
    for (const header of ["bytes=16-", "bytes=5-4", "bytes=-0"]) {
      expect(planPreviewAudioByteRange(16, header)).toEqual({
        status: "unsatisfiable",
      });
    }
    expect(planPreviewAudioByteRange(0, "bytes=0-")).toEqual({
      status: "unsatisfiable",
    });
  });

  it("denies malformed and multiple byte ranges without fallback", () => {
    const invalid = [
      "bytes=",
      "bytes=-",
      "bytes=0-1,3-4",
      "bytes=0-1,",
      "bytes=0-1\r\nX-Foo: bar",
      "bytes=NaN-4",
      "bytes=1.5-3",
      "items=0-4",
      "bytes=9007199254740993-",
      "bytes=0-999999999999999999",
      "bytes=" + "1".repeat(200),
    ];
    for (const header of invalid) {
      expect(planPreviewAudioByteRange(16, header)).toEqual({
        status: "invalid",
      });
    }
  });

  it("rejects unsafe or nonsensical file sizes", () => {
    for (const size of [-1, -Infinity, Infinity, Number.NaN, 0.25]) {
      expect(planPreviewAudioByteRange(size)).toEqual({ status: "invalid" });
    }
    expect(planPreviewAudioByteRange(Number.MAX_SAFE_INTEGER)).toMatchObject({
      status: "full",
      length: Number.MAX_SAFE_INTEGER,
    });
  });
});
