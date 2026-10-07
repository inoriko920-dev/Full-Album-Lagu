# STEP 11 FEATURE REGISTRY

Planning role: **ASTRA**  
Planning baseline analyzed: `main@da5b6786d0daa472c474a33ffd83a5834af24f82`  
Status: **NORMALIZED / W11-01..04 COMPLETE / PASS; W11-05 PLANNING COMPLETE / PASS**  
Implementation status: **W11-01..04 COMPLETE / PASS; W11-05 IN PROGRESS — T11-W05-01..02 PASS / VERIFIED; T11-W05-03 READY**

The complete planning authority is the companion DOCX:
`docs/source-of-truth/planning/current/10_STEP_11_FEATURE_REGISTRY_DEPENDENCY_GRAPH_WAVE_01_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`.

| ID | Capability | Requirement refs | Priority | Main dependencies | Status |
|---|---|---|---|---|---|
| FTR-001 | Project Lifecycle | F-001; FR-001..003 | MUST | STEP 10 persistence seam | VERIFIED W11-01 |
| FTR-002 | Autosave & Crash Recovery | F-001/F-017; FR-004 | MUST | FTR-001 | VERIFIED W11-01 |
| FTR-003 | Media Intake & Validation | F-002; FR-005..008 | MUST | FTR-001 | VERIFIED W11-02 |
| FTR-004 | Track Timeline & Track State | F-003; FR-009..011 | MUST | FTR-003 | VERIFIED W11-03 |
| FTR-005 | Auto Susun Album | F-004; FR-012 | MUST | FTR-003,FTR-004,FTR-013 | VERIFIED W11-04 |
| FTR-006 | Artwork/Metadata/Dynamic Track Binding | F-005; FR-013..015 | MUST | FTR-003,FTR-004 | VERIFIED W11-04 |
| FTR-007 | Manual Layer Editor | F-006; FR-016..019 | MUST | FTR-013 + UI Freeze | W11-05 T11-W05-01..02 PASS / T11-W05-03 READY |
| FTR-008 | Audio-Reactive Visual Engine | F-007; FR-020..022 | MUST | FTR-003,FTR-012; later tool boundary | PLANNED W11-06 |
| FTR-009 | Animation & Limited Keyframes | F-008; FR-023..024 | MUST | FTR-007,FTR-013 | PLANNED W11-07 |
| FTR-010 | Track-Boundary Transition System | F-009; FR-025..027 | MUST | FTR-004,FTR-006,FTR-009 | PLANNED W11-07 |
| FTR-011 | Template Workflow | F-010; FR-028..030 | MUST | FTR-007,FTR-013 | W11-05 PLANNING PASS / SERIAL BLOCKED BEHIND T11-W05-01..02 |
| FTR-012 | Preview Playback & Navigation | F-011; FR-031..033 | MUST | FTR-003,FTR-004 | PLANNED W11-06 |
| FTR-013 | Unified Command History / Undo-Redo | F-012; FR-034..035 | MUST | project state contracts | VERIFIED W11-03 |
| FTR-014 | Gemini Agent + AI Risk/Plan Policy | F-013/F-014; FR-036..041 | MUST | FTR-013,FTR-015 | DEFER STEP 12 |
| FTR-015 | Gemini Credential Vault & Failover | F-015/F-016; FR-042..047 | MUST | OS secure storage / provider | DEFER STEP 12 |
| FTR-016 | Missing Media Detection & Relink | F-017; FR-049..050 | MUST | FTR-003 | VERIFIED W11-02 |
| FTR-017 | MP4 Render & Preflight | F-018; FR-051..054 | MUST | most visual/media capabilities + STEP 12 tool integration | PLANNED W11-08 |
| FTR-018 | Error/Diagnostics/Offline Cross-Cutting | F-019/F-020; FR-048,055..056 | MUST | all waves | W11-01..04 PASS; W11-05 PLANNED CROSS-CUT |
| FTR-019 | Background Video | F-021; FR-057 | SHOULD | media/render capability | CONDITIONAL |
| FTR-020 | Extended Effects & Branding | F-022/F-024; FR-058..059 | SHOULD | visual engine | CONDITIONAL |
| FTR-021 | 1440p / 4K Render Presets | F-023 | SHOULD | render capability/hardware | CONDITIONAL |
| FTR-022 | Lyrics/Subtitles | F-025; FR-060 | COULD | media/timeline | FUTURE |
| FTR-023 | Persistent Undo History | F-026 | COULD | FTR-013 + persistence | FUTURE |

## Rules

- A feature is not DONE because code exists; acceptance + mandatory tests + evidence must pass.
- External provider/tool specifics are not pulled forward into STEP 11. Gemini and FFmpeg integration remain STEP 12 owned.
- Frozen UI may be wired for states but not silently redesigned.
- `FTR-018` is cross-cutting and must be verified in every wave that introduces a failure mode.


## W11-01 closure

- FTR-001: VERIFIED in W11-01.
- FTR-002: VERIFIED in W11-01.
- FTR-018 cross-cut for W11-01: PASS; remains active for later waves.
- All W11-01 acceptance AC-01..14: PASS.
- Evidence: `evidence/W11_01_WAVE_CLOSURE_EVIDENCE.md`.
- W11-02 Media Intake Foundation planning: PASS.
- T11-W02-01 media domain/contracts/project compatibility: PASS / VERIFIED.
- T11-W02-02 picker/drop discovery, bounded queue/progress/cancel: PASS / VERIFIED.
- T11-W02-03 audio probe/validation/metadata/deterministic initial order: PASS / VERIFIED.
- T11-W02-04 missing-media scan + deterministic relink core: PASS / VERIFIED.
- T11-W02-05 frozen media/missing/relink UI wiring: PASS / VERIFIED; exact SCR-002A baseline PASS.
- W11-02 planning authority: `WAVE_11_02_CHARTER.md`, `TASK_CARDS_W11_02.md`, `W11_02_ACCEPTANCE_MATRIX.md` and source-of-truth planning DOCX.
- T11-W02-06 wave closure: PASS / VERIFIED.
- W11-02 acceptance AC-01..18: PASS; architecture/UI drift: PASS — no material drift.
- Closure evidence: `evidence/W11_02_WAVE_CLOSURE_EVIDENCE.md` and `evidence/W11_02_ARCHITECTURE_DRIFT_REVIEW.md`.
- W11-03 ASTRA planning: COMPLETE / PASS; DoR PASS.
- W11-03 authority: `WAVE_11_03_CHARTER.md`, `TASK_CARDS_W11_03.md`, `W11_03_ACCEPTANCE_MATRIX.md`, `W11_03_DOR.md` and planning DOCX.
- T11-W03-01 Timeline Domain + CommandEngine Core: PASS / VERIFIED; evidence `evidence/T11_W03_01_TIMELINE_COMMAND_ENGINE_EVIDENCE.md`.
- T11-W03-02 Existing Mutation Migration + Session Checkpoint Semantics: PASS / VERIFIED; evidence `evidence/T11_W03_02_SESSION_CHECKPOINT_MUTATION_MIGRATION_EVIDENCE.md`.
- T11-W03-03 Reorder / Enable-Disable / Boundary Application Core: PASS / VERIFIED; evidence `evidence/T11_W03_03_TRACK_APPLICATION_CORE_EVIDENCE.md`.
- T11-W03-04 Frozen Album Timeline + Global Undo/Redo UI Wiring: PASS / VERIFIED; evidence `evidence/T11_W03_04_FROZEN_TIMELINE_HISTORY_UI_EVIDENCE.md`.
- T11-W03-05 Unified Batch History & Edge-Case Hardening: PASS / VERIFIED; evidence `evidence/T11_W03_05_UNIFIED_HISTORY_HARDENING_EVIDENCE.md`.
- T11-W03-06 Wave E2E, Drift Review & Evidence Closure: PASS / VERIFIED.
- W11-03 acceptance AC-W11-03-01..20: ALL PASS.
- FTR-004: VERIFIED W11-03.
- FTR-013: VERIFIED W11-03.
- FTR-018 cross-cut for W11-03: PASS.
- Closure evidence: `evidence/W11_03_WAVE_CLOSURE_EVIDENCE.md`.
- Drift review: `evidence/W11_03_ARCHITECTURE_DRIFT_REVIEW.md`.
- W11-04 is unlocked for ASTRA planning; W11-04 implementation has not started.


## W11-04 planning checkpoint

- Baseline: `main@b89326e99e03ec7a7cd596f3b2c4c7a5338c4442`.
- Features: FTR-005 + FTR-006 with FTR-013/FTR-018 cross-cut.
- ASTRA planning: COMPLETE / PASS.
- DoR: PASS.
- Planning authority: `docs/source-of-truth/planning/current/13_STEP_11_W11_04_AUTO_SUSUN_TRACK_BINDING_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`, `WAVE_11_04_CHARTER.md`, `TASK_CARDS_W11_04.md`, `W11_04_ACCEPTANCE_MATRIX.md`, `W11_04_DOR.md`.
- Acceptance: AC-W11-04-01..22 defined.
- T11-W04-01 Binding Schema + Resolver Contracts: PASS / VERIFIED; evidence `evidence/T11_W04_01_BINDING_SCHEMA_RESOLVER_EVIDENCE.md`.
- T11-W04-02 Deterministic Auto Susun Planner + CommandBatch: PASS / VERIFIED; evidence `evidence/T11_W04_02_AUTO_SUSUN_PLANNER_EVIDENCE.md`.
- T11-W04-03 Artwork Intake + Binding Commands: PASS / VERIFIED; evidence `evidence/T11_W04_03_ARTWORK_INTAKE_BINDING_EVIDENCE.md`.
- T11-W04-04 Metadata Override + Dynamic Binding Integration: PASS / VERIFIED; evidence `evidence/T11_W04_04_METADATA_DYNAMIC_BINDING_EVIDENCE.md`.
- T11-W04-05 Frozen Auto Susun + Inspector UI Wiring: PASS / VERIFIED; evidence `evidence/T11_W04_05_FROZEN_AUTO_SUSUN_INSPECTOR_UI_EVIDENCE.md`.
- T11-W04-06 Wave E2E, Stress, Drift Review & Evidence Closure: PASS / VERIFIED.
- FTR-005/FTR-006 are **VERIFIED W11-04**.
- FTR-018 cross-cut is PASS for W11-04 and remains active for later waves.
- Frozen UI pack is sufficient at planning time; no new UI prompt/image generation is authorized.

## T11-W04-02 verification

- T11-W04-02 Deterministic Auto Susun Planner + CommandBatch: PASS / VERIFIED.
- Verified implementation head: `e2bf67f6bd276748b3852a233873210aae9dfdf4`.
- Windows CI: `37653317447` / #268 PASS; job `112901989191`.
- Evidence: `evidence/T11_W04_02_AUTO_SUSUN_PLANNER_EVIDENCE.md`.
- FTR-005 core planner/application contract is now verified at task level: deterministic/offline ordering, idempotence, one auto-susun CommandBatch, stale/tampered-plan atomic rejection and 128-track stress.
- T11-W04-03 Artwork Intake + Binding Commands: PASS / VERIFIED.
- T11-W04-04 Metadata Override + Dynamic Binding Integration: PASS / VERIFIED.
- T11-W04-05 Frozen Auto Susun + Inspector UI Wiring: PASS / VERIFIED.
- T11-W04-06 Wave E2E, Stress, Drift Review & Evidence Closure: PASS / VERIFIED; FTR-005/FTR-006 are wave-VERIFIED and W11-04 is COMPLETE / PASS.


## W11-04 closure
- FTR-005 Auto Susun Album: **VERIFIED W11-04**.
- FTR-006 Artwork/Metadata/Dynamic Track Binding: **VERIFIED W11-04**.
- FTR-013 shared history dependency: regression PASS.
- FTR-018 W11-04 cross-cut: PASS.
- AC-W11-04-01..22: ALL PASS.
- Evidence: `evidence/W11_04_WAVE_CLOSURE_EVIDENCE.md`, `evidence/W11_04_ARCHITECTURE_DRIFT_REVIEW.md`.
- W11-05 FTR-007 + FTR-011 ASTRA planning is COMPLETE / PASS; implementation has not started.


## W11-05 planning checkpoint
- Baseline: `main@8f145a6684177286f8bae3bb9c50515d6f5703b7`.
- Features: FTR-007 + FTR-011 with FTR-013/FTR-018 cross-cut.
- ASTRA planning: COMPLETE / PASS.
- DoR: PASS.
- Acceptance: AC-W11-05-01..25.
- Planning authority: `docs/source-of-truth/planning/current/14_STEP_11_W11_05_MANUAL_LAYER_EDITOR_TEMPLATES_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`, `WAVE_11_05_CHARTER.md`, `TASK_CARDS_W11_05.md`, `W11_05_ACCEPTANCE_MATRIX.md`, `W11_05_DOR.md`.
- Frozen UI authority: SCR-002C + SCR-003A + SCR-003B + DLG-008/UI-IMG-012. No new prompt/image stage is required.
- Manual Layer Editor is primary; template workflow is visual-only/non-destructive and uses the same Project State + CommandEngine.
- W11-05 boundary: static visual scene/layer state and local templates only. W11-06 keeps playback/audio-reactive; W11-07 keeps keyframe/transition execution; STEP 12 keeps Gemini/FFmpeg.
- Serial task gate: T11-W05-01..02 PASS / VERIFIED; T11-W05-03 READY; T11-W05-04..07 BLOCKED.
- FTR-007/FTR-011 are **not VERIFIED** until implementation + W11-05 closure evidence passes.


## T11-W05-01 verification
- T11-W05-01 Visual Scene + Layer Schema & Pure Projection: PASS / VERIFIED.
- Verified implementation head: `137e8d31a08b804498b56a9b9cb094bcc4add8f0`.
- Windows CI: `37682820030` / #321 PASS; job `113003054180`.
- Evidence: `evidence/T11_W05_01_VISUAL_SCENE_SCHEMA_PROJECTION_EVIDENCE.md`.
- Additive schema-v1 visualScene, stable layer IDs/canonical order, normalized logical canvas, and pure W11-04-bound projection are verified.
- FTR-007 is **not wave-VERIFIED** yet; this task proves only its scene/schema/projection foundation.
- FTR-011 has not started.
- Dependency unlock: T11-W05-02 PASS / VERIFIED; T11-W05-03 READY; T11-W05-04..07 remain blocked.


## T11-W05-02 verification
- T11-W05-02 Manual Layer Commands + Gesture/History Semantics: PASS / VERIFIED.
- Verified implementation head: `308a4800bcbfcf4e85828795e6573893622dd722`.
- Windows CI: `37687361672` / #336 PASS; job `113018515599`.
- Evidence: `evidence/T11_W05_02_LAYER_COMMANDS_GESTURE_HISTORY_EVIDENCE.md`.
- FTR-007 command/history core now proves stable-ID CRUD/reorder/transform/common/text-style, lock/stale guards and coalesced transform gesture semantics.
- 128-layer command/history stress PASS.
- FTR-007 remains **not wave-VERIFIED** until remaining editor tasks + W11-05 closure pass.
- FTR-011 Template Workflow has not started.
- Dependency unlock: T11-W05-03 READY; T11-W05-04..07 remain blocked.
