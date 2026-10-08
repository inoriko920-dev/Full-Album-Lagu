# IMPLEMENTATION PLAN

## STEP 08 — Repository Foundation — COMPLETE
Gate: **PASS_WITH_PROVISIONAL**.

## STEP 09 — App Shell / UI Implementation — COMPLETE
Gate: **PASS_WITH_TOLERANCE**.
- S09-T01 Global App Shell — complete.
- S09-T02 Design Tokens + Shared Components — complete.
- S09-T03 Frozen Reference Screenshot Baseline — complete.

## STEP 10 — Minimum End-to-End Vertical Slice — COMPLETE
Verdict: **PASS_WITH_PROVISIONAL**.

Proven SLC: `SLC-010-001 Save & Reopen Empty Project`.

The slice proves a real Electron path from the frozen UI through ProjectSession, typed preload/IPC, application use cases and a main-process persistence adapter to an atomic schema-v1 JSON file, followed by close/reopen into the same renderer project state. Save cancellation is the representative end-to-end negative path.

Provisional: native save-dialog clicking is not automated in CI; CI injects the chosen path while retaining the same production persistence pipeline.

## STEP 11 — Feature Implementation Waves — IN PROGRESS

- W11-01 Project Lifecycle & Recovery Core — COMPLETE / PASS.
- W11-02 Media Intake Foundation — COMPLETE / PASS; T11-W02-01..06 VERIFIED.
- W11-02 features: FTR-003 + FTR-016 + FTR-018 cross-cut.
- Current planning authority:
  - `docs/source-of-truth/planning/current/11_STEP_11_W11_02_MEDIA_INTAKE_FOUNDATION_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
  - `docs/step11/WAVE_11_02_CHARTER.md`
  - `docs/step11/TASK_CARDS_W11_02.md`
  - `docs/step11/W11_02_ACCEPTANCE_MATRIX.md`
- Completed: **T11-W02-01 Media Domain, Contracts & Project Compatibility — PASS / VERIFIED**.
- Completed: **T11-W02-02 Picker/Drop Discovery, Batch Queue, Progress & Cancel — PASS / VERIFIED**.
- Completed: **T11-W02-03 Audio Probe, Validation, Metadata & Deterministic Initial Order — PASS / VERIFIED**.
- Completed: **T11-W02-04 Missing Media Scan & Relink Core — PASS / VERIFIED**.
- Completed: **T11-W02-05 Frozen Media/Missing/Relink UI Wiring — PASS / VERIFIED**.
- Completed: **T11-W02-06 Wave E2E, Drift Review & Evidence Closure — PASS / VERIFIED**.
- W11-02 acceptance AC-W11-02-01..18: **ALL PASS**; architecture/UI drift: **PASS — no material drift**.
- Closure proof: Windows CI `37616435681` / #177 PASS; `docs/step11/evidence/W11_02_WAVE_CLOSURE_EVIDENCE.md`.
- W11-03 Album Timeline + Command History — **COMPLETE / PASS**.
- W11-03 features: FTR-004 + FTR-013 + FTR-018 cross-cut.
- W11-03 planning baseline: `main@6f296f7cc8e8b81e86bde71f8cd3a32c0d0f1bd2`.
- W11-03 planning authority:
  - `docs/source-of-truth/planning/current/12_STEP_11_W11_03_ALBUM_TIMELINE_COMMAND_HISTORY_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
  - `docs/step11/WAVE_11_03_CHARTER.md`
  - `docs/step11/TASK_CARDS_W11_03.md`
  - `docs/step11/W11_03_ACCEPTANCE_MATRIX.md`
  - `docs/step11/W11_03_DOR.md`
- Completed: **T11-W03-01 Timeline Domain + CommandEngine Core — PASS / VERIFIED**.
- Proof: Windows CI `37624594282` / #192 PASS; `docs/step11/evidence/T11_W03_01_TIMELINE_COMMAND_ENGINE_EVIDENCE.md`.
- Completed: **T11-W03-02 Existing Mutation Migration + Session Checkpoint Semantics — PASS / VERIFIED**.
- Proof: Windows CI `37628187263` / #211 PASS; `docs/step11/evidence/T11_W03_02_SESSION_CHECKPOINT_MUTATION_MIGRATION_EVIDENCE.md`.
- Completed: **T11-W03-03 Reorder / Enable-Disable / Boundary Application Core — PASS / VERIFIED**.
- Proof: Windows CI `37631324251` / #225 PASS; `docs/step11/evidence/T11_W03_03_TRACK_APPLICATION_CORE_EVIDENCE.md`.
- Completed: **T11-W03-04 Frozen Album Timeline + Global Undo/Redo UI Wiring — PASS / VERIFIED**.
- Proof: Windows CI `37634883632` / #233 PASS; exact frozen SCR-002A PASS; `docs/step11/evidence/T11_W03_04_FROZEN_TIMELINE_HISTORY_UI_EVIDENCE.md`.
- Completed: **T11-W03-05 Unified Batch History & Edge-Case Hardening — PASS / VERIFIED**.
- Proof: Windows CI `37638091188` / #240 PASS; 128-track history/timeline stress PASS; `docs/step11/evidence/T11_W03_05_UNIFIED_HISTORY_HARDENING_EVIDENCE.md`.
- Completed: **T11-W03-06 Wave E2E, Drift Review & Evidence Closure — PASS / VERIFIED**.
- Proof: Windows CI `37642774190` / #244 PASS; AC-W11-03-01..20 ALL PASS; 12-track canonical full-flow PASS; 128-track live renderer/history PASS in 970 ms; `docs/step11/evidence/W11_03_WAVE_CLOSURE_EVIDENCE.md`.
- Architecture/UI/trust-boundary drift: **PASS — NO MATERIAL DRIFT**; `docs/step11/evidence/W11_03_ARCHITECTURE_DRIFT_REVIEW.md`.
- **W11-03 COMPLETE / PASS.**
- W11-04 Auto Susun + Track Binding ASTRA planning — **COMPLETE / PASS**.
- W11-04 baseline: `main@b89326e99e03ec7a7cd596f3b2c4c7a5338c4442`.
- W11-04 planning authority:
  - `docs/source-of-truth/planning/current/13_STEP_11_W11_04_AUTO_SUSUN_TRACK_BINDING_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
  - `docs/step11/WAVE_11_04_CHARTER.md`
  - `docs/step11/TASK_CARDS_W11_04.md`
  - `docs/step11/W11_04_ACCEPTANCE_MATRIX.md`
  - `docs/step11/W11_04_DOR.md`
- DoR: **PASS**; AC-W11-04-01..22 defined.
- Completed: **T11-W04-01 Binding Schema + Resolver Contracts — PASS / VERIFIED**.
- Proof: Windows CI `37649707029` / #252 PASS; `docs/step11/evidence/T11_W04_01_BINDING_SCHEMA_RESOLVER_EVIDENCE.md`.
- Completed: **T11-W04-02 Deterministic Auto Susun Planner + CommandBatch — PASS / VERIFIED**.
- Proof: Windows CI `37653317447` / #268 PASS; deterministic 128-track planner/apply/Undo/Redo stress PASS; `docs/step11/evidence/T11_W04_02_AUTO_SUSUN_PLANNER_EVIDENCE.md`.
- Completed: **T11-W04-03 Artwork Intake + Binding Commands — PASS / VERIFIED**.
- Proof: Windows CI `37657078199` / #278 PASS; `docs/step11/evidence/T11_W04_03_ARTWORK_INTAKE_BINDING_EVIDENCE.md`.
- Completed: **T11-W04-04 Metadata Override + Dynamic Binding Integration — PASS / VERIFIED**.
- Proof: Windows CI `37659863455` / #283 PASS; `docs/step11/evidence/T11_W04_04_METADATA_DYNAMIC_BINDING_EVIDENCE.md`.
- Completed: **T11-W04-05 Frozen Auto Susun + Inspector UI Wiring — PASS / VERIFIED**.
- Proof: Windows CI `37662992589` / #290 PASS; `docs/step11/evidence/T11_W04_05_FROZEN_AUTO_SUSUN_INSPECTOR_UI_EVIDENCE.md`.
- Completed: **T11-W04-06 Wave E2E, Stress, Drift Review & Evidence Closure — PASS / VERIFIED**.
- Proof: Windows CI `37672986946` / #304 PASS; AC-W11-04-01..22 ALL PASS; 12-track canonical W04 full-flow PASS; 128-track live renderer Auto Susun PASS in 79 ms; source fingerprints unchanged; `docs/step11/evidence/W11_04_WAVE_CLOSURE_EVIDENCE.md`.
- Architecture/UI/trust-boundary drift: **PASS — NO MATERIAL DRIFT**; `docs/step11/evidence/W11_04_ARCHITECTURE_DRIFT_REVIEW.md`.
- **W11-04 COMPLETE / PASS.**
- **W11-05 Manual Layer Editor + Templates ASTRA planning — COMPLETE / PASS.**
- Planning baseline: `main@8f145a6684177286f8bae3bb9c50515d6f5703b7`.
- Planning authority:
  - `docs/source-of-truth/planning/current/14_STEP_11_W11_05_MANUAL_LAYER_EDITOR_TEMPLATES_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
  - `docs/step11/WAVE_11_05_CHARTER.md`
  - `docs/step11/TASK_CARDS_W11_05.md`
  - `docs/step11/W11_05_ACCEPTANCE_MATRIX.md`
  - `docs/step11/W11_05_DOR.md`
- DoR: **PASS**; AC-W11-05-01..25 defined.
- Frozen UI references SCR-002C / SCR-003A / SCR-003B / DLG-008 are sufficient; **no new UI prompt/image stage is required**.
- Serial order: T11-W05-01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07.
- Completed: **T11-W05-01 — Visual Scene + Layer Schema & Pure Projection — PASS / VERIFIED**.
- Proof: Windows CI `37682820030` / #321 PASS; 244 Vitest assertions PASS; STEP 10 + W11-01..04 + frozen UI + Windows package/smoke/ZIP PASS; `docs/step11/evidence/T11_W05_01_VISUAL_SCENE_SCHEMA_PROJECTION_EVIDENCE.md`.
- Completed: **T11-W05-02 — Manual Layer Commands + Gesture/History Semantics — PASS / VERIFIED**.
- Proof: Windows CI `37687361672` / #336 PASS; 256 Vitest assertions PASS; 128-layer command/history stress PASS; STEP 10 + W11-01..04 + frozen UI + Windows package/smoke/ZIP PASS; `docs/step11/evidence/T11_W05_02_LAYER_COMMANDS_GESTURE_HISTORY_EVIDENCE.md`.
- Completed: **T11-W05-03 — Template Document + Local Store + Trial/Apply Core — PASS / VERIFIED**.
- Proof: Windows CI #352 (266 assertions, earlier gate PASS) plus final packaged-template smoke CI; 9 deterministic starters, 100-user-template stress, strict schema/store and guarded non-dirty Try/Revert/Apply; evidence `docs/step11/evidence/T11_W05_03_TEMPLATE_DOCUMENT_LOCAL_STORE_TRIAL_APPLY_EVIDENCE.md`.
- Completed: **T11-W05-04 — Static Scene Preview + Selection/Inspector Projection — PASS / VERIFIED**.
- Proof: Windows CI #365 / `37722584947` PASS at `c1219e3d9fa6cb12fc2a21a18a9eb945a5da5986` — **278 tests PASS** (153 unit, 55 contract, 32 component, 38 integration), STEP 10 + W11-01..04, frozen SCR-002A, Windows portable package/smoke/ZIP PASS; docs/step11/evidence/T11_W05_04_STATIC_PREVIEW_SELECTION_INSPECTOR_EVIDENCE.md.
- Next exact task: **T11-W05-05 — Frozen Layer + Inspector UI Wiring — SOL only**.
- W11-06 audio-reactive/playback, W11-07 animation/transitions, and STEP 12 Gemini/FFmpeg remain blocked.
- Existing frozen Auto Susun/Inspector/Media/Timeline surfaces are authoritative; no new UI prompt/image generation is required now.
- If a required W11-04 visual state cannot be represented by the frozen pack, implementation must STOP and return to ASTRA/UI governance.
- Exact Gemini and FFmpeg/FFprobe integration remain later integration work.

## Later
STEP 12 external/Gemini integration; STEP 13 QA/hardening; STEP 14 release candidate/package; STEP 15 final release/backup/maintenance.

No STEP is skipped because implementation looks easy.
