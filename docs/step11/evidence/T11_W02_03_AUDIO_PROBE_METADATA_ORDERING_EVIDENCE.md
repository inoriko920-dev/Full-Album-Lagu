# T11-W02-03 — AUDIO PROBE, VALIDATION, METADATA & DETERMINISTIC INITIAL ORDER EVIDENCE

## Verdict

**PASS / VERIFIED**

Task: `T11-W02-03 Audio Probe, Validation, Metadata & Deterministic Initial Order`  
Role: SOL  
Baseline: `main@2476c009a4f5a5bef3db17f83e6f70d052b29b9c`  
Verified implementation head: `62bd3b76f7f45dad14938b1dd94f2e9ff73c2722`  
Canonical verification run: Windows CI `37594104866` / run #136 — PASS  
Canonical job: `112702409465`

T11-W02-04 missing-media/relink, T11-W02-05 UI wiring, Gemini and runtime FFmpeg/FFprobe integration were not started.

## Dependency gate

Pinned runtime dependency:
- `music-metadata@12.0.0`;
- exact version is recorded in `package.json` and `package-lock.json`;
- dependency is compatible with the project's Node 22 runtime baseline;
- project runtime high-severity audit remains PASS on canonical Windows CI;
- no native addon was introduced.

The adapter uses `parseFile()` with:
- `duration: true`;
- `skipCovers: true`.

Embedded artwork is therefore not loaded during bulk probing.

## Main-owned probe adapter

Added `MusicMetadataProbePort` under main infrastructure.

Supported intake extensions are explicitly allowlisted:
- MP3;
- WAV;
- FLAC;
- M4A;
- AAC;
- OGG;
- Opus;
- WMA;
- AIFF/AIF.

Classification:
- unsupported extension or no supported audio track -> `MEDIA_UNSUPPORTED`;
- unreadable filesystem errors -> `MEDIA_UNREADABLE`;
- parser failure or structurally empty media -> `MEDIA_CORRUPT`;
- structurally recognized audio without usable positive duration -> `MEDIA_DURATION_UNAVAILABLE`;
- usable audio -> `ready`.

Public error messages are sanitized and do not expose parser internals or private filesystem details.

## Metadata extraction

Ready audio can populate:
- `durationMs`;
- title;
- artist;
- album;
- positive track number;
- year;
- container;
- codec.

Tags are trimmed and length-bounded. Missing optional tags are omitted. A missing title safely falls back to the filename stem when the project track is created.

## Bounded, cancellable MediaIntakeService

The service:
- only starts after a completed discovery batch;
- keeps filesystem source references on the trusted main/application side;
- probes with bounded concurrency, default 4;
- reports `discovered / processed / accepted / rejected`;
- supports cancellation through `AbortController`;
- stages probe results before project commit;
- never publishes a partially committed project when cancelled during probing;
- commits through the existing schema-v1 project model.

No `schemaVersion` bump was needed.

## Deterministic initial order

The final initial order is independent of asynchronous probe completion.

Comparator priority:
1. valid positive metadata track number;
2. numeric filename token fallback, including leading numbers and `Track N`;
3. normalized filename;
4. normalized source identity;
5. original import ordinal as final stable tie-break.

A 120-item test intentionally completes probes out of order while concurrency is limited to 4. Final project order remains deterministic.

## Project commit behavior

Ready supported audio:
- creates a required audio media asset;
- persists source path / filename / size;
- persists validated metadata including positive duration;
- creates a linked track with `audioAssetId`;
- uses metadata title when available, otherwise filename stem.

Invalid-but-recognized audio:
- is retained explicitly as a required audio asset with `availability: invalid`;
- records its public error code;
- remains visible to later readiness/missing-media logic.

Unsupported files:
- are reported as rejected;
- are not silently inserted into the project.

Existing tracks/assets remain intact and imported tracks are appended in deterministic import order. Project revision increments only when supported media is committed.

## Representative real-parser fixtures

Repository tests use small **synthetic silent audio fixtures**, not third-party music:
- MP3;
- WAV;
- FLAC;
- M4A;
- AAC.

The tagged MP3 fixture verifies:
- title `Tagged Track`;
- artist `Fixture Artist`;
- album `Fixture Album`;
- track 7;
- year 2026.

Fixture generation used a temporary CI-only FFmpeg installation to create synthetic test bytes. The temporary workflow was removed before verification. **FFmpeg/FFprobe is not a runtime dependency or implementation of this application in T11-W02-03.**

## Validation and non-destructive proof

Real parser integration verifies:
- all five representative formats produce usable positive duration;
- source bytes remain unchanged;
- source size remains unchanged;
- source mtime remains unchanged;
- corrupt audio is classified explicitly;
- unsupported input is classified explicitly.

Unit coverage additionally verifies unreadable filesystem classification, duration-unavailable classification and sanitized parser errors.

## Mandatory task tests

Canonical #136 proves:
- format/lint/typecheck — PASS;
- architecture check — PASS;
- secrets/path/UI-reference checks — PASS;
- unit tests — PASS;
- contract tests — PASS;
- component tests — PASS;
- integration tests — PASS;
- 120-item out-of-order probe completion — deterministic PASS;
- bounded concurrency <= 4 — PASS;
- cancellation before commit — PASS;
- metadata fallback — PASS;
- real synthetic MP3/WAV/FLAC/M4A/AAC probing — PASS;
- corrupt/unsupported classification — PASS;
- source non-destructive checks — PASS;
- build — PASS.

## Trust boundary

- renderer still has no direct Node filesystem, dialog, provider or subprocess ownership;
- probing belongs to main infrastructure behind typed application/IPC/preload contracts;
- public batch item summaries remain path-free;
- project documents retain source references by design as source-of-truth data;
- no Gemini provider code was introduced;
- no FFmpeg/FFprobe runtime integration was introduced.

## Decoder compatibility limitation

`music-metadata` validates parser/container structure and metadata. This task does **not** claim that every structurally valid file is guaranteed to decode in the later final MP4 rendering pipeline. Encoder/decoder compatibility and exact FFmpeg/FFprobe integration remain owned by STEP 12 / later render integration.

## Canonical Windows CI #136

Run: `37594104866`  
Job: `112702409465`  
Head: `62bd3b76f7f45dad14938b1dd94f2e9ff73c2722`

Also PASS:
- runtime high-severity audit;
- STEP 10 SLC save/reopen E2E;
- W11-01 lifecycle E2E;
- W11-01 recovery E2E;
- SCR-002A capture;
- exact frozen UI baseline;
- Windows x64 package;
- packaged executable smoke;
- portable multi-file ZIP.

Artifacts:
- Windows portable: `11470605736`, digest `sha256:59157ea51024a166ab5051d51ff083a15cf75c5b48a171504094849cee15b658`;
- STEP 10 SLC evidence: `11470240832`;
- W11-01 lifecycle evidence: `11470235811`;
- W11-01 recovery evidence: `11469641842`;
- frozen visual baseline: `11469916151`.

## Scope protection

Explicitly not implemented:
- missing-media scan;
- individual relink;
- folder relink;
- relink ambiguity scoring;
- DLG-005 / media progress UI wiring;
- frozen media-state UI work;
- Gemini integration;
- FFmpeg/FFprobe runtime integration;
- final render/decoder compatibility claims.

## Gate

**T11-W02-03: PASS / VERIFIED.**

Next task becomes:
**T11-W02-04 — Missing Media Scan & Relink Core**

Do not start T11-W02-05 or later tasks before T11-W02-04 passes.
