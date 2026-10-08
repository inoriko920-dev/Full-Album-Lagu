# T11-W05-07 — R14 Preserve Truthful Save Status When Catalog Refresh Fails (2026-10-08 WIB)

**Owner/scope:** SOL / STEP 11 / W11-05 / T11-W05-07 only  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51 (**DRAFT, not merged**)  
**Wave gate:** W11-05 **IN_PROGRESS**, AC-W11-05-21 formal frozen UI acceptance **OPEN**, AC-W11-05-25 final held; W11-06, W11-07 and STEP 12 BLOCKED.

## Bug, impact and solution

Before R14, `TemplateBrowser.saveUserTemplate()` correctly awaited `session.saveVisualTemplate()` and, on `ok`, closed the dialog and showed **Template tersimpan secara lokal.** However the following `await reloadCatalog()` could reject if `window.lfa.listTemplates()` threw (rather than returning `{status:"error"}`). The enclosing save `catch` incorrectly showed **Gagal menyimpan template lokal.** even when the save had succeeded; users could retry save and produce unnecessary duplicate local templates.

**Scoped correction:** `reloadCatalog()` now handles an unavailable bridge method, an explicit catalog `status:"error"`, and a thrown refresh exception **separately from the actual save**. It renders the accurate error message:

> Template berhasil disimpan, tetapi daftar template belum dapat diperbarui. Buka ulang Browser Template untuk menyegarkan daftar.

The success notice remains truthful, and successful refresh still updates the entries/selection as before. No automatic repeated save, no new catalog source, no template schema/history changes, no media/audio/credentials modifications and **no frozen visual layout changes**.

## Reproducible regression

A new React component test captures the initial successful catalog load, then forces the **post-save refresh** to throw. It asserts:
- Exactly **one** successful `bridge.saveTemplate` call and **two** listing calls, with no repeat save.
- Save dialog closes and success notice remains visible.
- Distinct refresh-failure notice appears; false **Gagal menyimpan template lokal.** message is absent.
- Canonical project revision remains `0` and dirty state `false`.

**Code commit:** `80e271bb130f145a359df643bc8d3df0de924783`  
**Test commit:** `125e603f3b1889d61372213a8ae9071e4994fe21`, formatting `e3a6625c3894d40d03a938a0b392aeec17742079`.

## Real Windows evidence

- **Windows CI #502 SUCCESS** at implementation+test SHA `e3a6625c3894d40d03a938a0b392aeec17742079`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37748595805
- **304 Vitest PASS:** 153 unit + 59 contract + **50 component** + 42 integration.
- Prettier, type/lint/architecture, frozen UI reference, secrets and portable path safeguards PASS.
- Real Electron W11-05 UI workflow, four frozen reference screenshots, Save/Reopen/second-project bindings, protected source SHA-256/size/mtime, 128-layer/100-template stress, previous STEP 10 and W11-01..04 tests, packaged executable smoke and portable multi-file ZIP PASS.
- Actual frozen four-screen and Electron flow evidence: artifact **11537208151** https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37748595805/artifacts/11537208151
- Portable CI **test build only, not released final application**: artifact **11536718570**.

## Gate status and handoff

R14 strengthens W11-05 template safety and truthful error handling (especially AC14/19/20) but **is not user acceptance of the frozen UI**. Earlier R09 audit mapped all 25 ACs, and R10 produced the authorized review packet for four frozen screens. **23 AC rows have technical evidence; AC21 UI/design owner signoff OPEN; AC25 final conditional on AC21.**

**W11-05 IN_PROGRESS. PR #51 DRAFT / NOT MERGED; `main` unchanged. W11-06 (spectrum/playback), W11-07 (animation), STEP 12 remain BLOCKED.** Do not infer UI approval from a generic `lanjutkan`; only an explicit user/design Decision A accepting the honest static UI or Decision B specifying bounded static design corrections may advance this gate.
