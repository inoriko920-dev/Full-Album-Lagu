# CURRENT HANDOFF

## Project
Lagu Full Album — `inoriko920-dev/Full-Album-Lagu`

## Current position
STEP 10 and W11-01..04 are COMPLETE. W11-05 ASTRA planning is PASS; T11-W05-01..03 are PASS / VERIFIED. Only T11-W05-04 Static Scene Preview + Selection/Inspector Projection is READY for the next SOL turn. STEP 11 is still IN PROGRESS.

## Mandatory read order
AGENTS -> PROJECT_STATE -> source-of-truth INDEX -> current planning DOCX -> Final UI Reference/UI Freeze -> STEP 06 Architecture -> STEP 07 Code Constitution -> STEP 10 SLC report -> STEP 11 Feature Registry/Dependency Graph/Wave Charter -> TASKS.

## STEP 11 planning authority
- Registry/wave-order baseline DOCX: `docs/source-of-truth/planning/current/10_STEP_11_FEATURE_REGISTRY_DEPENDENCY_GRAPH_WAVE_01_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
- W11-02 planning DOCX: `docs/source-of-truth/planning/current/11_STEP_11_W11_02_MEDIA_INTAKE_FOUNDATION_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`
- Operational registry: `docs/step11/FEATURE_REGISTRY.md`
- Dependency graph: `docs/step11/DEPENDENCY_GRAPH.md`
- W11-02 charter: `docs/step11/WAVE_11_02_CHARTER.md`
- W11-02 task cards: `docs/step11/TASK_CARDS_W11_02.md`
- W11-02 acceptance matrix: `docs/step11/W11_02_ACCEPTANCE_MATRIX.md`

## Last completed wave
**W11-03 Album Timeline + Command History**
- Features: FTR-004 Track Timeline & Track State + FTR-013 Unified Command History / Undo-Redo + FTR-018 cross-cut.
- Status: COMPLETE / PASS.
- Acceptance: AC-W11-03-01..20 ALL PASS.
- Drift review: PASS — no material architecture/UI/trust-boundary drift.
- Verified implementation head: `8464da5bbbff20ff23636a2b4894952949f6d070`.
- Windows CI: `37642774190` / run #244 PASS; job `112865244896`.
- Closure artifact: `11493061001`.
- Windows portable artifact: `11491964745`.
- Frozen visual artifact: `11494045003`.
- 12-track canonical full-flow PASS.
- 128-track live renderer/history flow PASS in 970 ms.
- Closure evidence: `docs/step11/evidence/W11_03_WAVE_CLOSURE_EVIDENCE.md`.
- Drift review: `docs/step11/evidence/W11_03_ARCHITECTURE_DRIFT_REVIEW.md`.

## Completed STEP 11 tasks
### T11-W01-01 Lifecycle Contracts & Session Path Ownership — PASS / VERIFIED
- branch SHA: `a1ab0388c655c399f7347d40ba0acec5fc178bc8`;
- Windows CI: `37532835161` PASS;
- main-owned `ProjectPathSession`;
- renderer-visible location contract contains only `unsaved | known-path`, never a raw path.

### T11-W01-02 Open / Save As / Known-Path Save — PASS / VERIFIED
- verified branch SHA: `119e039bc42da84dc8a9950d7744e3ea519552a3`;
- Windows CI: `37534906938` PASS;
- job: `112513587662`;
- lifecycle evidence artifact: `11446750441`;
- known-path Save bypasses Save As selector;
- Save As success/cancel behavior verified;
- Open success/cancel/missing-file behavior verified;
- Unicode + spaces paths verified on Windows;
- raw filesystem paths remain main-owned and omitted from public evidence;
- STEP 10 SLC, frozen UI baseline, package/smoke and portable ZIP remain green;
- evidence: `docs/step11/evidence/T11_W01_02_PROJECT_LIFECYCLE_EVIDENCE.md`.

### T11-W01-03 Dirty State & Autosave Recovery Store — PASS / VERIFIED
- verified branch SHA: `99071af5ddbc568db11db5b3eb4a5ab75aac2686`;
- Windows CI: `37570463026` PASS;
- job: `112627715745`;
- recovery evidence artifact: `11460358149`;
- dirty state is revision-based against last successful user Save;
- recovery snapshot/generation is separate from the primary project;
- dirty autosave, newer recovery detection, stale/corrupt/interrupted safety verified;
- accept/discard recovery core preserves the primary file;
- renderer remains filesystem-free and public recovery contracts expose no raw path;
- STEP 10 SLC, T11-W01-02 lifecycle, frozen UI baseline, package/smoke and portable ZIP remain green;
- evidence: `docs/step11/evidence/T11_W01_03_DIRTY_AUTOSAVE_RECOVERY_EVIDENCE.md`.

### T11-W01-04 Frozen UI States + Recovery UX Wiring — PASS / VERIFIED
- verified branch SHA: `fe548a032e982be70359dbc8dc6c2d02787ca6ce`;
- Windows CI: `37577568055` PASS;
- job: `112649903010`;
- frozen visual artifact: `11463371449`;
- conditional notice row appears only for lifecycle/recovery attention states;
- recovery available/stale/invalid states are visible and actionable;
- Pulihkan restores recovery into live dirty state without overwriting primary;
- Abaikan/Hapus Autosave removes recovery only;
- Save cancel/error states are visible and retryable;
- permanent Gemini rail and frozen hierarchy remain unchanged;
- exact default SCR-002A visual baseline remains green;
- evidence: `docs/step11/evidence/T11_W01_04_FROZEN_UI_RECOVERY_UX_EVIDENCE.md`.

### T11-W01-05 Wave E2E, Drift Review & Evidence Pack — PASS / VERIFIED
- verification baseline: `main@5b7cd0328dcdfdbb242a2e88999209446daacf12`;
- canonical Windows CI: `37578082369` PASS;
- job: `112651361529`;
- all AC-W11-01-01..14 PASS;
- architecture drift review PASS with no material drift;
- W11-01 evidence pack consolidated and findable;
- W11-01 status: COMPLETE / PASS;
- closure evidence: `docs/step11/evidence/W11_01_WAVE_CLOSURE_EVIDENCE.md`;
- drift review: `docs/step11/evidence/W11_01_ARCHITECTURE_DRIFT_REVIEW.md`.

## W11-02 closure task
### T11-W02-06 Wave E2E, Drift Review & Evidence Closure — PASS / VERIFIED
- 24-file import/dedupe/save/reopen/missing/relink full flow PASS;
- 105-file progressive intake/responsiveness/order/source-immutability PASS;
- Unicode/spaces and sanitized public evidence PASS;
- architecture gate + exact frozen UI + Windows package/smoke/ZIP PASS;
- W11-02 final status COMPLETE / PASS.

## W11-03 planning checkpoint
- Features: FTR-004 + FTR-013 + FTR-018 cross-cut.
- Planning baseline: `main@6f296f7cc8e8b81e86bde71f8cd3a32c0d0f1bd2`.
- Source-of-truth DOCX: `docs/source-of-truth/planning/current/12_STEP_11_W11_03_ALBUM_TIMELINE_COMMAND_HISTORY_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`.
- Operational charter: `docs/step11/WAVE_11_03_CHARTER.md`.
- Task cards: `docs/step11/TASK_CARDS_W11_03.md`.
- Acceptance: `docs/step11/W11_03_ACCEPTANCE_MATRIX.md` (AC-01..20).
- DoR: `docs/step11/W11_03_DOR.md` — PASS.
- Canonical order = tracks array; enabled is additive/optional; boundaries are derived.
- One CommandEngine/history must serve manual/template/Auto Susun/AI mutation origins.
- Batch mutations are atomic and one batch is one Undo.
- Dirty/save/recovery must use logical history checkpoint while revision stays monotonic.
- No new UI prompt/image generation; existing frozen album/timeline references are authority.
- No Gemini/FFmpeg/Auto Susun/template/layer/preview/transition/render implementation is authorized by this planning checkpoint.

## T11-W03-01 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `d0ab313bece2e9ef730ee41f417310501214d7b1`.
- Windows CI: `37624594282` / #192 PASS; job `112803016531`.
- Portable artifact: `11484295009`.
- Evidence: `docs/step11/evidence/T11_W03_01_TIMELINE_COMMAND_ENGINE_EVIDENCE.md`.
- Added optional schema-v1 track enabled state with legacy omission=enabled.
- Added pure derived Album Timeline projection; cumulative boundaries are not persisted.
- Added unified framework-independent CommandEngine/CommandBatch for manual/template/Auto Susun/AI origins.
- Successful semantic command = one history node + one revision; no-op adds neither.
- Undo/Redo preserve monotonic revision and move through logical semantic state tokens.
- Batch is atomic and one batch is one Undo.
- 105-track deterministic projection and full previous-wave regressions are green.
- No renderer/UI/session migration was performed.

## T11-W03-02 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `c505b14488735705401a0ffb6e1bd666dd77a996`.
- Windows CI: `37628187263` / #211 PASS; job `112815298762`.
- Portable artifact: `11484699332`.
- Evidence: `docs/step11/evidence/T11_W03_02_SESSION_CHECKPOINT_MUTATION_MIGRATION_EVIDENCE.md`.
- ProjectSession now publishes user mutations through ProjectSessionHistory -> ProjectCommandEngine.
- Logical saved-state token is the dirty/clean authority; numeric revision remains monotonic.
- Undo-to-saved is clean; Redo-away is dirty.
- Recovery Accept remains dirty until primary Save; Open/New-style reset clears history.
- Media import and relink use shared history; passive missing scan remains non-history reconciliation.
- Existing W11-01/W11-02 behavior, frozen UI, package, smoke and portable ZIP are green.

## T11-W03-03 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `83fd9a0772c72c38a995ccd2609a910692a0e61a`.
- Windows CI: `37631324251` / #225 PASS; job `112826044830`.
- Portable artifact: `11487030899`.
- Evidence: `docs/step11/evidence/T11_W03_03_TRACK_APPLICATION_CORE_EVIDENCE.md`.
- Reorder and enabled-state mutations use shared CommandEngine history.
- Canonical order remains tracks[]; boundaries stay derived.
- Required audio follows effective enabled usage, including shared assets.
- Missing disabled-only audio does not block readiness; re-enable restores blocker.
- 105-track command behavior, Unicode/spaces Save/Close/Reopen and source-byte immutability are green.

## T11-W03-04 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `96233d99ecf420ac1c3b583c959a63610c709c27`.
- Windows CI: `37634883632` / #233 PASS; job `112838360903`.
- Portable artifact: `11489515325`.
- Frozen visual artifact: `11489775014`.
- Evidence: `docs/step11/evidence/T11_W03_04_FROZEN_TIMELINE_HISTORY_UI_EVIDENCE.md`.
- Frozen Media + Album Timeline surfaces use the established track-command/history path.
- Selection and zoom are session-only and do not dirty the project.
- Reorder and enabled state stay synchronized across Media/Timeline.
- Global Undo/Redo follows the single CommandEngine history.
- One two-track media import is one UI Undo/Redo step.
- Disabled-only missing audio stops blocking Render immediately; Undo restores blocker.
- Exact empty SCR-002A and permanent Gemini rail remain unchanged.

## T11-W03-05 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `c1df8c4b101d69d3d5b28987efc88aaae0c44ce3`.
- Windows CI: `37638091188` / #240 PASS; job `112849492104`.
- Portable artifact: `11490767699`.
- Frozen visual artifact: `11489524645`.
- Evidence: `docs/step11/evidence/T11_W03_05_UNIFIED_HISTORY_HARDENING_EVIDENCE.md`.
- Runtime origin whitelist enforces manual/template/auto-susun/ai.
- Atomic batches are one revision/one history node/one Undo and fully roll back on stale/failed children.
- Save can finish after newer edits without falsely clearing dirty or being misreported as failure.
- Late Recovery is ignored if a newer user command exists, so newer work is not overwritten.
- Saved-token/Redo/divergent-branch semantics are hardened.
- 128-track / 60-batch / 60 Undo / 60 Redo deterministic stress passes.
- Exact frozen UI and permanent Gemini rail remain unchanged.

## T11-W03-06 completed
- Status: PASS / VERIFIED.
- Windows CI #244 passed full verify, runtime audit, STEP 10, W11-01, W11-02, W11-03 closure E2E, exact frozen UI, Windows package, smoke and portable ZIP.
- Canonical W11-03 closure flow imported 12 real WAV tracks, reordered, disabled, verified derived boundaries, saved, exercised Undo/Redo saved-checkpoint truth, restarted/reopened and preserved canonical saved state.
- 128-track live renderer/history scenario completed in 970 ms.
- Track/media identity remained stable and source file hash/size/mtime remained unchanged.
- Public evidence has no raw-path keys or provider secrets.
- AC-W11-03-01..20 ALL PASS.
- W11-03 = COMPLETE / PASS.

## W11-04 planning checkpoint
- Role: ASTRA — COMPLETE / PASS.
- Baseline: `main@b89326e99e03ec7a7cd596f3b2c4c7a5338c4442`.
- Features: FTR-005 Auto Susun Album + FTR-006 Artwork/Metadata/Dynamic Track Binding; FTR-013/FTR-018 cross-cut.
- Planning DOCX: `docs/source-of-truth/planning/current/13_STEP_11_W11_04_AUTO_SUSUN_TRACK_BINDING_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`.
- Operational charter: `docs/step11/WAVE_11_04_CHARTER.md`.
- Task cards: `docs/step11/TASK_CARDS_W11_04.md`.
- Acceptance: `docs/step11/W11_04_ACCEPTANCE_MATRIX.md` — AC-W11-04-01..22.
- DoR: `docs/step11/W11_04_DOR.md` — PASS.
- Auto Susun is deterministic/offline and must publish through one `auto-susun` CommandBatch.
- Metadata/artwork binding is additive schema-v1 and resolved dynamically with provenance.
- Artwork is optional visual media (`required=false`) and must not block required-audio readiness.
- Existing frozen Auto Susun/Inspector/Media/Timeline UI is sufficient at planning time; no new UI prompt/image stage is required.
- T11-W04-01 Binding Schema + Resolver Contracts: PASS / VERIFIED.
- T11-W04-02 Deterministic Auto Susun Planner + CommandBatch: PASS / VERIFIED.
- T11-W04-03 Artwork Intake + Binding Commands: PASS / VERIFIED.
- T11-W04-04 Metadata Override + Dynamic Binding Integration: PASS / VERIFIED.
- T11-W04-05 Frozen Auto Susun + Inspector UI Wiring: PASS / VERIFIED.
- T11-W04-06 Wave E2E, Stress, Drift Review & Evidence Closure: PASS / VERIFIED.

## T11-W04-01 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `706116e2e85b963d0d6570907f70d57a614ef0e6`.
- Windows CI: `37649707029` / #252 PASS; job `112889560184`.
- Portable artifact: `11496316747`.
- Frozen visual artifact: `11495428548`.
- Evidence: `docs/step11/evidence/T11_W04_01_BINDING_SCHEMA_RESOLVER_EVIDENCE.md`.
- Optional schema-v1 album default artwork + per-track binding fields are canonical.
- Artwork references must resolve to existing image assets; missing image availability does not break identity.
- `resolveTrackPresentation()` is pure/offline and returns deterministic value + provenance.
- Derived display values are not persisted.
- Legacy/additive JsonProjectStore round-trip and all prior regressions are green.

## T11-W04-02 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `e2bf67f6bd276748b3852a233873210aae9dfdf4`.
- Windows CI: `37653317447` / #268 PASS; job `112901989191`.
- Portable artifact: `11497287480`.
- Frozen visual artifact: `11496953525`.
- Evidence: `docs/step11/evidence/T11_W04_02_AUTO_SUSUN_PLANNER_EVIDENCE.md`.
- AutoArrangePlan is pure/offline and resolves order from canonical in-memory project state.
- Stable order uses metadata track number, filename number, normalized name and stable tie breaks.
- One apply is one `auto-susun` CommandBatch/history step; repeat on unchanged state is no-op.
- Stale revision/token and tampered plan reject atomically.
- Disabled state, manual binding overrides, IDs/audio links/source refs are preserved.
- 128-track deterministic core stress and all previous regressions pass.

## T11-W04-03 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `f2e33b6ec6a08b3d92acbe4963a1cf73c7086825`.
- Windows CI: `37657078199` / #278 PASS; job `112914788723`.
- Portable artifact: `11500071293`.
- Frozen visual artifact: `11498643123`.
- Evidence: `docs/step11/evidence/T11_W04_03_ARTWORK_INTAKE_BINDING_EVIDENCE.md`.
- PNG/JPEG/WebP main-owned intake, signature validation, optional image lifecycle, album/per-track binding, one-step import+bind history, nonblocking missing artwork, relink identity and source-image immutability are proven.

## T11-W04-04 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `ea2b6230af036f9eed05232d5ef0cd96609abb7d`.
- Windows CI: `37659863455` / #283 PASS; job `112924307870`.
- Portable artifact: `11500660174`.
- Frozen visual artifact: `11499639091`.
- Evidence: `docs/step11/evidence/T11_W04_04_METADATA_DYNAMIC_BINDING_EVIDENCE.md`.
- Manual metadata set/clear, selected-track resolved projection/provenance, draft non-dirty behavior, relink fallback refresh, save/reopen persistence and saved-checkpoint Undo/Redo are proven.

## T11-W04-05 completed
- Status: PASS / VERIFIED.
- Verified implementation head: `986e13f186d4dbc6bbb621f77a222fe8d30fa9f4`.
- Windows CI: `37662992589` / #290 PASS; job `112934968106`.
- Portable artifact: `11501198106`.
- Frozen visual artifact: `11501427907`.
- Evidence: `docs/step11/evidence/T11_W04_05_FROZEN_AUTO_SUSUN_INSPECTOR_UI_EVIDENCE.md`.
- Frozen Auto Susun and selected-track Inspector metadata/artwork controls are wired to official history; draft edits remain session-only until Apply; Media/Timeline/Inspector selection stays canonical; exact SCR-002A is unchanged.

## Protected boundaries
Renderer cannot receive direct filesystem/dialog/provider/subprocess access. Media intake/relink filesystem ownership belongs to Electron main behind typed preload/IPC. Source media must remain non-destructive. Recovery artifacts remain separate from primary Save. Frozen UI cannot be silently redesigned. Gemini and exact FFmpeg/FFprobe concrete integrations remain STEP 12 owned.


## W11-04 final closure
- Status: **COMPLETE / PASS**.
- Verified implementation head: `fa45534bbad250f5fb0a91f8d636d29fe138a2ae`.
- Windows CI: `37672986946` / #304 PASS; job `112969205553`.
- Closure artifact: `11505875947`.
- Portable artifact: `11505274919`.
- Frozen visual artifact: `11506080483`.
- AC-W11-04-01..22: ALL PASS.
- 128-track live Auto Susun: PASS, 79 ms renderer probe / 650 ms process.
- Source fingerprints: unchanged.
- Architecture/UI/trust-boundary drift: PASS — NO MATERIAL DRIFT.
- Evidence: `docs/step11/evidence/W11_04_WAVE_CLOSURE_EVIDENCE.md`, `docs/step11/evidence/W11_04_ARCHITECTURE_DRIFT_REVIEW.md`.


## W11-05 planning completed
- Role: ASTRA.
- Baseline: `main@8f145a6684177286f8bae3bb9c50515d6f5703b7`.
- Status: **PLANNING COMPLETE / PASS**; current implementation checkpoint is T11-W05-01..02 PASS / VERIFIED; T11-W05-03 READY.
- Features: FTR-007 Manual Layer Editor + FTR-011 Template Workflow; FTR-013/FTR-018 cross-cut.
- Planning DOCX: `docs/source-of-truth/planning/current/14_STEP_11_W11_05_MANUAL_LAYER_EDITOR_TEMPLATES_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`.
- Companion authority: `WAVE_11_05_CHARTER.md`, `TASK_CARDS_W11_05.md`, `W11_05_ACCEPTANCE_MATRIX.md`, `W11_05_DOR.md`.
- DoR: PASS; AC-W11-05-01..25 defined.
- Serial tasks: T11-W05-01..02 PASS / VERIFIED; T11-W05-03 READY; T11-W05-04..07 BLOCKED.
- UI authority already frozen: SCR-002C (Layer), SCR-003A/003B (Template/Try), DLG-008/UI-IMG-012 (Save Template). No new UI prompt/image generation is needed.
- Scope boundary: static scene/layer editing + visual-only local templates. Playback/audio-reactive remains W11-06; animation/transitions remains W11-07; Gemini/FFmpeg remains STEP 12.
- Governance repair: `10_STEP_11_FEATURE_REGISTRY_DEPENDENCY_GRAPH_WAVE_01_CHARTER_LAGU_FULL_ALBUM_v1_0.docx` was absent from checkout and is restored as a **reconstructed repository copy** with an integrity notice. Never describe it as the missing historical original.



## T11-W05-01 completed
- Status: **PASS / VERIFIED**.
- Verified implementation head: `137e8d31a08b804498b56a9b9cb094bcc4add8f0`.
- Windows CI: `37682820030` / #321 PASS; job `113003054180`.
- Portable artifact: `11509257626`.
- Frozen visual artifact: `11510031703`.
- Evidence: `docs/step11/evidence/T11_W05_01_VISUAL_SCENE_SCHEMA_PROJECTION_EVIDENCE.md`.
- Additive schema-v1 visualScene, normalized logical canvas, stable layer IDs/canonical order, schema validation and pure W11-04-bound title/artist/artwork projection are proven.
- Spectrum/Progress remain structural placeholders; no W11-06 runtime was pulled forward.
- 244 Vitest assertions plus STEP 10/W11-01..04/frozen UI/package/smoke/ZIP are green.
- FTR-007/FTR-011 are not wave-VERIFIED yet.



## T11-W05-02 completed
- Status: **PASS / VERIFIED**.
- Verified implementation head: `308a4800bcbfcf4e85828795e6573893622dd722`.
- Windows CI: `37687361672` / #336 PASS; job `113018515599`.
- Portable artifact: `11511078393`.
- Frozen visual artifact: `11511467773`.
- Evidence: `docs/step11/evidence/T11_W05_02_LAYER_COMMANDS_GESTURE_HISTORY_EVIDENCE.md`.
- Official manual layer commands now cover add/remove/duplicate/reorder/transform/common/text-style through the shared CommandEngine.
- Locked-layer mutation, stale revision/token, duplicate ID and invalid targets reject atomically.
- Transform gesture preview is session-only; gesture end produces one guarded manual command/history node.
- 128-layer / 64-edit full Undo/Redo stress is deterministic.
- 256 Vitest assertions plus STEP 10/W11-01..04/frozen UI/package/smoke/ZIP are green.
- FTR-007 is not wave-VERIFIED yet; FTR-011 has not started.

## Next exact action
After the user says `lanjutkan`, remain **SOL** and execute **T11-W05-04 — Static Scene Preview + Selection/Inspector Projection only**. Read W11-05 planning authority plus W05-01/W05-02/W05-03 evidence first. Do not start T11-W05-05, frozen UI wiring, W11-06, W11-07 or STEP 12 in that turn.

## T11-W05-03 handoff (2026-10-08 WIB)
- Task PASS / VERIFIED after branch Windows CI and packaged resource smoke.
- Draft development PR #47: `sol/t11-w05-03-template-core-20261008`.
- Source: versioned strict visual-only `template-document.ts`; `template-workflow-service.ts` with non-dirty Try/Revert and one guarded CommandEngine `template` Apply; `JsonTemplateStore` in main infrastructure; nine starter JSON resources; packaging resource check.
- Verification evidence: `docs/step11/evidence/T11_W05_03_TEMPLATE_DOCUMENT_LOCAL_STORE_TRIAL_APPLY_EVIDENCE.md`.
- Nine built-ins (including Minimal Biru), 100 user-template catalog trial stress, second-project binding, corrupt/incompatible and collision safety, and prior waves regressions. No UI rendering/template IPC yet: reserved for future authorized tasks, not a bug.
- Next exact task: **T11-W05-04 only**. W11-05 remains IN PROGRESS; W05-05..07 BLOCKED.
