# T11-W02-04 — MISSING MEDIA SCAN & RELINK CORE EVIDENCE

## Verdict

**PASS / VERIFIED**

Task: `T11-W02-04 Missing Media Scan & Relink Core`  
Role: SOL  
Baseline: `main@322ae37a254f78c13d466de79d6b2f62c029ff23`  
Verified implementation head: `b9e22a6c4c1e986d0592dd914d7977eb3678701d`  
Canonical verification run: Windows CI `37603548993` / run #156 — PASS  
Canonical job: `112733462189`

T11-W02-05 frozen UI wiring and T11-W02-06 wave closure were not started. Gemini and runtime FFmpeg/FFprobe integration remain outside this task.

## Delivered

### 1. Main-owned missing-media scan

Added `MissingMediaService` behind a narrow `MediaSourcePort`.

The production Node adapter:
- inspects project references with read-only filesystem calls;
- canonicalizes existing file paths through `realpath`;
- classifies ENOENT as missing;
- classifies inaccessible/non-regular references as unreadable;
- never renames, moves, deletes or rewrites source media.

Open and startup load paths run the scan before the project is returned to the renderer. The scan reflects external filesystem availability without incrementing project revision merely because a file disappeared or returned.

### 2. Required audio versus optional visual

A missing required audio asset is projected as a readiness blocker:
- media availability = `missing`;
- issue = `MEDIA_NOT_FOUND`;
- readiness blocker = `REQUIRED_MEDIA_MISSING`.

A missing optional image/video asset is still reported as missing but does **not** make project media readiness false.

This preserves the planned distinction between mandatory audio and optional visual media.

### 3. Single-file relink

Explicit relink:
1. resolves the target media asset from the project;
2. asks main-owned native selection for one replacement;
3. inspects the selected filesystem entry;
4. validates the replacement before any project mutation;
5. for audio, reuses `MusicMetadataProbePort` and requires a `ready` probe result;
6. commits the source reference only after validation succeeds.

A successful relink:
- updates the media asset sourcePath/fileName/size;
- clears stale missing/invalid state;
- refreshes audio metadata when applicable;
- updates linked track sourcePath;
- increments project revision exactly once.

Invalid or unreadable replacement:
- returns `RELINK_FAILED`;
- does not expose a changed project;
- leaves the original project state unchanged.

### 4. Deterministic folder relink

Folder relink recursively enumerates the selected folder through the existing main-owned discovery port.

Candidate policy:
1. exact normalized filename is mandatory;
2. exact size adds confidence;
3. audio duration within tolerance adds confidence;
4. only a high-confidence candidate is eligible;
5. a unique highest-confidence candidate auto-resolves;
6. equal-best candidates remain `RELINK_AMBIGUOUS`;
7. no eligible candidate remains `RELINK_NO_MATCH`;
8. fuzzy/closest-filename guessing is deliberately not used.

Matching and traversal are deterministic. Relink may safely commit unique matches while ambiguous/no-match assets remain unresolved.

### 5. Sanitized public contracts

Typed preload/IPC channels:
- `media:scan-missing`;
- `media:relink-single`;
- `media:relink-folder`.

Public missing/relink summaries expose:
- asset ID;
- basename/fileName;
- kind/required state;
- availability/error code;
- candidate size and duration hints.

Ambiguous candidate summaries reject raw source paths. Full sourcePath remains only inside the project document where it is legitimate source-of-truth data and inside trusted main/application internals.

### 6. Native selection seams

Production selection stays in Electron main:
- one replacement file;
- one relink folder.

Deterministic argv seams exist for automation:
- `--w11-relink-file=...`;
- `--w11-relink-folder=...`;
- cancel variants.

Renderer receives no broad filesystem API.

## Mandatory scenario proof

### Moved Track 5

Real Windows filesystem integration creates a project whose Track 5 points to an old missing path, then places the valid audio in a moved Unicode/spaces folder.

Explicit relink proves:
- replacement validates as real audio;
- asset ID remains stable;
- linked track ID remains stable;
- media and track source references move to the canonical replacement path;
- availability becomes `ready`;
- revision increments once;
- replacement source bytes, size and mtime remain unchanged.

### Unique folder match

A recursive Unicode/spaces folder scan finds exactly one high-confidence `05 Track 5.mp3` candidate.

Result:
- `relinked`;
- project revision increments once;
- canonical path is stored.

### Ambiguous same-name candidates

Two same-name candidates with equal confidence remain:
- `RELINK_AMBIGUOUS`;
- both candidate summaries are path-free;
- no project reference changes;
- revision remains unchanged.

### No-match

A different filename is present but no exact normalized filename match exists.

Result:
- `RELINK_NO_MATCH`;
- no fuzzy guess;
- no mutation.

### Invalid explicit replacement

A file named as MP3 but containing invalid bytes is rejected by the audio probe.

Result:
- `RELINK_FAILED`;
- no replacement project is returned;
- original project revision/reference remains unchanged.

### Optional visual

A missing optional image is reported as missing but media readiness remains `ready: true` with no blocker.

### Source non-destructive

Real-file tests verify the moved audio source:
- bytes unchanged;
- size unchanged;
- mtime unchanged.

No source copy, rename, move or rewrite is performed by relink.

## Canonical Windows CI #156

Run: `37603548993`  
Job: `112733462189`  
Head: `b9e22a6c4c1e986d0592dd914d7977eb3678701d`

PASS:
- clean install;
- Prettier;
- ESLint;
- TypeScript;
- architecture check;
- secret scan;
- portable path check;
- UI reference pack;
- unit tests;
- contract tests;
- component tests;
- integration tests;
- build;
- runtime high-severity audit;
- STEP 10 SLC save/reopen E2E;
- W11-01 lifecycle E2E;
- W11-01 recovery E2E;
- SCR-002A capture/evidence;
- exact frozen UI baseline;
- Windows x64 package;
- packaged executable smoke;
- portable multi-file ZIP.

Artifacts:
- Windows portable: `11474325455`, digest `sha256:423cf82ed04918eeec2607837374c0b16914aee2b2b5afb4cb32d11880d72f9a`;
- W11-01 recovery: `11474156384`;
- frozen visual baseline: `11473996913`;
- W11-01 lifecycle: `11473139392`;
- STEP 10 SLC: `11473139379`.

## Acceptance contribution

This task supplies core proof for:
- **AC-W11-02-11** project open/startup detects missing referenced media;
- **AC-W11-02-12** required missing audio blocks readiness while optional visual does not;
- **AC-W11-02-13** explicit single-file relink validates before mutation and updates references only;
- **AC-W11-02-14** folder relink auto-resolves only unique high-confidence matches; ambiguity/no-match remains unresolved;
- **AC-W11-02-15** Unicode/spaces filesystem cases pass on Windows;
- **AC-W11-02-16** renderer trust boundary remains intact;
- **AC-W11-02-17** relink/missing diagnostics are sanitized and offline.

Wave-level criteria are not falsely declared closed before T11-W02-05 and T11-W02-06.

## Native dialog automation limitation

CI does not physically click the operating-system relink file/folder dialogs. Production uses native Electron dialogs; deterministic argument seams and real-filesystem service tests exercise the same main-owned validation/relink core.

## Scope protection

Explicitly not implemented:
- frozen Media panel state wiring;
- DLG-005 missing/relink dialog UI;
- progress/partial-result presentation;
- visual redesign;
- W11-W02-05;
- W11-W02-06 closure;
- Gemini;
- runtime FFmpeg/FFprobe integration.

## Gate

**T11-W02-04: PASS / VERIFIED.**

Next task becomes:
**T11-W02-05 — Frozen Media/Missing/Relink UI Wiring**

Do not start T11-W02-06 before T11-W02-05 passes.
