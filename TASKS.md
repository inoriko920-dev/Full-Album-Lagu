# TASK LEDGER

## Completed foundation / UI / vertical slice
- STEP 08 Repository Foundation — DONE / PASS_WITH_PROVISIONAL.
- STEP 09 App Shell / UI Implementation — DONE / verified frozen screenshot baseline.
- STEP 10 `SLC-010-001 Save & Reopen Empty Project` — DONE / PASS_WITH_PROVISIONAL.

# STEP 11 — FEATURE WAVES

## ASTRA-11-PLAN — Feature Registry + Dependency Graph + W11-01 Charter
- Owner: ASTRA
- Priority: P0
- Risk: MEDIUM
- Status: DONE
- Work status: PLANNING_COMPLETE
- Evidence status: DOCX + operational Markdown
- Gate: PASS
- Baseline analyzed: `main@da5b6786d0daa472c474a33ffd83a5834af24f82`
- Result: FTR-001..FTR-023 normalized; wave order locked; W11-01 READY.
- Implementation code changed: NO.

## T11-W01-01 — Lifecycle Contracts & Session Path Ownership
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified branch SHA: `a1ab0388c655c399f7347d40ba0acec5fc178bc8`
- Windows CI run: `37532835161` — PASS
- CI job: `112506354661`
- Scope delivered:
  - public typed location contract: `unsaved | known-path`;
  - composition-owned `ProjectPathSession` is canonical owner of the actual current path;
  - raw filesystem path is not exposed through renderer lifecycle contract;
  - successful STEP 10 save/startup load records known-path ownership;
  - renderer ProjectSession tracks only public location state;
  - unit + contract + component seam tests added.
- Existing STEP 10 save/reopen E2E, frozen UI baseline, runtime audit, Windows package/smoke and portable ZIP all PASS.
- Evidence: `docs/step11/evidence/T11_W01_01_LIFECYCLE_CONTRACTS_EVIDENCE.md`.
- Out of scope honored: Open, Save As, known-path Save behavior, autosave/recovery, media, Gemini, FFmpeg/render and UI redesign.

## T11-W01-02 — Open / Save As / Known-Path Save
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified branch SHA: `119e039bc42da84dc8a9950d7744e3ea519552a3`
- Windows CI run: `37534906938` — PASS
- CI job: `112513587662`
- Lifecycle evidence artifact: `11446750441`
- Scope delivered:
  - typed `project:open` and `project:save-as` channels;
  - application-owned lifecycle service for Open / Save As / known-path Save;
  - known-path Save bypasses Save As selection;
  - Save As success updates path ownership only after successful persistence;
  - Save As cancel preserves existing path;
  - Open success validates/loads first, then changes path ownership;
  - Open cancel/error preserves current path;
  - production native Open/Save As dialogs plus deterministic CI path/cancel seams;
  - renderer contracts still expose no raw filesystem path.
- Verification:
  - integration tests use real `JsonProjectStore` with spaces + Unicode paths;
  - deterministic Windows Electron E2E: 6 scenarios, all PASS;
  - assertions PASS: known-path Save bypass, Save As success/cancel, Open success/cancel/error, Unicode/spaces, sanitized public evidence;
  - STEP 10 SLC PASS;
  - frozen SCR-002A baseline PASS;
  - runtime high-severity audit PASS;
  - Windows package/smoke/portable ZIP PASS.
- Evidence: `docs/step11/evidence/T11_W01_02_PROJECT_LIFECYCLE_EVIDENCE.md`.
- Out of scope honored: dirty state, autosave/recovery, recovery UX, media, Gemini, FFmpeg/render, frozen UI redesign.

## T11-W01-03 — Dirty State & Autosave Recovery Store
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified branch SHA: `99071af5ddbc568db11db5b3eb4a5ab75aac2686`
- Windows CI run: `37570463026` — PASS
- CI job: `112627715745`
- Recovery evidence artifact: `11460358149`
- Scope delivered:
  - revision-based dirty/saved state;
  - separate recovery artifact schema and generation;
  - atomic main-owned recovery store;
  - dirty-only periodic autosave scheduling;
  - newer-valid/stale/corrupt recovery detection;
  - accept/discard recovery core without primary overwrite;
  - interrupted temporary recovery safety;
  - typed preload/IPC recovery boundary with no raw paths.
- Verification:
  - full verify suite PASS;
  - recovery unit/contract/integration tests PASS;
  - deterministic Windows recovery E2E PASS;
  - STEP 10 SLC + T11-W01-02 regression PASS;
  - frozen SCR-002A baseline PASS;
  - Windows package/smoke/portable ZIP PASS.
- Evidence: `docs/step11/evidence/T11_W01_03_DIRTY_AUTOSAVE_RECOVERY_EVIDENCE.md`.
- Out of scope honored: recovery UX wiring, media, Gemini, FFmpeg/render and frozen UI redesign.

## T11-W01-04 — Frozen UI States + Recovery UX Wiring
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified branch SHA: `fe548a032e982be70359dbc8dc6c2d02787ca6ce`
- Windows CI run: `37577568055` — PASS
- CI job: `112649903010`
- Frozen visual artifact: `11463371449`
- Scope delivered:
  - conditional frozen-shell notice row with no default-state layout drift;
  - recovery available/stale/invalid visible states;
  - Pulihkan / Abaikan / Hapus Autosave actions;
  - Save cancel/error visible feedback and retry;
  - autosave-write error manual-Save action;
  - ProjectSession accept/discard wiring through typed bridge only;
  - dirty/recovery DOM state markers for tests.
- Verification:
  - component state/action tests PASS;
  - full verify suite PASS;
  - STEP 10 SLC + T11-W01-02 + T11-W01-03 regressions PASS;
  - exact SCR-002A frozen visual baseline PASS;
  - Windows package/smoke/portable ZIP PASS.
- Evidence: `docs/step11/evidence/T11_W01_04_FROZEN_UI_RECOVERY_UX_EVIDENCE.md`.
- Out of scope honored: W11-01 final drift closure, media, Gemini integration, FFmpeg/render and frozen UI redesign.

## T11-W01-05 — Wave E2E, Drift Review & Evidence Pack
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: DONE
- Work status: VERIFIED
- Evidence status: COMPLETE
- Gate: PASS
- Verification baseline: `main@5b7cd0328dcdfdbb242a2e88999209446daacf12`
- Canonical Windows CI: `37578082369` — PASS
- CI job: `112651361529`
- Acceptance result: AC-W11-01-01..14 all PASS; none BLOCKED.
- Architecture drift: PASS — no material drift.
- Evidence:
  - `docs/step11/evidence/W11_01_WAVE_CLOSURE_EVIDENCE.md`
  - `docs/step11/evidence/W11_01_ARCHITECTURE_DRIFT_REVIEW.md`
- W11-01 final status: COMPLETE / PASS.

## ASTRA-W11-02-PLAN — Media Intake Foundation Charter
- Owner: ASTRA
- Priority: P0
- Risk: HIGH
- Status: DONE
- Work status: PLANNING_COMPLETE
- Evidence status: DOCX + operational Markdown
- Gate: PASS
- Baseline analyzed: `main@c791e9bebc30c7db9337f4341cfdd7e421a64b57`
- Feature set: FTR-003 + FTR-016 + FTR-018 cross-cut.
- Requirements: F-002, F-017; FR-005..008, FR-048..050, FR-055..056.
- DoR: PASS.
- Planning authority:
  - `docs/source-of-truth/planning/current/11_STEP_11_W11_02_MEDIA_INTAKE_FOUNDATION_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
  - `docs/step11/WAVE_11_02_CHARTER.md`
  - `docs/step11/TASK_CARDS_W11_02.md`
  - `docs/step11/W11_02_ACCEPTANCE_MATRIX.md`
- Implementation code changed: NO.
- No new UI prompt/image generation required; existing frozen states are authoritative.

## T11-W02-01 — Media Domain, Contracts & Project Compatibility
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified implementation head: `bc63f368af86d9c6f418a683b7fee47d4093a4df`
- Windows CI run: `37586453731` — PASS
- CI job: `112677579172`
- Scope delivered:
  - additive schema-v1 `mediaAssets` and track `audioAssetId`;
  - explicit media kind/availability/issue invariants;
  - required-media readiness blocker projection without raw source paths;
  - strict public media batch/relink contracts;
  - narrow internal media source/probe ports;
  - real JsonProjectStore legacy and additive-media round-trip compatibility tests.
- No runtime dependency, renderer/preload/IPC media API, picker, probe adapter, relink service or UI added.
- Evidence: `docs/step11/evidence/T11_W02_01_MEDIA_DOMAIN_CONTRACTS_EVIDENCE.md`.

## T11-W02-02 — Picker/Drop Discovery, Batch Queue, Progress & Cancel
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified implementation head: `ad9df0bd20703dbd1ab67c1ca673cdc65f8a3731`
- Windows CI run: `37589834065` — PASS
- CI job: `112688415921`
- Scope delivered:
  - native multi-file audio picker and multi-folder picker;
  - preload-only `webUtils.getPathForFile` drop-path resolution;
  - one main-owned recursive deterministic discovery service;
  - canonical real-path batch dedupe with Windows case folding;
  - bounded concurrency 4, progress/status and cancellation;
  - strict path-free public discovery summaries;
  - 20+, 100+, Unicode/spaces, duplicate, cancellation, non-destructive and trust-boundary tests.
- No audio probe/metadata dependency, relink implementation, media UI, Gemini or FFmpeg/FFprobe added.
- Evidence: `docs/step11/evidence/T11_W02_02_PICKER_DROP_DISCOVERY_EVIDENCE.md`.

## T11-W02-03 — Audio Probe, Validation, Metadata & Deterministic Initial Order
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified implementation head: `62bd3b76f7f45dad14938b1dd94f2e9ff73c2722`
- Windows CI run: `37594104866` — PASS
- CI job: `112702409465`
- Scope delivered:
  - exact `music-metadata@12.0.0` runtime dependency after compatibility/license gate;
  - main-owned `MusicMetadataProbePort` with duration and common metadata extraction;
  - explicit unsupported/unreadable/corrupt/duration-unavailable classification;
  - `skipCovers: true` bulk probing;
  - bounded/cancellable intake service with progress and staged commit;
  - deterministic initial order: metadata track -> filename number -> filename -> stable tie-break;
  - schema-v1 media asset/track commit with filename title fallback;
  - synthetic real-parser MP3/WAV/FLAC/M4A/AAC coverage plus 120-item ordering stability.
- Runtime FFmpeg/FFprobe, relink and media UI were not implemented.
- Evidence: `docs/step11/evidence/T11_W02_03_AUDIO_PROBE_METADATA_ORDERING_EVIDENCE.md`.

## T11-W02-04 — Missing Media Scan & Relink Core
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: READY
- Start condition: user says `lanjutkan`.
- Dependency: T11-W02-03 PASS.
- Scope: missing-media scan, required-audio vs optional-visual distinction, individual relink, deterministic folder relink matching and ambiguity handling only.
- Gate: must PASS before T11-W02-05.

## T11-W02-05 — Frozen Media/Missing/Relink UI Wiring
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W02-04.

## T11-W02-06 — Wave E2E, Drift Review & Evidence Closure
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W02-05.

W11-03 remains blocked until W11-02 closes COMPLETE / PASS.
