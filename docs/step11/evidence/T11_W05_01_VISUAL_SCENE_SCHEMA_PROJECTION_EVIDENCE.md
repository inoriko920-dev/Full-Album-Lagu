# T11-W05-01 — Visual Scene + Layer Schema & Pure Projection Evidence

## Verdict

- Task: **T11-W05-01 — Visual Scene + Layer Schema & Pure Projection**
- Role: SOL
- Status: **PASS / VERIFIED**
- Verified implementation head: `137e8d31a08b804498b56a9b9cb094bcc4add8f0`
- Windows CI: `37682820030` / run **#321** — **PASS**
- CI job: `113003054180`
- Windows portable artifact: `11509257626`
- Frozen visual artifact: `11510031703`

## Implemented scope

T11-W05-01 adds the minimum canonical persistent visual-scene foundation required by W11-05 without pulling later tasks forward.

Implemented:
- additive optional `ProjectDocument.visualScene` while keeping `schemaVersion: 1`;
- versioned `sceneVersion: 1`;
- stable unique layer IDs;
- canonical `layers[]` array as the single back-to-front z-order authority;
- structural layer families:
  - background;
  - artwork;
  - text;
  - spectrum;
  - progress;
- common visibility/lock/transform contract;
- supported text role/style contract;
- background solid/linear-gradient schema;
- pure selected-track / first-enabled-track scene projection;
- dynamic title/artist/artwork resolution through the existing W11-04 presentation resolver;
- structural placeholders for Spectrum/Progress so W11-06 audio/playhead runtime is not pulled forward;
- schema-v1 JSON persistence/round-trip proof.

Not implemented:
- manual layer commands;
- gesture/history commits;
- Layer/Inspector UI;
- template document/store/try/apply;
- playback/audio analyzer;
- keyframes/transitions;
- Gemini/provider integration;
- FFmpeg/render integration.

## Logical canvas contract

T11-W05-01 locks the visual transform representation as **resolution-independent normalized coordinates**.

- `x`, `y`: normalized logical position, allowed range **-1..2** so an editor may represent partially/off-canvas elements without encoding pixel resolution.
- `width`, `height`: normalized logical size, **>0..2**.
- `rotationDeg`: **-360..360**.
- `opacity`: **0..1**.
- `anchor`: one of nine semantic anchors from top-left through bottom-right.

This contract is independent from 1080p/1440p/4K output size. No pixel-space value becomes a second persistent transform authority.

## Schema validation

Verified:
- legacy schema-v1 project without `visualScene` remains valid and is not auto-populated;
- scene/layer schema is additive;
- duplicate layer IDs reject;
- malformed/out-of-bounds transform rejects;
- dynamic text roles reject persisted track-dependent text;
- static text requires non-empty text;
- linear-gradient stops must be strictly increasing;
- no second z-index field exists;
- scene supports up to 512 persisted layers while closure stress remains separately owned by later W11-05 tasks.

## Pure projection

`resolveVisualScene()`:
1. validates the input through canonical `projectDocumentSchema`;
2. uses the requested selected track when it exists;
3. otherwise selects the first enabled track;
4. otherwise resolves structural placeholders with no track context;
5. delegates title/artist/track-number/artwork semantics to W11-04 `resolveTrackPresentation()`;
6. resolves album-artwork semantically from album presentation;
7. returns derived `resolvedText`, `resolvedArtwork` and structural runtime markers **without persisting them**.

Projection has no filesystem, subprocess, provider, renderer or network dependency.

## Persistence and immutability proof

`tests/integration/json-project-store.test.ts` proves:
- visualScene saves and reloads under schema-v1;
- canonical layer order and transform/style values survive JSON round-trip;
- derived projection values are never serialized.

Unit purity proof confirms:
- repeated projection is deterministic;
- input ProjectDocument JSON is byte-equivalent at the object serialization level before/after projection;
- media sourcePath references remain unchanged;
- no resolvedText/resolvedArtwork/runtimeState field is written into Project State.

T11-W05-01 never writes source media bytes.

## Automated verification

Windows CI #321 foundation gate:
- format: PASS;
- lint: PASS;
- typecheck: PASS;
- architecture: PASS — 60 source files;
- secret scan: PASS — 131 foundation text files;
- portable path scan: PASS — 65 foundation files;
- frozen UI reference verification: PASS.

Test counts:
- unit: **127 PASS / 20 files**;
  - `tests/unit/visual-scene.test.ts`: **12 PASS**;
- contract: **55 PASS / 11 files**;
- component: **28 PASS / 4 files**;
- integration: **34 PASS / 9 files**;
  - `tests/integration/json-project-store.test.ts`: **6 PASS**.

Total Vitest assertions in the four suites: **244 PASS**.

Mandatory regression in the same Windows run:
- STEP 10 save/reopen: PASS;
- W11-01 lifecycle: PASS;
- W11-01 recovery: PASS;
- W11-02 media closure: PASS;
- W11-03 timeline/history closure: PASS;
- W11-04 Auto Susun/track-binding closure: PASS;
- SCR-002A capture + frozen baseline: PASS;
- Windows x64 package: PASS;
- packaged executable smoke: PASS;
- portable multi-file ZIP: PASS.

## Acceptance contribution

Task-level evidence now satisfies the T11-W05-01-owned portion of:
- **AC-W11-05-01 — PASS at task level**: legacy schema-v1 compatibility + persistence;
- **AC-W11-05-02 — PASS at task level**: deterministic optional scene/layer validation, stable unique IDs, canonical array order;
- **AC-W11-05-03 — PASS at task level**: dynamic title/artist/artwork projection without derived persistence;
- **AC-W11-05-10 — PARTIAL / foundation PASS**: Spectrum/Progress structural layers exist without W11-06 runtime; selection/reorder/transform interaction remains later ownership;
- **AC-W11-05-11 — PARTIAL / schema persistence PASS**: visual scene Save/Reopen storage is proven; unified history/session behavior remains later tasks;
- **AC-W11-05-23 — PASS for this task**: no architecture/provider/tool boundary drift;
- **AC-W11-05-25 — PASS for this task**: mandatory previous-wave/package regressions are green.

This does **not** close W11-05 and does not mark FTR-007/FTR-011 VERIFIED.

## Dependency result

**T11-W05-01 PASS / VERIFIED.**

Only **T11-W05-02 — Manual Layer Commands + Gesture/History Semantics** is unlocked next. T11-W05-03..07, W11-06, W11-07 and STEP 12 remain blocked.
