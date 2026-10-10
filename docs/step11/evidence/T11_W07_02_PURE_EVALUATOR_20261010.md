# T11-W07-02 — Deterministic animation/keyframe evaluator (2026-10-10)

**Scope:** Source-domain implementation of agreed W11-07 T02 only. New canonical owner `src/core/domain/visual-animation-evaluator.ts` evaluates `VisualLayer` animation settings already added in merged T01. No extra presets, UI assets, project schema, renderer orchestration, player clock, or CommandEngine mutation.

## Contract and ordering
- Caller passes validated per-track local timestamp derived from existing `projectAlbumTimeline` / `resolveAlbumPlaybackPosition`. No separate persisted track order or frame-history clock.
- Manual keyframes run first: x/y/opacity are absolute values, scale is relative to layer's static width and height. Between keys interpolate linearly; before first/after last hold endpoint.
- Loop animation runs second, then entrance and exit. Evaluator supports the existing agreed preset sets only; loops are phase-based, repeatable and reversible at equal timestamps.
- Sample time is bounded to track duration; reject NaN/Infinity/negative time or zero/negative/nonfinite duration. Final dimensions/position/opacity remain in supported visual bounds. Input layer and project are never mutated.

## Evidence
- Real tests in `tests/unit/visual-animation-evaluator.test.ts`: legacy/no animation, opacity 100% at 0ms / 92.5% at 1250ms / 85% at 2500ms, keyframe x/y/scale, easing, fade/zoom/slide/shrink, float/pulse/slow-zoom, disabled loop, overlapping short-track entrance+exit, backward seeks, exact canonical track switch and 128-layer x10 deterministic replay.
- [CI #800](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38025476610) failed formatting only.
- [CI #801](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38025641792) **SUCCESS with temporary automatic Prettier step** (for recovering exact required formatting). Thus #801 is **not** exact immutable source validation.
- Exact Prettier test-only diff was applied to repository; evaluator source was already unchanged by Prettier. Temporary formatter workflow stage has been deleted and restored to exactly the `main` workflow content.
- **Status: IMPLEMENTED; final exact-head normal Windows CI PENDING**. No merge or T03 work until it passes.

## Explicit limitations
This task returns pure layer transform samples; it does **not** draw animated pixels, wire the Inspector or simulate an audio speaker. T03 CommandEngine integration and T04–07 runtime/Windows proof still follow sequentially. W11-06 physical listening/real Suspend-Resume/multi-hour resource checks remain NOT_TESTED; no MP4 and no final release.
