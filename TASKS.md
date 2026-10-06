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
- Status: READY
- Start condition: user says `lanjutkan` after planning source-of-truth commit.
- Scope: lifecycle contracts + session current-path ownership only.
- Out of scope: autosave implementation, media import, track timeline, Gemini, FFmpeg/render, UI redesign.
- Acceptance: typed lifecycle contract; renderer has no direct filesystem/dialog access; existing STEP 10 seam/tests preserved; mandatory unit/contract/component tests PASS.
- Next task after PASS: T11-W01-02, but never in the same turn without a new `lanjutkan`.

## T11-W01-02 — Open / Save As / Known-Path Save
- Status: BLOCKED_BY T11-W01-01

## T11-W01-03 — Dirty State & Autosave Recovery Store
- Status: BLOCKED_BY T11-W01-02

## T11-W01-04 — Frozen UI States + Recovery UX Wiring
- Status: BLOCKED_BY T11-W01-03

## T11-W01-05 — Wave E2E, Drift Review & Evidence Pack
- Status: BLOCKED_BY T11-W01-04
