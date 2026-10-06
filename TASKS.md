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
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified branch SHA: `a1ab0388c655c399f7347d40ba0acec5fc178bc8`
- Windows CI run: `37532835161` — PASS
- CI job: `112506354661`
- Scope delivered:
  - public typed location contract: `unsaved | known-path`;
  - composition-owned `ProjectPathSession` is canonical owner of the actual current path;
  - raw filesystem path is not exposed through renderer lifecycle contract;
  - successful STEP 10 save/startup load records known-path ownership;
  - renderer ProjectSession tracks only public location state;
  - unit + contract + component seam tests added.
- Existing STEP 10 save/reopen E2E, frozen UI baseline, runtime audit, Windows package/smoke and portable ZIP all PASS.
- Evidence: `docs/step11/evidence/T11_W01_01_LIFECYCLE_CONTRACTS_EVIDENCE.md`.
- Out of scope honored: Open, Save As, known-path Save behavior, autosave/recovery, media, Gemini, FFmpeg/render and UI redesign.
- Next task after PASS: T11-W01-02, but never in the same turn without a new `lanjutkan`.

## T11-W01-02 — Open / Save As / Known-Path Save
- Status: READY
- Start condition: user says `lanjutkan`.
- Dependency: T11-W01-01 PASS.

## T11-W01-03 — Dirty State & Autosave Recovery Store
- Status: BLOCKED_BY T11-W01-02

## T11-W01-04 — Frozen UI States + Recovery UX Wiring
- Status: BLOCKED_BY T11-W01-03

## T11-W01-05 — Wave E2E, Drift Review & Evidence Pack
- Status: BLOCKED_BY T11-W01-04
