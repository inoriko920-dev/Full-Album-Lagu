# T11-W05-07 — R16 Synchronous Template-Load Failure Recovery (2026-10-08 WIB)

**Scope:** SOL, STEP 11 / W11-05 / T11-W05-07, no later-wave implementation.  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51 — **DRAFT / NOT MERGED**  
**Formal stage:** W11-05 **IN_PROGRESS**; AC-W11-05-21 static frozen UI authority signoff **OPEN**; AC-W11-05-25 final closure **HELD** until AC21 is accepted.

## Actual source bug

The `TemplateBrowser.tsx` selected-template loader already had an asynchronous `.catch()` path showing `Template tidak dapat dimuat.` and releasing its in-flight guard. However it **invoked** `window.lfa.loadTemplate(selectedId)` *outside* a Promise continuation. A synchronous preload/IPC bridge throw could escape the effect before the `.catch()` existed, leaving the pending state true and potentially breaking the Template Browser. The equivalent initial catalog issue had been corrected in R15, but the template-document loader was still exposed.

## Bounded fix

Captured the optional `loadTemplate` bridge function, preserved the existing null/availability check, and changed the call to `Promise.resolve().then(() => loadTemplate(selectedId)).then(...).catch(...)`.

- Both rejected Promises **and immediate synchronous exceptions** now reach the same guarded error message and pending-state reset.
- Existing `requestVersion` checks prevent stale old-template results, and the `templateLoadPending` guard prevents duplicate clicks while a load is pending (R13).
- A failed selected template can still be reloaded **on an explicit same-card click** (R12); a successfully loaded card remains stable (R11).
- No changes to TemplateDocument, IPC contract, security boundary, project history, physical source files, video/audio runtime, frozen UI reference or layout.

**Source commit:** `db15834a4fde3ee0003cf1c2b303e3b5c9293fc7`.

## Regression coverage and Windows verification

Added `tests/component/AppShell.visual-layer-editor.test.tsx` regression that throws directly from `bridge.loadTemplate` on attempt 1, verifies the localized Browser error and disabled Try, and then makes a second explicit same-card click succeed. The test asserts exactly two attempts, cleared error, re-enabled **Coba Template**, canonical revision `0` and dirty flag `false`.

**Test commit:** `f10c3e869a834970061054cdfdf736e8c96d63ef`.

- **Windows CI #514 SUCCESS** on exactly that implementation+test commit: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37752797495
- **306 Vitest PASS**: 153 unit + 59 contract + **52 component** + 42 integration.
- Prettier, TypeScript, lint, trust/secrets/path boundary checks and frozen 29-state UI authority validation PASS.
- Real Electron W11-05 Template workflow, four frozen screen captures and comparisons, canonical Save/Reopen/cross-project, protected source SHA-256/size/mtime, 128-layer/100-template stress, prior STEP 10 / W11-01..04 regression E2Es, Windows executable packaged smoke and portable ZIP PASS.
- Real W11-05 Windows screenshot/E2E artifact **11538698518**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37752797495/artifacts/11538698518
- CI Windows **test build only**, not final published release: artifact **11538424902**.

## Handoff and acceptance constraints

R16 strengthens W11-05 safe local template load/error recovery, especially technical evidence for **AC14/AC20**. It does **not** constitute approval of frozen UI design or waive actual layout defects. R09 remains the inventory of all 25 acceptance conditions and R10 is the formal four-screen UI decision packet at `docs/step11/evidence/T11_W05_07_R10_UI_AUTHORITY_REVIEW_PACKET.md`.

**23 ACs technically evidenced; AC21 approval explicitly OPEN; AC25 technical subchecks PASS but full acceptance HELD by AC21.** W11-05 IN_PROGRESS, PR #51 DRAFT/NOT MERGED, `main` unchanged. W11-06 audio-reactive spectrum/playback, W11-07 animation and STEP 12 all remain BLOCKED pending clear user/design owner decision followed by final 25-AC gate, CI and approval.
