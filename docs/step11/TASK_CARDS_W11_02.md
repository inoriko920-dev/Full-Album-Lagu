# W11-02 TASK CARDS — MEDIA INTAKE FOUNDATION

Planning baseline: `main@c791e9bebc30c7db9337f4341cfdd7e421a64b57`

Only one task may be executed at a time. SOL must re-read PROJECT_STATE and verify current main SHA before every task.

## T11-W02-01 — Media Domain, Contracts & Project Compatibility
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: READY_AFTER_PLANNING_MERGE
- Purpose:
  - establish additive media reference model;
  - define media/probe/relink contracts and public error codes;
  - preserve schema-v1/W11-01 compatibility;
  - create canonical ports without concrete import/probe implementation.
- Acceptance subset: AC-05, AC-07, AC-11, AC-12, AC-16, AC-17.
- Mandatory tests:
  - domain/schema compatibility;
  - old project fixture round-trip;
  - typed contract validation;
  - no raw filesystem capability exposed.
- Out:
  - file picker;
  - metadata library;
  - UI.
- Astra trigger:
  - schemaVersion bump or destructive migration.

## T11-W02-02 — Picker/Drop Discovery, Batch Queue, Progress & Cancel
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W02-01
- Purpose:
  - native multi-file picker;
  - drag/drop file path seam through preload;
  - recursive folder discovery;
  - canonical-path batch dedupe;
  - bounded asynchronous queue/progress/cancel.
- Acceptance subset: AC-01..05, AC-10, AC-15..17.
- Mandatory tests:
  - 20+ discovery;
  - 100+ discovery;
  - duplicate selection;
  - Unicode/spaces;
  - cancellation;
  - renderer trust boundary.
- Evidence:
  - deterministic batch summary without raw private paths.

## T11-W02-03 — Audio Probe, Validation, Metadata & Deterministic Initial Order
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: BLOCKED_BY T11-W02-02
- Purpose:
  - add preferred `music-metadata` adapter after dependency/license gate;
  - classify supported/invalid/unsupported/unreadable media;
  - extract duration and common tags;
  - calculate deterministic initial order independent of concurrency.
- Acceptance subset: AC-06..10, AC-15, AC-17.
- Mandatory tests:
  - MP3/WAV/FLAC/M4A/AAC or repo-approved representative fixtures;
  - corrupt/unsupported;
  - metadata missing;
  - mixed track-number/filename sorting;
  - 100+ batch ordering stability;
  - memory/progress behavior evidence.
- Do not:
  - claim final FFmpeg decoder compatibility;
  - extract embedded artwork by default during bulk import.

## T11-W02-04 — Missing Media Scan & Relink Core
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: BLOCKED_BY T11-W02-03
- Purpose:
  - scan references after open;
  - distinguish required audio and optional assets;
  - single relink;
  - folder relink with safe deterministic matching;
  - preserve source files.
- Acceptance subset: AC-11..17.
- Mandatory tests:
  - moved Track 5 scenario;
  - missing audio;
  - optional missing visual fixture;
  - exact unique match;
  - ambiguous same-name candidates;
  - no-match;
  - invalid replacement;
  - source unchanged.
- Astra trigger:
  - destructive file operation or generic asset model conflict.

## T11-W02-05 — Frozen Media/Missing/Relink UI Wiring
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W02-04
- Purpose:
  - wire import/progress/invalid states into frozen Media panel;
  - implement missing-media warning from UI-IMG-002F;
  - implement DLG-005 states from UI-IMG-009A/009B;
  - keep Gemini right rail and shell hierarchy unchanged.
- Acceptance subset: AC-01, AC-02, AC-07, AC-11..14, AC-18.
- Mandatory tests:
  - component states/actions;
  - accessibility roles/copy;
  - screenshot regression for default shell and relevant missing-media state where deterministic.
- UI rule:
  - no new prompt/image generation;
  - existing frozen references are authority.

## T11-W02-06 — Wave E2E, Drift Review & Evidence Closure
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED_BY T11-W02-05
- Purpose:
  - prove full intake -> save -> reopen -> missing -> relink flow;
  - prove 100+ batch;
  - map AC-W11-02-01..18;
  - run architecture/security/UI drift review;
  - close evidence/state/handoff.
- Acceptance:
  - AC-W11-02-01..18 PASS or truthfully BLOCKED;
  - canonical Windows CI green;
  - evidence pack findable;
  - source files unchanged.
- Do not:
  - start W11-03 in same turn.

## W11-02 release-to-next-wave condition
W11-03 remains blocked until T11-W02-06 is COMPLETE / PASS and the dependency graph/state/handoff explicitly close W11-02.
