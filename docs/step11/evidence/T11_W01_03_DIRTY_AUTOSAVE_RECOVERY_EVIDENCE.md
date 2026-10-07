# T11-W01-03 — Dirty State & Autosave Recovery Store Evidence

Status: **VERIFIED / PASS**

## Scope
Task `T11-W01-03` implements dirty-state tracking and the recovery persistence core for W11-01. Recovery data is intentionally a separate artifact from the primary schema-v1 project file. A recovery autosave never counts as a successful user Save and never replaces the primary project.

## Implementation
- Added revision-based dirty-state evaluation:
  - current revision equals last successful saved revision -> clean;
  - revision differs -> dirty;
  - successful normal Save advances the saved revision and clears dirty.
- Added a separate typed recovery contract with:
  - recovery schema version;
  - monotonic generation;
  - capture timestamp;
  - saved primary revision baseline;
  - validated project snapshot.
- Added `ProjectRecoveryStore` port and `JsonProjectRecoveryStore` main-process implementation.
- Recovery artifact names use a SHA-256 project-id key and remain under the application recovery root, not beside/inside the primary project as a fake Save.
- Recovery writes use temporary-file + rename semantics.
- Added `ProjectRecoveryService` for:
  - dirty-only autosave;
  - generation increment;
  - newer-valid recovery detection;
  - stale detection;
  - corrupt/incomplete recovery rejection;
  - accept without primary-file write;
  - discard of recovery only.
- Added typed allowlisted preload/IPC methods:
  - `project:autosave-recovery`
  - `project:get-recovery-status`
  - `project:accept-recovery`
  - `project:discard-recovery`
- Renderer ProjectSession schedules periodic autosave only while dirty and never receives filesystem access or raw recovery paths.
- Recovery UI presentation is intentionally deferred to T11-W01-04.

## Acceptance mapping
| Acceptance | Result | Evidence |
| --- | --- | --- |
| AC-W11-01-05 mutation after save is dirty; successful save clears dirty | PASS | dirty-state unit tests + ProjectSession saved-revision wiring |
| AC-W11-01-06 dirty project creates recovery generation | PASS | integration tests + Windows `recovery-autosave` E2E |
| AC-W11-01-07 startup can detect newer valid recovery | PASS | service integration + Windows `recovery-detect` E2E |
| AC-W11-01-08 discard recovery does not overwrite primary | PASS | integration + Windows discard/primary-file assertions |
| AC-W11-01-09 corrupt/stale recovery fails safely | PASS | corrupt/stale/interrupted integration + Windows stale/corrupt scenarios |
| AC-W11-01-10 Unicode/spaces path scenarios | PASS | recovery integration fixtures + Windows E2E fixtures |
| AC-W11-01-11 renderer has no direct fs/dialog access | PASS | typed bridge/main persistence boundary + architecture gate |
| AC-W11-01-12 recovery core works offline | PASS | no provider/network dependency in recovery pipeline |
| AC-W11-01-13 sanitized evidence/no unnecessary paths | PASS | E2E evidence omits raw path fields |
| AC-W11-01-14 Windows CI/frozen UI baseline remain green | PASS | run `37570463026` |

## Unit / contract / integration verification
Coverage includes:
- clean vs dirty revision behavior;
- invalid revision rejection;
- recovery contract/channel validation;
- recovery artifact schema separate from primary project schema;
- dirty autosave generation 1 -> 2;
- clean project autosave skipped;
- newer valid recovery availability;
- stale recovery after a newer primary Save;
- corrupt JSON recovery rejected safely;
- interrupted temporary recovery artifact ignored when no completed artifact exists;
- accept returns recovery content without writing primary;
- discard deletes recovery only;
- primary project remains readable and unchanged throughout recovery-only operations.

## Deterministic Windows Electron E2E
Run: `37570463026`  
Job: `112627715745`  
Verified branch SHA: `99071af5ddbc568db11db5b3eb4a5ab75aac2686`

Recovery artifact:
- name: `Lagu-Full-Album-T11-W01-03-Recovery-Evidence`
- artifact ID: `11460358149`
- digest: `sha256:9f9e85d52896bdff93e1821f616de5478225495df009dbaf35c64ddba7ecec98`

Verified Windows scenarios/assertions:
- dirty autosave creates a separate recovery generation;
- autosave does not overwrite the primary project;
- startup detects newer recovery;
- accept returns recovery snapshot without primary write;
- discard removes only recovery;
- stale recovery returns `RECOVERY_STALE` and preserves newer primary;
- corrupt recovery returns `RECOVERY_INVALID` and preserves primary;
- public evidence contains no raw path fields.

## Regression gates
The same CI run verifies:
- full `npm run verify`: PASS;
- formatting/lint/typecheck/architecture/secrets/portable-path/reference checks: PASS;
- unit + contract + component + integration suites: PASS;
- runtime high-severity dependency audit: PASS;
- STEP 10 SLC-010-001 save/reopen E2E: PASS;
- T11-W01-02 lifecycle E2E: PASS;
- frozen SCR-002A screenshot + visual baseline: PASS;
- Windows x64 package: PASS;
- packaged executable smoke: PASS;
- portable multi-file ZIP: PASS.

Windows portable artifact:
- artifact ID: `11460408134`
- digest: `sha256:163c291bffb6ce557cce4271b10f9e5f6abde40c2c1a44678bb6d630d441f899`

## Boundaries / out of scope honored
No recovery UI redesign, media import/timeline feature, Gemini/provider/credential work, FFmpeg/render implementation, schema-v1 primary migration, file locking, recent-project list, or renderer filesystem access was introduced.

## Known limitation
The recovery core can detect/return/discard recovery and ProjectSession now schedules dirty autosave. The frozen user-facing recovery offer/actions are intentionally not wired yet; that belongs to **T11-W01-04 Frozen UI States + Recovery UX Wiring**.

## Next
T11-W01-04 — Frozen UI States + Recovery UX Wiring.
