# T11-W04-01 — BINDING SCHEMA + RESOLVER CONTRACTS EVIDENCE

Task: **T11-W04-01**  
Wave: **W11-04 Auto Susun + Track Binding**  
Role: **SOL**  
Verified implementation head: `706116e2e85b963d0d6570907f70d57a614ef0e6`  
Windows CI: `37649707029` / run #252 — **PASS**  
CI job: `112889560184` — **PASS**  
Windows portable artifact: `11496316747`  
Frozen visual artifact: `11495428548`  
Gate: **PASS / VERIFIED**

## 1. Additive schema-v1 binding contract

W11-04 introduces only optional schema-v1 fields:

- `ProjectDocument.albumPresentation?.defaultArtworkAssetId`
- `ProjectTrack.binding?.titleOverride`
- `ProjectTrack.binding?.artistOverride`
- `ProjectTrack.binding?.albumOverride`
- `ProjectTrack.binding?.yearOverride`
- `ProjectTrack.binding?.artworkAssetId`

No schemaVersion bump or destructive migration was introduced. Existing passthrough compatibility remains preserved.

## 2. Artwork referential validation

PASS:
- album default artwork may reference only an existing `kind=image` media asset;
- per-track artwork may reference only an existing `kind=image` media asset;
- unknown artwork asset IDs are rejected;
- audio assets cannot be used as artwork references;
- a referenced image whose availability is `missing` remains referentially valid because availability is a media-lifecycle concern, not broken identity.

Artwork selection/import/relink remains T11-W04-03.

## 3. Pure resolved-track presentation contract

Added pure domain resolver:
`resolveTrackPresentation(project, trackId)`.

It performs no I/O and does not mutate project state.

Locked resolution order:
1. title: manual override -> audio metadata -> track title -> filename stem;
2. artist: manual override -> audio metadata -> neutral empty placeholder;
3. album: manual override -> audio metadata -> project name;
4. year: manual override -> audio metadata -> undefined placeholder;
5. track number: audio metadata -> current canonical 1-based position;
6. artwork: per-track artwork -> album default -> placeholder.

Provenance values:
- `manual-override`
- `audio-metadata`
- `track-fallback`
- `filename-fallback`
- `project-fallback`
- `canonical-position`
- `album-default`
- `placeholder`

## 4. No derived-value persistence

PASS:
- resolver leaves input project semantically unchanged;
- no resolved presentation object is written to ProjectDocument;
- derived title/artist/album/year/track-number/artwork remain projections;
- only explicit overrides and canonical artwork references persist.

## 5. Compatibility and persistence proof

PASS:
- legacy schema-v1 projects without W11-04 fields remain valid;
- existing legacy round-trip regressions remain green;
- additive W11-04 fields round-trip through the real JsonProjectStore;
- album default artwork and per-track override references survive persistence;
- Save/Reopen introduces no derived display fields.

## 6. Validation proof

PASS:
- valid optional overrides accepted;
- blank string overrides rejected;
- invalid year override rejected;
- unknown track resolution rejected;
- unknown artwork references rejected;
- non-image artwork references rejected.

## 7. Windows regression gate

Windows CI #252 passed:
- Prettier / ESLint / TypeScript;
- architecture, secret and portable-path checks;
- UI reference verification;
- unit, contract, component and integration suites;
- production build;
- runtime high-severity dependency audit;
- STEP 10 save/reopen E2E;
- W11-01 lifecycle E2E;
- W11-01 recovery E2E;
- W11-02 media closure E2E;
- W11-03 album timeline/history closure E2E;
- exact frozen SCR-002A capture/baseline;
- Windows x64 packaging;
- packaged executable smoke;
- portable multi-file ZIP.

## 8. Acceptance contribution

T11-W04-01 contributes verified evidence to:
- AC-W11-04-01 — legacy schema-v1 compatibility;
- AC-W11-04-02 — additive fields and image-only artwork references;
- AC-W11-04-03 — deterministic resolution priority/provenance foundation;
- AC-W11-04-04 — pure/offline resolver with no derived persistence;
- AC-W11-04-21 — architecture/secrets/paths/provider-free gate remains green;
- AC-W11-04-22 — prior-wave/frozen UI/package regressions remain green.

These are task-level contributions only. W11-04 is not wave-complete.

## 9. Protected boundaries

PASS:
- no Auto Susun planner/application command;
- no artwork picker/intake/relink;
- no metadata override mutation command;
- no Inspector/UI wiring;
- no Gemini/provider work;
- no FFmpeg/FFprobe;
- no source-media mutation;
- no persistent Undo history;
- no new UI prompt/image generation;
- no second Project State/history owner.

## 10. Gate verdict

**T11-W04-01 = PASS / VERIFIED.**

Only **T11-W04-02 — Deterministic Auto Susun Planner + CommandBatch** may become READY next. T11-W04-03..06 remain serially blocked.
