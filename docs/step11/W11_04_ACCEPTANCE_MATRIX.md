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

## Closure rule

W11-04 is not COMPLETE because code exists. T11-W04-06 must provide final Windows evidence, map AC-W11-04-01..22 to PASS, and record an architecture/UI/trust-boundary drift review with **no material drift**.
