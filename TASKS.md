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

## T11-W01-02 — Open / Save As / Known-Path Save
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified branch SHA: `119e039bc42da84dc8a9950d7744e3ea519552a3`
- Windows CI run: `37534906938` — PASS
- CI job: `112513587662`
- Lifecycle evidence artifact: `11446750441`
- Scope delivered:
  - typed `project:open` and `project:save-as` channels;
  - application-owned lifecycle service for Open / Save As / known-path Save;
  - known-path Save bypasses Save As selection;
  - Save As success updates path ownership only after successful persistence;
  - Save As cancel preserves existing path;
  - Open success validates/loads first, then changes path ownership;
  - Open cancel/error preserves current path;
  - production native Open/Save As dialogs plus deterministic CI path/cancel seams;
  - renderer contracts still expose no raw filesystem path.
- Verification:
  - integration tests use real `JsonProjectStore` with spaces + Unicode paths;
  - deterministic Windows Electron E2E: 6 scenarios, all PASS;
  - assertions PASS: known-path Save bypass, Save As success/cancel, Open success/cancel/error, Unicode/spaces, sanitized public evidence;
  - STEP 10 SLC PASS;
  - frozen SCR-002A baseline PASS;
  - runtime high-severity audit PASS;
  - Windows package/smoke/portable ZIP PASS.
- Evidence: `docs/step11/evidence/T11_W01_02_PROJECT_LIFECYCLE_EVIDENCE.md`.
- Out of scope honored: dirty state, autosave/recovery, recovery UX, media, Gemini, FFmpeg/render, frozen UI redesign.

## T11-W01-03 — Dirty State & Autosave Recovery Store
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Verified branch SHA: `99071af5ddbc568db11db5b3eb4a5ab75aac2686`
- Windows CI run: `37570463026` — PASS
- CI job: `112627715745`
- Recovery evidence artifact: `11460358149`
- Scope delivered:
  - revision-based dirty/saved state;
  - separate recovery artifact schema and generation;
  - atomic main-owned recovery store;
  - dirty-only periodic autosave scheduling;
  - newer-valid/stale/corrupt recovery detection;
  - accept/discard recovery core without primary overwrite;
  - interrupted temporary recovery safety;
  - typed preload/IPC recovery boundary with no raw paths.
- Verification:
  - full verify suite PASS;
  - recovery unit/contract/integration tests PASS;
  - deterministic Windows recovery E2E PASS;
  - STEP 10 SLC + T11-W01-02 regression PASS;
  - frozen SCR-002A baseline PASS;
  - Windows package/smoke/portable ZIP PASS.
- Evidence: `docs/step11/evidence/T11_W01_03_DIRTY_AUTOSAVE_RECOVERY_EVIDENCE.md`.
- Out of scope honored: recovery UX wiring, media, Gemini, FFmpeg/render and frozen UI redesign.

## T11-W01-04 — Frozen UI States + Recovery UX Wiring
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: READY
- Start condition: user says `lanjutkan`.
- Dependency: T11-W01-03 PASS.

## T11-W01-05 — Wave E2E, Drift Review & Evidence Pack
- Status: BLOCKED_BY T11-W01-04
