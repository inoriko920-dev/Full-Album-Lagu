# W11-03 WAVE CHARTER — ALBUM TIMELINE + COMMAND HISTORY

Planning role: **ASTRA**  
Planning baseline: `main@6f296f7cc8e8b81e86bde71f8cd3a32c0d0f1bd2`  
Feature set: **FTR-004 Track Timeline & Track State + FTR-013 Unified Command History / Undo-Redo + FTR-018 Error/Diagnostics/Offline cross-cut**  
Requirements: **F-003 / FR-009..011; F-012 / FR-034..035; FR-048, FR-055..056**  
Status: **PLANNING COMPLETE / DoR PASS — IMPLEMENTATION NOT STARTED**

Source-of-truth planning DOCX:
`docs/source-of-truth/planning/current/12_STEP_11_W11_03_ALBUM_TIMELINE_COMMAND_HISTORY_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`

## 1. Wave goal

Turn the media-aware project from W11-02 into a deterministic album sequence that can be reordered and enabled/disabled manually, while establishing one canonical CommandEngine/history path that every later manual/template/Auto Susun/AI mutation must reuse.

W11-03 is foundational. It does **not** implement Auto Susun, Gemini, templates, layer editing, preview playback, transitions, keyframes, or rendering.

## 2. Locked requirement behavior

- **FR-009 Manual Reorder:** user can change track order manually; reordered state is visible in timeline and persists.
- **FR-010 Recalculate Boundaries:** reorder/duration/enable changes recalculate cumulative track start/end deterministically.
- **FR-011 Track Enable/Disable:** a track can be disabled without deleting its source media; disabled track does not participate in final effective sequence.
- **FR-034 Unified Command History:** manual/template/Auto Susun/AI project changes use the same command/history stream.
- **FR-035 Batch AI Undo:** a future multi-object AI batch is one transaction and one Undo step.

## 3. Canonical state decisions

### Persisted project intent
- `ProjectDocument.tracks[]` array order is the canonical album order.
- Add optional `track.enabled`; absence means **enabled** for schema-v1 backward compatibility.
- No duplicate `order`, `startMs`, `endMs`, or album duration source-of-truth fields are persisted.

### Derived timeline
A pure timeline projection derives:
- effective enabled sequence;
- cumulative `startMs`;
- cumulative `endMs`;
- total album duration;
- unresolved timing state when an enabled track has no usable positive audio duration.

Use integer milliseconds. Timing must not depend on async completion order.

### Session-only state
Do not persist:
- active track selection;
- timeline zoom/scroll viewport;
- hover/playhead state until a later preview wave defines authoritative playback state;
- open dialog state.

## 4. Enable/disable and media readiness

Disabling a track:
- keeps stable track ID, audio link and source reference;
- removes it from effective album duration/sequence;
- must not destructively modify the audio file.

Required-media readiness must follow **effective enabled usage**:
- audio referenced only by disabled tracks is not render-required;
- if the same asset is still referenced by an enabled track, it remains required;
- re-enable restores required status and any missing/invalid blocker.

This must be implemented without introducing a second readiness owner.

## 5. CommandEngine ownership

A framework-independent CommandEngine becomes the only owner for W11-03 user project mutations.

Each command has:
- command kind;
- user-readable label;
- origin: `manual | template | auto-susun | ai`;
- expected base revision/state token for stale-mutation protection;
- validated payload.

Required behavior:
- one successful semantic command = one history node + one project revision increment;
- no-op = no history node + no revision increment;
- `executeBatch` validates/applies atomically and increments revision once;
- any batch subcommand failure = no partial project publication and no history entry;
- Undo/Redo restore deterministic semantic states;
- revision remains monotonic through Undo/Redo for recovery ordering;
- executing a new command after Undo truncates the redo branch;
- history is bounded **in-memory only** in W11-03; persistent Undo history remains FTR-023.

System reconciliation such as passive missing-media availability scan is **not** a user history command.

## 6. Dirty/save/recovery semantics

Current `project.revision !== savedRevision` alone is insufficient once Undo can return to the saved semantic state while revision stays monotonic.

W11-03 must add logical history-state/checkpoint semantics:
- Open/startup normal project -> clean base history state;
- successful user command -> dirty;
- Save success -> saved checkpoint becomes current state;
- Undo exactly back to saved checkpoint -> clean;
- Redo away -> dirty;
- new divergent command after Undo -> redo truncated; clean only if current token equals valid saved token;
- passive missing-media scan -> no history/no false dirty;
- Recovery Accept -> history resets around recovered state, but project remains dirty until primary Save;
- Open/New -> prior project history discarded; no cross-project Undo;
- autosave follows the authoritative dirty signal.

## 7. Existing mutation migration

W11-02 currently publishes media-import and relink project changes directly into ProjectSession. During W11-03 these **user-driven project mutations** must be migrated into the shared history semantics where applicable so later features do not inherit parallel mutation owners.

Do not force passive filesystem reconciliation into user history.

## 8. Frozen UI authority

Use existing frozen references only:
- **UI-IMG-002B** — album-ready editor;
- **UI-IMG-002D** — Album Timeline variant;
- **PNL-002 Tracks & Media** — order / enabled / media-state presentation;
- **PNL-007 Album Timeline** — track boundaries, ready/selected/zoom/long-project states;
- existing UI Freeze global shell.

Rules:
- no new UI prompt/image generation;
- default SCR-002A hierarchy remains unchanged;
- Gemini right rail remains permanent;
- Album Timeline remains bottom;
- before exposing global Undo/Redo, compare actual frozen top-bar reference and restore frozen controls if the current shell omitted them; do not invent a redesign;
- selection is editor/session state and must not dirty the project;
- manual reorder uses existing track/timeline surfaces rather than a second playlist owner.

## 9. Performance policy

- timeline projection: pure O(n);
- 100+ tracks must remain responsive and deterministic;
- history is bounded in memory;
- stable track keys in React;
- long album horizontal overflow must remain usable;
- no cloud/provider dependency in timeline/history core.

## 10. Error policy

Reject safely with unchanged project/history for:
- stale expected revision/token;
- unknown track ID;
- invalid reorder target;
- invalid enabled-state command;
- unresolved duration where authoritative timing is required;
- failed batch subcommand.

Diagnostics must be sanitized and must not expose secrets/provider data/unnecessary raw paths.

## 11. Acceptance

Authoritative acceptance matrix:
`docs/step11/W11_03_ACCEPTANCE_MATRIX.md`

All AC-W11-03-01..20 must PASS or be truthfully BLOCKED before W11-03 closes.

## 12. Serial implementation order

1. `T11-W03-01` Timeline Domain + CommandEngine Core
2. `T11-W03-02` Existing Mutation Migration + Session Checkpoint Semantics
3. `T11-W03-03` Reorder / Enable-Disable / Boundary Application Core
4. `T11-W03-04` Frozen Album Timeline + Global Undo/Redo UI Wiring
5. `T11-W03-05` Unified Batch History & Edge-Case Hardening
6. `T11-W03-06` Wave E2E, Drift Review & Evidence Closure

Exactly one SOL task per user `lanjutkan` turn. A later task remains blocked until its predecessor is PASS / VERIFIED.

## 13. Explicitly out of scope

- trim/split/ripple/multi-lane editing;
- keyframes and automation lanes implementation;
- Auto Susun algorithm (W11-04);
- artwork/dynamic metadata binding (W11-04);
- manual layer editor/templates (W11-05);
- preview/audio-reactive engine (W11-06);
- transitions (W11-07);
- final render / FFmpeg/FFprobe integration;
- Gemini provider/vault/agent implementation (STEP 12);
- persistent Undo history (FTR-023);
- new UI prompt/image generation.

## 14. ASTRA stop triggers

Stop SOL and return to ASTRA if implementation requires:
- `schemaVersion` > 1;
- persisted cumulative start/end as a second timing source of truth;
- a renderer-owned shadow Project State or second history stack;
- breaking W11-01 recovery correctness;
- revision increments per batch subcommand;
- any manual/template/Auto Susun/AI path bypassing CommandEngine;
- Gemini, FFmpeg/FFprobe, native addon, new framework or external runtime dependency;
- frozen UI structural redesign/new UI prompt/image;
- destructive source-media operations;
- 100+ track behavior that cannot remain responsive/deterministic.

## 15. Gate

**W11-03 DoR = PASS after this planning package is merged as source of truth.**

After merge, only **T11-W03-01** becomes READY for SOL. W11-04 stays blocked until T11-W03-06 closes W11-03 COMPLETE / PASS.
