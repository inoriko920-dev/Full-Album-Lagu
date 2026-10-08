# W11-05 — Acceptance Matrix

Wave: **Manual Layer Editor + Templates**  
Features: **FTR-007 + FTR-011; FTR-013/FTR-018 cross-cut**  
Planning baseline: `main@8f145a6684177286f8bae3bb9c50515d6f5703b7`

| ID | Acceptance condition | Planned owner |
|---|---|---|
| AC-W11-05-01 | Legacy schema-v1 project without `visualScene` opens/saves/reopens without semantic loss. | 01/07 |
| AC-W11-05-02 | Optional scene/layer fields validate deterministically; layer IDs are unique/stable; canonical layer array order is z-order. | 01 |
| AC-W11-05-03 | Dynamic title/artist/artwork layer bindings resolve through W11-04 presentation without duplicating current-track values into persisted layer state. | 01/04 |
| AC-W11-05-04 | Layer selection from canvas or Layer list points to the same stable layer ID and remains UI-session/non-dirty. | 04/05 |
| AC-W11-05-05 | Add/remove/duplicate/reorder supported layers are non-destructive and each explicit action is reversible through unified history. | 02/05 |
| AC-W11-05-06 | Layer transform position/size-or-scale/rotation/opacity/anchor-alignment/visibility persists and is visibly projected. | 02/04/05 |
| AC-W11-05-07 | Continuous pointer transform previews locally and commits one coalesced manual history entry at gesture end. | 02/05 |
| AC-W11-05-08 | Locked layer remains selectable but mutation is rejected/no-op until explicitly unlocked. | 02/05 |
| AC-W11-05-09 | Supported text layer font/alignment/style edits validate, persist and remain readable in static Preview. | 02/04/05 |
| AC-W11-05-10 | Spectrum and Progress structural layers can be selected/reordered/transformed without implementing audio-reactive/playhead runtime early. | 01/04/05 |
| AC-W11-05-11 | Save/Reopen persists the canonical visual scene and resets in-memory history cleanly. | 01..07 |
| AC-W11-05-12 | TemplateDocument contains reusable visual configuration only; no playlist, audio bytes, track order/duration, credentials or absolute user media paths. | 03/07 |
| AC-W11-05-13 | Template catalog/store filesystem ownership stays in main via PathService/port; renderer has no direct fs/network/marketplace path. | 03 |
| AC-W11-05-14 | Frozen local category/filter behavior and deterministic starter catalog include canonical `Minimal Biru`. | 03/06 |
| AC-W11-05-15 | Coba Template is session-only: no project revision, dirty flag or history change before explicit Apply. | 03/06 |
| AC-W11-05-16 | Kembali ke Sebelumnya discards trial state exactly and leaves playlist/audio/metadata/order/duration unchanged. | 03/06 |
| AC-W11-05-17 | Terapkan Template publishes one template-origin atomic transaction, one revision and one Undo/Redo step. | 03/06 |
| AC-W11-05-18 | Stale trial/apply revision/state token rejects atomically with no partial visual publication. | 03 |
| AC-W11-05-19 | Save as Template creates a reusable local template without dirtying the project; dynamic bindings resolve correctly in a second project. | 03/06/07 |
| AC-W11-05-20 | Invalid/incompatible/corrupt template is rejected without changing project state or protected project data. | 03/07 |
| AC-W11-05-21 | Frozen SCR-002C, SCR-003A, SCR-003B and DLG-008 hierarchy/copy/safety semantics are preserved; Gemini remains permanent right rail in Main Editor. | 05/06/07 |
| AC-W11-05-22 | Layer/template operations never mutate source audio/image bytes; SHA-256/size/mtime protected-source fingerprints remain unchanged. | 02/03/07 |
| AC-W11-05-23 | Architecture, secret, portable-path and trust-boundary gates pass; no Gemini/FFmpeg/provider integration is introduced. | all/07 |
| AC-W11-05-24 | 128-layer command/projection and 100-template catalog/filter/try scenarios remain deterministic and responsive with no renderer lockup. | 02/03/07 |
| AC-W11-05-25 | STEP 10 + W11-01..04 + exact frozen UI + Windows package/executable smoke/portable ZIP regressions all pass. | 07 |

## Closure rule

Task-level evidence contributes to this matrix but does not close the wave by itself.

**W11-05 COMPLETE / PASS** requires T11-W05-07 to:
- map AC-W11-05-01..25 to final PASS;
- attach Windows E2E/stress/source-fingerprint evidence;
- record architecture/UI/trust-boundary drift review with no material drift;
- preserve all mandatory previous-wave/package gates.


## T11-W05-01 task-level evidence

- Verified implementation head: `137e8d31a08b804498b56a9b9cb094bcc4add8f0`
- Windows CI: `37682820030` / #321 — PASS
- Evidence: `evidence/T11_W05_01_VISUAL_SCENE_SCHEMA_PROJECTION_EVIDENCE.md`
- AC-W11-05-01: **PASS at T11-W05-01 level** — legacy schema-v1 remains compatible and visualScene JSON round-trip is proven.
- AC-W11-05-02: **PASS at T11-W05-01 level** — deterministic validation, unique stable IDs, canonical layer-array order.
- AC-W11-05-03: **PASS at T11-W05-01 level** — title/artist/artwork resolve through W11-04 bindings without derived persistence.
- AC-W11-05-10: **PARTIAL** — Spectrum/Progress structural layers exist without W11-06 runtime; interaction behavior remains later ownership.
- AC-W11-05-11: **PARTIAL** — persistence round-trip is proven; full session/history behavior remains later ownership.
- AC-W11-05-23: **PASS for T11-W05-01** — architecture/provider/tool boundaries remain intact.
- AC-W11-05-25: **PASS for T11-W05-01 regression gate** — STEP 10 + W11-01..04 + frozen UI + package/smoke/ZIP green.

These task-level statuses do not close the W11-05 acceptance matrix; final closure remains T11-W05-07 owned.


## T11-W05-02 task-level evidence

- Verified implementation head: `308a4800bcbfcf4e85828795e6573893622dd722`
- Windows CI: `37687361672` / #336 — PASS
- Evidence: `evidence/T11_W05_02_LAYER_COMMANDS_GESTURE_HISTORY_EVIDENCE.md`
- AC-W11-05-05: **PASS at core-command level** — add/remove/duplicate/reorder are non-destructive and reversible through unified history.
- AC-W11-05-06: **PARTIAL / command-state PASS** — transform/common state is canonical/reversible; visible Preview remains T11-W05-04/05.
- AC-W11-05-07: **PASS at core gesture/history level** — continuous preview remains session-only and one gesture-end commit creates one history node.
- AC-W11-05-08: **PASS at core-command level** — locked mutation rejects until explicit unlock.
- AC-W11-05-09: **PARTIAL / command validation PASS** — text-style edits validate/persist; readable Preview remains later ownership.
- AC-W11-05-10: **PARTIAL** — structural layer command targeting works without W11-06 runtime.
- AC-W11-05-22: **PASS for logical non-destructive boundary** — layer remove/Undo leaves tracks/media references unchanged; physical fingerprint closure remains T11-W05-07.
- AC-W11-05-23: **PASS for T11-W05-02** — architecture/secrets/portable trust boundaries remain intact.
- AC-W11-05-24: **PARTIAL / 128-layer command-history stress PASS** — 100-template stress remains T11-W05-03/07.
- AC-W11-05-25: **PASS for T11-W05-02 regression gate**.

These task-level statuses do not close W11-05; final closure remains T11-W05-07 owned.


## T11-W05-03 task-level evidence
- Evidence: `evidence/T11_W05_03_TEMPLATE_DOCUMENT_LOCAL_STORE_TRIAL_APPLY_EVIDENCE.md`.
- AC-W11-05-12: **PASS task level** — template schema restricts to static scene and no protected project/media/secret fields.
- AC-W11-05-13: **PASS core level** — main-only store and Electron composition resource/user-data directories. Template browser bridge/wiring is later scope.
- AC-W11-05-14: **PASS core level** — deterministic nine read-only starters, all categories, canonical `Minimal Biru`; browser grid/filters later W05-06.
- AC-W11-05-15, 16: **PASS core level** — Try/Revert session-only with no revision, dirty or history impact.
- AC-W11-05-17, 18: **PASS core level** — single template-origin guarded Apply and stale atomic rejection.
- AC-W11-05-19: **PASS core level** — non-dirty Save as Template and cross-project semantic bindings; dialog UI later.
- AC-W11-05-20: **PASS core level** — strict schema/version, corrupt template/store failure and collision protection.
- AC-W11-05-24: **PARTIAL / catalog stress PASS** — 100 user-template items plus nine built-ins; renderer performance and full E2E remain W05-07.
- AC-W11-05-23/25: **PASS for this task** — prior architecture/secret/UI/regression/Windows packaged smoke and portable ZIP gates.
- These task-level statuses **do not close W11-05**. W05-04..07 must finish, with wave closure only by W05-07.


## T11-W05-04 task-level evidence
- Evidence: `evidence/T11_W05_04_STATIC_PREVIEW_SELECTION_INSPECTOR_EVIDENCE.md`.
- AC-W11-05-03: **PASS task level** — selected-track/first-enabled title/artist/artwork binding reused via existing W11-04 resolver.
- AC-W11-05-04: **PASS core/session level** — shared layer stable-ID between canvas/list in UI-session, never dirties project; mounted AppShell integration remains W05-05.
- AC-W11-05-06,09: **PARTIAL / Preview projection PASS** — normalized transform/text style render, Inspector model; frozen UI editing wires in W05-05.
- AC-W11-05-08: **PASS selection component level** — locked layer remains selectable, preview gesture rejects locked transforms.
- AC-W11-05-10: **PASS static structural rendering** — selectable/reorderable spectrum and progress placeholder, no playback/runtime.
- AC-W11-05-21: **PARTIAL / no shell drift** — isolated Preview not yet wired to frozen SCR-002C; SCR-002A exact regression PASS.
- AC-W11-05-24: **PARTIAL / 128-layer projection + component stress PASS**; full live renderer stress/E2E deferred W05-07.
- AC-W11-05-23/25: **PASS for T11-W05-04** — Windows CI #365 / `37722584947` PASS at `c1219e3d9fa6cb12fc2a21a18a9eb945a5da5986` — **278 tests PASS** (153 unit, 55 contract, 32 component, 38 integration), STEP 10 + W11-01..04, frozen SCR-002A, Windows portable package/smoke/ZIP PASS.
- W11-05 overall remains IN PROGRESS. W05-05..07 are not wave-VERIFIED.


## T11-W05-05 task-level evidence
- Evidence `evidence/T11_W05_05_FROZEN_LAYER_INSPECTOR_UI_WIRING_EVIDENCE.md`.
- AC-W11-05-04: **PASS at AppShell component level** — synchronized UI-session canvas/list stable-ID selection, non-dirty.
- AC-W11-05-05: **PASS at UI command level** — add/duplicate/remove/reorder, global Undo/Redo via one CommandEngine owner.
- AC-W11-05-06/07: **PASS at UI/session level** — frozen left Inspector transforms, ephemeral pointer gesture preview vs single committed history entry, anchor/visibility/lock.
- AC-W11-05-08: **PASS UI level** — locked layer selectable but mutating controls disabled, explicit unlock.
- AC-W11-05-09/10: **PASS task-level** — text style and Spectrum/Progress static structural selection without early runtime.
- AC-W11-05-21: **PARTIAL / hierarchy PASS** — frozen left rail / permanent Gemini right / Timeline unchanged, SCR-002A pixel baseline PASS; **dedicated SCR-002C pixel comparison not yet evidenced**; final UI authority closure W05-07.
- AC-W11-05-23/25: **PASS at task level** — Windows CI #378 / `37724632656` PASS at `7bdd0ee79ebf528182d9f2e5ae7da30967988c37`; 283 tests (153 unit, 55 contract, 37 component, 38 integration), architecture/secrets/portable paths, 29 frozen UI reference states, SCR-002A visual baseline, STEP 10/W11-01..04 E2E, Windows packaged smoke + portable multi-file ZIP PASS.
- W11-05 overall remains IN PROGRESS; W05-06 and W05-07 must finish before any wave-level PASS.


## T11-W05-06 task-level evidence (2026-10-08)
- Evidence: `evidence/T11_W05_06_FROZEN_TEMPLATE_BROWSER_TRY_SAVE_UI_EVIDENCE.md`; Windows CI #394 / `37726555465` PASS at `0961b284d0d4152bfa47c6d634906125659bb904`; **292 tests PASS** (153 unit, 59 contract, 42 component, 38 integration), architecture/secrets/portable-path checks, 29 frozen UI reference states, exact SCR-002A baseline, STEP 10 and W11-01..04 E2E, packaged Windows executable smoke and portable multi-file ZIP PASS.
- AC-W11-05-12/13: **PASS task level** — strict template schema visual-only plus main-owned local catalog/store with validated IPC and zero renderer filesystem access.
- AC-W11-05-14: **PASS UI level** — local category/search grid and starter `Minimal Biru`; deterministic 100-template live stress pending W05-07.
- AC-W11-05-15/16: **PASS UI/core level** — exact Mode Coba safety copy; Try non-dirty/revision/history; Kembali ke Sebelumnya exact revert.
- AC-W11-05-17/18: **PASS UI/core level** — one guarded template-origin Apply with global Undo/Redo; stale trial rejected safely.
- AC-W11-05-19/20: **PASS local UI/contract level** — Save name/category and visual-only data, rejects corrupt/incompatible template; second-project full E2E remains W05-07.
- AC-W11-05-21: **PARTIAL / semantics and frozen shell PASS** — SCR-003A/B/DLG-008 copy and structure covered by component tests, old SCR-002A exact baseline PASS; dedicated screenshot pixel comparison remains W05-07.
- AC-W11-05-22: **PARTIAL** — no source media mutations in code/UI and protected data rejected by strict template IPC; physical SHA-256/size/mtime proof belongs to W05-07.
- AC-W11-05-23/25: **PASS task-level** — Windows CI #394 / `37726555465` PASS at `0961b284d0d4152bfa47c6d634906125659bb904`; **292 tests PASS** (153 unit, 59 contract, 42 component, 38 integration), architecture/secrets/portable-path checks, 29 frozen UI reference states, exact SCR-002A baseline, STEP 10 and W11-01..04 E2E, packaged Windows executable smoke and portable multi-file ZIP PASS.
- W11-05 wave **not closed**; final 25-AC drift/E2E closure awaits T11-W05-07.


## T11-W05-07 initial full-wave review (2026-10-08 WIB)
- All 25 acceptance conditions were reviewed against prior task evidence plus real Windows CI #407, run `37729207171` (298 Vitest tests and all real Electron, Save/Reopen, second-project binding, fingerprint, 128-layer and 100-template tests PASS).
- **AC-W11-05-21: FAIL / BLOCKER** after direct human visual review of frozen-vs-Electron SCR-002C, SCR-003A, SCR-003B and DLG-008 screenshots. See `evidence/T11_W05_07_UI_DRIFT_GATE_FAIL.md`. Main Editor's visual composition, local gallery, Try mode and Save dialog differ materially from frozen references. Pixel-exact comparison was neither used nor claimed due differing image resolutions.
- **Other conditions:** functional, schema, template, protection, stress, trust boundary and prior-wave regression evidence PASS at test level; final whole-wave PASS is withheld until AC21 is remediated and all 25 ACs are rechecked.
- **Wave gate: FAIL; W11-05 remains IN PROGRESS; T11-W05-07 corrective work is the only authorized next step.**

## W05-07 R02 new evidence — unchanged wave gate
- **W05-07 R02 (2026-10-08 WIB):** editor-hosted Try/Preview, simultaneous left Layer+Inspector, frozen category rail, real visual-only scope Save dialog over editor implemented. Windows CI #427 / `37730737210` **PASS 301 tests** (153 unit, 59 contract, 47 component, 42 integration), Windows Electron/screenshots/source fingerprints/portable/previous waves PASS. **UI imagery/layout visual acceptance still pending**; do not merge draft PR #51 or start W11-06. Evidence: `docs/step11/evidence/T11_W05_07_VISUAL_REMEDIATION_R02.md` (relative from docs files: `step11/evidence/...`).
- AC-W11-05-04/06: **PASS / R02 UI wiring evidence** — selected layer + editable Inspector simultaneously in left rail, non-dirty session selection.
- AC-W11-05-15/16/17: **PASS / R02 renderer evidence** — actual trial-mode scene projected in Main Editor without history; Revert/Apply behavior and Undo/Redo pass Windows Electron.
- AC-W11-05-19: **PASS / R02 scoped Save evidence** — visual layer-group options actually filter persisted reusable template; second-project dynamic binding, no dirty and protected source metadata preserved.
- AC-W11-05-21: **PARTIAL / DESIGN REVIEW STILL FAIL** — key workflow topology repaired, but visual fidelity and thumbnail/reference composition differences remain; no whole-wave PASS.
- AC-W11-05-22/23/24/25: **PASS task-level Windows CI #427** — immutable source SHA-256/size/mtime, 128/100 stress, protected paths, 29 references, frozen SCR-002A baseline, portable executable smoke and ZIP, old waves regression.
- W11-05 still **IN_PROGRESS**, W05-07 only authorized next.

## T11-W05-07 R03 evidence and remaining UI gate
- R03 Windows CI #444 / `37732523147` PASS at `37264b3d998d5c89214ec699b22b35c894ea459d`: 301 tests (153 unit, 59 contract, 47 component, 42 integration), physical source fingerprints, 128-layer/100-template stress, four real Electron screenshots, prior regressions and portable smoke/ZIP PASS. Evidence `docs/step11/evidence/T11_W05_07_VISUAL_REMEDIATION_R03.md`; frozen comparison artifact `11530732266`.
- AC-W11-05-14: **PASS task level** — existing local catalog, 3-column category gallery and distinct bundled thumbnails for built-ins; user templates remain clearly samples/no remote imagery.
- AC-W11-05-21: **NOT YET ACCEPTED** — current true Electron gallery/artwork is visually closer to frozen references, but full approved scenic canvas and populated timeline composition remain absent (current two-track fixture and future audio runtime boundary). No fictitious waveform/playhead and no pixel-exact claim.
- AC-W11-05-22/23/25: **PASS technical task-level** — real source byte/size/mtime fingerprint, prior regression and Windows portable executable E2E.
- **Next authorization:** continue **SOL T11-W05-07 visual remediation ONLY** on draft PR #51; AC-W11-05-21 remains NOT ACCEPTED, so W11-05 overall IN PROGRESS. Do not begin W11-06/W11-07/STEP 12 or merge PR before frozen UI authority review PASS.


## T11-W05-07 R09 — full 25-AC readiness audit (2026-10-08 WIB)
- New authoritative handoff evidence: `evidence/T11_W05_07_R09_25_AC_CLOSURE_READINESS_AUDIT.md`. Contains every AC01..25, actual supporting task evidence/Windows CI, a signoff matrix and protected runtime boundaries.
- R09 added **real Windows Electron SCR-003A category/search/no-match safety regression** and verifies no project revision or dirty mutation. Windows CI **#472 / `37741414109` PASS**, commit `f8f382009ea1ab9c35d0e91b5dac6e08720ff1a2`: 301 tests (153 unit, 59 contract, 47 component, 42 integration), full W05-07 E2E/screenshots, project Save/Reopen/cross-project, SHA-256/size/mtime media protections, 128-layer and 100-template stress, prior waves, Windows packaged smoke and portable multi-file ZIP. Visual artifact `11534087251`; portable test build `11534156950`.
- **Readiness audit: AC01..20, AC22..24** have technical evidence **PASS (23 ACs)**; **AC21** frozen UI authority signoff **OPEN**; **AC25** has green technical regressions but final PASS is **HELD by AC21**. No all-25 PASS claim or reinterpretation of frozen mockup into working audio playback.
- **Wave status stays W11-05 IN_PROGRESS / T11-W05-07 OPEN; PR #51 DRAFT/NOT MERGED; W11-06/07/STEP 12 BLOCKED.** Independent affirmative UI/product authority decision or actionable W11-05 visual defect list required.


## T11-W05-07 R10 — UI-authority decision packet, no acceptance inferred (2026-10-08 WIB)
- Independent comparison of **all four latest genuine CI #475** frozen-vs-Electron images was completed; see `evidence/T11_W05_07_R10_UI_AUTHORITY_REVIEW_PACKET.md` and original Windows action evidence `11534043628` (run `37741904387`, PASS).
- R10 identifies *per-screen* differences between truthful current W11-05 structures and reference visuals. Spectrum motion/playback and media-filled timeline are not implicitly implemented or required by the W11-05 runtime, but current-stage template-thumbnail richness, gallery proportions and dialog styling require an **explicit** reviewer decision.
- **Formal result:** `AC-W11-05-21 = OPEN / WAITING FOR USER OR DESIGN AUTHORITY DECISION`; `AC-W11-05-25 = TECHNICAL REGRESSION PASS / FINAL GATE HELD`. 23 other acceptance criteria have existing technical evidence from R09, not freshly re-awarded final signoff. No user approval/waiver is claimed.
- Reviewer chooses either (A) explicit approval of the current **static** four-screen presentation with truthful sample media boundaries, or (B) precise per-screen W11-05-only UI fixes. Then SOL must recheck all 25 ACs and final Windows CI/DoD; until then **W11-05 IN PROGRESS, PR #51 DRAFT/NOT MERGED and W11-06/07/STEP 12 BLOCKED**.


## T11-W05-07 R11 — active template reselect regression, still awaiting UI signoff (2026-10-08 WIB)
- Fixed genuine Template Browser issue: clicking the already-selected catalog card previously cleared `selectedTemplate` without changing `selectedId`, so the loader effect never reran and `Coba Template` became disabled. Now clear/load only when the entry ID actually changes.
- Added component and **real Electron Windows SCR-003A** reselect regression requiring Try remains enabled and matching detail heading. Windows **CI #482 / `37744819940` SUCCESS** on `e658752df7a3eee0ff1555ba419d41186ccc979f`: 301 tests, genuine W05-07 Electron E2E/four screenshots, 128-layer/100-template stress, source SHA-256/size/mtime, previous waves, packaged Windows smoke and portable ZIP PASS. Artifact `11535790571`.
- Evidence: `evidence/T11_W05_07_R11_ACTIVE_TEMPLATE_RESELECTION_FIX.md`; improved AC14 catalog usability and AC21 picker interaction **at technical level only**. **AC21 remains OPEN pending explicit UI-owner decision** and **AC25 final held by AC21**. Do not claim 25/25 PASS, merge draft PR #51, or start W11-06/W11-07/STEP 12.


## T11-W05-07 R12 — recover transient selected-template load, UI signoff unchanged (2026-10-08 WIB)
- `TemplateBrowser.tsx`: same card click **retains loaded state when successful**, or **retries once on user action when no template is loaded**. Existing async response-version guard still prevents stale selection.
- `tests/component/AppShell.visual-layer-editor.test.tsx`: first load fails, second same-ID click succeeds, Try enables, alert clears, revision/dirty remain unchanged. **Windows CI #488 / `37745862253` SUCCESS** at `c0a6fd7995dc3b631aa620b8955dfa5dc3bb7b10`, **302 tests** (153 unit, 59 contract, 48 component, 42 integration), real Electron four-state capture, previous-wave E2E, source fingerprints, 128/100 stress, Windows packaged smoke, portable ZIP PASS. Artifact `11535972213`.
- Evidence `evidence/T11_W05_07_R12_TEMPLATE_LOAD_RETRY.md`.
- **AC21 remains OPEN pending explicit UI acceptance; AC25 technical green but final closure held. W11-05 IN_PROGRESS, PR #51 DRAFT/NOT MERGED, W11-06/07 and STEP12 BLOCKED.**


## T11-W05-07 R13 — single in-flight local template loader (2026-10-08 WIB)
- Confirmed renderer UI duplicate-load issue: repeated clicks on the already selected catalog card during an **in-flight** `loadTemplate` could restart parallel IPC requests even though requestVersion ignored stale responses. Added `templateLoadPending` guard; only a settled failure allows explicit same-card retry, and already loaded selections stay usable.
- Deterministic component regression holds the first load open, clicks selected card three times (still one request), finishes with an error, then clicks again (exactly one recovery request), verifying unchanged project revision/dirty. **Windows CI #495 / `37747261951` SUCCESS**, code/test head `3e31be00a32ff16dc14a4461e4cbd3bd752b444b`: **303 tests** (153 unit, 59 contract, 49 component, 42 integration), real Electron W05-07, source fingerprints, 128/100 stress, prior waves, portable packaged smoke/ZIP PASS. Visual artifact `11536631133`.
- Evidence `evidence/T11_W05_07_R13_PENDING_TEMPLATE_LOAD_GUARD.md`. **AC21 frozen UI signoff OPEN; AC25 technical portion PASS, final held. W11-05 IN_PROGRESS, PR #51 DRAFT/NOT MERGED; W11-06/W11-07/STEP12 BLOCKED.**


## T11-W05-07 R14 — truthful Save/Refresh status (2026-10-08 WIB)
- **Real Template Browser bug:** after `saveVisualTemplate` returned success, a thrown `listTemplates` catalog refresh could be caught as `Gagal menyimpan template lokal.`, falsely implying the saved file did not exist and risking duplicate retries. `reloadCatalog` now safely handles unavailability, error results and throws separately, preserving success confirmation and clearly describing catalog refresh failure.
- Added deterministic component regression: successful save, thrown *second* catalog listing, one save only, correct success + refresh warning, no false save error, no dirty/revision change. **Windows CI #502 / `37748595805` SUCCESS** at SHA `e3a6625c3894d40d03a938a0b392aeec17742079`: **304 tests** (153 unit, 59 contract, 50 component, 42 integration), real Windows Electron W11-05, Save/Reopen/cross-project, source SHA-256/size/mtime, 128/100 stress, previous waves, screenshots, portable ZIP/smoke. Evidence `11537208151`.
- Full R14 evidence `evidence/T11_W05_07_R14_SAVE_CATALOG_REFRESH_TRUTHFUL_STATUS.md`. **AC21 frozen UI design signoff remains OPEN**; AC25 technical PASS but final acceptance HELD. **W11-05 IN_PROGRESS, PR #51 DRAFT/not merged, next waves BLOCKED.**


## T11-W05-07 R15 — initial catalog sync-throw safety (2026-10-08 WIB)
- Browser Template mount used to invoke `listTemplates()` outside its Promise handler. A preload/IPC bridge throwing **synchronously** could break rendering instead of showing a safe error. It now resolves the invocation inside the existing async error chain, preserving unmounted guard and read-only project state.
- React regression directly throws from `listTemplates`: Browser remains mounted, Coba disabled, Gemini stays, error message appears and Kembali ke Editor remains usable without project revision/dirty mutation.
- **Windows CI #508 / `37750086819` SUCCESS** at code/test SHA `17a532d898d718933dc30b98d0a0b72f62d33368`: **305 tests** (153 unit, 59 contract, 51 component, 42 integration), actual Electron W05-07, four screenshot comparisons, Save/Reopen/cross-project, source SHA-256/size/mtime, 128-layer/100-template stress, earlier waves, packaged Windows smoke and portable ZIP. Evidence artifact `11537557161`.
- See `evidence/T11_W05_07_R15_INITIAL_CATALOG_SYNC_THROW_GUARD.md`. **AC21 formal frozen UI signoff remains OPEN, AC25 final held; W11-05 IN_PROGRESS, PR #51 DRAFT/NOT MERGED and W11-06/07/STEP12 BLOCKED.**


## T11-W05-07 R16 — synchronous selected template load failure recovery (2026-10-08 WIB)
- **Real remaining loader bug:** `window.lfa.loadTemplate(selectedId)` was invoked outside its `.catch()`; a synchronous preload/IPC throw could escape the effect, leave the pending flag set, and interrupt Browser state. R16 invokes it in `Promise.resolve().then(...)`, reusing the guarded catch and R12 manual same-card retry without duplicate requests.
- New React regression directly throws on first `loadTemplate` call; Browser shows error/Try disabled, a single deliberate re-click reloads, clears error and enables Try, while canonical revision/dirty stay unchanged.
- **Windows CI #514 / `37752797495` SUCCESS** on SHA `f10c3e869a834970061054cdfdf736e8c96d63ef`: **306 tests** (153 unit, 59 contract, 52 component, 42 integration), true Electron W11-05, frozen screenshot captures, Save/Reopen/cross-project, source SHA-256/size/mtime, 128/100 stress, prior-wave E2Es and Windows portable packaged smoke/ZIP. Evidence artifact `11538698518`.
- Full evidence `evidence/T11_W05_07_R16_TEMPLATE_LOAD_SYNC_THROW_RECOVERY.md`. **AC21 frozen UI explicit approval remains OPEN; AC25 technical checks PASS, final acceptance HELD. W11-05 IN_PROGRESS / PR #51 DRAFT/NOT MERGED; next waves BLOCKED.**


## T11-W05-07 R17 — stale initial catalog vs post-save refresh guard (2026-10-08 WIB)
- Found a real result-ordering race: the initial `listTemplates` request could resolve **after** a successful post-save `reloadCatalog` request and overwrite fresh entries, hiding a just-saved user template. New catalog generation ref rejects old success/error responses so only the newest request can update entries, selection and refresh error state.
- Deterministic React component regression holds first catalog result while one successful local save and second refresh complete, then releases the old result: new user entry stays visible, one save, two catalog reads, no project revision/dirty mutation.
- **Windows CI #520 / `37754360119` SUCCESS** on code/test SHA `0d40ef3a7a484c14d93bbc1c88ca2b4bcce97f0f`: **307 tests** (153 unit, 59 contract, 53 component, 42 integration), actual Electron W11-05/four frozen screenshots, Save/Reopen/cross-project, physical source SHA-256/size+mtime, 128 layers/100 templates, earlier-wave regression and packaged Windows portable smoke/ZIP. Screenshot/E2E artifact `11540106386`.
- Evidence: `evidence/T11_W05_07_R17_STALE_CATALOG_RESPONSE_GUARD.md`. **AC21 formal frozen UI signoff remains OPEN, AC25 technical green but final acceptance HELD; W11-05 IN_PROGRESS, PR #51 DRAFT/not merged, later waves BLOCKED.**


## T11-W05-07 R18 — isolate post-save catalog warning from pending template-load result (2026-10-08 WIB)
- **Actual safety/UX bug:** pending `loadTemplate` could finish after a **successful visual template save + failed catalog refresh**, unconditionally clear the shared `catalogError`, and erase the truthful "saved but list not updated" warning. R18 introduces distinct `templateLoadError` and keeps catalog/save warning independent of selected-template success/failure; stale load errors clear when selection changes.
- Deterministic React regression delays template load, saves exactly once, makes the second catalog listing return an error, checks warning, then releases successful load. Warning remains, Try enables, save confirmation persists, revision/dirty unchanged.
- **Windows CI #531 / `37757002704` SUCCESS** at code/test+restored-strict-format SHA `43e70882bfcdaafc8e2532d8a6c405a1bd40e7f0`: **308 tests** (153 unit, 59 contract, 54 component, 42 integration), original Prettier/TypeScript/lint, genuine Electron W11-05 and four frozen screenshots, Save/Reopen/cross-project, source SHA-256/size/mtime, 128-layer/100-template stress, prior wave E2Es, Windows packaged smoke and portable ZIP PASS. Evidence artifact `11540248008`.
- Earlier Prettier-only failures were diagnosed via a **temporary branch-only format script**, whose exact Prettier output was applied. Original `package.json` script was **restored** before #531, with no weakened CI.
- R18 full report: `evidence/T11_W05_07_R18_CATALOG_WARNING_ISOLATION.md`. **AC21 explicit UI authority signoff still OPEN; AC25 technical PASS but final held. W11-05 IN_PROGRESS, PR #51 DRAFT/NOT MERGED; W11-06/07/STEP12 BLOCKED.**


## T11-W05-07 R19 — valid large Unicode template save/read invariant (2026-10-08 WIB)
- Genuine persisted data-integrity defect: `JsonTemplateStore.saveUserTemplate()` previously wrote any schema-valid template without a byte-size check, while the reader rejected user template JSON greater than **2 MiB**. A successful save with many Unicode static text layers could therefore be unreadable and omitted from the catalog.
- R19 retains the **2 MiB built-in catalog** guard, defines an **8 MiB user-template** guard applied **symmetrically** on read and serialized UTF-8 pre-save, and writes the exact byte-checked payload. Strict schemas, built-in no-overwrite, source safeguards and atomic no-overwrite hard-link behavior unchanged.
- Added real-store integration regression: 440 schema-valid CJK text layers, payload >2 MiB; filesystem saved size matches, `list()` discovers user template, `load()` returns exact document. **Windows CI #538 / `37758688373` SUCCESS** on SHA `be5dd822db6bb94fd8b80b54b984343aab432593`: **309 tests** (153 unit, 59 contract, 54 component, 43 integration), genuine Electron W11-05, four frozen screenshot comparisons, prior-wave E2Es, protected physical source fingerprints, 128-layer/100-template stress, Windows portable smoke/ZIP PASS. Artifact `11541217865`.
- Evidence `evidence/T11_W05_07_R19_LARGE_TEMPLATE_ROUNDTRIP_GUARD.md`. **AC21 frozen UI authority signoff remains OPEN; AC25 technical green but final acceptance HELD. W11-05 IN_PROGRESS, PR #51 DRAFT/unmerged, W11-06/W11-07/STEP12 BLOCKED.**

## T11-W05-07 R23 — scoped static presentation and genuine Windows #547
- **R23 UI code + responsive fixes verified** at `24004a0fc44535499b3b05297efdd5b170032bb9`: Windows CI #547 / `37764099762` **SUCCESS; 310 tests** (154 unit/59 contract/54 component/43 integration). Four authentic frozen/Electron screenshot pairs artifact `11544106158`; packaged executable smoke, portable test ZIP, earlier-wave Windows regression, protected source hash/size/mtime, 128/100 stress all PASS.
- SCR-003A catalog layout/illustration, SCR-003B gallery no-overlap, DLG-008 modal clarity improved; no model/media/protocol/frozen-reference/runtime changes. Full evidence `evidence/T11_W05_07_R23_STATIC_UI_POLISH_WINDOWS_VERIFIED.md`.
- **AC21 remains OPEN for affirmative UI owner signoff on actual R23 four-screen captures. AC25 technical portion PASS but FINAL HELD; W11-05 not closed, PR #51 Draft, next waves blocked.**
