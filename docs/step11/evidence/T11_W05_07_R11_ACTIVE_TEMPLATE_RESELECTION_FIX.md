# T11-W05-07 — R11 Active Template Reselection Safety Fix (2026-10-08 WIB)

**Owner:** SOL, STEP 11 / W11-05 / T11-W05-07 only  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** [#51](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51), **DRAFT / DO NOT MERGE**  
**Whole wave gate:** **W11-05 IN_PROGRESS**. AC-W11-05-21 frozen UI authority acceptance **OPEN**, AC-W11-05-25 final approval held. W11-06/07 and STEP 12 remain BLOCKED.

## Reproduced-by-code bug / actual fix

`src/renderer/app/TemplateBrowser.tsx` catalog item `onClick` previously unconditionally called `setSelectedTemplate(null)` and `setSelectedId(entry.templateId)`. When the *currently selected* local template was clicked again, its selected ID stayed identical. The asynchronous `useEffect` loader depends only on `selectedId` and therefore did **not** rerun. `activeTemplate` became null and `Coba Template` disabled permanently until the user chose a different item.

**Fix:** Retain the already loaded `selectedTemplate` and `selectedId` when the clicked entry ID equals the current selection; reset the loaded document and switch IDs **only when an actual new template is chosen**. The existing saved-message clearing and revert behavior remain intact. No project revision, canonical template data, history, source bytes, IPC, audio runtime or frozen reference is modified.

**Commits:**
- `f0cf95c66868c6e5a4544ef219fc22e2e6c17f15` — guard no-op reselection in `TemplateBrowser.tsx`.
- `62d5de878305d63f2772bdc48bb304713086811c` — component regression on already-selected card.
- `7dde57f4dce890c7070b37667ef80c8d3b09bfb4` — real Electron `SCR-003A` regression: re-click selected catalog card and require unchanged enabled Try and detail heading.
- `e658752df7a3eee0ff1555ba419d41186ccc979f` — final test formatting fix.

## Windows evidence

- **Real Windows CI #482 SUCCESS** at `e658752df7a3eee0ff1555ba419d41186ccc979f`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37744819940
- **301 Vitest PASS**: 153 unit + 59 contract + 47 component + 42 integration; Prettier, lint, TS, architecture/secrets/portable paths and frozen reference validation PASS.
- **Actual Electron W05-07 E2E PASS**, including reselecting loaded card in `SCR-003A`, safe category/search/no-match, Trial/Revert/Apply, Save/Reopen, second-project visual bindings, source SHA-256/size/mtime protection, 128-layer/100-template stress and prior STEP 10/W11-01..04 E2E PASS.
- Windows executable packaged **smoke PASS** and portable multi-file ZIP PASS.
- Genuine four-screen screenshot and DOM evidence artifact **11535790571**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37744819940/artifacts/11535790571
- Windows portable **test build**, not published final release, artifact **11534773823**.
- A prior CI #481 attempt failed *only* on Prettier for the new test; #482 verified the formatted implementation and superseded that failure.

## 25-AC gate and next handoff

This is a **targeted W11-05 defect fix**, strengthening AC-W11-05-14 (local template catalog usability) and AC-W11-05-21 (frozen template picker behavior). It does **not** grant UI/design authority approval.

- Review complete 25-AC technical map: `docs/step11/evidence/T11_W05_07_R09_25_AC_CLOSURE_READINESS_AUDIT.md`.
- Review real four-screen design signoff decision: `docs/step11/evidence/T11_W05_07_R10_UI_AUTHORITY_REVIEW_PACKET.md`.
- **23 criteria technically evidenced; AC21 OPEN pending explicit user/design approval; AC25 technical PASS but final acceptance HELD by AC21.**
- Keep PR #51 **DRAFT / NOT MERGED**, `main` untouched, and do not begin W11-06, W11-07 or STEP 12. Generic "lanjutkan" is *not* UI acceptance. The user may explicitly accept static UI or request precise W11-05-owned revisions; only after that decision may SOL retest/close the remaining full-wave gate.
