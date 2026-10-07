# W11-03 TASK CARDS — ALBUM TIMELINE + COMMAND HISTORY

Planning baseline: `main@6f296f7cc8e8b81e86bde71f8cd3a32c0d0f1bd2`  
Planning authority: `WAVE_11_03_CHARTER.md` + source-of-truth DOCX.  
Execution rule: **one SOL task at a time**.

## T11-W03-01 — Timeline Domain + CommandEngine Core
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: READY_AFTER_PLANNING_MERGE
- Purpose:
  - additive optional `track.enabled` with legacy default true;
  - pure deterministic timeline projection;
  - core CommandEngine / CommandBatch / history contracts;
  - monotonic revision + logical history-state token foundation;
  - no renderer UI wiring yet.
- Acceptance subset: AC-01,02,07,09..14,18,19.
- Mandatory tests:
  - legacy schema-v1 compatibility;
  - boundary projection 0/1/many/100+;
  - disabled-track exclusion;
  - execute/no-op/stale rejection;
  - Undo/Redo branch mechanics;
  - atomic batch success/failure;
  - origin contract.
- ASTRA trigger:
  - schemaVersion bump;
  - need to persist derived boundaries;
  - separate mutation owner/history stack.

## T11-W03-02 — Existing Mutation Migration + Session Checkpoint Semantics
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: BLOCKED_BY T11-W03-01
- Purpose:
  - integrate CommandEngine with ProjectSession;
  - migrate existing W11-02 user-driven media import/relink project commits into shared history semantics where applicable;
  - retain passive missing scan as system reconciliation;
  - replace revision-only dirty logic with logical saved-history checkpoint;
  - preserve autosave, Open/New and Recovery Accept behavior.
- Acceptance subset: AC-09,10,11,12,15,16,19,20.
- Mandatory tests:
  - Save -> command -> Undo-to-saved clean;
  - Redo away dirty;
  - recovery accept remains dirty;
  - Open/New clears prior history;
  - passive scan no false dirty/history;
  - import/relink command history integration.
- ASTRA trigger:
  - W11-01 recovery or W11-02 relink behavior cannot remain compatible.

## T11-W03-03 — Reorder / Enable-Disable / Boundary Application Core
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: BLOCKED_BY T11-W03-02
- Purpose:
  - validated `track.reorder` and `track.set-enabled` commands;
  - canonical order remains `tracks[]`;
  - stable IDs/media links;
  - required-media synchronization from enabled usage;
  - deterministic boundary recalculation;
  - persistence round-trip.
- Acceptance subset: AC-03..07,10..12,15,18.
- Mandatory tests:
  - first/middle/last reorder;
  - disable/re-enable;
  - shared asset requirement;
  - missing disabled vs re-enabled audio;
  - Save/Close/Reopen order+enabled state;
  - Unicode/spaces regression.
- Do not:
  - implement trim/split/ripple;
  - modify source audio.

## T11-W03-04 — Frozen Album Timeline + Global Undo/Redo UI Wiring
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W03-03
- Purpose:
  - map UI-IMG-002B/UI-IMG-002D and PNL-002/PNL-007;
  - expose selection/reorder/enable state through frozen surfaces;
  - expose global Undo/Redo according to source-of-truth top-bar hierarchy;
  - selection/zoom remain session-only;
  - keep permanent Gemini rail and default shell frozen.
- Acceptance subset: AC-03,05,08,11,17,18,20.
- Mandatory tests:
  - selected track UI does not dirty project;
  - reorder action updates timeline/project;
  - enabled/disabled visual state;
  - Undo/Redo disabled/enabled/actions;
  - one batch = one UI Undo;
  - default SCR-002A + relevant album/timeline regression.
- UI rule:
  - **no new UI prompt/image generation**;
  - if frozen top-bar contains controls missing from current shell, restore frozen control instead of redesigning.

## T11-W03-05 — Unified Batch History & Edge-Case Hardening
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: BLOCKED_BY T11-W03-04
- Purpose:
  - prove multi-command atomic transaction/one Undo;
  - enforce origin unification for manual/template/auto-susun/ai contract;
  - harden redo invalidation/stale conflicts;
  - harden save/recovery/autosave interactions;
  - 100+ scale/performance proof.
- Acceptance subset: AC-10..19.
- Mandatory tests:
  - failed subcommand atomic rollback;
  - batch one revision/one Undo;
  - origin-independent history;
  - divergent branch after Undo;
  - saved checkpoint branch edge cases;
  - 100+ track history/timeline stress.
- Do not:
  - implement template/Auto Susun/Gemini features themselves.

## T11-W03-06 — Wave E2E, Drift Review & Evidence Closure
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W03-05
- Purpose:
  - full import/load -> reorder -> disable -> boundary -> save/reopen flow;
  - Undo/Redo + saved checkpoint proof;
  - 100+ Windows proof;
  - map AC-W11-03-01..20;
  - architecture/UI/trust-boundary drift review;
  - evidence/state/handoff closure.
- Acceptance:
  - AC-W11-03-01..20 PASS or truthfully BLOCKED;
  - canonical Windows CI green;
  - W11-01/W11-02/frozen UI/package regressions green.
- Do not:
  - start W11-04 in the same turn.

## Release-to-next-wave condition

W11-04 remains blocked until T11-W03-06 is COMPLETE / PASS and registry/dependency graph/state/handoff explicitly close W11-03.
