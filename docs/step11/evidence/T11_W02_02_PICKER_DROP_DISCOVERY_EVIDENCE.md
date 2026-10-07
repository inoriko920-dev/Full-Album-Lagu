# T11-W02-02 — PICKER / DROP DISCOVERY, BATCH QUEUE, PROGRESS & CANCEL EVIDENCE

## Verdict

**PASS / VERIFIED**

Task: `T11-W02-02 Picker/Drop Discovery, Batch Queue, Progress & Cancel`  
Role: SOL  
Baseline: `main@261c88cb0cd20de8330b3e7fcbfa08facb7e8e99`  
Verified implementation head: `ad9df0bd20703dbd1ab67c1ca673cdc65f8a3731`  
Canonical verification run: Windows CI `37589834065` / run #118 — PASS  
Canonical job: `112688415921`

No audio metadata parser/probe, deterministic metadata sorting, relink implementation, media UI wiring, Gemini integration, or FFmpeg/FFprobe integration was added.

## Delivered

### 1. Native audio and folder selection
Main-owned selection was added through Electron dialog adapters:
- audio picker uses `openFile + multiSelections`;
- audio filter includes mp3/wav/flac/m4a/aac/ogg/opus/wma/aiff/aif;
- folder picker uses `openDirectory + multiSelections`;
- cancellation is explicit as `MEDIA_SELECTION_CANCELLED`;
- deterministic argument seams exist for CI/automation without moving filesystem ownership into renderer.

### 2. Drop path resolution stays in preload
The narrow preload bridge adds `discoverDroppedMedia(files)`.

For dropped browser `File` objects:
- preload resolves the native path through Electron `webUtils.getPathForFile`;
- resolved paths are passed directly into the allowlisted media-discovery IPC channel;
- the renderer receives only a sanitized batch ID/start result;
- raw paths are not returned in public discovery status or item summaries.

### 3. Canonical main-owned discovery service
Added a framework-independent `MediaDiscoveryService` with:
- one canonical entry path for picker, dropped files and folder roots;
- recursive folder traversal;
- bounded asynchronous inspection queue;
- default concurrency 4;
- deterministic sorted frontier processing;
- explicit progress counters;
- cancellation via `AbortController`;
- separate internal discovered-source lookup for the next probe task;
- terminal batch retention/pruning.

### 4. Canonical-path batch dedupe
The Node adapter:
- resolves selected filesystem entries through `realpath`;
- normalizes canonical identities;
- applies Windows case folding for canonical identity;
- avoids duplicate physical files within one batch;
- avoids re-traversing duplicate canonical directories;
- skips symlink recursion.

### 5. Sanitized public discovery model
Public status/results contain:
- batch ID;
- progress counts;
- discovery ID;
- basename/fileName;
- file size;
- duplicate count;
- sanitized issue reason.

They do not contain:
- sourcePath;
- canonical filesystem path;
- directory path;
- filesystem API objects.

Internal sourcePath remains main/application-owned for T11-W02-03 probing.

### 6. Non-destructive discovery
The main filesystem adapter performs metadata/read-only operations:
- lstat;
- stat;
- realpath;
- readdir.

No source write, rename, move, delete, timestamp update or media mutation exists in the discovery path.

## Mandatory task tests

### 20+ discovery
Integration test creates 24 source files and verifies:
- all 24 discovered;
- source bytes unchanged;
- source size unchanged;
- source mtime unchanged.

### 100+ recursive discovery
Integration test creates 120 files across nested folders with:
- spaces;
- Unicode names;
- nested directories.

Proof:
- 120 files discovered;
- no public root path leakage;
- second run produces the same deterministic public item order.

### Duplicate selection
Integration test selects the same physical file:
- directly;
- through its containing folder;
- directly again.

Result:
- one public discovered file;
- duplicate counter increments;
- canonical identity dedupe prevents accidental duplicate intake.

### Unicode / spaces
Real Node filesystem integration uses temp paths and filenames containing spaces and `Ω`. PASS on canonical Windows CI.

### Bounded concurrency
Unit fake-port test with 40 files proves:
- concurrency is actually parallel;
- maximum concurrent inspection never exceeds configured limit 4.

### Cancellation
Unit recursive 100-child test:
- starts discovery;
- requests cancel during active work;
- terminal status becomes `cancelled`;
- code is `MEDIA_IMPORT_CANCELLED`;
- partial summary remains sanitized;
- repeated cancel returns `not-running`.

### Renderer trust boundary
- renderer imports no Electron/Node filesystem API;
- drag/drop native path resolution belongs to preload;
- native picker belongs to main;
- public results reject `sourcePath`;
- architecture check PASS.

## Contract / IPC proof

Allowlisted channels:
- `media:pick-audio-files`;
- `media:pick-folder`;
- `media:discover-dropped`;
- `media:get-discovery-status`;
- `media:cancel-discovery`.

All preload and IPC boundaries validate request/result schemas.

## Acceptance interpretation for this task

This task provides the task-owned proof for:
- AC-W11-02-01 foundation: native multi-file picker is wired to the canonical discovery pipeline; final ready-audio import remains owned by T11-W02-03/05/06.
- AC-W11-02-02 foundation: 100+ discovery, bounded async work and progress/status are proved; full responsive UI presentation remains later.
- AC-W11-02-03 foundation: dropped files route into the same canonical discovery service; final wave E2E remains T11-W02-06.
- AC-W11-02-04 foundation: recursive deterministic folder discovery and cancellation are proved.
- AC-W11-02-05 discovery portion: source bytes/size/mtime unchanged.
- AC-W11-02-10: canonical-path batch dedupe is proved.
- AC-W11-02-15 discovery portion: Unicode/spaces paths PASS on Windows.
- AC-W11-02-16: renderer retains no direct fs/dialog/subprocess/provider ownership.
- AC-W11-02-17 discovery portion: no network/provider dependency and public summaries are path-sanitized.

No full-wave criterion is falsely declared closed before its remaining owning tasks.

## Native dialog automation limitation

CI does not click the real operating-system file/folder dialog. Production uses Electron native dialogs, while deterministic command-line selection/cancel seams feed the same main-owned discovery service and IPC pipeline. Full wave-level UI/E2E closure remains T11-W02-05/06.

## CI proof — Windows CI #118

On `ad9df0bd20703dbd1ab67c1ca673cdc65f8a3731`:
- clean install — PASS;
- format — PASS;
- lint — PASS;
- TypeScript — PASS;
- architecture check — PASS;
- secrets/path/UI reference checks — PASS;
- unit tests — PASS;
- contract tests — PASS;
- component tests — PASS;
- integration tests — PASS;
- build — PASS;
- runtime high-severity audit — PASS;
- STEP 10 SLC save/reopen E2E — PASS;
- W11-01 lifecycle E2E — PASS;
- W11-01 recovery E2E — PASS;
- SCR-002A capture/evidence — PASS;
- exact frozen UI baseline — PASS;
- Windows x64 package — PASS;
- packaged executable smoke — PASS;
- portable multi-file ZIP — PASS.

Artifacts:
- Windows portable: `11468390615`, digest `sha256:7ac571c33e0ef1d4fffc586ee8563425bb758c6023dc26bd801b53972b81f329`
- Frozen visual baseline: `11467439702`, digest `sha256:128febbbdba1f5d98072f17d0b3015f93c1e97a2216b20c72ca6c1bdcca3d7b1`
- STEP 10 SLC evidence: `11468345596`
- W11-01 lifecycle evidence: `11467484505`
- W11-01 recovery evidence: `11468505159`

## Scope protection

Explicitly not implemented:
- `music-metadata` or any other metadata dependency;
- audio duration/codec/container probing;
- invalid/corrupt/unsupported audio classification;
- metadata title/artist/album/year/track extraction;
- deterministic metadata/filename initial track order;
- project media commit from probe results;
- missing-media scan;
- relink core;
- media progress UI or frozen DLG-005 wiring;
- Gemini;
- FFmpeg/FFprobe.

## Gate

**T11-W02-02: PASS / VERIFIED.**

Next task becomes:
**T11-W02-03 — Audio Probe, Validation, Metadata & Deterministic Initial Order**

Do not start T11-W02-04 or later tasks before T11-W02-03 passes.
