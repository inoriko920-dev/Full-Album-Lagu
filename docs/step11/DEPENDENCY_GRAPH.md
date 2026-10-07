# STEP 11 DEPENDENCY GRAPH & WAVE ORDER

Baseline: `main@da5b6786d0daa472c474a33ffd83a5834af24f82`

Dependency semantics:
- **HARD**: downstream capability cannot be meaningfully verified first.
- **SOFT**: can be developed independently but integration quality improves with predecessor.
- **DATA/SCHEMA**: project/session/persistence state contract dependency.
- **UI**: frozen UI state/interaction dependency.
- **RISK**: security/performance/runtime uncertainty suggests later sequencing.
- **PACKAGING/RUNTIME**: bundled runtime/tool dependency.

## Planned sequence

1. **W11-01 — Project Lifecycle & Recovery Core** — FTR-001 + FTR-002 + FTR-018 — **COMPLETE / PASS**
2. **W11-02 — Media Intake Foundation** — FTR-003 + FTR-016 + FTR-018 — **IN PROGRESS; T11-W02-01 PASS; T11-W02-02 NEXT**
3. **W11-03 — Album Timeline + Command History** — FTR-004 + FTR-013 + FTR-018
4. **W11-04 — Auto Susun + Track Binding** — FTR-005 + FTR-006
5. **W11-05 — Manual Layer Editor + Templates** — FTR-007 + FTR-011 + FTR-013
6. **W11-06 — Preview + Audio-Reactive Visuals** — FTR-012 + FTR-008
7. **W11-07 — Animation + Boundary Transitions** — FTR-009 + FTR-010
8. **W11-08 — Render Readiness Contract** — FTR-017 + FTR-018
9. **STEP12-AI** — FTR-015 then FTR-014
10. Conditional/future: FTR-019..023 according to evidence and release need.

## Critical edges

- FTR-001 -> FTR-002: autosave/recovery needs stable project lifecycle/path ownership.
- FTR-003 -> FTR-004: timeline state needs validated media identities/durations.
- FTR-004 + FTR-013 -> FTR-005: Auto Susun must create deterministic album state through official command/history seams.
- FTR-003 + FTR-004 -> FTR-006: metadata/artwork binding needs stable tracks and active-track semantics.
- FTR-013 -> FTR-007/FTR-011/FTR-014: manual/template/AI mutations must converge on one history mechanism.
- FTR-012 + FTR-003 -> FTR-008: reactive preview needs playable/analyzable audio plus preview lifecycle.
- FTR-004 + FTR-006 + FTR-009 -> FTR-010: boundary transitions coordinate track state, bindings and animation.
- FTR-017 depends on verified project/media/visual/timeline state; external encoder/runtime is STEP 12.

## Why W11-01 first

STEP 10 already proved one thin persistence path. W11-01 extends that seam into the minimum reliable lifecycle needed by every later feature: known-path Save, Save As, Open, dirty state, autosave snapshots and crash recovery. It is high-unlock, offline, deterministic, and does not require Gemini/FFmpeg/provider decisions.


## W11-01 completion

W11-01 dependency unlock is proven and closed. FTR-001 and FTR-002 are verified and may now serve as prerequisites for later waves. FTR-018 remains active cross-cutting work.

W11-02 ASTRA planning is complete and DoR is PASS. T11-W02-01 is COMPLETE / PASS. T11-W02-02 is now the only READY implementation task; T11-W02-03..06 remain dependency-blocked. W11-03 remains blocked until W11-02 closes COMPLETE / PASS.


## W11-02 planning checkpoint

- Baseline: `main@c791e9bebc30c7db9337f4341cfdd7e421a64b57`.
- Features: FTR-003 + FTR-016 + FTR-018 cross-cut.
- Planning gate: PASS.
- DoR: PASS.
- Acceptance: AC-W11-02-01..18.
- Serial tasks: T11-W02-01 PASS -> T11-W02-02 READY -> T11-W02-03..06 BLOCKED.
- W11-03 remains HARD-blocked on W11-02 closure.
