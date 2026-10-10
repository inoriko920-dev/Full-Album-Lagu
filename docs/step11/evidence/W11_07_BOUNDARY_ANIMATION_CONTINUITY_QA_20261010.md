# W11-07 — Boundary animation continuity QA (2026-10-10)

## Defect fixed within the frozen product scope
The agreed FTR-009 keyframe/entrance/exit/loop animation was already applied by `StaticScenePreview` in ordinary playback. The W11-07 T06 `BoundaryVisualPreview` projected track-to-track transition channels but rendered both side layers from the static persisted transform. Entering a transition could therefore reset layer position/opacity keyframes even though the canonical track clock continued.

This QA-only stabilization reuses **the existing T02 `evaluateVisualLayerAnimation`**, **the existing canonical `projectAlbumTimeline`** and **the existing T04 transition weights**. It applies each side's layer animation first, then the per-preset boundary opacity weighting; reversing that order allows an opacity keyframe to overwrite the transition. Outgoing samples at the actual boundary end relative to its original start, incoming samples at `frame.elapsedMs`; no second clock, schema, UI panel, feature, preset, asset or timeline was added. The original 29-state/UI-IMG-002D/UI-IMG-002G references remain frozen.

## Tests and proof
- Real React `BoundaryVisualPreview` component tests (three additional cases) check 1000ms outgoing end and 400ms incoming keyframes at global time 1400ms: outgoing x=100%, opacity 0.25; incoming x=40%, opacity 0.40 after crossfade.
- With artwork `at-boundary`, the outgoing side alpha remains 0 and incoming keeps its animated 0.80 alpha, independently of title/artist mode.
- Repeated seek to 1000/1200/1400/1750ms, forward and backward, repeats exactly and never mutates the ProjectDocument.
- All previously approved eight preset DOM/CSS tests, Windows foundation, packaged MP3/WAV and portable ZIP regressions still run in the **unchanged** CI workflow.
- Latest known exact-main baseline at start: `main@6ab83a70f633a3c5e195b36f07f1f2f51dbe00b0`, Windows [CI #876 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38037670162).
- [Diagnostic Windows CI #878 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38038370650) on source prior to formatting commits; the diagnostic workflow ran temporary `prettier --write`. Exact two-file Prettier diff was applied to source. The temporary CI stage was removed and the original workflow was compared byte-identical to `main`.
- **The final exact-head standard Windows CI has NOT been certified at this document commit.** Do not merge until this and the postmerge main run succeed.

## Gates deliberately unchanged
W11-07 original matrix remains 8 PASS_AUTOMATED / 4 PARTIAL_AUTOMATED, with missing true GPU-pixel/owner UI parity for AC10/AC11 and combined physical AC08/AC09. W11-06 speaker/headphone sound, physical Suspend/Resume, 25 native picker interactions and multi-hour resource plateau remain NOT_TESTED. No release or MP4 claim. W11-08 planning/renderer remains separate and is NOT silently authorized by this bug fix.
