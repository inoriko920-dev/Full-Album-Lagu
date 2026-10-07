# T11-W05-02 — Manual Layer Commands + Gesture/History Semantics Evidence

## Verdict

- Task: **T11-W05-02 — Manual Layer Commands + Gesture/History Semantics**
- Role: SOL
- Status: **PASS / VERIFIED**
- Verified implementation head: `308a4800bcbfcf4e85828795e6573893622dd722`
- Windows CI: `37687361672` / run **#336** — **PASS**
- CI job: `113018515599`
- Windows portable artifact: `11511078393`
- Frozen visual artifact: `11511467773`

## Implemented command family

All mutations use the existing shared `ProjectCommandEngine` and origin `manual`.

Implemented:
- `layer.add`;
- `layer.remove`;
- `layer.duplicate`;
- `layer.reorder`;
- `layer.set-transform`;
- `layer.set-common`;
- `layer.set-text-style`.

No second project state, history engine, renderer mutation path, template state or provider path was introduced.

## Stable-ID and canonical-order semantics

- Every command targets a stable layer ID, never a transient array position.
- Duplicate requires an explicit caller-supplied `newLayerId`; no random hidden ID generator is introduced.
- Duplicate IDs reject atomically.
- The existing `visualScene.layers[]` array remains the single canonical back-to-front z-order.
- Reorder receives the stable layer ID plus one validated destination index.
- Same-index reorder is a true no-op: no revision and no history entry.

## Locked-layer policy

A locked layer:
- remains addressable/selectable by stable ID;
- rejects remove, duplicate, reorder, transform and ordinary common-property mutation;
- rejects mutation through the command engine with no partial publication;
- accepts only an explicit `{ locked: false }` common-state command.

Once unlocked, normal mutations are allowed again.

This preserves the W11-05 rule that locked layers may be selected but cannot be changed until explicitly unlocked.

## Common state and text style

`layer.set-common` validates only:
- `name`;
- `visible`;
- `locked`.

Unknown common fields reject before project publication.

`layer.set-text-style`:
- accepts only validated W05-01 text-style state;
- rejects non-text targets;
- suppresses semantic no-op changes through the existing CommandEngine equality gate.

## Continuous gesture semantics

`LayerTransformGestureSession` is session-only and does not mutate Project State.

At gesture start it captures:
- stable layer ID;
- base project revision;
- base state token;
- initial transform.

During pointer movement:
- repeated preview transforms are validated and retained only inside the gesture session;
- Project State revision remains unchanged;
- dirty state remains unchanged;
- Undo/Redo history remains unchanged.

At gesture end:
- `createCommitCommand()` produces exactly one `layer.set-transform` manual command;
- the command carries the original base revision + state token;
- a valid commit creates exactly one revision and one Undo history entry;
- if canonical project state changed while the gesture was open, the commit rejects as stale and publishes nothing.

Automated proof performs **50 sequential preview updates** followed by one commit and verifies one history entry only.

## Stale/atomic safety

Task tests prove:
- stale base revision -> `STALE_REVISION`;
- stale state token -> `STALE_STATE_TOKEN`;
- duplicate layer ID -> atomic `COMMAND_FAILED`;
- non-text style target -> atomic reject;
- locked-layer mutation -> atomic reject;
- no failed command increments revision or history.

## Non-destructive media behavior

Layer commands mutate only `ProjectDocument.visualScene`.

The remove/Undo test holds referenced audio/image media and tracks constant before/after layer mutation. The command module contains no filesystem, subprocess, provider or media-delete contract.

Physical source-file SHA/size/mtime closure remains T11-W05-07 owned, but T11-W05-02 introduces no capability capable of deleting or rewriting source media.

## 128-layer stress

A canonical schema-v1 project containing **128 visual text layers** is exercised through:
- 64 sequential manual edits;
- alternating stable-ID transform + reorder commands;
- one revision/history node per successful action;
- unique layer IDs preserved;
- full 64-step Undo;
- exact canonical order restoration;
- full 64-step Redo;
- exact changed-order restoration.

Observed deterministic checkpoints:
- after edits: revision 64, undoDepth 64, redoDepth 0;
- after full Undo: revision 128, stateToken `state-0`, undoDepth 0, redoDepth 64, dirty false;
- after full Redo: revision 192, undoDepth 64, redoDepth 0, dirty true.

## Automated verification

Windows CI #336 foundation gate:
- format: PASS;
- lint: PASS;
- typecheck: PASS;
- architecture: PASS — 61 source files;
- secret scan: PASS — 133 foundation text files;
- portable path scan: PASS — 66 foundation files;
- frozen UI reference verification: PASS.

Vitest:
- unit: **139 PASS / 21 files**;
  - `tests/unit/project-layer-commands.test.ts`: **12 PASS**;
- contract: **55 PASS / 11 files**;
- component: **28 PASS / 4 files**;
- integration: **34 PASS / 9 files**.

Total Vitest assertions across the four suites: **256 PASS**.

Mandatory regression in the same Windows run:
- STEP 10 save/reopen: PASS;
- W11-01 lifecycle: PASS;
- W11-01 recovery: PASS;
- W11-02 media closure: PASS;
- W11-03 timeline/history closure: PASS;
- W11-04 Auto Susun/track-binding closure: PASS;
- SCR-002A capture + screenshot verification + frozen visual baseline: PASS;
- Windows x64 package: PASS;
- packaged executable smoke: PASS;
- portable multi-file ZIP: PASS.

## Acceptance contribution

Task-level evidence contributes:
- **AC-W11-05-05 — PASS at core-command level**: add/remove/duplicate/reorder are non-destructive and reversible through unified history;
- **AC-W11-05-06 — PARTIAL / command persistence foundation PASS**: transform/common state is canonical and reversible; visible Preview projection remains T11-W05-04/05;
- **AC-W11-05-07 — PASS at core gesture/history level**: continuous preview is session-only and one end gesture creates one history node;
- **AC-W11-05-08 — PASS at core-command level**: locked-layer mutation rejects until explicit unlock;
- **AC-W11-05-09 — PARTIAL / command validation PASS**: text-style mutation validates/persists in state; readable static Preview remains later ownership;
- **AC-W11-05-10 — PARTIAL**: Spectrum/Progress may be targeted by general transform/reorder command contracts without adding W11-06 runtime;
- **AC-W11-05-22 — PASS for logical non-destructive boundary**: project layer mutation leaves media references/tracks unchanged; physical fingerprint closure remains W05-07;
- **AC-W11-05-23 — PASS for this task**: architecture/secrets/portable trust boundaries remain intact;
- **AC-W11-05-24 — PARTIAL / 128-layer command-history stress PASS**: 100-template stress remains T11-W05-03/07;
- **AC-W11-05-25 — PASS for this task regression gate**.

These task-level statuses do not close W11-05.

## Dependency result

**T11-W05-02 PASS / VERIFIED.**

Only **T11-W05-03 — Template Document + Local Store + Trial/Apply Core** is unlocked next. T11-W05-04..07, W11-06, W11-07 and STEP 12 remain blocked.
