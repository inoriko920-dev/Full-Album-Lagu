# T11-W05-07 — R08 Frozen UI Gap Triage and Template Selection Consistency (2026-10-08 WIB)

**Owner/scope:** SOL, STEP 11 / W11-05 / T11-W05-07 only  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51 (**DRAFT, NOT MERGED**)  
**Gate:** **301 tests + Windows E2E/portable technical PASS; AC-W11-05-21 frozen visual approval OPEN; W11-05 IN PROGRESS.**  
**Blocked:** W11-06 audio/playback, W11-07 motion, STEP 12 provider/render integration until mandatory UI acceptance is resolved.

## Evidence reviewed

Opened the real Windows CI #465 four-screen reference/implementation side-by-side PNGs in artifact `11532684541` before editing. This compares the approved source-of-truth DOCX's extracted images (each **520×325 compressed JPEG**) with actual **1600×1000 Electron PNG**; the comparison runner deliberately uses *no pixel-perfect similarity threshold*.

| Frozen state | Existing hierarchy, copy and safety behavior | Actual gap classification |
| --- | --- | --- |
| **SCR-002C / UI-IMG-002C** | Selected visual layer, independently scrollable Layer and Inspector, live static Preview, permanent Gemini rail, Album Timeline: prior R07 geometry PASS. | The reference has rich scenic album art, populated multi-item visual timeline, active playback/beat imagery. The Windows test project has two actual fixture tracks and intentionally static spectral/progress placeholders; **not grounds for inventing W11-06 playback or source art**. |
| **SCR-003A / UI-IMG-003A** | Local category rail, search/filter, 3×3 starter catalog, selected detail and Coba flow are present. | Reference gallery uses richer painted/photoscenic thumbnails and category glyphs. The renderer has disclosed source-free SVG examples; cosmetic asset-fidelity decision is distinct from filtering correctness. **R08 fixes the hidden-selection defect.** |
| **SCR-003B / UI-IMG-003B** | Editor-hosted trial, not-dirty warning, reversible controls, gallery outside true 16:9 scene, right-side agent/timeline stay mounted. | Previously the gallery always displayed the *first six* entries, omitting a selected template at later positions (notably user templates). **R08 fixes this actual active-selection visibility bug**, without mutating trial or audio data. Rich reference visuals remain illustrative/deferred. |
| **DLG-008 / UI-IMG-012** | Real editor-hosted modal, left true static project Preview, right name/category, scoped layer selections, source/audio/credentials exclusion and safe Save remain present (R05). | Scenic reference Preview and a densely populated timeline are illustration/content differences. Never substitute mockup content for real selected-project source or claim audio-reactive playback. |

**Acceptance interpretation:** AC-W11-05-21 in `docs/step11/W11_05_ACCEPTANCE_MATRIX.md` expressly checks *hierarchy/copy/safety semantics* across four states and a permanent Gemini rail; it does not explicitly demand pixel-for-pixel recreation of reference photographs or an audio analyzer within W11-05. However frozen design signoff has not been formally granted, so **AC21 remains OPEN / NOT ACCEPTED** and no waiver, gate PASS, PR merge or next-wave authorization is presumed. A decision by UI/product authority must distinguish semantic UI acceptance from future runtime/content and any separately requested cosmetic polish.

## Code change: local filtering cannot select a hidden template

**File:** `src/renderer/app/TemplateBrowser.tsx`

- Category rail, category select and search field reconcile the active ID to a matching visible catalog entry (or `null` if no matches); stale selected TemplateDocument is cleared on the switch.
- The preview and **Coba Template** action are derived from a document whose ID exactly matches the currently *visible* selected entry. A hidden/stale document is never actionable, even while an asynchronous template load is in flight.
- `galleryEntries` still presents at most six starter/user cards, but ensures the selected entry is one of those six even when it is beyond the initial slice (e.g. template #100).
- This is renderer-local presentation and UI-session selection only. No track duration/order, project revision, template schema or CommandEngine owner was changed. Existing trial-apply remains an explicit one-step atomic Undo/Redo action.

**Tests:** Extended existing React component/stress tests to verify category switching to Neon updates the detail, no-match search disables Coba, and a 100-template trial includes the actual selected template in the gallery while canonical project remains clean.

**Relevant commits:** `e913e51` (implementation), `c366d30` (renderer formatting), `b26c8c7` (final corrected component test). Earlier test-format iterations were superseded.

## Actual Windows CI evidence

- **CI #469 SUCCESS** on code/test head `b26c8c748236895317334717ed7044ebd84baf19`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37740447189
- **301 passing tests:** 153 unit + 59 contract + 47 component + 42 integration. Prettier, lint, TypeScript, architecture, secrets, portability and frozen reference checks PASS.
- Real Windows Electron W05-07 project Try/Revert/Apply, Save/Reopen/cross-project dynamic binding, fixture/source SHA-256+size+mtime protection, 128-layer/100-template stress, full previous-wave regressions, four captured screenshot/reference states, packaged executable smoke and portable multi-file ZIP PASS.
- Four-screen image/DOM/source-fingerprint evidence artifact **11533408457**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37740447189/artifacts/11533408457
- Windows portable **test artifact** **11533567027** (not a final public release).

## Exit decision and safe continuation

**R08 scoped functionality: PASS.**  
**W11-05 overall: IN PROGRESS; AC-W11-05-21 visual signoff remains OPEN.**  
**PR #51: DRAFT, NOT MERGED. main: unchanged.**

Next authorized task within W05-07: seek explicit acceptance of frozen *hierarchy/copy/safety semantics* with truthful representative fixture imagery, or a precise bounded list of further static **W11-05-owned** visual deficiencies. Do **not** endlessly rework the UI based solely on painterly mockup media that require W11-06/07. After formal review, map AC-W11-05-01..25, document drift/no-drift, perform final Windows regressions, and only then consider W11-05 closure and merge.
