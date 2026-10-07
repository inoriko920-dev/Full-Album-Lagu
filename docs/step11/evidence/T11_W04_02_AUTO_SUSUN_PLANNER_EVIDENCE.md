# T11-W04-02 — DETERMINISTIC AUTO SUSUN PLANNER + COMMANDBATCH EVIDENCE

Task: **T11-W04-02**  
Wave: **W11-04 Auto Susun + Track Binding**  
Role: **SOL**  
Verified implementation head: `e2bf67f6bd276748b3852a233873210aae9dfdf4`  
Windows CI: `37653317447` / run #268 — **PASS**  
CI job: `112901989191` — **PASS**  
Windows portable artifact: `11497287480`  
Frozen visual artifact: `11496953525`  
Gate: **PASS / VERIFIED**

## 1. Pure deterministic Auto Susun planner

Added `src/core/application/services/auto-arrange-service.ts`.

The planner:
- parses canonical schema-v1 ProjectDocument;
- requires a non-empty logical state token;
- reads only project/media metadata already in memory;
- performs no filesystem, network, provider, subprocess or UI work;
- emits an explicit `AutoArrangePlan` containing project identity, base revision, base state token, ordered track IDs and per-track from/to diagnostics.

No second persisted order source is introduced. Canonical order remains `ProjectDocument.tracks[]`.

## 2. Locked ordering rule

The implemented stable order follows the W11-04 charter:

1. effective positive numeric order = audio metadata `trackNumber` when valid, otherwise leading filename order number;
2. tracks with a valid numeric order sort before tracks without one;
3. equal/missing numeric order falls back to normalized filename/title text;
4. original canonical index is the stable tie break;
5. stable track ID is the final total-order tie break.

The implementation reuses the established W11-02 filename-number parser, so filename ordering semantics do not fork into a second rule.

Media-asset array order does not affect the result because assets are resolved by stable ID.

## 3. Idempotence

PASS:
- first Auto Susun on an unsorted project applies one semantic change;
- re-planning the resulting unchanged state returns `changed=false`;
- applying that second plan returns CommandEngine `noop`;
- no extra revision, history node, Undo depth or Redo noise is created.

## 4. One CommandBatch / one history step

`createAutoArrangeCommandBatch(plan)` produces:
- batch kind `album.auto-arrange`;
- origin `auto-susun`;
- one atomic apply-order child command using the same origin;
- expected base revision + expected state token copied from the plan.

PASS:
- one Auto Susun apply increments revision once;
- creates exactly one history entry;
- creates exactly one Undo/Redo step;
- Undo restores the original canonical order;
- Redo restores the arranged order;
- revision remains monotonic through history traversal.

## 5. Stale/tampered plan safety

PASS:
- stale revision plan rejects before publication;
- stale state-token plan rejects before publication;
- tampered plan with unknown track ID rejects atomically;
- no partial order is published;
- no history/revision noise is created by rejected plans;
- batch construction clones the plan so caller mutation after batch creation cannot change the pending operation.

## 6. Preservation rules

Auto Susun changes only canonical track order.

Verified preserved by stable track ID:
- `track.id`;
- `audioAssetId`;
- `sourcePath`;
- existing `enabled` state, including disabled tracks;
- explicit `binding` object and all manual metadata/artwork overrides;
- album presentation and media assets.

No source audio/image file is read or modified by this core operation.

## 7. 128-track stress proof

The unit stress fixture contains 128 tracks with:
- mixed metadata track numbers;
- mixed filename order numbers;
- missing metadata track numbers;
- disabled tracks;
- explicit manual title/artist bindings;
- stable audio IDs/source references.

PASS:
- two identical inputs produce identical plans;
- all 128 unique IDs are present exactly once;
- one batch applies the full plan;
- every identity/binding/enabled state remains unchanged by track ID;
- re-run is no-op;
- full Undo restores original order;
- Redo restores planned order.

The planner is pure synchronous in-memory work and introduces no renderer loop or cloud dependency.

## 8. Windows regression gate

Windows CI #268 passed:
- Prettier / ESLint / TypeScript;
- architecture, secret and portable-path checks;
- UI reference verification;
- unit, contract, component and integration tests;
- production build;
- runtime high-severity dependency audit;
- STEP 10 save/reopen E2E;
- W11-01 lifecycle + recovery E2E;
- W11-02 media closure E2E;
- W11-03 album timeline/history closure E2E;
- exact frozen SCR-002A screenshot/baseline;
- Windows x64 package;
- packaged executable smoke;
- portable multi-file ZIP.

## 9. Acceptance contribution

T11-W04-02 provides verified evidence for:
- AC-W11-04-05 deterministic stable Auto Susun ordering;
- AC-W11-04-06 idempotent/no-op repeated run;
- AC-W11-04-07 preservation of IDs/audio/source/disabled/manual overrides;
- AC-W11-04-08 one auto-susun CommandBatch / one revision / one Undo-Redo step;
- AC-W11-04-09 stale/tampered plan atomic rejection;
- AC-W11-04-18 global CommandEngine Undo/Redo semantics at core level;
- AC-W11-04-19 128-track deterministic core stress;
- AC-W11-04-21 architecture/provider-free/trust-boundary regression;
- AC-W11-04-22 all prior waves/frozen UI/package regressions.

These are task-level contributions only. W11-04 remains in progress.

## 10. Protected boundaries

PASS:
- no artwork picker/intake/relink;
- no metadata override mutation commands;
- no Inspector/UI wiring;
- no new UI prompt/image generation;
- no Gemini/provider work;
- no FFmpeg/FFprobe;
- no source-media mutation;
- no persistent Undo history;
- no schemaVersion bump;
- no duplicate persisted order field;
- no second Project State/history owner.

## 11. Gate verdict

**T11-W04-02 = PASS / VERIFIED.**

Only **T11-W04-03 — Artwork Intake + Binding Commands** may become READY next. T11-W04-04..06 remain serially blocked.
