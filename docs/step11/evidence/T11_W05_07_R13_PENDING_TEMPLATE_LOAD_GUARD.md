# T11-W05-07 — R13 Single In-Flight Template Load Guard (2026-10-08 WIB)

**Owner:** SOL / STEP 11 / W11-05 / T11-W05-07  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** [#51](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51) — **DRAFT, NOT MERGED**  
**Whole-wave gate:** **W11-05 IN_PROGRESS**; AC-W11-05-21 frozen UI signoff OPEN; AC-W11-05-25 technical regressions PASS but final closure HELD. W11-06/W11-07/STEP12 BLOCKED.

## Defect and controlled correction

R12 introduced user-initiated retry of a failed selected-template load. Before R13, clicking an already selected card **while the original asynchronous `loadTemplate` had not settled** could increment the retry counter repeatedly, restarting concurrent local IPC loads. Request-version tokens prevented stale results from taking effect but did not prevent needless duplicate requests.

R13 tracks the in-flight status in a renderer-local `useRef` (`templateLoadPending`). The guarded loader:
- Sets pending TRUE on starting a valid `window.lfa.loadTemplate(selectedId)` call.
- Clears pending when the **current** request succeeds, fails or the selected ID/effect is cleaned up.
- Clicking the same card only increments `templateLoadRetry` **if no loaded matching template and no request still in flight**.
- Preserves R11 behavior: an already loaded same-ID card remains usable and Try stays enabled.
- Preserves R12 behavior: once a failed load settles, the next explicit card click can retry once.
- Reuses the existing `requestVersion` stale-response guard. Does not touch source audio, persisted scene, canonical project revision/dirty, CommandEngine, template format, main-side store or visual reference design.

**Implementation commit:** `dfaceb64114f8f35f633a9a5511a9c6d8859efd3`  
**Unit/component regression:** `ec73bf97e2af26757718da927f825a13e7d40b82`; type-safe deferred-release callback `3e31be00a32ff16dc14a4461e4cbd3bd752b444b`.

## Evidence and tests

Component regression deliberately keeps the first `loadTemplate` promise pending, clicks the same selected card three times, verifies that there is still **exactly one** IPC invocation, then releases the first request as a failure. A subsequent manual click must issue **exactly one** new request, recover the template, re-enable `Coba Template`, clear the alert, and leave canonical revision and dirty-state unchanged.

- **Actual Windows CI #495 SUCCESS** at `3e31be00a32ff16dc14a4461e4cbd3bd752b444b`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37747261951
- **303 Vitest PASS**: 153 unit + 59 contract + **49 component** + 42 integration.
- Prettier, lint/type/architecture, frozen-reference/secret/portable-path checks PASS.
- Real Electron W05-07 workflows with screenshots, Trial/Revert/Apply, project Save/Reopen/cross-project media binding, actual source SHA-256+size+mtime, 128-layer/100-template stress and earlier STEP 10/W11-01..04 regressions PASS.
- Windows packaged executable smoke and portable multi-file ZIP PASS.
- Actual Electron four-screen visual/E2E evidence artifact **11536631133**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37747261951/artifacts/11536631133
- Portable Windows **CI test artifact**, not a final published release: **11536142672**.

## Acceptance decision and next step

This is a **W11-05-owned functional resilience** correction; it improves confidence in local template safety AC14/AC20, but adds **no** new frozen UI approval. R09 mapped the 25 acceptance conditions and R10 prepared a four-screen design review packet.

**23 technical acceptance rows evidenced; AC-W11-05-21 explicitly awaits user/design-owner approval of frozen static UI; AC-W11-05-25 final approval held by that decision.**

**W11-05 remains IN_PROGRESS, PR #51 DRAFT/NOT MERGED, `main` unchanged.** Do not treat `lanjutkan` as approval, merge PR, edit frozen references, or implement W11-06 audio/spectrum, W11-07 animation or STEP 12. Continue gate closure only after explicit UI authority Decision A (accept the truthful static UI) or Decision B (identify concrete current-wave cosmetic/layout corrections).
