# T11-W05-07 — R06 Preview/Mode Coba Non-Overlap Remediation (2026-10-08 WIB)

**Role / scope:** SOL, STEP 11 / W11-05 / T11-W05-07 only  
**Branch / PR:** `sol/t11-w05-07-wave-closure-20261008` / [PR #51](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51) (DRAFT; not merged)  
**Final wave status:** W11-05 **IN_PROGRESS**. Technical PASS, but AC-W11-05-21 visual fidelity **NOT YET ACCEPTED**. W11-06, W11-07 and STEP 12 remain BLOCKED.

## Grounded defect and fix

Inspecting the actual R05 `SCR-003B` Windows screenshot revealed that the `template-trial-overlay__gallery` sat on top of the right-hand portion of the actual 16:9 Preview, covering part of the project-bound title `Original Audio A`. It prevented honest inspection of the trial scene, even though template state, non-dirty semantics and history checks already passed.

**Implemented:**
- `src/renderer/app/template-browser.css`: only while `.app-shell--template-trial` is active, reserve responsive right-side space in `.preview-stage` (`padding-right: clamp(232px, 18vw, 270px)`), allowing the existing 16:9 `.preview-frame` to shrink within the real central workspace while the floating temporary gallery stays visible outside the scene.
- `src/main/verification/w11-05-ui-capture.ts`: during the real Electron `SCR-003B` capture, require both `.preview-frame--visual` and `.template-trial-overlay__gallery` and reject the screen if the scene right edge is closer than 8 CSS pixels to the gallery left edge. An overlapping gallery is now a **Windows CI failure** rather than an untested design defect.
- The existing project-bound title, static spectrum structural rendering, source-safe example artwork, right-side Gemini Agent, bottom Album Timeline, and non-dirty Try/Revert/Apply lifecycle are unchanged. This does **not** add working playback/waveform/FFmpeg or introduce a second project state.

**Implementation commits:** `8ffddaca137678c8af0d186ead7542eb5bf1823e` (layout) and `3faff3afefef58841fedb6c8ab085e327e4081cb` (Windows non-overlap regression).

## Real Windows evidence

- **CI #458 SUCCESS** at `3faff3afefef58841fedb6c8ab085e327e4081cb`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37737587670
- **301 tests PASS** (153 unit, 59 contract, 47 component, 42 integration). Formatting, lint, typecheck, architecture/secrets/portable-path checks PASS.
- Real Electron Windows W05-07 captures and the new `SCR-003B` overlap assertion PASS. Re-reviewed the actual 1600x1000 `SCR-003B.png`: `Original Audio A` is fully visible and the gallery is visually separated from the true 16:9 scene.
- Wave regression, Save/Reopen and cross-project dynamic binding, source SHA-256/size/mtime immutability, 128 layers/100 templates, Windows packaged executable smoke and portable multi-file ZIP PASS.
- Four-screen reference/screenshot side-by-side evidence artifact `11532238637`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37737587670/artifacts/11532238637
- Windows portable **test-build**, not final release: artifact `11532089969`.

## Acceptance and remaining visual limitations

- **SCR-003B R06 targeted non-overlap/layout gate:** PASS, verified both by actual screenshot review and guarded Windows geometry assertion.
- **AC-W11-05-21 complete frozen visual authority:** **OPEN / NOT ACCEPTED**. The approved reference's scenic full canvas and densely populated audio timeline remain materially more elaborate than the source-grounded static two-track fixture. No fake waveform/audio-reactive playback/source media image will be inserted to force superficial visual similarity. Remaining static visual appearance for SCR-002C and other frozen screens still needs independent decision/review.
- **Project and source protection:** PASS in actual Windows integration; no source media changed.
- **W11-05 gate: IN_PROGRESS.** Keep PR #51 DRAFT and `main` untouched. Do not advance W11-06/07 or STEP 12.

## Handoff

Continue SOL T11-W05-07 only: compare the real four-screen R06 artifact against the frozen UI DOCX, address another demonstrably resolvable static UI mismatch, or obtain an explicit product/UI authority decision for mockup elements whose truthful behavior depends on later waves. Re-run Windows CI and re-review AC-W11-05-01..25 before any full-wave PASS/merge.
