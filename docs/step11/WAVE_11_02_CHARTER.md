# W11-02 WAVE CHARTER — MEDIA INTAKE FOUNDATION

**WAVE-ID:** W11-02  
**Planning role:** ASTRA  
**Execution owner after gate:** SOL  
**Planning baseline:** `main@c791e9bebc30c7db9337f4341cfdd7e421a64b57`  
**Features:** FTR-003 Media Intake & Validation + FTR-016 Missing Media Detection & Relink + FTR-018 Error/Diagnostics/Offline cross-cut  
**Requirement refs:** F-002, F-017; FR-005..008, FR-048..050, FR-055..056  
**Status:** **READY FOR SOL AFTER THIS PLANNING PR MERGES**  
**Coding in this planning checkpoint:** NOT ALLOWED

## 1. Objective

Build the reliable media-entry foundation that every later album/timeline/preview/render wave can trust.

W11-02 must let a user bring 10–100+ audio files into a project through one canonical intake pipeline, validate and probe them asynchronously, extract useful metadata/duration, establish deterministic initial ordering, detect broken/missing references after reopen, and relink moved files without touching source media.

The result is not yet a finished album timeline. W11-02 produces trustworthy media/track source state for W11-03 and later waves.

## 2. Product authority distilled

Locked behavior from Product Definition:
- user may choose 10–100+ audio files at once;
- multi-file picker and drag-drop file/folder are required;
- import reads metadata and duration;
- invalid/corrupt/unsupported audio must be visible and never silently treated as render-ready;
- default order: valid track-number metadata -> numeric filename fallback -> filename fallback;
- all media work is non-destructive;
- long import/probe work is asynchronous with progress and cancel;
- do not load entire long audio collections into RAM when streaming/probe is sufficient;
- open-project must scan missing assets;
- missing mandatory audio is explicit and must be capable of blocking final render later;
- missing optional visual asset is a warning/placeholder class, not equivalent to mandatory audio;
- relink supports one file and folder scan;
- matching may use filename/size/hash hints but ambiguity must not be guessed;
- core workflow must work offline;
- errors/diagnostics must be actionable and sanitized.

## 3. Frozen UI authority

No new UI prompt/image generation is required.

Use the existing frozen pack:
- `UI-IMG-002A` — empty Album Editor;
- `UI-IMG-002B` — album-ready Main Editor anchor;
- `UI-IMG-002F` — Album Editor missing-media warning;
- `UI-IMG-009A` — DLG-005 Missing Media unresolved;
- `UI-IMG-009B` — DLG-005 Missing Media relink scan/partial.

Locked shell remains:
- left: Media | Layer | Inspector;
- center: Preview;
- permanent right: Gemini Agent;
- bottom: Album Timeline;
- Bahasa Indonesia.

W11-02 may wire import/progress/error/missing/relink states into this hierarchy but may not redesign it.

## 4. Scope IN

### 4.1 Audio intake
- native multi-file audio picker;
- drag-drop individual audio files;
- drag-drop folder discovery;
- recursive folder scan with deterministic path ordering;
- batch-level canonical-path dedupe so one physical file selected twice in one operation is not duplicated accidentally;
- 20+ and 100+ track scenarios;
- import progress, cancel and per-item result summary.

### 4.2 Probe / validation
- file existence/readability;
- supported media/container recognition;
- metadata parse;
- duration extraction;
- codec/container properties where available;
- invalid/corrupt/unsupported classification;
- bounded concurrency;
- no full-album buffering into RAM.

### 4.3 Track/source metadata
For ready audio:
- stable track ID;
- stable media asset ID;
- source path reference;
- source filename;
- size;
- optional fingerprint/relink hint;
- title;
- artist;
- album;
- track number;
- year;
- duration;
- probe/availability state.

### 4.4 Deterministic initial order
Initial sort priority:
1. valid positive track number metadata;
2. leading/recognizable numeric filename token;
3. normalized filename;
4. stable source identity/import ordinal as final tie-break.

Sorting must produce the same result for the same input set independent of asynchronous probe completion order.

### 4.5 Missing media / relink
- scan references on project open/load completion;
- distinguish required audio from optional visual references;
- missing audio explicit;
- single-file relink;
- folder relink for many references;
- deterministic candidate scoring;
- ambiguous matches require user choice / remain unresolved;
- relink changes project reference only; source file is never renamed/moved/edited.

### 4.6 Reliability / diagnostics
- offline operation;
- typed errors;
- basename-oriented UI copy;
- raw private paths only where project state legitimately requires them, not in public evidence/log summaries;
- no secrets/provider dependency;
- deterministic Windows evidence.

## 5. Scope OUT

- track cumulative start/end timeline calculation;
- manual track reorder and enable/disable behavior beyond source readiness state;
- Auto Susun Album;
- artwork/background import UI;
- waveform cache / FFT / spectrum analysis;
- preview playback engine;
- track binding / template application;
- CommandEngine/Undo-Redo redesign;
- Gemini;
- FFmpeg/FFprobe executable integration;
- render preflight enforcement;
- copying media into a managed project bundle;
- cloud sync/library;
- file locking/multi-instance coordination;
- frozen UI redesign.

## 6. Dependency decision

### 6.1 Preferred metadata/probe library
Planning choice: **`music-metadata`** as the preferred pure-JS Node-side metadata/duration adapter.

Reasons:
- mature focused media metadata parser;
- MIT license;
- supports Node 22 used by this repo;
- supports MP3, WAV, FLAC, AAC/ADTS, MP4/M4A, Ogg/Vorbis/Opus, WMA/ASF, AIFF and additional formats;
- exposes duration, codec/container and common tags;
- streaming/file parsing avoids loading the entire album into memory;
- keeps W11-02 independent of the STEP 12 FFmpeg/FFprobe packaging decision.

Important boundary:
- W11-02 intake validation means structural/parser validity + supported container/codec + usable duration where required;
- final encoder/decoder/render compatibility remains a later render/tool integration responsibility;
- do not claim `music-metadata` proves every frame/sample decodes successfully.

### 6.2 Folder discovery
Use Node filesystem primitives in Electron main; do not add a glob dependency unless implementation evidence shows a concrete need.

### 6.3 Drag-drop path resolution
Use Electron `webUtils.getPathForFile(file)` through preload/context isolation. Do not import Electron in product renderer feature code. Prefer sending resolved paths directly onward to main rather than displaying/exposing unnecessary full paths in web content.

## 7. Target architecture

Canonical direction:

`Renderer Media UI -> typed preload -> IPC -> MediaIntakeService -> MediaDiscovery/MediaProbePort -> project mutation boundary`

Missing/relink direction:

`Project open -> MissingMediaService -> AssetLocator/RelinkService -> typed result -> ProjectSession/UI`

Owners:
- domain/reference models: `src/core/domain`;
- media use cases/services: `src/core/application/services`;
- ports: `src/core/application/ports`;
- contracts: `src/core/contracts`;
- native picker/discovery/probe/relink adapters: `src/main/infrastructure/media`;
- composition: `src/main/composition-root.ts`;
- IPC/preload allowlist: existing owners;
- live project/UI state: `src/renderer/state/project-session`;
- visual presentation: frozen Media panel/dialog states.

No renderer filesystem ownership.

## 8. Proposed domain model

Keep `schemaVersion: 1` unless implementation proves a destructive incompatibility.

Additive fields only; existing W11-01 project files must continue to parse.

Recommended project-level optional collection:
`mediaAssets?: MediaAssetReference[]`

Recommended media reference fields:
- `id`;
- `kind: audio | image | video`;
- `required: boolean`;
- `sourcePath`;
- `fileName`;
- `sizeBytes`;
- `fingerprint?`;
- `availability: ready | missing | invalid | unsupported`;
- `errorCode?`;
- `metadata?`.

Audio metadata:
- `durationMs`;
- `title?`;
- `artist?`;
- `album?`;
- `trackNumber?`;
- `year?`;
- `container?`;
- `codec?`.

Track compatibility:
- existing required `id/title/sourcePath` remains readable;
- new `audioAssetId?` may link to mediaAssets;
- do not remove `sourcePath` in W11-02;
- legacy tracks can be normalized into an in-memory media reference without forced migration.

Why this model:
- enables generic missing scan for mandatory audio and future optional visuals;
- preserves existing schema-v1 compatibility;
- gives future W11-03 timeline a stable source identity;
- avoids placing probe implementation details in renderer.

## 9. Media state model

Per media item:
- `queued`;
- `discovering`;
- `probing`;
- `ready`;
- `invalid`;
- `unsupported`;
- `missing`;
- `cancelled`.

Batch:
- `idle`;
- `selecting`;
- `discovering`;
- `probing`;
- `committing`;
- `completed`;
- `cancelled`;
- `error`.

A failed item must not falsely fail unrelated valid items. Batch result must state accepted/rejected/cancelled counts.

## 10. Error taxonomy

Recommended public codes:
- `MEDIA_SELECTION_CANCELLED`;
- `MEDIA_DISCOVERY_FAILED`;
- `MEDIA_NOT_FOUND`;
- `MEDIA_UNREADABLE`;
- `MEDIA_UNSUPPORTED`;
- `MEDIA_CORRUPT`;
- `MEDIA_DURATION_UNAVAILABLE`;
- `MEDIA_PROBE_FAILED`;
- `MEDIA_IMPORT_CANCELLED`;
- `RELINK_CANCELLED`;
- `RELINK_NO_MATCH`;
- `RELINK_AMBIGUOUS`;
- `RELINK_FAILED`.

Internal errors may retain detail, but renderer/log-copy output is sanitized.

## 11. Relink matching strategy

Single relink:
- user explicitly selects replacement;
- selected file must pass type/probe validation;
- project reference updates only after successful validation.

Folder relink:
1. enumerate candidate files;
2. exact normalized filename match;
3. size match when known;
4. optional quick/full fingerprint match if available;
5. duration/metadata hint for audio;
6. resolve only a unique high-confidence candidate;
7. leave ambiguous/no-match unresolved and show reason.

No arbitrary “closest filename” auto-guess may silently change a project.

## 12. Performance policy

- default bounded probe concurrency: implementation-tunable, starting target 4;
- discovery/probe runs outside blocking UI handlers;
- cancellation checked between discovery/probe units;
- stream/read metadata rather than loading all files into memory;
- embedded artwork extraction disabled during bulk audio intake unless a later feature explicitly needs it;
- 100-track import must provide progressive status rather than one frozen operation;
- deterministic results must not depend on probe completion timing.

## 13. W11-02 acceptance criteria

- **AC-W11-02-01** native picker imports 20+ audio files through one batch pipeline.
- **AC-W11-02-02** 100+ audio batch completes with progress/status and without UI lock.
- **AC-W11-02-03** drag-drop file uses the same intake service as picker.
- **AC-W11-02-04** drag-drop folder discovery is deterministic, recursive and cancellable.
- **AC-W11-02-05** import is non-destructive; source bytes/timestamps are not modified by product code.
- **AC-W11-02-06** supported valid audio produces ready source state with usable duration.
- **AC-W11-02-07** corrupt/unsupported/unreadable audio is explicitly classified and never silently treated as ready.
- **AC-W11-02-08** title/artist/album/track number/year are read when available; safe filename fallback exists.
- **AC-W11-02-09** initial order follows metadata track number -> filename number -> filename -> stable tie-break and is independent of async completion order.
- **AC-W11-02-10** duplicate physical paths within one intake batch are de-duplicated and reported.
- **AC-W11-02-11** open project missing-media scan identifies required missing audio separately from optional visual references.
- **AC-W11-02-12** missing required audio remains explicit and exposes a render-blocking readiness reason for later render preflight.
- **AC-W11-02-13** single-file relink updates only the project reference after successful validation.
- **AC-W11-02-14** folder relink resolves unique high-confidence matches, while ambiguous/no-match items remain unresolved.
- **AC-W11-02-15** Unicode/spaces paths and moved-folder scenarios pass on Windows.
- **AC-W11-02-16** renderer retains no direct fs/dialog/subprocess/provider access.
- **AC-W11-02-17** core intake/relink works offline and diagnostics contain no secret or unnecessary raw-path leakage.
- **AC-W11-02-18** frozen UI baseline/regression, W11-01 lifecycle/recovery, package/smoke/portable ZIP remain green.

## 14. Mandatory tests

Unit:
- filename numeric extraction;
- metadata track-number normalization;
- deterministic sort comparator;
- media state transitions;
- relink candidate scoring/ambiguity.

Contract:
- typed intake/progress/cancel results;
- public errors;
- no arbitrary filesystem API exposure;
- project/media schema backward compatibility.

Integration:
- real temp files/directories with spaces + Unicode;
- supported sample formats;
- corrupt/unsupported fixtures;
- 20+ and 100+ batch;
- cancellation;
- missing scan;
- single/folder relink;
- primary source files unchanged.

Component:
- frozen Media panel states;
- progress/cancel;
- invalid item reason;
- missing warning;
- DLG-005 unresolved and partial relink states;
- permanent Gemini rail unchanged.

Windows E2E:
- picker injection seam;
- dropped-file path seam;
- folder import;
- 100+ batch;
- close/reopen missing scan;
- moved folder relink;
- cancel/error/sanitized evidence.

Regression:
- W11-01 lifecycle/recovery E2E;
- SCR-002A exact frozen baseline;
- Windows package/smoke/portable ZIP.

## 15. Task sequence

1. **T11-W02-01 — Media Domain, Contracts & Project Compatibility**
2. **T11-W02-02 — Picker/Drop Discovery, Batch Queue, Progress & Cancel**
3. **T11-W02-03 — Audio Probe, Validation, Metadata & Deterministic Initial Order**
4. **T11-W02-04 — Missing Media Scan & Relink Core**
5. **T11-W02-05 — Frozen Media/Missing/Relink UI Wiring**
6. **T11-W02-06 — Wave E2E, Drift Review & Evidence Closure**

One task per user turn.

## 16. Definition of Ready

- requirements mapped: PASS;
- W11-01 dependency: PASS;
- source-of-truth baseline known: PASS;
- frozen UI states already exist: PASS;
- architecture owner known: PASS;
- external metadata dependency candidate researched: PASS;
- scope IN/OUT explicit: PASS;
- error model defined: PASS;
- acceptance criteria defined: PASS;
- test/evidence strategy defined: PASS;
- rollback/review triggers defined: PASS.

**W11-02 DoR verdict: PASS after this planning package is merged.**

## 17. ASTRA review triggers during implementation

Stop SOL and return to ASTRA if:
- schemaVersion must increase;
- existing W11-01 project files cannot round-trip;
- renderer must receive direct fs/dialog/subprocess ownership;
- reliable duration/validation proves impossible without pulling FFmpeg/FFprobe into STEP 11;
- native dependency is proposed;
- frozen UI needs structural redesign;
- relink requires destructive file operations;
- dependency/license posture materially changes;
- 100+ import cannot remain cancellable/responsive with the planned architecture.

## 18. Rollback

Each T11-W02 task must be independently revertible. Project files written by any W11-02 task must remain readable by the W11-01 schema-v1 parser. Source media is never modified, so rollback must not require restoring user audio files.

## 19. Gate

After this ASTRA planning package is merged:
- T11-W02-01 becomes READY for SOL;
- no later W11-W02 task may start early;
- no W11-03 implementation may begin in the same turn;
- Gemini and FFmpeg/FFprobe exact integration remain deferred to their existing owner.
