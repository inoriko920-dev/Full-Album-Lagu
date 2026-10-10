# SOL T11-W07-01 — Additive animation / keyframe / boundary schema evidence

Scope: **implementation only, not finished wave W11-07**. This T01 establishes canonical v1 source contracts for previously agreed FTR-009 (FR-023/024) and FTR-010 (FR-025/026/027). No screenshot/UI/canvas engine, no CommandEngine mutation UI, no newly introduced user-facing features, no MP4.

## Verified prerequisites
- Owner uploaded UI-IMG-002G source PNG and both source-of-truth DOCX to GitHub; byte-for-byte Git object proof is in `docs/step11/W11_07_DOR.md`.
- ASTRA planning PR #66 merged at `main@cd89904a94c5062b0a71f299a51b683a4949608b`, postmerge exact-main Windows CI [#791 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38024071125).
- Original 29 frozen UI states remain checksum pinned; W11-06 physical sound, real suspend/resume and resource plateau remain NOT_TESTED.

## Real T01 implementation
1. `src/core/domain/visual-scene-schema.ts`: additive optional per-layer animation schema with allowed entrance, exit, loop and bounded keyframe x/y/scale/opacity tracks; timestamps strictly increasing, duplicate tracks and nonfinite/out-of-bounds values rejected.
2. `src/core/domain/project-document.ts`: additive optional `boundaryTransitions`, directed pair uniqueness, exactly the agreed eight boundary presets, validated duration/easing and handoff modes. No second album timeline or persisted playlist. Reordered tracks remain loadable; transition adjacency is T04 runtime work.
3. `tests/unit/visual-animation-schema.test.ts`: 33 new tests for legacy projects, roundtrip, artwork 0-to-2500ms opacity 85%, negative cases, all eight transition presets and safe project reorder.

## Verification and limitations
- [Windows CI #792](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38024417505) failed **formatting only**. A CI-only temporary Prettier snapshot recovered exact required formatting.
- [Windows CI #793](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38024508716) **SUCCESS** including 33 T01 tests and full Windows packed regression, but this commit had a temporary precheck `prettier --write`. **Do not use #793 as final immutable-source formatting certification.**
- All exact formatting diffs were applied to the repository source. The temporary formatter workflow step was then removed; CI workflow was confirmed byte-identical to `main` before final rerun.
- **Current status: IMPLEMENTED / AWAITING FINAL EXACT-HEAD WINDOWS CI**. No T02 implementation or T01 merge before latest normal workflow passes.

## Nonclaims
Nothing in T01 actually animates pixels, renders frames, listens to physical speakers, transitions on the UI, or produces MP4. UI-IMG-002G is source-of-truth design only. W11-06 physical acceptance remains **NOT_TESTED**; release is blocked.
