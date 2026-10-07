# SOURCE OF TRUTH INDEX

## Mandatory read order
1. `planning/current/00_MASTER_PRODUCT_DEFINITION_LAGU_FULL_ALBUM_REPO_COMPACT.docx`
2. `planning/current/01_STEP_00_PROJECT_INTAKE_LAGU_FULL_ALBUM_FINAL_REPO_COMPACT.docx`
3. `planning/current/02_STEP_01_PRODUCT_DEFINITION_BASELINE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT.docx`
4. `planning/current/03_STEP_02_EXISTING_SOLUTION_GITHUB_DISCOVERY_LAGU_FULL_ALBUM_v1_0_REPO_COMPACT.docx`
5. `planning/current/04_STEP_03_UI_UX_INVENTORY_LAGU_FULL_ALBUM_v1_1_REVISED_GEMINI_AGENT_REPO_COMPACT.docx`
6. `planning/current/05_STEP_04_UI_DESIGN_SYSTEM_PROMPT_PACK_LAGU_FULL_ALBUM_v1_1_REVISED_GEMINI_AGENT_REPO_COMPACT.docx`
7. `../ui/06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT_SMALL.docx`
8. `planning/current/07_STEP_05_UI_FREEZE_LAGU_FULL_ALBUM_v1_0_REPO_COMPACT.docx`
9. `planning/current/08_STEP_06_ARCHITECTURE_TECHNOLOGY_DECISION_LAGU_FULL_ALBUM_v1_0_REPO_COMPACT.docx`
10. `planning/current/09_STEP_07_CODE_CONSTITUTION_REPOSITORY_ARCHITECTURE_LAGU_FULL_ALBUM_v1_0_REPO_COMPACT.docx`
11. `planning/current/10_STEP_11_FEATURE_REGISTRY_DEPENDENCY_GRAPH_WAVE_01_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
12. `planning/current/11_STEP_11_W11_02_MEDIA_INTAKE_FOUNDATION_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
13. `planning/current/12_STEP_11_W11_03_ALBUM_TIMELINE_COMMAND_HISTORY_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
14. `planning/current/13_STEP_11_W11_04_AUTO_SUSUN_TRACK_BINDING_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
15. `factory/SOFTWARE_FACTORY_V2_COMPLETE_GUIDE.txt`
16. `../../ui/manifests/UI_REFERENCE_MANIFEST.json`
17. `../../ui/manifests/UI_FREEZE_MANIFEST.json`
18. `../../architecture/ARCHITECTURE.md`
19. `../../architecture/CODE_CONSTITUTION.md`
20. `../../architecture/S08_T03_CI_PACKAGING_EVIDENCE.md`
21. `../../handoff/CURRENT_HANDOFF.md`

## Current vs archive
`planning/current/` is authoritative. `planning/archive/` is history only.

The following are explicitly **SUPERSEDED** and must not drive implementation:
- STEP 03 v1.0 UI/UX Inventory.
- STEP 04 v1.0 UI Design/Prompt Pack.

Their compact DOCX copies remain under `planning/archive/` so later AI can reconstruct decision history without mistaking them for current UI.

## Repository compact copies
The repository stores compact DOCX copies so planning remains directly available to future AI sessions. The current UI reference DOCX contains all **29 approved visual states** with compressed embedded images. Compression may reduce image quality but does not change layout/state authority.

Original artifact SHA-256 values and the mapping between original files and repository copies are recorded in `SOURCE_OF_TRUTH_MANIFEST.md`.

## Machine-readable UI integrity
`docs/ui/manifests/UI_REFERENCE_MANIFEST.json` and `docs/ui/manifests/UI_FREEZE_MANIFEST.json` are the operational STEP 08 mapping layer for the frozen UI pack. `npm run verify:ui-reference` verifies the exact Git blob identities of the prompt pack, visual reference, source manifest and UI Freeze document, plus the 29-state declaration.

These manifests do not replace the DOCX planning/reference authority; they make its repository identity verifiable by CI.

## UI authority
Visual layout/hierarchy/state -> Final UI Reference + STEP 05 UI Freeze.
Canonical behavior/copy -> Product Definition + current STEP 03/04 textual specification + UI Freeze.
Generated image wording never overrides locked product behavior; final render remains video MP4.

## Conflict precedence
Latest explicit user decision -> current Product Definition/planning -> UI Freeze/Final UI Reference -> Architecture/Code Constitution -> operational summaries/handoff.

## STEP 11 current planning
- Registry/wave-order baseline: `planning/current/10_STEP_11_FEATURE_REGISTRY_DEPENDENCY_GRAPH_WAVE_01_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`.
- W11-02 authority: `planning/current/11_STEP_11_W11_02_MEDIA_INTAKE_FOUNDATION_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`.
- W11-03 authority: `planning/current/12_STEP_11_W11_03_ALBUM_TIMELINE_COMMAND_HISTORY_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`.
- Current W11-04 authority: `planning/current/13_STEP_11_W11_04_AUTO_SUSUN_TRACK_BINDING_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`.
- Operational companions: `../../step11/FEATURE_REGISTRY.md`, `../../step11/DEPENDENCY_GRAPH.md`, W11-02 closure documents, and current W11-03 `WAVE_11_03_CHARTER.md`, `TASK_CARDS_W11_03.md`, `W11_03_ACCEPTANCE_MATRIX.md`, `W11_03_DOR.md`.
- W11-02 planning baseline: `main@c791e9bebc30c7db9337f4341cfdd7e421a64b57`.
- W11-02 closure evidence: `../../step11/evidence/W11_02_WAVE_CLOSURE_EVIDENCE.md`.
- W11-02 drift review: `../../step11/evidence/W11_02_ARCHITECTURE_DRIFT_REVIEW.md`.
- W11-03 planning baseline: `main@6f296f7cc8e8b81e86bde71f8cd3a32c0d0f1bd2`.
- W11-03 implementation evidence: `../../step11/evidence/T11_W03_01_TIMELINE_COMMAND_ENGINE_EVIDENCE.md`, `../../step11/evidence/T11_W03_02_SESSION_CHECKPOINT_MUTATION_MIGRATION_EVIDENCE.md`, `../../step11/evidence/T11_W03_03_TRACK_APPLICATION_CORE_EVIDENCE.md`, `../../step11/evidence/T11_W03_04_FROZEN_TIMELINE_HISTORY_UI_EVIDENCE.md`, `../../step11/evidence/T11_W03_05_UNIFIED_HISTORY_HARDENING_EVIDENCE.md`, `../../step11/evidence/W11_03_WAVE_CLOSURE_EVIDENCE.md`, and `../../step11/evidence/W11_03_ARCHITECTURE_DRIFT_REVIEW.md`.
- W11-04 planning baseline: `main@b89326e99e03ec7a7cd596f3b2c4c7a5338c4442`.
- W11-04 operational companions: `../../step11/WAVE_11_04_CHARTER.md`, `../../step11/TASK_CARDS_W11_04.md`, `../../step11/W11_04_ACCEPTANCE_MATRIX.md`, `../../step11/W11_04_DOR.md`.
- W11-04 implementation evidence: `../../step11/evidence/T11_W04_01_BINDING_SCHEMA_RESOLVER_EVIDENCE.md` and `../../step11/evidence/T11_W04_02_AUTO_SUSUN_PLANNER_EVIDENCE.md`.
- Status: W11-01 COMPLETE / PASS; W11-02 COMPLETE / PASS; W11-03 COMPLETE / PASS; **W11-04 IN PROGRESS with T11-W04-01..02 PASS / VERIFIED**.
- Only T11-W04-03 has SOL implementation authority next; T11-W04-04..06 remain serially blocked.
- Existing frozen Auto Susun/Inspector/Media/Timeline references are sufficient at planning time; no new UI prompt/image generation is required.
