# T11-W03-04 — FROZEN TIMELINE + GLOBAL HISTORY UI EVIDENCE

Task: **T11-W03-04**  
Wave: **W11-03 Album Timeline + Command History**  
Role: **SOL**  
Verified implementation head: `96233d99ecf420ac1c3b583c959a63610c709c27`  
Windows CI: `37634883632` / run #233 — **PASS**  
CI job: `112838360903` — **PASS**  
Windows portable artifact: `11489515325`  
Frozen visual artifact: `11489775014`  
W11-02 media regression artifact: `11487838136`  
Gate: **PASS / VERIFIED**

## 1. Delivered UI wiring

- Reused the frozen Media / Album Timeline surfaces; no new UI prompt or image generation.
- Added session-only track selection shared between the left Media rail and bottom Album Timeline.
- Added session-only timeline zoom at 75%..150%; zoom never mutates ProjectDocument or dirty state.
- Wired manual move-up / move-down actions to the validated T11-W03-03 `track.reorder` command path.
- Wired enabled/disabled controls to the validated `track.set-enabled` command path.
- Wired global Undo / Redo to the one ProjectSessionHistory / CommandEngine history stack.
- Global Undo / Redo controls appear only for album/history states, so the empty frozen SCR-002A hierarchy remains pixel-stable.
- Permanent Gemini Agent right rail remains present and untouched.
- Derived timeline cards show order plus resolved boundary labels; disabled/unresolved states remain presentation only.

## 2. Session-only state proof

PASS:
- selecting a track changes only renderer session state;
- timeline zoom changes only renderer session state;
- selection and zoom do not increment project revision;
- selection and zoom do not make a clean project dirty;
- selection does not introduce a second Project State owner.

## 3. Project mutation UI proof

PASS:
- move-up reorder changes canonical `tracks[]` order and both Media + Timeline surfaces together;
- boundary labels recalculate from canonical order;
- enable/disable visual state follows project state;
- disabled-only missing audio stops blocking Render and is removed from blocking missing-media attention;
- Undo restores enabled state/readiness/order;
- Redo restores the undone mutation;
- Undo back to the loaded/saved state is clean;
- Redo away is dirty.

## 4. Global history proof

PASS:
- initial album state shows disabled Undo / Redo;
- a project command enables Undo;
- Undo enables Redo;
- Redo reapplies the semantic state;
- one multi-track media import remains one global UI Undo step;
- one Undo removes the entire imported batch and one Redo restores it.

## 5. Frozen UI regression

The empty default SCR-002A remains the exact frozen baseline:
- conditional Undo / Redo controls are absent when there is no project history/album track;
- empty timeline zoom controls remain disabled;
- left Media / center Preview / permanent right Gemini / bottom Album Timeline hierarchy is unchanged;
- exact screenshot verification PASS in Windows CI #233;
- no new UI reference or prompt was created.

## 6. Canonical Windows regression gate

Windows CI #233 passed:
- Prettier / ESLint / TypeScript;
- architecture, secret and portable-path checks;
- UI reference verification;
- unit, contract, component and integration tests;
- production build;
- runtime dependency audit;
- STEP 10 save/reopen E2E;
- W11-01 lifecycle E2E;
- W11-01 recovery E2E;
- W11-02 media closure E2E;
- exact frozen SCR-002A screenshot/baseline verification;
- Windows x64 packaging;
- packaged executable smoke;
- portable multi-file ZIP.

## 7. Acceptance contribution

T11-W03-04 contributes verified evidence to AC-W11-03-03, 05, 08, 11, 17, 18 and 20. Final wave closure remains owned by T11-W03-06; T11-W03-05 must still harden unified batch/history edge cases first.

## 8. Protected boundaries / drift result

PASS:
- no schemaVersion bump;
- no persisted timeline selection, zoom, start/end boundaries or duplicate order source;
- no renderer filesystem/dialog/provider/subprocess ownership;
- no second history stack;
- no source-media mutation;
- no Gemini provider or FFmpeg/FFprobe work;
- no Auto Susun/template/layer/preview/transition/keyframe/render implementation;
- no silent frozen UI redesign.

## 9. Gate verdict

**T11-W03-04 = PASS / VERIFIED.**

Only **T11-W03-05 — Unified Batch History & Edge-Case Hardening** may become READY next. T11-W03-06 and W11-04 remain blocked.
