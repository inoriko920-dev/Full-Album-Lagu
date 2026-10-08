# T11-W05-07 — R17 Prevent Stale Initial Catalog Overwriting a Post-Save Refresh (2026-10-08 WIB)

**Scope:** SOL STEP 11 / W11-05 / T11-W05-07; no features from later waves.  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51 (**DRAFT / NOT MERGED**)  
**Formal wave status:** **W11-05 IN_PROGRESS**; AC-W11-05-21 frozen UI authority acceptance **OPEN**; AC-W11-05-25 technically green but final closure **HELD** by AC21.

## Root cause: out-of-order catalog reads

The Template Browser initially issues `window.lfa.listTemplates()` from a mount effect. A successful visual-only template save invokes `reloadCatalog()` and issues a second read. When the initial read takes longer and resolves **after** the post-save refresh, its old catalog could overwrite newer entries and restore outdated selection, making the just-saved template appear to vanish until the Browser reopened. Both requests individually succeeded; the issue was their completion order.

## Scoped fix

- Introduced a renderer-only `catalogRequestVersion` ref incremented at each new initial-list or refresh request.
- Only the **current generation** may update catalog entries, selected ID, or catalog error, whether the result succeeds, returns a structured error, or throws.
- Delayed initial responses and old refresh errors are ignored instead of overwriting a newer successful catalog.
- Existing mount cleanup still guards unmounted state. No new bridge endpoints, network calls, template data schema, audio/video runtime, canonical project history changes, or edits to the approved 29-state frozen UI references.
- This is the same general stale-result safety principle already used in the selected TemplateDocument loader, now correctly applied to **catalog** reads.

**Implementation commit:** `aba651e61369a8320739ef8612e658a1183f1fb1`.

## Deterministic race regression

The new React regression:
1. Starts Browser Template and deliberately holds the first catalog read unresolved.
2. Opens existing `Simpan sebagai Template` dialog, names and successfully saves a template (one save call only).
3. Post-save catalog refresh resolves first and includes a distinct new user-owned entry (`Template Baru`).
4. Releases the **older initial** catalog response afterward and verifies the new entry remains present and the truthful save message stays.
5. Confirms exactly two reads, one save, canonical revision `0`, dirty `false`.

**Regression commit:** `0d40ef3a7a484c14d93bbc1c88ca2b4bcce97f0f`.

## Real Windows verification and artifacts

- **Windows CI #520 SUCCESS** at implementation + regression SHA `0d40ef3a7a484c14d93bbc1c88ca2b4bcce97f0f`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37754360119
- **307 Vitest PASS:** 153 unit + 59 contract + **53 component** + 42 integration.
- Prettier, lint/types, architecture/trust/security, frozen UI references and portable-path checks PASS.
- Genuine Windows Electron W11-05 template and layer scenarios, four frozen reference comparisons, Save/Reopen, cross-project visual bindings, media SHA-256/size/mtime fingerprints, 128-layer/100-template stress, previous STEP 10 and W11-01..04 regressions, executable packaged smoke and portable multi-file ZIP PASS.
- Windows four-screen screenshot and E2E artifact **11540106386**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37754360119/artifacts/11540106386
- Windows portable **CI test build only, not final released application**, artifact **11539262999**.

## Wave gate and next handoff

R17 strengthens technical safety of local catalog refresh and template saving (especially AC14, AC19, AC20). It does **not** provide design-owner acceptance.

R09 acceptance audit still maps 25 criteria; R10 is the frozen SCR-002C / SCR-003A / SCR-003B / DLG-008 UI authority review packet. **23 ACs have recorded technical evidence; AC21 OPEN pending an explicit user/design decision; AC25 technical PASS but final HELD.**

**W11-05 remains IN_PROGRESS. PR #51 remains DRAFT/NOT MERGED, `main` unchanged. W11-06 audio-reactive spectrum/playback, W11-07 animation and STEP 12 remain BLOCKED** until real UI approval and complete 25-AC gate closure. Generic `lanjutkan` is not approval and the reference visual source-of-truth must not be modified or misrepresented.
