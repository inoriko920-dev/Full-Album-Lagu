# T11-W01-01 — Lifecycle Contracts & Session Path Ownership Evidence

Status: **VERIFIED / PASS**

## Scope
This task extends the STEP 10 persistence seam only far enough to make project location state typed and current-path ownership explicit. It intentionally does not implement Open, Save As, or known-path Save behavior.

## Implementation
- Added `src/core/contracts/project-lifecycle.ts`.
  - Public renderer-safe location states: `unsaved` and `known-path`.
  - Contract is strict; raw filesystem path fields are rejected.
- Added `src/core/application/services/project-path-session.ts`.
  - Composition-owned canonical current-path owner.
  - Actual filesystem path remains outside renderer contracts.
- Updated save/startup persistence results.
  - Successful save returns public `known-path` state and records the selected path in `ProjectPathSession`.
  - Successful startup load records the startup path and returns public `known-path` state.
- Updated renderer ProjectSession.
  - Starts `unsaved`.
  - Tracks only public location state received from the typed bridge.
- Added `data-project-location` as deterministic component/E2E seam; no visible frozen UI redesign.

## Mandatory tests
- Unit: `ProjectPathSession` unsaved/known-path ownership, clear and invalid-path behavior.
- Contract: public lifecycle schema accepts only renderer-safe states and rejects a raw path.
- Contract: save/startup results require typed location state on success.
- Component: shell starts unsaved, successful Save updates public state to known-path, and Save still routes through the official typed bridge.
- Existing STEP 10 persistence integration/E2E remains green.

## Windows CI evidence
- Tested branch SHA: `a1ab0388c655c399f7347d40ba0acec5fc178bc8`
- Workflow run: `37532835161`
- Job: `112506354661`
- Result: PASS
- `npm ci`: PASS
- full `npm run verify`: PASS
- runtime dependency audit at high threshold: PASS
- STEP 10 SLC-010-001 save/reopen E2E: PASS
- SCR-002A real-app screenshot + frozen visual baseline: PASS
- Windows x64 package + packaged executable smoke: PASS
- portable ZIP + artifact upload: PASS

## Artifacts
- STEP 10 SLC evidence: artifact `11444254255`
- S09-T03 visual baseline: artifact `11444364103`
- Windows x64 foundation package: artifact `11444523836`

## Architecture decision
The actual current filesystem path is owned by a composition-scoped application service in the main process. Renderer code receives only a public location state. This preserves the trust boundary: renderer code still has no direct filesystem or Electron dialog access and cannot obtain the raw project path from this contract.

## Out of scope honored
No Open command, Save As command, known-path Save shortcut, autosave, recovery artifact, media/timeline feature, Gemini integration, FFmpeg/render implementation, or UI hierarchy redesign was added.

## Next
T11-W01-02 may consume `ProjectPathSession.getCurrentPath()` to implement Open / Save As / known-path Save through the official typed preload/IPC/application pipeline.
