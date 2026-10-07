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
11. `factory/SOFTWARE_FACTORY_V2_COMPLETE_GUIDE.txt`
12. `../../ui/manifests/UI_REFERENCE_MANIFEST.json`
13. `../../ui/manifests/UI_FREEZE_MANIFEST.json`
14. `../../architecture/ARCHITECTURE.md`
15. `../../architecture/CODE_CONSTITUTION.md`
16. `../../architecture/S08_T03_CI_PACKAGING_EVIDENCE.md`
17. `../../handoff/CURRENT_HANDOFF.md`

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
- `planning/current/10_STEP_11_FEATURE_REGISTRY_DEPENDENCY_GRAPH_WAVE_01_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
- Operational companions: `../../step11/FEATURE_REGISTRY.md`, `../../step11/DEPENDENCY_GRAPH.md`, `../../step11/WAVE_11_01_CHARTER.md`, `../../step11/TASK_CARDS_W11_01.md`.
- Baseline analyzed: `main@da5b6786d0daa472c474a33ffd83a5834af24f82`.
- Status: STEP 11 planning baseline PASS; W11-01 COMPLETE / PASS; later waves not started. Next planning target is W11-02 Media Intake Foundation, which requires a new ASTRA charter before SOL implementation.
