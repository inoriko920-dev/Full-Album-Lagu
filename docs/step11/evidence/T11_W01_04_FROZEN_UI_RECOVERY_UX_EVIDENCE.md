# T11-W01-04 — Frozen UI States + Recovery UX Wiring Evidence

Status: **VERIFIED / PASS**

## Scope
Task `T11-W01-04` wires lifecycle and recovery state into the frozen editor shell without redesigning the approved hierarchy. The default SCR-002A empty editor remains unchanged; status UI is rendered only when recovery, cancellation, or error state requires user attention.

## UX implementation
- Added one conditional notice row directly below the frozen top toolbar.
- Default/idle state renders no notice row, preserving the approved SCR-002A layout.
- Recovery available:
  - visible message that a newer autosave exists;
  - `Pulihkan` action restores the recovery snapshot into live ProjectSession;
  - restored snapshot remains dirty against the last primary-file revision;
  - `Abaikan` removes only the recovery artifact.
- Stale recovery:
  - states that the primary project is newer;
  - `Hapus Autosave` removes only the stale recovery artifact.
- Invalid recovery:
  - visible error that the recovery artifact cannot be used;
  - primary project remains active;
  - `Hapus Autosave` is available.
- Save cancellation:
  - visible non-destructive status;
  - `Simpan Lagi` retries normal user Save.
- Save error:
  - visible error status;
  - `Simpan Lagi` retries normal user Save.
- Autosave write error:
  - visible error status;
  - `Simpan Sekarang` directs the user to protect the project with normal Save.
- Startup load error is visible without mutating the existing file.

## Frozen hierarchy protection
The following approved hierarchy is unchanged:
- top project actions;
- left Media / Layer / Inspector work rail;
- center 16:9 Preview;
- permanent right Gemini Agent rail;
- bottom Album Timeline.

The recovery/lifecycle notice is conditional and absent from the default frozen state. No Gemini panel, work rail, preview, timeline, or toolbar action was removed/reordered.

## ProjectSession behavior
- Added typed `acceptRecovery()` and `discardRecovery()` actions to renderer ProjectSession.
- Actions use the existing typed preload/IPC recovery boundary only.
- No direct filesystem access or raw recovery path is introduced into renderer.
- Accepting recovery changes live project state but does not overwrite the primary file.
- Discarding recovery removes only the recovery artifact.
- Added public DOM state markers for testability:
  - `data-project-dirty`
  - `data-recovery-state`

## Component verification
Component tests cover:
- default frozen shell renders with no notice;
- permanent Gemini rail remains visible;
- newer recovery is visible and actionable;
- `Pulihkan` restores recovery content and leaves project dirty;
- `Abaikan` removes recovery while preserving primary project state;
- stale recovery is visible and removable;
- invalid recovery is visible while primary project remains active;
- Save cancellation is visible and retryable;
- Save error is visible and retryable.

## Windows CI proof
Run: `37577568055`  
Job: `112649903010`  
Verified branch SHA: `fe548a032e982be70359dbc8dc6c2d02787ca6ce`

Passed in the same run:
- clean install;
- full `npm run verify`;
- formatting / lint / typecheck;
- architecture / secrets / portable path checks;
- unit / contract / component / integration suites;
- build;
- runtime high-severity audit;
- STEP 10 SLC save/reopen E2E;
- T11-W01-02 lifecycle E2E;
- T11-W01-03 recovery E2E;
- SCR-002A real-app screenshot;
- exact frozen visual baseline verification;
- Windows x64 package;
- packaged executable smoke;
- portable multi-file ZIP.

Frozen visual artifact:
- ID: `11463371449`
- digest: `sha256:fb042a6a6ee20cbbea794baf883a416ce4f288cb0726ec71f9ce7e9be6ca0011`

Windows portable artifact:
- ID: `11462359325`
- digest: `sha256:bba663b78dac76a2b4b97f74c7d637b2f58298a4d09f034ddede28c0e0303a99`

## Acceptance result
- cancellation/error states visible: PASS;
- recovery available/stale/invalid states visible: PASS;
- recovery actions usable through official ProjectSession path: PASS;
- permanent Gemini rail and frozen hierarchy unchanged: PASS;
- default SCR-002A frozen visual baseline unchanged: PASS;
- existing lifecycle/recovery regressions remain green: PASS.

## Out of scope honored
No W11-01 final drift closure, new media/timeline feature, Gemini provider/credential integration, FFmpeg/render implementation, project schema migration, or frozen UI redesign was introduced.

## Next
T11-W01-05 — Wave E2E, Drift Review & Evidence Pack.
