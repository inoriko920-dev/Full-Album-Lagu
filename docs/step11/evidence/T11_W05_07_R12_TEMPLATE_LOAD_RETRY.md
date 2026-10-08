# T11-W05-07 — R12 Recover Failed Same-Template Load (2026-10-08 WIB)

**Scope:** SOL STEP 11 / W11-05 / T11-W05-07 only  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR #51:** https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51 — **DRAFT, NOT MERGED**  
**Overall W11-05 gate:** **IN_PROGRESS** — `AC-W11-05-21` explicit UI authority signoff OPEN; `AC-W11-05-25` technical checks PASS but closure held.

## Reproducible bug and non-destructive correction

Before R12, if the async main-owned `window.lfa.loadTemplate(selectedId)` returned a transient `status:error`, the selected ID remained unchanged, but `selectedTemplate` was unavailable and **Coba Template** stayed disabled. R11 had correctly preserved a *successfully loaded* same-ID selection on repeated clicks, but that meant the same-card click could not retrigger `useEffect([selectedId])` after an error. A user needed to pick a different template just to recover.

**Fix** in `src/renderer/app/TemplateBrowser.tsx`:
- Add local UI-only `templateLoadRetry` counter to the existing loader effect dependencies.
- If a clicked catalog entry is **different**, clear loaded template and select the new ID as before.
- If it is **already selected and loaded**, preserve its working state as required by R11.
- If it is **already selected but not loaded** (e.g. transient read failure), increment the counter to request a one-time retry through the same main-process IPC. The existing `requestVersion` guard prevents outdated responses from replacing current selection.
- No automatic retry loop, no extra persistence mutation, no template schema or protected media changes, no renderer filesystem/network access, and no changes to frozen UI sources.

**Regression test** in `tests/component/AppShell.visual-layer-editor.test.tsx`:
- First IPC load fails with `TEMPLATE_READ_FAILED`, disables Try and shows an alert.
- User re-clicks same **Minimal Biru** catalog card.
- Exactly one additional load attempt succeeds; Try becomes enabled, alert clears, and canonical project revision and dirty status remain unchanged.
- Existing R11 loaded-template reselect behavior and Windows SCR-003A flow remain covered.

**Commits:** `0d7f210756d9c252fbbbddc16c422aebfdfb29fb` (code), `c0a6fd7995dc3b631aa620b8955dfa5dc3bb7b10` (test).

## Actual Windows verification

- **Windows CI #488 SUCCESS** on `c0a6fd7995dc3b631aa620b8955dfa5dc3bb7b10`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37745862253
- **302 passing Vitest tests**: 153 unit + 59 contract + **48 component** + 42 integration.
- Prettier, lint/types, architecture, secrets, portable path and frozen source-reference validation PASS.
- Actual Electron W11-05 Visual/Template E2E, frozen SCR-002C/SCR-003A/SCR-003B/DLG-008 screenshot capture, project Save/Reopen/cross-project bindings, physical source SHA-256/size/mtime, 128-layer/100-template stress, STEP 10 + W11-01..04, Windows packaged smoke and portable multi-file ZIP PASS.
- Actual Windows screenshot/flow evidence **artifact 11535972213**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37745862253/artifacts/11535972213
- Windows portable **CI test build only (not final published app)** artifact **11535408100**.

## Acceptance and stop conditions

- Strengthens technical AC-W11-05-14/20 (safe local catalog/load behavior) and AC21 template flow safety.
- **23 other AC rows still have R09 technical evidence. AC21 is OPEN for explicit reviewer approval of the frozen static four-screen presentation; AC25 final closure is held.** R10 review packet is the source of truth: `docs/step11/evidence/T11_W05_07_R10_UI_AUTHORITY_REVIEW_PACKET.md`. R12 is not a design approval or UI waiver.
- **W11-05 remains IN_PROGRESS; PR #51 remains DRAFT/NOT MERGED; `main` untouched.** W11-06 audio/spectrum, W11-07 animation and STEP 12 remain BLOCKED. Generic user continuation is not affirmative design approval.
