# W11-07 AC10 — real packaged Windows eight-preset Preview QA

## Scope and source-of-truth
This is QA-only and changes **no product code, image/UI asset or approved features**. It extends the existing packaged Windows 3-/128-track Electron testing pipeline using only the eight owner-approved transitions from UI-IMG-002D and the existing `BoundaryInspector`, `BoundaryVisualPreview`, `CommandEngine` and timeline. Prior baseline `main@e84ce57014e1702151d2288297d13458e0061889`, exact-main Windows CI [#939 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38050668576).

## Test implementation
- `src/main/verification/w11-06-editor-ui-probe.ts`: In the **actual packaged Windows Electron process**, select a real adjacent imported WAV boundary after applying the approved template; cycle `crossfade`, `fade-through-black-blur`, `slide`, `zoom`, `dissolve`, `light-glitch`, `soft-flash`, `premium-album-change` via the existing native HTML Inspector select.
- Await the actual React-composited `.boundary-visual-preview` for each preset at deterministic `0.500` progress, with correct source/target IDs, both sides, geometry, visible single foundation spectrum, unmodified Gemini rail and album timeline.
- Validate actual DOM effect channels/inline CSS for black overlay/blur, slide offset, zoom scale, glitch contrast, soft-flash overlay and premium zoom/blur/white flash; store side transforms, filters and overlay opacities for **all eight** in the existing packaged Electron JSON evidence.
- Undo all seven extra preset selections in order, then preserve the existing original crossfade → absent → redo → undo test, dirty restoration and monotonically increasing revision. The original audio playback/FFT, pause, seek, 128-track and final screenshot proof still runs afterward.
- `scripts/run-w06-packaged-editor-controls.mjs` enforces the eight ordered sample records for **both** 3 and 128 actual synthetic WAV album fixtures; retains records in `T05_WINDOWS_UI_SUMMARY.json`.
- `scripts/run-w07-t07-acceptance.mjs` fails closed unless both packaged counts contain genuine eight-preset renderer evidence; AC10 remains **PARTIAL_AUTOMATED** and its evidence description reflects the stronger packaged verification.

## Mandatory verification gate
PR and exact-head normal Windows CI must PASS, including formatter, lint/TypeScript, security and architecture checks, unit/contract/component/integration, actual packaged Electron save/reopen, packaged 3-/128-track UI, SHA-256 Windows portable ZIP and W11-07 acceptance artifact. Then merge only if CI head matches, followed by postmerge exact-main Windows CI PASS.

## Nonclaims and remaining physical gates
The test records DOM/CSS compositor state in actual Electron. It does **not** prove that all eight effects match the source reference *pixel by pixel*, nor certify viewer smoothness or physical audiovisual sync. No new screenshot/reference image has been generated. W11-07 AC10 and AC11 still need human review. W11-06 physical speaker/headphone audition, real OS Suspend/Resume, 25 real OS picker operations, and multihour CPU/memory plateau remain **NOT_TESTED**. No final release or MP4 claim.
