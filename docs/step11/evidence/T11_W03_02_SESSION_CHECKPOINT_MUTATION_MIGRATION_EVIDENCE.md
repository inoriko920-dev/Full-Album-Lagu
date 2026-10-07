# T11-W03-02 — SESSION CHECKPOINT + MUTATION MIGRATION EVIDENCE

Task: **T11-W03-02**  
Wave: **W11-03 Album Timeline + Command History**  
Role: **SOL**  
Verified implementation head: `c505b14488735705401a0ffb6e1bd666dd77a996`  
Windows CI: `37628187263` / run #211 — **PASS**  
CI job: `112815298762` — **PASS**  
Windows portable artifact: `11484699332`  
Frozen visual artifact: `11485890461`  
W11-02 media regression artifact: `11485551095`  
Gate: **PASS / VERIFIED**

## 1. Delivered scope

### ProjectSession now uses shared history/checkpoint semantics
- Added `ProjectSessionHistory` as the session-facing owner around the existing `ProjectCommandEngine`.
- ProjectSession no longer treats revision equality as the source of truth for dirty state.
- Dirty/clean truth is the logical saved-state token checkpoint.
- `savedRevision` remains available only where required by the existing recovery snapshot compatibility contract.
- Successful Save marks the current logical history state as the saved checkpoint.

### Undo/Redo checkpoint behavior
- Revision remains monotonic.
- Undo can return to the exact logical state that was last saved and therefore becomes clean even though the numeric revision increased.
- Redo away from the saved logical state becomes dirty again.
- New project/open reset uses a clean history baseline and removes prior Undo/Redo history.

### Recovery compatibility
- Recovery Accept does not overwrite the primary project.
- Accepted recovery resets the in-memory history baseline but deliberately has no saved-state token, so it remains dirty until the user performs a primary Save.
- The primary saved revision is retained for the recovery/autosave compatibility contract.

### Existing W11-02 mutation migration
- Media import is committed through the shared CommandEngine history path as `media.import`.
- Single relink is committed through the same history path as `media.relink.single`.
- Folder relink is committed through the same history path as `media.relink.folder`.
- Candidate project revisions produced by existing W11-02 services are normalized by CommandEngine so one semantic user mutation still publishes exactly one revision increment.

### Passive system reconciliation
- Missing-media scan remains passive system reconciliation, not a user history command.
- Passive reconciliation can update availability/readiness state without adding Undo history, changing the logical state token, or falsely making a clean project dirty.
- Reconciliation updates the current semantic-state snapshot so availability state is not lost merely by Undo/Redo traversal.

## 2. Mandatory task proof

PASS:
- Save -> command -> Undo-to-saved is clean.
- Redo away from saved checkpoint is dirty.
- Recovery Accept remains dirty until primary Save.
- Open/New-style clean reset clears prior history.
- Passive missing-media scan creates no false dirty/history noise.
- Media import uses shared history.
- Single/folder relink use shared history.
- Logical state checkpoint and revision monotonicity coexist.
- Cross-project mutation candidates are rejected by CommandEngine identity protection.
- Existing frozen AppShell media import fixture preserves current project identity, matching production intake behavior.

## 3. Canonical Windows regression gate

Windows CI #211 passed:
- Prettier / ESLint / TypeScript;
- architecture check;
- secret and portable-path checks;
- frozen UI reference verification;
- unit, contract, component and integration tests;
- production build;
- runtime dependency audit;
- STEP 10 save/reopen E2E;
- W11-01 lifecycle E2E;
- W11-01 recovery E2E;
- W11-02 media-intake closure E2E;
- exact frozen SCR-002A verification;
- Windows x64 packaging;
- packaged executable smoke;
- portable multi-file ZIP.

## 4. Acceptance contribution

T11-W03-02 contributes verified evidence to AC-W11-03-09, 10, 11, 12, 15, 16, 19 and 20. These remain wave-level acceptance criteria and are not declared finally closed until the later W11-03 closure task verifies the complete wave.

## 5. Protected boundaries / drift result

PASS:
- one CommandEngine remains the user-mutation/history owner;
- no second renderer Project State history stack was introduced;
- renderer still has no direct filesystem/dialog/provider/subprocess ownership;
- passive scan remains system reconciliation rather than Undo history;
- no schemaVersion bump;
- no persisted derived timeline boundaries;
- no new UI prompt/image or frozen UI redesign;
- no T11-W03-03 reorder/enable-disable command implementation;
- no Gemini, FFmpeg/FFprobe, Auto Susun, templates, preview, layers, transitions, keyframes or render work.

## 6. Gate verdict

**T11-W03-02 = PASS / VERIFIED.**

Only **T11-W03-03 — Reorder / Enable-Disable / Boundary Application Core** may become READY next. T11-W03-04..06 and W11-04 remain blocked.
