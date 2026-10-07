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
3. **W11-03 — Album Timeline + Command History** — FTR-004 + FTR-013 + FTR-018 — **IN PROGRESS; T11-W03-01..02 PASS / VERIFIED; T11-W03-03 READY**
4. **W11-04 — Auto Susun + Track Binding** — FTR-005 + FTR-006
5. **W11-05 — Manual Layer Editor + Templates** — FTR-007 + FTR-011 + FTR-013
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

W11-02 ASTRA planning and implementation are complete. T11-W02-01..06 are COMPLETE / PASS, all AC-W11-02-01..18 PASS, and the architecture/UI drift review is PASS with no material drift. W11-03 ASTRA planning is COMPLETE / PASS with DoR PASS. T11-W03-01..02 are PASS / VERIFIED; T11-W03-03 is the only READY implementation task.


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
- Serial order: T11-W03-01 PASS -> T11-W03-02 PASS -> T11-W03-03 READY -> T11-W03-04 BLOCKED -> 05 -> 06.
- W11-04 remains blocked until W11-03 closes COMPLETE / PASS.

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
