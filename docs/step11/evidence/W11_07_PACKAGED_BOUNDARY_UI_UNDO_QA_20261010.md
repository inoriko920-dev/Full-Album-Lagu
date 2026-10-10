# W11-07 QA — real packaged boundary Inspector, Preview and Undo/Redo

**Purpose:** Strengthen W11-07 AC08/AC09 evidence from React unit/component checks to a real packaged Windows Electron UI sequence. Existing functionality and owner-approved 29-state UI are unchanged.

The source-only changes are in:
- `src/main/verification/w11-06-editor-ui-probe.ts`: before audio playback, import real fixture WAVs, apply the existing frozen template, click a real adjacent timeline boundary, select the existing Crossfade preset in the existing left Inspector, confirm the actual two-track Preview at deterministic 50% progress, Undo, Redo, then Undo once more. Assert the original semantic boundary content and dirty flag return, while the CommandEngine revision continues increasing monotonically as designed; preserve track count, Gemini rail and album timeline.
- `scripts/run-w06-packaged-editor-controls.mjs`: require the new proof flags for **both 3-track and 128-track** executable runs, and retain them in the UI evidence summary.
- `scripts/run-w07-t07-acceptance.mjs`: make the real packaged 3+128 evidence a required W11-07 audit input, without modifying the existing eight PASS_AUTOMATED / four PARTIAL_AUTOMATED classification.

**Required acceptance:** Windows CI must PASS at the latest PR commit, including TypeScript/format, all existing tests, compiled/package smoke, both packaged editor sequences, stored JSON and screenshot evidence, SHA-256 ZIP and W11-07 audit. Restore/keep the original Windows CI workflow with no formatter bypass. Only then merge and verify exact-main Windows CI PASS.

**Limitations:** This tests packaged UI interactions and deterministic mid-transition output but is **not** human review of pixel parity for all eight effects. Real physical Windows speaker/headphone audition, Suspend/Resume, 25 OS picker clicks, multi-hour resource plateau, and complete frozen UI owner approval remain **NOT_TESTED**. Do not claim wave closure, MP4 or release.
