# T11-W01-02 — Open / Save As / Known-Path Save Evidence

Status: **VERIFIED / PASS**

## Scope
Task `T11-W01-02` extends the STEP 10 persistence seam with project Open, explicit Save As, and normal Save-to-current-path behavior. It preserves the STEP 11 path-ownership rule: the actual filesystem path is owned in Electron main and renderer-facing contracts expose only public `unsaved | known-path` state.

## Implementation
- Added typed channels:
  - `project:open`
  - `project:save-as`
  - existing `project:save` now uses the known current path when available.
- Added `ProjectLifecycleService` in the application layer.
- Native production selectors remain in Electron main composition:
  - Save As -> `dialog.showSaveDialog`
  - Open -> `dialog.showOpenDialog`
- Deterministic Windows CI seams inject selected/cancelled paths through process args while using the same typed preload/IPC/application/store path.
- Save As changes current-path ownership only after a successful write.
- Open changes current-path ownership only after a successful validated load.
- Cancel/error paths leave the previous path session unchanged.

## Acceptance mapping
| Acceptance | Result | Evidence |
| --- | --- | --- |
| AC-W11-01-01 known-path Save does not reopen Save As | PASS | integration selector-call assertion + Windows `known-save` scenario |
| AC-W11-01-02 Save As cancel leaves path/state unchanged | PASS | integration + `save-as-cancel` E2E |
| AC-W11-01-03 Open cancel leaves current project unchanged | PASS | integration + `open-cancel` E2E |
| AC-W11-01-04 valid Open restores selected project | PASS | integration + `open-valid` E2E |
| AC-W11-01-10 Unicode/spaces paths | PASS | integration + all Windows fixture paths |
| AC-W11-01-11 renderer has no direct fs/dialog access | PASS | typed bridge/main composition + architecture gate |
| AC-W11-01-12 core lifecycle works offline | PASS | no provider/network dependency; Windows E2E offline path |
| AC-W11-01-13 sanitized evidence/no unnecessary paths | PASS | public E2E evidence omits raw path fields |
| AC-W11-01-14 Windows CI/frozen UI baseline remain green | PASS | run `37534906938` |

Autosave/recovery acceptance AC-W11-01-05..09 is intentionally owned by T11-W01-03 and is not claimed here.

## Integration tests
Real `JsonProjectStore` integration covers:
- Save As followed by known-path Save without a second selector call.
- Save As cancel preserving the old path.
- Open cancel preserving the old path.
- Valid Open moving path ownership only after successful load.
- Missing project Open preserving previous path.
- spaces + Unicode directories/file names.

## Deterministic Windows Electron E2E
Run: `37534906938`  
Job: `112513587662`  
Verified branch SHA: `119e039bc42da84dc8a9950d7744e3ea519552a3`

Artifact:
- name: `Lagu-Full-Album-T11-W01-02-Lifecycle-Evidence`
- artifact ID: `11446750441`
- digest: `sha256:ff7b6907d04384cc8933da031d13603134289fd66f58e6e1eb4d8b3d54577c43`

E2E summary:
- scenario count: 6
- `known-save`: PASS
- `save-as-valid`: PASS
- `save-as-cancel`: PASS
- `open-valid`: PASS
- `open-cancel`: PASS
- `open-error`: PASS
- failed assertions: none

Verified assertions:
- known-path Save bypasses Save As;
- Save As writes the new path and later normal Save stays there;
- Save As cancel preserves current path;
- Open cancel preserves current project;
- valid Open moves known-path ownership;
- missing Open returns `PROJECT_NOT_FOUND` and preserves current path;
- Unicode/spaces paths exercised;
- public evidence contains no raw path fields.

## Regression gates
The same CI run also verifies:
- `npm ci` and full `npm run verify`: PASS;
- runtime high-severity dependency audit: PASS;
- STEP 10 SLC-010-001 save/reopen E2E: PASS;
- frozen SCR-002A real-app screenshot and visual baseline: PASS;
- Windows x64 package: PASS;
- packaged executable smoke: PASS;
- portable multi-file ZIP: PASS.

## Known limitation
CI does not automate pointer/keyboard interaction with the native OS dialogs. It injects deterministic selected/cancelled paths into the same main-process selector seam. Production still uses Electron native Open/Save As dialogs.

## Out of scope honored
No dirty-state engine, autosave/recovery artifact, recovery UI, media/timeline editing feature, Gemini integration, FFmpeg/render implementation, schema migration, recent-project list, file locking, or frozen UI redesign was introduced.

## Next
T11-W01-03 — Dirty State & Autosave Recovery Store.
