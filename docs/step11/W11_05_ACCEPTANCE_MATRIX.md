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
- R03 Windows CI #445 / `37732523147` PASS at `37264b3d998d5c89214ec699b22b35c894ea459d`: 301 tests (153 unit, 59 contract, 47 component, 42 integration), physical source fingerprints, 128-layer/100-template stress, four real Electron screenshots, prior regressions and portable smoke/ZIP PASS. Evidence `docs/step11/evidence/T11_W05_07_VISUAL_REMEDIATION_R03.md`; frozen comparison artifact `11530732266`.
- AC-W11-05-14: **PASS task level** — existing local catalog, 3-column category gallery and distinct bundled thumbnails for built-ins; user templates remain clearly samples/no remote imagery.
- AC-W11-05-21: **NOT YET ACCEPTED** — current true Electron gallery/artwork is visually closer to frozen references, but full approved scenic canvas and populated timeline composition remain absent (current two-track fixture and future audio runtime boundary). No fictitious waveform/playhead and no pixel-exact claim.
- AC-W11-05-22/23/25: **PASS technical task-level** — real source byte/size/mtime fingerprint, prior regression and Windows portable executable E2E.
- **Next authorization:** continue **SOL T11-W05-07 visual remediation ONLY** on draft PR #51; AC-W11-05-21 remains NOT ACCEPTED, so W11-05 overall IN PROGRESS. Do not begin W11-06/W11-07/STEP 12 or merge PR before frozen UI authority review PASS.
