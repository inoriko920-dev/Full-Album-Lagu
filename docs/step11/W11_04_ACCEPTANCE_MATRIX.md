# W11-04 — Acceptance Matrix

Wave: **Auto Susun + Track Binding**  
Features: FTR-005 + FTR-006; FTR-013/FTR-018 cross-cut  
Planning baseline: `main@b89326e99e03ec7a7cd596f3b2c4c7a5338c4442`

| ID | Acceptance condition | Planned owner |
|---|---|---|
| AC-W11-04-01 | Legacy schema-v1 project without W11-04 fields opens/saves/reopens without semantic loss. | T11-W04-01/06 |
| AC-W11-04-02 | Optional binding/default artwork fields round-trip; artwork refs validate as image assets. | 01 |
| AC-W11-04-03 | Resolved title/artist/album/year/artwork follows locked priority and provenance deterministically. | 01/04 |
| AC-W11-04-04 | Resolver is pure/offline and does not persist derived display values merely because they were resolved. | 01 |
| AC-W11-04-05 | Auto Susun stable comparator produces deterministic recommended order independent of async completion order. | 02 |
| AC-W11-04-06 | Re-running Auto Susun on unchanged state is idempotent/no-op with no revision/history noise. | 02 |
| AC-W11-04-07 | Auto Susun preserves track IDs, audio links, source refs, disabled state and explicit manual overrides. | 02 |
| AC-W11-04-08 | One Auto Susun action = one auto-susun CommandBatch, one revision, one Undo/Redo step. | 02 |
| AC-W11-04-09 | Stale plan/revision/token rejects atomically with no partial project publication. | 02 |
| AC-W11-04-10 | PNG/JPEG/WebP artwork intake is main-owned, optional and source-preserving. | 03 |
| AC-W11-04-11 | Per-track artwork overrides album default; clearing override restores default/placeholder. | 03/04 |
| AC-W11-04-12 | Missing/invalid optional artwork degrades gracefully and does not make required-audio readiness false. | 03/06 |
| AC-W11-04-13 | Artwork import+bind as one user action can be undone/redone atomically. | 03 |
| AC-W11-04-14 | Metadata override Apply/Clear uses manual command history; draft typing stays session-only/non-dirty. | 04/05 |
| AC-W11-04-15 | Relink/refreshed audio metadata changes derived fallback when no manual override blocks it. | 04 |
| AC-W11-04-16 | Save/reopen persists canonical order, explicit overrides and artwork refs/defaults with correct clean/dirty semantics. | 04/06 |
| AC-W11-04-17 | Frozen Auto Susun/Inspector/Media/Timeline wiring preserves shell hierarchy and permanent Gemini rail. | 05/06 |
| AC-W11-04-18 | Global Undo/Redo restores Auto Susun and manual binding semantic state with monotonic revision. | 02..06 |
| AC-W11-04-19 | 128-track stress remains deterministic/responsive with no renderer O(n²) lockup. | 02/06 |
| AC-W11-04-20 | Audio/image source SHA-256, size and mtime remain unchanged across W11-04 operations. | 03/06 |
| AC-W11-04-21 | Architecture, secret, portable-path and trust-boundary gates pass; no Gemini/FFmpeg dependency is required. | all/06 |
| AC-W11-04-22 | STEP10 + W11-01 + W11-02 + W11-03 + exact frozen UI + Windows package/smoke/ZIP regressions all pass. | 06 |

## T11-W04-01 checkpoint evidence

- T11-W04-01 status: **PASS / VERIFIED**.
- Verified implementation head: `706116e2e85b963d0d6570907f70d57a614ef0e6`.
- Windows CI: `37649707029` / #252 PASS.
- Evidence: `evidence/T11_W04_01_BINDING_SCHEMA_RESOLVER_EVIDENCE.md`.
- Verified contribution: AC-01 legacy schema-v1 compatibility; AC-02 additive binding/default artwork fields + image-only references; AC-03 resolver priority/provenance foundation; AC-04 pure/offline resolver + no derived persistence; AC-21 architecture/secrets/paths/provider-free regression; AC-22 STEP10/W11-01/W11-02/W11-03/frozen UI/package regressions.
- These are **task-level verified contributions**, not final W11-04 closure.

## T11-W04-02 checkpoint evidence

- T11-W04-02 status: **PASS / VERIFIED**.
- Verified implementation head: `e2bf67f6bd276748b3852a233873210aae9dfdf4`.
- Windows CI: `37653317447` / #268 PASS.
- Evidence: `evidence/T11_W04_02_AUTO_SUSUN_PLANNER_EVIDENCE.md`.
- Verified contribution: AC-05 deterministic comparator independent of media-array completion order; AC-06 repeat no-op/idempotence; AC-07 IDs/audio/source/disabled/manual binding preservation; AC-08 one auto-susun CommandBatch/one revision/one Undo-Redo step; AC-09 stale revision/token + tampered plan atomic rejection; AC-18 core Undo/Redo semantic restoration; AC-19 128-track deterministic stress; AC-21 provider-free architecture/secrets/paths gate; AC-22 prior-wave/frozen UI/package regressions.
- These are **task-level verified contributions**, not final wave closure.

## T11-W04-03 checkpoint evidence

- T11-W04-03 status: **PASS / VERIFIED**.
- Verified implementation head: `f2e33b6ec6a08b3d92acbe4963a1cf73c7086825`.
- Windows CI: `37657078199` / #278 PASS; job `112914788723`.
- Evidence: `evidence/T11_W04_03_ARTWORK_INTAKE_BINDING_EVIDENCE.md`.
- Verified contribution: AC-10 main-owned PNG/JPEG/WebP optional source-preserving intake; AC-11 per-track artwork priority and clear-to-default/placeholder behavior; AC-12 missing optional artwork stays nonblocking while corrupt/unsupported intake fails safely; AC-13 one import+bind is one atomic manual history step with Undo/Redo; AC-18 artwork history semantics; AC-20 source-image byte/size/mtime immutability contribution; AC-21 architecture/secrets/portable-path/provider-free gates; AC-22 prior-wave/frozen-UI/package/smoke/ZIP regression contribution.
- Full SHA-256/source-immutability matrix and final AC-W11-04-01..22 closure remain owned by T11-W04-06.

## T11-W04-04 checkpoint evidence

- T11-W04-04 status: **PASS / VERIFIED**.
- Verified implementation head: `ea2b6230af036f9eed05232d5ef0cd96609abb7d`.
- Windows CI: `37659863455` / #283 PASS; job `112924307870`.
- Evidence: `evidence/T11_W04_04_METADATA_DYNAMIC_BINDING_EVIDENCE.md`.
- Verified contribution: AC-03 manual override priority/provenance integration; AC-11 artwork remains preserved while metadata fields are set/cleared; AC-14 Apply/Clear use manual command history while draft helpers remain session-only/non-dirty; AC-15 relink-refreshed audio metadata becomes the derived fallback when no manual override blocks the field; AC-16 explicit overrides persist through Save/Reopen without derived duplication; AC-18 Undo/Redo restores metadata semantic state and the logical saved checkpoint with monotonic revision; AC-21 architecture/secrets/portable-path/provider-free gates; AC-22 prior-wave/frozen-UI/package/smoke/ZIP regression contribution.
- Final complete AC-W11-04-01..22 closure remains owned by T11-W04-06.

## Closure rule

W11-04 is not COMPLETE because code exists. T11-W04-06 must provide final Windows evidence, map AC-W11-04-01..22 to PASS, and record an architecture/UI/trust-boundary drift review with **no material drift**.
