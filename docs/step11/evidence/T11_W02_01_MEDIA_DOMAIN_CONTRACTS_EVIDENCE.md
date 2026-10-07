# T11-W02-01 — MEDIA DOMAIN, CONTRACTS & PROJECT COMPATIBILITY EVIDENCE

## Verdict

**PASS / VERIFIED**

Task: `T11-W02-01 Media Domain, Contracts & Project Compatibility`  
Role: SOL  
Baseline: `main@36558c3ec74da535c8f455e9657a54b7eda3a41f`  
Verified implementation head: `bc63f368af86d9c6f418a683b7fee47d4093a4df`  
Canonical verification run: Windows CI `37586453731` / run #92 — PASS  
Canonical job: `112677579172`

No picker, drag-drop, metadata parser, concrete relink service, UI wiring, Gemini, or FFmpeg/FFprobe implementation was added.

## Delivered

### 1. Additive schema-v1 media domain
Added `src/core/domain/media-asset.ts` with:
- media kinds: audio / image / video;
- availability: ready / missing / invalid / unsupported;
- persistent issue taxonomy:
  - MEDIA_NOT_FOUND;
  - MEDIA_UNREADABLE;
  - MEDIA_UNSUPPORTED;
  - MEDIA_CORRUPT;
  - MEDIA_DURATION_UNAVAILABLE;
  - MEDIA_PROBE_FAILED;
- normalized optional audio metadata;
- stable media ID, required/optional flag, source reference, filename, size and optional fingerprint;
- invariants preventing false-ready audio and inconsistent unavailable states.

### 2. Project compatibility
`src/core/domain/project-document.ts` remains `schemaVersion: 1`.

Additive changes only:
- optional `ProjectDocument.mediaAssets`;
- optional `Track.audioAssetId`;
- audioAssetId must resolve to an existing audio media asset when present;
- media asset IDs must be unique;
- legacy `id/title/sourcePath` track shape remains valid;
- `createEmptyProject()` output is unchanged and does not force media fields.

### 3. Render-readiness foundation
Added `src/core/domain/media-readiness.ts`.

The pure projection:
- blocks required missing/invalid/unsupported media;
- does not block optional missing visual media;
- returns sanitized blocker data: asset ID, filename, media kind and readiness code;
- exposes no source filesystem path.

This is a readiness contract for later render preflight; it does not implement rendering.

### 4. Typed public media/relink contracts
Added `src/core/contracts/media-intake.ts` with:
- planned public media/relink error taxonomy;
- path-free item report;
- coherent batch progress schema;
- completed/cancelled/error batch result schema;
- sanitized relink candidate summary;
- explicit relink result states including no-match and ambiguous.

The public item and relink candidate schemas are strict and reject raw `sourcePath` fields.

### 5. Narrow application ports
Added:
- `src/core/application/ports/media-source-port.ts`;
- `src/core/application/ports/media-probe-port.ts`.

These are internal core/application boundaries only:
- no arbitrary filesystem object;
- no renderer bridge;
- no Electron import;
- no Node filesystem import;
- no concrete implementation;
- no dependency install.

## Compatibility proof

### Legacy W11-01 project
Integration coverage writes a W11-01 style schema-v1 JSON project, loads it through the real `JsonProjectStore`, saves it again, then verifies:
- no media field is forced into the legacy project;
- unknown/pass-through fields remain preserved;
- track sourcePath remains preserved;
- output still uses schemaVersion 1.

### New schema-v1 media project
Integration coverage saves and reloads a schema-v1 project containing:
- `mediaAssets`;
- ready audio metadata/duration;
- track `audioAssetId`.

The round-trip is equal without a version bump.

## Test coverage added

Unit:
- legacy schema-v1 parse compatibility;
- unchanged empty-project shape;
- additive mediaAssets/audioAssetId acceptance;
- ready audio duration invariant;
- explicit issue requirement for unavailable media;
- required vs optional readiness behavior;
- invalid audioAssetId reference rejection.

Contract:
- complete W11-02 media/relink public error taxonomy;
- strict path-free public item report;
- coherent progress counters;
- explicit cancelled batch contract;
- sanitized ambiguous relink candidate contract.

Integration:
- real JsonProjectStore legacy round-trip;
- real JsonProjectStore additive media schema-v1 round-trip.

## Trust-boundary / architecture proof

- No renderer code changed.
- No preload/IPC channel added.
- No direct filesystem/dialog/subprocess/provider API exposed to renderer.
- Domain imports only Zod/domain concerns.
- Application ports remain infrastructure-independent.
- No new runtime dependency was added.
- `music-metadata` remains deferred to T11-W02-03.
- FFmpeg/FFprobe remains deferred to its existing owner.

## CI proof — Windows CI #92

On `bc63f368af86d9c6f418a683b7fee47d4093a4df`:
- clean install — PASS;
- Prettier — PASS;
- ESLint — PASS;
- TypeScript — PASS;
- architecture check — PASS;
- secrets check — PASS;
- portable-path check — PASS;
- frozen UI reference integrity — PASS;
- unit tests — PASS;
- contract tests — PASS;
- component tests — PASS;
- integration tests — PASS;
- build — PASS;
- runtime dependency audit — PASS;
- STEP 10 SLC save/reopen E2E — PASS;
- W11-01 lifecycle E2E — PASS;
- W11-01 recovery E2E — PASS;
- SCR-002A screenshot/evidence — PASS;
- exact frozen visual baseline — PASS;
- Windows x64 package — PASS;
- packaged executable smoke — PASS;
- portable multi-file ZIP — PASS.

Artifacts:
- Windows portable: `11466856833`, digest `sha256:d2d50c00785d5a5b451eead718a4b23297877575e273031bb00e815b221aa858`
- Frozen visual baseline: `11466443132`, digest `sha256:63dde5ff6248f16dee02c5c85206268110af2d70b5f7a3493dd8d21ca94bb55a`
- W11-01 lifecycle evidence: `11466706982`
- W11-01 recovery evidence: `11466926534`
- STEP 10 SLC evidence: `11466567469`

## Acceptance interpretation for this task

T11-W02-01 establishes the contractual foundation for the wave criteria:
- AC-W11-02-05: project model is reference-only/non-destructive; actual source immutability during import is proved later.
- AC-W11-02-07: invalid/unsupported/unreadable states and issue codes are explicit; actual probe classification is T11-W02-03.
- AC-W11-02-11: required/optional + kind distinction exists; actual open-project missing scan is T11-W02-04.
- AC-W11-02-12: required unavailable media emits explicit readiness blockers; render preflight integration remains later.
- AC-W11-02-16: no renderer filesystem capability added; architecture gate PASS.
- AC-W11-02-17: public contracts are path-sanitized and no provider/network dependency was added.

No full-wave acceptance criterion is falsely declared closed before its owning implementation task.

## Scope protection

Explicitly not implemented:
- picker / native dialogs;
- drag/drop;
- recursive folder discovery;
- batch queue/progress execution;
- cancellation execution;
- `music-metadata`;
- actual audio probing;
- deterministic initial sorting implementation;
- missing-media filesystem scan;
- relink matching/application service;
- media UI / DLG-005;
- W11-W02-02 or later tasks.

## Gate

**T11-W02-01: PASS / VERIFIED.**

Next task becomes:
**T11-W02-02 — Picker/Drop Discovery, Batch Queue, Progress & Cancel**

Do not start T11-W02-03 or later tasks before T11-W02-02 passes.
