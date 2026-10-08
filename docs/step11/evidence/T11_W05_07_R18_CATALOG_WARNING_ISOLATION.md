# T11-W05-07 — R18 Keep Catalog Refresh Warning After a Pending Template Load (2026-10-08 WIB)

**Owner:** SOL / STEP 11 / W11-05 / T11-W05-07, bounded current-wave safety fix  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51 — **DRAFT / DO NOT MERGE**  
**Formal stage:** **W11-05 IN_PROGRESS**; AC-W11-05-21 UI design-owner signoff **OPEN**; AC-W11-05-25 final acceptance **HELD** by AC21.

## Verified current-wave bug

Template Browser previously used one shared `catalogError` state for both **catalog listing/refresh** errors and **selected TemplateDocument load** errors. After a successful visual-only save, a failed catalog refresh displayed the truthful warning:

> Template berhasil disimpan, tetapi daftar template belum dapat diperbarui. Buka ulang Browser Template untuk menyegarkan daftar.

However, if a prior asynchronous `loadTemplate` subsequently finished successfully, its callback unconditionally did `setCatalogError(null)`, erasing that independent post-save warning. The template was saved, but the user could lose the information that the catalog itself was not updated. This is particularly relevant when the user saves a visual template while the Browser's selected template is still loading.

## Bounded correction

In `src/renderer/app/TemplateBrowser.tsx`:
- Introduce separate local `templateLoadError` state for `loadTemplate` errors; preserve `catalogError` strictly for initial catalog/refresh status.
- A selected-template load **success** clears only `templateLoadError`; it never silently clears a catalog refresh warning or the truthful save success message.
- A failed selected-template load sets its own error without rewriting the catalog result.
- Clear an obsolete template-load error on explicit selection or filter changes that select another template.
- Existing error alert chooses session error, catalog warning or template-load error (in that order), without changing the frozen layout/copy or adding banners. Existing R11-R17 retries, single in-flight loader and catalog generation guards remain.
- No data-model or bridge contract change, no network activity, no source media or project state mutation and no frozen 29-state UI design change.

**Code commit:** `33e127d358bc86ac8485ac806b0fdf699de15a3b`.

## Deterministic regression

The component regression delays `loadTemplate` while the Browser opens, completes exactly one successful template save, makes the **second catalog listing fail**, checks the correct catalog warning, then resolves the delayed `loadTemplate` successfully. The warning must **remain visible** while Try becomes enabled and saved status persists. Asserts one save, two catalog reads, revision `0` and dirty flag `false`.

**Test commits:** `a3e4e05b6a7ade438db6b8ad0ee72ede7f51a649`, typed fixture `4d27aab9953228b2f0940a29cdfc02635283ed2c`, simplified fixture `c7519ce5b3c086df1720984f82528b02580c140e`, exact Prettier change `5c9096deb89ecda306fa6a4d157266f371e09a80`.

### Why several diagnostic runs failed

- Runs #527 and #528 stopped at **Prettier style** in the new test, before tests or runtime verification. No behavior failure was established by these runs.
- Run #529 was an **intentional temporary formatting diagnostic**: in the working PR branch only, the format script was modified to run the same repository Prettier and print its precise `git diff` in GitHub Actions logs. The diff required only making one `expect(...).toBeEnabled()` assertion a single line.
- The exact Prettier output was applied and the original `package.json` `format:check` script was **fully restored** in commit `43e70882bfcdaafc8e2532d8a6c405a1bd40e7f0`. No relaxed linting/formatting, temporary diagnostic CI script, tests or behavior are left in the branch.
- Thus only successful **normal, strict Windows CI #531**, not the intentional diagnostic, establishes R18 PASS.

## Windows source-to-build evidence

- **Windows CI #531 SUCCESS** at `43e70882bfcdaafc8e2532d8a6c405a1bd40e7f0`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37757002704
- **308 passing Vitest tests**: 153 unit + 59 contract + **54 component** + 42 integration.
- Original Prettier 3.9.9 check, TypeScript, lint, architecture, frozen UI source manifest, secret/path safety PASS.
- Real Windows Electron W11-05 Template workflow and four frozen screenshot comparisons, Save/Reopen/cross-project visual binding, source SHA-256/size/mtime guard, 128-layer/100-template stress, STEP 10 and earlier STEP11-wave E2Es, packaged executable smoke and Windows portable multi-file ZIP PASS.
- Genuine W11-05 Windows screenshot/E2E evidence artifact **11540248008**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37757002704/artifacts/11540248008
- Windows portable **CI test build only; not final released application**, artifact **11541385136**.

## Acceptance / hard stop

R18 improves current-wave catalog/save/load correctness (particularly technical AC14/19/20). **It does not accept frozen UI visually.** R09 maps all 25 ACs and R10 documents the exact four-screen SCR-002C/SCR-003A/SCR-003B/DLG-008 design-owner decision.

**23 AC rows hold technical evidence; AC-W11-05-21 approval OPEN, AC-W11-05-25 full acceptance HELD.** W11-05 IN_PROGRESS; PR #51 remains DRAFT/NOT MERGED; `main` unchanged. W11-06 audio/spectrum, W11-07 animation and STEP 12 remain BLOCKED until explicit design approval and subsequent full 25-AC signoff and CI.
