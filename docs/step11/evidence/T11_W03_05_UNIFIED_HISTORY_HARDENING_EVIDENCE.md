# T11-W03-05 — UNIFIED BATCH HISTORY & EDGE-CASE HARDENING EVIDENCE

Task: **T11-W03-05**  
Wave: **W11-03 Album Timeline + Command History**  
Role: **SOL**  
Verified implementation head: `c1df8c4b101d69d3d5b28987efc88aaae0c44ce3`  
Windows CI: `37638091188` / run #240 — **PASS**  
CI job: `112849492104` — **PASS**  
Windows portable artifact: `11490767699`  
Frozen visual artifact: `11489524645`  
Gate: **PASS / VERIFIED**

## 1. Canonical command-origin hardening

The one CommandEngine contract is now runtime-enforced for exactly:
- `manual`
- `template`
- `auto-susun`
- `ai`

Unknown runtime origins are rejected with `INVALID_COMMAND` before publication. All four valid origins use identical command/history semantics. This proves the mutation seam without implementing Template, Auto Susun or Gemini features themselves.

## 2. Atomic batch hardening

PASS:
- ProjectSessionHistory now exposes the same `executeBatch` seam as ProjectCommandEngine;
- one successful multi-command batch = one revision + one history node + one Undo;
- child command origins must match the batch origin;
- stale child expectation rejects the full batch;
- thrown child failure rejects the full batch;
- no partial semantic state/history publication occurs on failure;
- a batch whose final semantic state equals the starting state is a no-op with no revision/history noise;
- diagnostics remain sanitized and do not surface internal error text or raw paths.

## 3. Redo / divergent branch hardening

PASS:
- Undo exposes Redo;
- a new command after Undo truncates the prior Redo branch;
- divergent state receives a new logical state token;
- saved checkpoint identity is not falsely reused on a divergent branch;
- revision remains monotonic across execute/Undo/Redo.

## 4. Save checkpoint race hardening

A real race was closed:
- Save now captures the project revision + logical state token at request time;
- if the user edits while the Save request is in flight, a successful Save marks the **captured** checkpoint as saved rather than requiring it to still be current;
- the newer live project remains dirty;
- Undo back to that saved logical token becomes clean;
- a mismatched revision returned by persistence is rejected safely as a write-contract error.

This prevents a successful older Save from being misreported as failure and prevents a newer live state from being falsely marked clean.

## 5. Recovery race hardening

A second real race was closed:
- Recovery captures the current logical token/revision before the async accept request;
- if user state changes before the recovery result returns, the late recovery result is ignored;
- the newer user command is preserved;
- the recovery notice remains available for an explicit retry;
- a second guard runs after media scanning so edits that occur during the scan are also protected.

This prevents late recovery completion from overwriting newer user work.

## 6. Autosave / logical dirty interaction

PASS:
- a late Save checkpoint keeps the newer state dirty with the older saved revision;
- dirty recovery autosave receives the correct saved revision;
- Undo back to the saved logical token returns `dirty=false`;
- renderer autosave scheduling remains governed by logical `dirty`, so Undo-to-saved stops further autosave scheduling even though numeric revision continues increasing.

No recovery schema or autosave IPC contract change was required.

## 7. 128-track stress proof

Windows unit verification covers:
- 128 tracks;
- 60 atomic track batches;
- each batch combines enabled-state + reorder through `auto-susun` origin contract;
- 60 Undo operations;
- 60 Redo operations;
- canonical order deterministic after Redo;
- baseline order restored after full Undo;
- timeline remains complete;
- enabled-track count and total derived duration remain deterministic;
- history depth/revision/state-token invariants remain correct.

No cloud/provider/runtime dependency is used by this stress path.

## 8. Windows regression gate

Windows CI #240 passed:
- Prettier / ESLint / TypeScript;
- architecture, secret and portable-path checks;
- UI reference verification;
- unit, contract, component and integration tests;
- production build;
- runtime dependency audit;
- STEP 10 save/reopen E2E;
- W11-01 lifecycle E2E;
- W11-01 recovery E2E;
- W11-02 media closure E2E;
- exact frozen SCR-002A screenshot/baseline verification;
- Windows x64 packaging;
- packaged executable smoke;
- portable multi-file ZIP.

## 9. Acceptance contribution

T11-W03-05 contributes verified evidence to AC-W11-03-10..19:
- single semantic command and batch revision/history invariants;
- deterministic Undo/Redo;
- Redo invalidation after divergent branch;
- atomic batch rollback and one-Undo semantics;
- origin unification;
- logical saved checkpoint / dirty / autosave behavior;
- recovery concurrency protection;
- 100+ track deterministic history/timeline stress;
- sanitized offline diagnostics.

Final AC-W11-03-01..20 closure remains owned by T11-W03-06.

## 10. Protected boundaries / drift result

PASS:
- no schemaVersion bump;
- no persisted cumulative boundaries or duplicate order source;
- no second history stack;
- no renderer filesystem/provider/subprocess ownership;
- no persistent Undo history;
- no Template/Auto Susun/Gemini feature implementation;
- no FFmpeg/FFprobe integration;
- no UI redesign or new UI prompt/image;
- no source-media mutation.

## 11. Gate verdict

**T11-W03-05 = PASS / VERIFIED.**

Only **T11-W03-06 — Wave E2E, Drift Review & Evidence Closure** may become READY next. W11-04 remains blocked until T11-W03-06 closes W11-03.
