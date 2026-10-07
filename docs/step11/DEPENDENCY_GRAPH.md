# STEP 11 DEPENDENCY GRAPH & WAVE ORDER

Baseline: `main@da5b6786d0daa472c474a33ffd83a5834af24f82`

Dependency semantics:
- **HARD**: downstream capability cannot be meaningfully verified first.
- **SOFT**: can be developed independently but integration quality improves with predecessor.
- **DATA/SCHEMA**: project/session/persistence state contract dependency.
- **UI**: frozen UI state/interaction dependency.
- **RISK**: security/performance/runtime uncertainty suggests later sequencing.
- **PACKAGING/RUNTIME**: bundled runtime/tool dependency.

## Planned sequence

1. **W11-01 — Project Lifecycle & Recovery Core** — FTR-001 + FTR-002 + FTR-018 — **COMPLETE / PASS**
2. **W11-02 — Media Intake Foundation** — FTR-003 + FTR-016 + FTR-018 — **COMPLETE / PASS**
3. **W11-03 — Album Timeline + Command History** — FTR-004 + FTR-013 + FTR-018 — **COMPLETE / PASS**
4. **W11-04 — Auto Susun + Track Binding** — FTR-005 + FTR-006 — **COMPLETE / PASS**
5. **W11-05 — Manual Layer Editor + Templates** — FTR-007 + FTR-011 + FTR-013 — **IN PROGRESS; T11-W05-01..02 PASS / VERIFIED; T11-W05-03 READY**
6. **W11-06 — Preview + Audio-Reactive Visuals** — FTR-012 + FTR-008
7. **W11-07 — Animation + Boundary Transitions** — FTR-009 + FTR-010
8. **W11-08 — Render Readiness Contract** — FTR-017 + FTR-018
9. **STEP12-AI** — FTR-015 then FTR-014
10. Conditional/future: FTR-019..023 according to evidence and release need.

## Critical edges

- FTR-001 -> FTR-002: autosave/recovery needs stable project lifecycle/path ownership.
- FTR-003 -> FTR-004: timeline state needs validated media identities/durations.
- FTR-004 + FTR-013 -> FTR-005: Auto Susun must create deterministic album state through official command/history seams.
- FTR-003 + FTR-004 -> FTR-006: metadata/artwork binding needs stable tracks and active-track semantics.
- FTR-013 -> FTR-007/FTR-011/FTR-014: manual/template/AI mutations must converge on one history mechanism.
- FTR-012 + FTR-003 -> FTR-008: reactive preview needs playable/analyzable audio plus preview lifecycle.
- FTR-004 + FTR-006 + FTR-009 -> FTR-010: boundary transitions coordinate track state, bindings and animation.
- FTR-017 depends on verified project/media/visual/timeline state; external encoder/runtime is STEP 12.

## Why W11-01 first

STEP 10 already proved one thin persistence path. W11-01 extends that seam into the minimum reliable lifecycle needed by every later feature: known-path Save, Save As, Open, dirty state, autosave snapshots and crash recovery. It is high-unlock, offline, deterministic, and does not require Gemini/FFmpeg/provider decisions.


## W11-01 completion

W11-01 dependency unlock is proven and closed. FTR-001 and FTR-002 are verified and may now serve as prerequisites for later waves. FTR-018 remains active cross-cutting work.

W11-02 and W11-03 implementation are complete. W11-03 AC-W11-03-01..20 are ALL PASS and the architecture/UI/trust-boundary drift review is PASS with no material drift. W11-04 dependencies FTR-004/FTR-013 are now verified, but W11-04 implementation remains blocked until ASTRA creates and passes its detailed planning/DoR source-of-truth.


## W11-02 planning checkpoint

- Baseline: `main@c791e9bebc30c7db9337f4341cfdd7e421a64b57`.
- Features: FTR-003 + FTR-016 + FTR-018 cross-cut.
- Planning gate: PASS.
- DoR: PASS.
- Acceptance: AC-W11-02-01..18.
- Serial tasks: T11-W02-01 PASS -> T11-W02-02 PASS -> T11-W02-03 PASS -> T11-W02-04 PASS -> T11-W02-05 PASS -> T11-W02-06 PASS.
- Closure: AC-W11-02-01..18 PASS; drift review PASS; W11-02 COMPLETE / PASS.
- W11-03 planning baseline: `main@6f296f7cc8e8b81e86bde71f8cd3a32c0d0f1bd2`.
- W11-03 features: FTR-004 + FTR-013 + FTR-018.
- W11-03 planning/DoR: PASS.
- Serial order: T11-W03-01 PASS -> T11-W03-02 PASS -> T11-W03-03 PASS -> T11-W03-04 PASS -> T11-W03-05 PASS -> T11-W03-06 PASS.
- W11-03 = COMPLETE / PASS. W11-04 is dependency-unlocked for ASTRA planning; SOL implementation remains blocked pending its planning/DoR gate.

## T11-W03-01 verification

- Verified implementation head: `d0ab313bece2e9ef730ee41f417310501214d7b1`.
- Windows CI: `37624594282` / #192 PASS; job `112803016531`.
- Timeline schema/projection + unified CommandEngine foundation are proven.
- 105-track deterministic projection and all prior lifecycle/media/frozen UI/package regressions are green.
- Evidence: `evidence/T11_W03_01_TIMELINE_COMMAND_ENGINE_EVIDENCE.md`.
- Dependency unlock: T11-W03-02 READY. Later W11-03 tasks remain serially blocked.

## T11-W03-02 verification

- Verified implementation head: `c505b14488735705401a0ffb6e1bd666dd77a996`.
- Windows CI: `37628187263` / #211 PASS; job `112815298762`.
- ProjectSession/shared CommandEngine mutation ownership and logical saved checkpoint are proven.
- Save -> command -> Undo-to-saved clean; Redo-away dirty; Recovery Accept dirty; Open/New reset history.
- W11-02 media import/relink use shared history; passive missing scan remains system reconciliation without false history/dirty noise.
- All prior lifecycle/media/frozen UI/package regressions are green.
- Evidence: `evidence/T11_W03_02_SESSION_CHECKPOINT_MUTATION_MIGRATION_EVIDENCE.md`.
- Dependency unlock: T11-W03-03 READY. Later W11-03 tasks remain serially blocked.

## T11-W03-03 verification

- Verified implementation head: `83fd9a0772c72c38a995ccd2609a910692a0e61a`.
- Windows CI: `37631324251` / #225 PASS; job `112826044830`.
- Validated reorder and enabled-state commands use the shared CommandEngine.
- Canonical order remains tracks[]; cumulative boundaries remain derived.
- Required audio follows effective enabled usage, including shared-asset behavior.
- Missing disabled-only audio no longer blocks readiness; re-enable restores the blocker.
- First/middle/last reorder, 105-track deterministic behavior, Save/Close/Reopen, Unicode/spaces and source-byte immutability are green.
- Evidence: `evidence/T11_W03_03_TRACK_APPLICATION_CORE_EVIDENCE.md`.
- Dependency unlock: T11-W03-04 READY. T11-W03-05..06 remain serially blocked.

## T11-W03-04 verification

- Verified implementation head: `96233d99ecf420ac1c3b583c959a63610c709c27`.
- Windows CI: `37634883632` / #233 PASS; job `112838360903`.
- Frozen Media and Album Timeline surfaces now use the shared track command/history path.
- Selection and zoom are session-only and non-dirty.
- Global Undo/Redo actions and disabled/enabled states are proven.
- One multi-track import is one global UI Undo/Redo step.
- Exact empty SCR-002A remains unchanged; permanent Gemini rail remains frozen.
- All prior lifecycle/media/package regressions are green.
- Evidence: `evidence/T11_W03_04_FROZEN_TIMELINE_HISTORY_UI_EVIDENCE.md`.
- Dependency unlock: T11-W03-05 READY. T11-W03-06 remains blocked.

## T11-W03-05 verification

- Verified implementation head: `c1df8c4b101d69d3d5b28987efc88aaae0c44ce3`.
- Windows CI: `37638091188` / #240 PASS; job `112849492104`.
- All four official mutation origins share one runtime-validated command/history contract.
- Atomic batch rollback/one-revision/one-Undo and net-zero no-op behavior are proven.
- Divergent Redo invalidation and logical saved checkpoint behavior are hardened.
- Late Save completion preserves newer dirty work; late Recovery cannot overwrite newer user commands.
- 128-track / 60-batch / 60 Undo / 60 Redo timeline/history stress is deterministic.
- Exact frozen SCR-002A and all prior lifecycle/media/package regressions remain green.
- Evidence: `evidence/T11_W03_05_UNIFIED_HISTORY_HARDENING_EVIDENCE.md`.
- Dependency unlock: T11-W03-06 READY. W11-04 remains blocked until wave closure.

## T11-W03-06 / W11-03 closure

- Verified implementation head: `8464da5bbbff20ff23636a2b4894952949f6d070`.
- Windows CI: `37642774190` / #244 PASS; job `112865244896`.
- 12-track canonical Windows full-flow PASS: import/load -> reorder -> disable -> derived boundary -> Save -> Undo/Redo saved-checkpoint -> process restart/reopen.
- 128-track live renderer/history scenario PASS in 970 ms.
- AC-W11-03-01..20: ALL PASS.
- Architecture/UI/trust-boundary drift: PASS — no material drift.
- Closure evidence: `evidence/W11_03_WAVE_CLOSURE_EVIDENCE.md`.
- Drift review: `evidence/W11_03_ARCHITECTURE_DRIFT_REVIEW.md`.
- FTR-004 and FTR-013 are VERIFIED W11-03; FTR-018 cross-cut PASS.
- Dependency result: W11-04 may enter ASTRA planning. No W11-04 implementation is authorized until its own planning/DoR gate passes.


## W11-04 planning checkpoint

- Baseline: `main@b89326e99e03ec7a7cd596f3b2c4c7a5338c4442`.
- Dependencies FTR-003/FTR-004/FTR-013 are verified by W11-02/W11-03.
- Features: FTR-005 + FTR-006; FTR-013/FTR-018 cross-cut.
- Planning/DoR: PASS.
- Acceptance: AC-W11-04-01..22.
- Serial order: T11-W04-01 PASS -> T11-W04-02 PASS -> T11-W04-03 PASS -> T11-W04-04 PASS -> T11-W04-05 PASS -> T11-W04-06 PASS.
- Auto Susun must be deterministic/offline and publish through the existing CommandEngine/CommandBatch seam.
- Track binding/default artwork is additive schema-v1; resolved values remain derived.
- Existing frozen UI is reused; no new UI prompt/image generation is required now.
- W11-05 ASTRA planning/DoR is COMPLETE / PASS; T11-W05-01 is ready after planning merge and later W11-05 tasks remain serially blocked.

## T11-W04-01 verification

- Verified implementation head: `706116e2e85b963d0d6570907f70d57a614ef0e6`.
- Windows CI: `37649707029` / #252 PASS; job `112889560184`.
- Additive schema-v1 album/track binding contract and image-only artwork reference validation are proven.
- Pure resolved-track presentation priority + provenance are proven without I/O or state mutation.
- Legacy/additive persistence round-trip and no-derived-value-persistence behavior are green.
- STEP 10, W11-01, W11-02, W11-03, exact frozen UI and Windows package/smoke/ZIP remain green.
- Evidence: `evidence/T11_W04_01_BINDING_SCHEMA_RESOLVER_EVIDENCE.md`.
- Dependency unlock: T11-W04-02 READY. T11-W04-03..06 remain blocked.

## T11-W04-02 verification

- Verified implementation head: `e2bf67f6bd276748b3852a233873210aae9dfdf4`.
- Windows CI: `37653317447` / #268 PASS; job `112901989191`.
- Deterministic offline AutoArrangePlan + one auto-susun CommandBatch are proven.
- Repeated unchanged run is no-op; stale revision/token and tampered plans reject atomically.
- Disabled state, manual bindings, IDs/audio links/source refs remain stable.
- 128-track core stress is deterministic and all prior lifecycle/media/timeline/frozen UI/package regressions are green.
- Evidence: `evidence/T11_W04_02_AUTO_SUSUN_PLANNER_EVIDENCE.md`.
- T11-W04-03 verification: implementation head `f2e33b6ec6a08b3d92acbe4963a1cf73c7086825`; Windows CI `37657078199` / #278 PASS; evidence `evidence/T11_W04_03_ARTWORK_INTAKE_BINDING_EVIDENCE.md`.
- T11-W04-04 verification: implementation head `ea2b6230af036f9eed05232d5ef0cd96609abb7d`; Windows CI `37659863455` / #283 PASS; evidence `evidence/T11_W04_04_METADATA_DYNAMIC_BINDING_EVIDENCE.md`.
- T11-W04-05 verification: implementation head `986e13f186d4dbc6bbb621f77a222fe8d30fa9f4`; Windows CI `37662992589` / #290 PASS; evidence `evidence/T11_W04_05_FROZEN_AUTO_SUSUN_INSPECTOR_UI_EVIDENCE.md`.
- Dependency unlock: W11-05 T11-W05-01 PASS / VERIFIED; T11-W05-02 READY.


## W11-04 completion
- Serial tasks: T11-W04-01 PASS -> T11-W04-02 PASS -> T11-W04-03 PASS -> T11-W04-04 PASS -> T11-W04-05 PASS -> T11-W04-06 PASS.
- AC-W11-04-01..22: ALL PASS.
- FTR-005 + FTR-006: VERIFIED.
- Architecture/UI/trust-boundary drift: PASS — NO MATERIAL DRIFT.
- Verified implementation head: `fa45534bbad250f5fb0a91f8d636d29fe138a2ae`.
- Windows CI `37672986946` / #304 PASS.
- **W11-04 COMPLETE / PASS.**
- Dependency unlock: W11-05 T11-W05-01 PASS / VERIFIED; SOL T11-W05-02 is the only next task.


## W11-05 planning checkpoint
- Baseline: `main@8f145a6684177286f8bae3bb9c50515d6f5703b7`.
- Dependencies: W11-04 COMPLETE / PASS; FTR-013 verified; frozen UI pack already contains required Layer/Template states.
- Features: FTR-007 + FTR-011; FTR-013/FTR-018 cross-cut.
- Planning/DoR: COMPLETE / PASS.
- Acceptance: AC-W11-05-01..25.
- Serial order: T11-W05-01 PASS -> T11-W05-02 PASS -> T11-W05-03 READY -> T11-W05-04 BLOCKED -> T11-W05-05 BLOCKED -> T11-W05-06 BLOCKED -> T11-W05-07 BLOCKED.
- Scene/layer state is additive schema-v1, stable-ID, canonical-array-order and CommandEngine-owned.
- Templates are local visual configuration only; Try is session-only and Apply is one template-origin atomic history unit.
- Frozen SCR-002C/SCR-003A/SCR-003B/DLG-008 are sufficient; no new UI prompt/image generation.
- Playback/audio-reactive remains W11-06; animation/transitions W11-07; provider/FFmpeg STEP 12.
- W11-06 remains blocked until W11-05 reaches COMPLETE / PASS.


## T11-W05-01 completion
- Additive schema-v1 visualScene + pure projection: PASS / VERIFIED.
- Verified implementation head: `137e8d31a08b804498b56a9b9cb094bcc4add8f0`.
- Windows CI `37682820030` / #321 PASS.
- AC-W11-05-01..03 task-owned foundation: PASS at task level.
- FTR-007 scene/schema/projection foundation is available to downstream manual commands.
- Dependency unlock: T11-W05-02 PASS / VERIFIED; **T11-W05-03 READY**. T11-W05-04..07 remain blocked.


## T11-W05-02 completion
- Manual layer command/history core: PASS / VERIFIED.
- Verified implementation head: `308a4800bcbfcf4e85828795e6573893622dd722`.
- Windows CI `37687361672` / #336 PASS.
- Shared CommandEngine remains the only mutation/history authority.
- Stable-ID CRUD/reorder/transform/common/text-style + locked/stale guards verified.
- Session-only gesture preview -> one manual commit/history node verified.
- 128-layer / 64-edit full Undo/Redo stress PASS.
- Dependency unlock: **T11-W05-03 READY**. T11-W05-04..07 remain blocked.
