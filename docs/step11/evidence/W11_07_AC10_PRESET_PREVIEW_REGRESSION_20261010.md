# W11-07 AC10 — Approved transition-preset React Preview regression (2026-10-10)

## Scope and exact baseline
- **Baseline**: `main@9c29ec52d5b336f5cebdeadd6c7d6f4e875e7357`; exact-main Windows [CI #867 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38036191965).
- Feature-locked stabilization **only**: `tests/component/BoundaryVisualPreview.regression.test.tsx`; no changes to application source, preset definitions, UI shell, 29-state frozen reference, user-provided assets, render architecture or playback.
- The W11-07 T01–T07 implementation remains merged; the original 12-AC matrix continues to record **8 PASS_AUTOMATED + 4 PARTIAL_AUTOMATED**. This supplement adds DOM/CSS component proof for AC-W11-07-10, **not** owner visual signoff.

## What actual React component tests prove
- Render `BoundaryVisualPreview` using the **real** `resolveAlbumBoundaryVisualFrame` from canonical two-track resolved project data, not a test-local imitation of transition formulae.
- Parameterize the exact eight approved presets: crossfade; fade-through-black-blur; slide; zoom; dissolve; light-glitch; soft-flash; premium-album-change. Assert actual Preview DOM preset/track markers, metadata from both tracks, precise transform/blur/opacity styles from T04 frames, and expected black/white overlay channel opacity.
- Assert a single background, true spectrum and progress layer only in the foundation (not duplicated in either metadata side). Titles/artists follow per-field `at-boundary` handoff independently of artwork `during-transition` weights.
- Differentiate dissolve (smoothstep) from crossfade **away from the midpoint**; explicitly assert the glitch contrast and premium zoom/blur are reflected in the mounted React output.
- Simulate repeated forward/backward seeks through canonical timestamps and verify presentation values are identical at identical times. The project revision, playlist and source document remain unchanged.
- Tests do **not** claim a physical speaker, actual media thumbnail, true pixel-for-pixel equivalence to UI-IMG-002D, 002G, or all frozen 29 states. JSDOM verifies DOM/CSS instructions, not GPU/compositor pixels.

## Verification gate
- [Diagnostic Windows CI #869 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38037047421), including new component suite and existing packaged Windows regressions. The diagnostic run temporarily executed `prettier --write`, so it is **not** accepted as a final unmodified-source formatting certificate.
- Exact Prettier diff from #869 was committed to the actual test source. The temporary formatter was **removed**, and canonical CI workflow compared byte-for-byte equal to baseline `main`.
- **PENDING** at this documentation checkpoint: exact-head standard Windows CI on the final branch SHA, safe PR merge, postmerge exact-main Windows CI. Do not claim VERIFIED before those are SUCCESS.

## Unchanged release/owner gates
- W11-07 AC08–AC11 remain `PARTIAL_AUTOMATED` until proper physical combined-session / audiovisual / visual reference checks. An automated test does not become user acceptance.
- W11-06 live listening/headphones, physical Windows Suspend/Resume, 25 real OS file-picker interactions, multi-hour resource plateau and 20-AC final signoff remain **NOT_TESTED**.
- Final release remains **BLOCKED**; no MP4 has been rendered, and W11-08/STEP12 rendering/FFmpeg work is not authorized by this QA-only PR.
