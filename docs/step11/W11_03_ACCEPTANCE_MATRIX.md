# W11-03 ACCEPTANCE MATRIX — ALBUM TIMELINE + COMMAND HISTORY

| ID | Acceptance target | Planned task(s) | Mandatory proof |
|---|---|---|---|
| AC-W11-03-01 | Schema-v1 persists optional track enabled state; absence defaults enabled for legacy projects | 01,03,06 | schema + legacy round-trip |
| AC-W11-03-02 | Pure timeline projection derives deterministic cumulative start/end and total duration from ordered enabled tracks | 01,03,06 | unit/integration/Windows projection |
| AC-W11-03-03 | Manual reorder changes canonical project track order, appears in timeline, survives Save/Close/Reopen | 03,04,06 | component + Windows E2E |
| AC-W11-03-04 | Reorder recalculates all affected cumulative boundaries deterministically | 01,03,06 | boundary fixtures |
| AC-W11-03-05 | Disable excludes track from effective sequence/duration without deleting/changing source media | 03,04,06 | project + source hash/mtime proof |
| AC-W11-03-06 | Re-enable restores participation/boundaries and required-media readiness safely | 03,06 | readiness + missing-media fixtures |
| AC-W11-03-07 | Track IDs and media links remain stable through reorder/enable-disable | 01,03,06 | identity assertions |
| AC-W11-03-08 | Active selection and timeline viewport state are session-only and do not dirty project | 04,06 | component/session proof |
| AC-W11-03-09 | All W11-03 user mutations use one CommandEngine; renderer has no parallel Project State mutation owner | 01,02,06 | architecture check/drift review |
| AC-W11-03-10 | One successful command creates one history step + one revision increment; no-op creates neither | 01,02,03 | command tests |
| AC-W11-03-11 | Undo restores exact previous semantic state; Redo restores undone state deterministically | 01,02,04,06 | unit/component/E2E |
| AC-W11-03-12 | New command after Undo truncates redo branch without corrupting saved state | 01,02,05,06 | branch tests |
| AC-W11-03-13 | CommandBatch is atomic, increments revision once, and is undone/redone as one step | 01,05,06 | batch tests/E2E |
| AC-W11-03-14 | manual/template/auto-susun/ai origins share one transaction/history contract; no AI-only path | 01,05,06 | contract/architecture proof |
| AC-W11-03-15 | Save checkpoint is correct: Undo back to saved history state is clean; Redo away is dirty; autosave follows that truth | 02,05,06 | dirty/checkpoint/autosave tests |
| AC-W11-03-16 | Open/New reset history; Recovery Accept remains dirty until primary Save; passive missing scan creates no history/dirty noise | 02,05,06 | lifecycle/recovery integration |
| AC-W11-03-17 | Frozen hierarchy and album/timeline references remain compliant; global Undo/Redo is actionable per source-of-truth | 04,06 | visual/component regression |
| AC-W11-03-18 | 100+ track timeline/reorder/history stays responsive and deterministic on Windows | 01,03,05,06 | stress summary |
| AC-W11-03-19 | Core timeline/history works offline and diagnostics contain no secret/provider/unnecessary raw-path leakage | 01..06 | secret/path/architecture gates |
| AC-W11-03-20 | W11-01 lifecycle/recovery, W11-02 media/relink, frozen UI, Windows package/smoke/portable ZIP regressions stay green | 02,04,06 | canonical Windows CI |

## T11-W03-02 checkpoint evidence

- T11-W03-02 status: **PASS / VERIFIED**.
- Verified implementation head: `c505b14488735705401a0ffb6e1bd666dd77a996`.
- Windows CI: `37628187263` / #211 PASS.
- Evidence: `evidence/T11_W03_02_SESSION_CHECKPOINT_MUTATION_MIGRATION_EVIDENCE.md`.
- Verified contribution: AC-09 shared mutation owner for current W11-02 user mutations; AC-10/11/12 command/history behavior; AC-15 logical Save checkpoint; AC-16 Open/New/Recovery/passive-scan semantics; AC-19 offline/trust-boundary gates; AC-20 W11-01/W11-02/frozen UI/package regressions.
- These are **task-level verified contributions**, not premature final wave closure; the matrix remains open until T11-W03-06.

## T11-W03-03 checkpoint evidence

- T11-W03-03 status: **PASS / VERIFIED**.
- Verified implementation head: `83fd9a0772c72c38a995ccd2609a910692a0e61a`.
- Windows CI: `37631324251` / #225 PASS.
- Evidence: `evidence/T11_W03_03_TRACK_APPLICATION_CORE_EVIDENCE.md`.
- Verified contribution: AC-03 canonical reorder + persistence core; AC-04 deterministic boundary recalculation; AC-05 disable excludes effective sequence without source mutation; AC-06 re-enable restores required-media blocker; AC-07 stable track/media identity; AC-10 one semantic command/one revision and no-op behavior; AC-11 Undo/Redo semantic restoration through shared engine; AC-12 redo branch foundation remains intact; AC-15 saved checkpoint compatibility; AC-18 105-track deterministic command proof; AC-20 prior-wave/frozen UI/package regression.
- These are **task-level verified contributions**, not premature final wave closure; T11-W03-04 UI integration and later hardening/closure remain required.

## T11-W03-04 checkpoint evidence

- T11-W03-04 status: **PASS / VERIFIED**.
- Verified implementation head: `96233d99ecf420ac1c3b583c959a63610c709c27`.
- Windows CI: `37634883632` / #233 PASS.
- Frozen visual artifact: `11489775014`.
- Evidence: `evidence/T11_W03_04_FROZEN_TIMELINE_HISTORY_UI_EVIDENCE.md`.
- Verified contribution: AC-03 reorder appears synchronously in Media + Timeline; AC-05 disabled presentation/readiness; AC-08 selection + zoom are session-only/non-dirty; AC-11 global Undo/Redo restores UI semantic state; AC-17 frozen hierarchy/global history actions + exact SCR-002A; AC-18 conditional timeline remains deterministic with existing 100+ core evidence; AC-20 all prior waves/frozen UI/package regressions green.
- One multi-track media import is also proven as one global UI Undo/Redo step.
- These are **task-level verified contributions**, not premature final wave closure; T11-W03-05 hardening and T11-W03-06 closure remain required.

## T11-W03-05 checkpoint evidence

- T11-W03-05 status: **PASS / VERIFIED**.
- Verified implementation head: `c1df8c4b101d69d3d5b28987efc88aaae0c44ce3`.
- Windows CI: `37638091188` / #240 PASS.
- Evidence: `evidence/T11_W03_05_UNIFIED_HISTORY_HARDENING_EVIDENCE.md`.
- Verified contribution: AC-10 command/batch revision-history invariants; AC-11 deterministic Undo/Redo; AC-12 divergent Redo invalidation + stale expectation rejection; AC-13 atomic batch/one Undo; AC-14 manual/template/auto-susun/ai origin parity; AC-15 late Save logical checkpoint and dirty correctness; AC-16 late Recovery overwrite protection + autosave logical-dirty interaction; AC-18 128-track/60-batch/Undo/Redo stress; AC-19 sanitized offline errors and no provider dependency.
- These are **task-level verified contributions**, not final wave closure; T11-W03-06 must still run the canonical full-flow E2E, final AC-W11-03-01..20 mapping and drift review.

## T11-W03-06 final closure

- Status: **PASS / VERIFIED**.
- Verified implementation head: `8464da5bbbff20ff23636a2b4894952949f6d070`.
- Windows CI: `37642774190` / #244 PASS; job `112865244896`.
- Closure artifact: `11493061001`.
- 12-track canonical full-flow: PASS.
- 128-track live renderer/history scenario: PASS in 970 ms.
- Failed closure assertions: none.
- Architecture/UI/trust-boundary drift: PASS — no material drift.
- **AC-W11-03-01..20 = ALL PASS.**

| Acceptance | Final result | Final evidence |
| --- | --- | --- |
| AC-W11-03-01 | PASS | schema-v1/legacy tests + persisted optional disabled state in closure |
| AC-W11-03-02 | PASS | pure projection tests + closure derived timeline labels |
| AC-W11-03-03 | PASS | UI reorder -> Save -> process restart/reopen |
| AC-W11-03-04 | PASS | reordered/disabled cumulative boundary labels in closure |
| AC-W11-03-05 | PASS | disabled exclusion + source SHA-256/size/mtime unchanged |
| AC-W11-03-06 | PASS | re-enable/Undo/Redo restoration + canonical readiness tests |
| AC-W11-03-07 | PASS | stable track IDs/audioAssetId/source references |
| AC-W11-03-08 | PASS | selection + zoom session-only, no dirty/revision change |
| AC-W11-03-09 | PASS | architecture gate + one ProjectSessionHistory/CommandEngine mutation owner |
| AC-W11-03-10 | PASS | Windows command/no-op tests |
| AC-W11-03-11 | PASS | closure Undo/Redo exact semantic restoration |
| AC-W11-03-12 | PASS | divergent branch tests + saved-state preservation |
| AC-W11-03-13 | PASS | atomic batch tests, one revision/one Undo |
| AC-W11-03-14 | PASS | manual/template/auto-susun/ai origin parity |
| AC-W11-03-15 | PASS | Save -> command dirty -> Undo-to-saved clean -> Redo-away dirty |
| AC-W11-03-16 | PASS | reopen history reset + recovery/passive reconciliation regressions |
| AC-W11-03-17 | PASS | global history UI + exact frozen SCR-002A |
| AC-W11-03-18 | PASS | 128-track live Windows scenario 970 ms + prior 60-batch stress |
| AC-W11-03-19 | PASS | architecture/secrets/paths gates + sanitized offline evidence |
| AC-W11-03-20 | PASS | STEP10/W11-01/W11-02/frozen UI/package/smoke/ZIP all green |

## Closure rule

Closure condition satisfied: **AC-W11-03-01..20 ALL PASS** with canonical Windows evidence and no BLOCKED item. W11-03 is COMPLETE / PASS.
