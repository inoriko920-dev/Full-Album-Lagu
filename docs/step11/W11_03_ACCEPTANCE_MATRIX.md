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

## Closure rule

W11-03 may close only when **AC-W11-03-01..20** are all PASS or any BLOCKED item is explicitly documented with evidence. No criterion is implied PASS merely because code exists.
