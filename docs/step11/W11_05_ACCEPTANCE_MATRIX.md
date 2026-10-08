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
