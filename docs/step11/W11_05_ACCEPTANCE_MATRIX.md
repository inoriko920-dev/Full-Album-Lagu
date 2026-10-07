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
