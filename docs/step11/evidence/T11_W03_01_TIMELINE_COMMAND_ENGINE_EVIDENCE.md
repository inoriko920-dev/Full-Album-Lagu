# T11-W03-01 — TIMELINE DOMAIN + COMMAND ENGINE CORE EVIDENCE

Task: **T11-W03-01**  
Wave: **W11-03 Album Timeline + Command History**  
Role: **SOL**  
Implementation head verified: `d0ab313bece2e9ef730ee41f417310501214d7b1`  
Windows CI: `37624594282` / run #192 — **PASS**  
CI job: `112803016531` — **PASS**  
Windows portable artifact: `11484295009`  
Gate: **PASS / VERIFIED**

## 1. Delivered scope

### Additive schema-v1 track state
- Added optional `track.enabled`.
- Legacy track with no `enabled` field remains semantically enabled.
- No `schemaVersion` bump.
- JsonProjectStore round-trip covers explicit `enabled: false` while prior legacy round-trip continues preserving omission.

### Pure album timeline projection
- Added `projectAlbumTimeline()` as a domain-only projection.
- Canonical sequence comes from `ProjectDocument.tracks[]`.
- Disabled tracks remain in project state but are excluded from effective sequence/duration.
- Enabled track duration comes from the validated W11-02 audio media metadata.
- Cumulative `startMs` and `endMs` are derived, never persisted.
- If an enabled track has no usable duration, the projection marks that track and downstream absolute timing unresolved instead of inventing time.
- 105-track deterministic projection is covered.

### Unified CommandEngine core
- Added one framework-independent `ProjectCommandEngine`.
- Supported origins are `manual | template | auto-susun | ai`.
- One successful semantic command creates one history entry and exactly one project revision increment.
- Semantic no-op creates neither history nor revision noise.
- Expected revision and logical state-token stale guards reject safely.
- Undo/Redo restore semantic states while project revision remains monotonic.
- Logical state token travels with the semantic history state, providing the checkpoint primitive needed by T11-W03-02.
- New command after Undo invalidates the redo branch.
- History is bounded in memory only; persistent Undo remains FTR-023 future work.
- `CommandBatch` is atomic: success publishes once and is one Undo; any failed subcommand publishes nothing.
- Mixed command origins inside a batch are rejected.
- Command failure results are sanitized and do not expose internal exception/path text.

## 2. Files changed

Production:
- `src/core/domain/project-document.ts`
- `src/core/domain/album-timeline.ts`
- `src/core/application/services/project-command-engine.ts`

Verification:
- `tests/unit/album-timeline.test.ts`
- `tests/unit/project-command-engine.test.ts`
- `tests/contract/command-history-contract.test.ts`
- `tests/integration/json-project-store.test.ts`

No renderer, preload, IPC, main infrastructure, provider, FFmpeg/FFprobe, or product UI file is changed by this task.

## 3. Mandatory task tests

PASS:
- legacy schema-v1 compatibility;
- additive enabled-state persistence;
- boundary projection for empty/effective-zero, one/many and 105 tracks;
- disabled-track exclusion;
- unresolved-duration behavior;
- execute / semantic no-op / stale-revision / stale-state-token rejection;
- monotonic Undo/Redo;
- divergent redo-branch invalidation;
- bounded in-memory history;
- atomic batch success as one revision / one Undo;
- failed batch rollback with no partial state;
- common origin contract for manual/template/auto-susun/ai;
- sanitized command failure result.

## 4. Canonical Windows regression gate

Windows CI #192 passed:
- Prettier / lint / TypeScript;
- architecture check;
- secret and portable-path checks;
- frozen UI reference verifier;
- unit, contract, component and integration tests;
- build;
- runtime dependency audit;
- STEP 10 save/reopen E2E;
- W11-01 lifecycle E2E;
- W11-01 recovery E2E;
- W11-02 media-intake closure E2E;
- exact frozen SCR-002A capture/verification;
- Windows x64 package;
- packaged executable smoke;
- portable multi-file ZIP.

## 5. Acceptance contribution

This task establishes the foundation for AC-W11-03-01, 02, 07, 09..14, 18 and 19. It does **not** claim full wave acceptance yet. Session migration, saved-checkpoint dirty semantics, actual reorder/enable commands and UI are intentionally left to later serial W11-03 tasks.

## 6. Protected boundaries / drift review

PASS:
- no schema version bump;
- no persisted duplicate order/start/end source of truth;
- no renderer-owned shadow Project State;
- no second history stack;
- no Gemini/provider code;
- no FFmpeg/FFprobe/runtime tool integration;
- no source-media mutation;
- no frozen UI redesign or new UI prompt/image;
- no T11-W03-02 implementation pulled forward.

## 7. Gate verdict

**T11-W03-01 = PASS / VERIFIED.**

Only **T11-W03-02 — Existing Mutation Migration + Session Checkpoint Semantics** may become READY next. T11-W03-03..06 and W11-04 remain blocked.
