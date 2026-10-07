# W11-04 — Task Cards

Planning baseline: `main@b89326e99e03ec7a7cd596f3b2c4c7a5338c4442`  
Planning gate: **PASS**  
Serial implementation only.

## T11-W04-01 — Binding Schema + Resolver Contracts
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: PASS / VERIFIED
- Verified implementation head: `706116e2e85b963d0d6570907f70d57a614ef0e6`
- Windows CI: `37649707029` / #252 PASS; job `112889560184`
- Evidence: `evidence/T11_W04_01_BINDING_SCHEMA_RESOLVER_EVIDENCE.md`
- Scope:
  - additive optional album/track binding schema;
  - artwork referential validation;
  - pure resolved track presentation with field provenance;
  - legacy schema-v1 compatibility;
  - no UI, no image picker, no Auto Susun implementation.
- Mandatory proof:
  - old project round-trip;
  - image-only artwork reference validation;
  - priority/provenance matrix;
  - no derived-value persistence;
  - malformed/unknown refs rejected;
  - prior-wave regression gate.

## T11-W04-02 — Deterministic Auto Susun Planner + CommandBatch
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: PASS / VERIFIED
- Dependency: T11-W04-01 PASS / VERIFIED
- Verified implementation head: `f6b3d8064c7025afbd6f882023a4bc5eba3ce078`
- Windows CI: `37654060583` / #272 PASS; job `112904557720`
- Windows portable artifact: `11496964253`
- Frozen visual artifact: `11498102072`
- Evidence: `evidence/T11_W04_02_AUTO_SUSUN_PLANNER_BATCH_EVIDENCE.md`
- Scope:
  - pure `AutoArrangePlan`;
  - stable comparator;
  - idempotence;
  - stale plan guards;
  - one `auto-susun` CommandBatch;
  - disabled/manual override preservation;
  - 128-track core stress.
- Mandatory proof:
  - trackNumber -> filename number -> normalized name -> stable tie break;
  - repeated run becomes no-op;
  - one batch = one revision/history/Undo;
  - no partial publish on stale/failure;
  - source IDs/links unchanged.

## T11-W04-03 — Artwork Intake + Binding Commands
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: READY
- Dependency: T11-W04-02 PASS / VERIFIED
- Scope:
  - main-owned PNG/JPEG/WebP selection/validation;
  - optional image media asset lifecycle;
  - project default and per-track artwork commands;
  - atomic import+bind;
  - cancel/error/relink behavior.
- Mandatory proof:
  - supported/unsupported/cancel;
  - `required=false`;
  - missing artwork nonblocking;
  - per-track override > album default;
  - source image bytes unchanged;
  - one user import+bind = one Undo.

## T11-W04-04 — Metadata Override + Dynamic Binding Integration
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W04-03
- Scope:
  - explicit metadata override set/clear commands;
  - resolver integration with current selected track projection;
  - provenance/status;
  - relink/metadata refresh behavior;
  - Save/Reopen/Undo/Redo.
- Mandatory proof:
  - override priority and clear fallback;
  - draft state is non-dirty;
  - relink metadata updates derived fallback when not manually overridden;
  - logical saved checkpoint unchanged.

## T11-W04-05 — Frozen Auto Susun + Inspector UI Wiring
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W04-04
- Scope:
  - enable frozen Auto Susun toolbar action;
  - wire selected-track Inspector metadata/artwork controls;
  - plan/apply/no-op/error state;
  - Media/Timeline synchronization;
  - global Undo/Redo;
  - no Gemini provider calls.
- Mandatory proof:
  - exact frozen hierarchy preserved;
  - draft form edits non-dirty until Apply;
  - Auto Susun and manual binding actions use official history;
  - exact SCR-002A remains PASS.
- UI governance:
  - no new prompt/image generation;
  - if required state is missing from frozen pack, STOP and return to ASTRA.

## T11-W04-06 — Wave E2E, Stress, Drift Review & Evidence Closure
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W04-05
- Scope:
  - canonical Windows full-flow;
  - 128-track stress;
  - artwork missing/relink;
  - Save/reopen;
  - Undo/Redo saved checkpoint;
  - source fingerprints;
  - AC-W11-04-01..22 mapping;
  - architecture/UI/trust-boundary drift review;
  - package/smoke/ZIP.
- Closure rule:
  - W11-04 closes only when every AC is PASS and no material drift exists.
