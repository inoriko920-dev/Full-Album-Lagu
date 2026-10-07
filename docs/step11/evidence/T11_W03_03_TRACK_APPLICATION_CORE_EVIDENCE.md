# T11-W03-03 — TRACK APPLICATION CORE EVIDENCE

Task: **T11-W03-03**  
Wave: **W11-03 Album Timeline + Command History**  
Role: **SOL**  
Verified implementation head: `83fd9a0772c72c38a995ccd2609a910692a0e61a`  
Windows CI: `37631324251` / run #225 — **PASS**  
CI job: `112826044830` — **PASS**  
Windows portable artifact: `11487030899`  
Frozen visual artifact: `11487375187`  
W11-02 media regression artifact: `11486930958`  
Gate: **PASS / VERIFIED**

## 1. Delivered scope

- Added validated `track.reorder` commands through the shared CommandEngine.
- Added validated `track.set-enabled` commands through the same history path.
- Canonical order remains `ProjectDocument.tracks[]`; no duplicate order field was added.
- Track IDs, `audioAssetId`, and source references remain stable through reorder and enable/disable.
- Album boundaries remain purely derived from canonical order + enabled state + known audio duration.
- No persisted `startMs`, `endMs`, or album-duration source of truth was introduced.
- Required audio media now follows effective enabled usage for track-referenced assets.
- Audio referenced only by disabled tracks becomes non-required.
- Shared audio remains required while any referencing track is enabled.
- Re-enable restores required status and any missing/invalid readiness blocker.
- Reorder and enabled-state no-ops create no revision/history noise.
- Unknown track IDs, invalid target indexes, and invalid enabled payloads are rejected with unchanged project/history.

## 2. Mandatory task proof

PASS:
- first -> last reorder;
- middle -> first reorder;
- last -> middle/first reorder;
- deterministic cumulative boundary recalculation;
- disable/re-enable without deleting or mutating source identity;
- shared-asset required-media synchronization;
- missing disabled audio stops blocking readiness;
- re-enabled missing audio restores readiness blocker;
- logical Save checkpoint participates correctly with track commands;
- 105-track reorder remains one deterministic command/history step;
- Save/Close/Reopen preserves order + enabled state;
- Unicode + spaces project/source paths;
- source audio bytes remain unchanged by command + persistence flow.

## 3. Important timing rule confirmed

A missing audio file may still retain previously known duration metadata. In that case:
- render/media readiness is blocked when the asset is required;
- derived timeline timing may remain known from persisted metadata;
- missing availability does not automatically erase known duration.

This keeps timing and media availability as separate concerns.

## 4. Canonical Windows regression gate

Windows CI #225 passed:
- Prettier / ESLint / TypeScript;
- architecture, secret and portable-path checks;
- unit, contract, component and integration tests;
- production build;
- runtime dependency audit;
- STEP 10 save/reopen E2E;
- W11-01 lifecycle and recovery E2E;
- W11-02 media closure E2E;
- exact frozen SCR-002A verification;
- Windows x64 package;
- packaged executable smoke;
- portable multi-file ZIP.

## 5. Acceptance contribution

T11-W03-03 contributes verified evidence to AC-W11-03-03..07, AC-W11-03-10..12, AC-W11-03-15, AC-W11-03-18 and AC-W11-03-20. These remain wave-level criteria and are not declared finally closed until later W11-03 integration/closure tasks complete.

## 6. Protected boundaries / drift result

PASS:
- no schemaVersion bump;
- no persisted cumulative boundaries;
- no second Project State/history owner;
- no source-audio mutation;
- no renderer filesystem/provider/subprocess access;
- no new UI prompt/image generation;
- no T11-W03-04 UI wiring;
- no Auto Susun, templates, Gemini, FFmpeg/FFprobe, preview, layers, transitions, keyframes or render work.

## 7. Gate verdict

**T11-W03-03 = PASS / VERIFIED.**

Only **T11-W03-04 — Frozen Album Timeline + Global Undo/Redo UI Wiring** may become READY next. T11-W03-05..06 and W11-04 remain blocked.
