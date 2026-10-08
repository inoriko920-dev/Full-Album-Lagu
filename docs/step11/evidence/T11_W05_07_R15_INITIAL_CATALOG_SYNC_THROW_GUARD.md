# T11-W05-07 — R15 Initial Catalog Synchronous-Throw Guard (2026-10-08 WIB)

**Owner/scope:** SOL STEP 11 / W11-05 / T11-W05-07; no later-wave features  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51 (**DRAFT, NOT MERGED**)  
**Whole wave status:** **W11-05 IN_PROGRESS**; AC-W11-05-21 frozen UI approval OPEN; AC-W11-05-25 final acceptance HELD pending AC21.

## Reproduced weakness and correction

The Browser Template mount effect called `window.lfa.listTemplates()` **before** building its Promise rejection handler. A preload/bridge method that throws *synchronously* (rather than returning a rejected Promise) would escape the effect and could break Browser rendering, even though async catalog failures already had a harmless, localized error message.

**R15 fix:** Put the call to the optional `window.lfa.listTemplates()` inside `Promise.resolve().then(() => { ... })`, letting both synchronous exceptions and Promise rejections reach the already existing `.catch()` path with **Gagal membaca katalog template lokal.** The no-service fallback still reports **Layanan template lokal tidak tersedia.** This change preserves the mounted/cancellation check to avoid setting state after teardown and does not add any new catalog, network provider, project mutation or UI redesign.

**Regression:** A React component test makes `bridge.listTemplates` throw directly before returning a Promise and verifies:
- Browser Template is still displayed, with a localized error alert;
- Coba Template is disabled (no corrupted catalog selection);
- frozen right-side Gemini panel remains;
- the user can click **Kembali ke Editor** normally;
- project revision stays `0` and dirty remains `false`.

**Commits:** `641d3ad6a3e22ad0fc55b5a39de8134551acf067` (initial fix), `b3e47c1b92fbc6fb5a05ff06977aa078e2196bab` (regression), `17a532d898d718933dc30b98d0a0b72f62d33368` (final code formatting).

The first test run **#507** failed at *Prettier*, before behavior tests; formatting was corrected and superseded by #508.

## Real Windows verification

- **Windows CI #508 SUCCESS** on `17a532d898d718933dc30b98d0a0b72f62d33368`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37750086819
- **305 passing Vitest tests**: 153 unit, 59 contract, **51 component**, 42 integration.
- Prettier, TypeScript, lint, architecture, security/source path guards and frozen 29-state UI authority checks PASS.
- Actual Windows Electron T11-W05-07 browser/trial/layer/save workflow and four frozen screenshot/reference states, canonical Save/Reopen/second project, source SHA-256/size/mtime, 128-layer/100-template stress and previous STEP 10/W11-01..04 E2E PASS.
- Windows packaged executable smoke and portable multi-file ZIP PASS.
- Genuine W11-05 Windows screenshots / E2E evidence artifact **11537557161**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37750086819/artifacts/11537557161
- Portable Windows **CI test build (not a final public release)** artifact **11537214850**.

## Gate, handoff and stop rule

R15 improves robustness of the local template catalog initial-load error path and reinforces the technical AC-W11-05-14 and AC-W11-05-20. **It does not constitute a frozen UI approval.**

The R09 audit maps all 25 ACs; R10 contains the source-of-truth four-screen reviewer Decision A/B packet:
`docs/step11/evidence/T11_W05_07_R10_UI_AUTHORITY_REVIEW_PACKET.md`.

**23 AC rows have technical evidence; AC-W11-05-21 explicit UI approval OPEN; AC-W11-05-25 technical PASS but final acceptance HELD. W11-05 remains IN_PROGRESS, PR #51 DRAFT/NOT MERGED and `main` unchanged.** No W11-06 audio/spectrum, W11-07 animation or STEP 12 work until the explicit UI-owner decision and final all-25 closure gate.
