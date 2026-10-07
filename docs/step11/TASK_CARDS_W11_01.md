# W11-01 TASK CARDS

Only one task may be executed at a time. SOL must verify the current main SHA before each task.

## T11-W01-01 — Lifecycle Contracts & Session Path Ownership
- Owner: SOL
- Risk: MEDIUM
- Status: DONE / VERIFIED
- Purpose: extend STEP 10 contracts so project session can distinguish unsaved vs known-path project and support Open/Save/Save As without renderer filesystem access.
- Acceptance: typed contracts; no direct renderer fs/dialog; current path ownership explicit; existing STEP 10 tests preserved.
- Mandatory tests: unit + contract + component seam tests.
- Evidence: task SHA + test summary.
- Rollback: Git revert.
- Astra trigger: material project schema or trust-boundary change.

## T11-W01-02 — Open / Save As / Known-Path Save
- Owner: SOL
- Risk: MEDIUM
- Status: DONE / VERIFIED
- Purpose: implement the lifecycle use cases and native dialog/injected deterministic CI seam.
- Acceptance: AC-W11-01-01..05,10..12 relevant subset.
- Tests: integration + deterministic Windows E2E + cancel/error cases.

## T11-W01-03 — Dirty State & Autosave Recovery Store
- Owner: SOL
- Risk: HIGH
- Status: DONE / VERIFIED
- Purpose: separate recovery artifact/generation from primary project; periodic dirty autosave; safe startup detection.
- Acceptance: AC-W11-01-05..09.
- Tests: interrupted/invalid/stale recovery + primary-file safety.
- Astra trigger: schema/security/source-of-truth ambiguity.

## T11-W01-04 — Frozen UI States + Recovery UX Wiring
- Owner: SOL
- Risk: MEDIUM
- Status: DONE / VERIFIED
- Purpose: wire lifecycle/recovery states into the frozen shell without redesign.
- Acceptance: cancel/error/recovery states visible and actionable; Gemini rail/frozen hierarchy unchanged.
- Tests: component/UI state + screenshot regression where relevant.

## T11-W01-05 — Wave E2E, Drift Review & Evidence Pack
- Owner: SOL
- Risk: MEDIUM
- Status: DONE / VERIFIED
- Purpose: prove the complete wave, run architecture drift review, close evidence/state.
- Acceptance: all AC-W11-01-01..14 PASS or truthfully BLOCKED; canonical Windows CI green; evidence pack findable.


## Wave closure

W11-01: **COMPLETE / PASS**.

- AC-W11-01-01..14: all PASS.
- Architecture drift review: PASS.
- Canonical Windows CI: PASS.
- Evidence: `evidence/W11_01_WAVE_CLOSURE_EVIDENCE.md`.
