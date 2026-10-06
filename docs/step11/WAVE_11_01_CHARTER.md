# W11-01 WAVE CHARTER — PROJECT LIFECYCLE & RECOVERY CORE

**WAVE-ID:** W11-01  
**Role for planning:** ASTRA  
**Execution owner:** SOL  
**Baseline analyzed:** `main@da5b6786d0daa472c474a33ffd83a5834af24f82`  
**Features:** FTR-001, FTR-002, FTR-018 cross-cut  
**Status:** **READY**  
**Coding in this planning checkpoint:** NOT STARTED

## Objective

Turn the STEP 10 save/reopen vertical slice into a dependable project lifecycle and recovery core that later media/timeline/editor waves can safely build upon.

## Scope IN

- Open Project through the existing trust boundary.
- Save to known current project path after first save/open.
- Save As with native path selection.
- Stable current project path ownership outside renderer filesystem access.
- Explicit dirty/saved state.
- Periodic autosave snapshot/generation for dirty projects.
- Startup recovery detection and offer.
- Accept/discard recovery behavior.
- Crash-safe/atomic project writes.
- Unicode + spaces in paths.
- Explicit cancel/error states and sanitized diagnostics.
- Automated unit/contract/integration/E2E evidence.
- Handoff/state/evidence updates.

## Scope OUT

- Audio/media import/probe/relink.
- Track editing/timeline calculation.
- CommandEngine/Undo-Redo redesign.
- Persistent undo history.
- Schema migration beyond current schema v1 unless a blocking defect is found.
- File locking/multi-instance coordination.
- Recent-projects library.
- Gemini/provider/credential vault.
- FFmpeg/render engine.
- Cloud sync.
- Frozen UI redesign.

## Architecture contracts

- Renderer never receives arbitrary filesystem APIs or Electron dialog objects.
- Renderer -> typed preload -> IPC -> application use case -> ProjectStore remains the persistence direction.
- Project file is the source of truth after successful Save/Open.
- Autosave/recovery is a separate recovery artifact and must never masquerade as a successful user Save.
- Primary save remains atomic using temporary write + replace/rename semantics.
- Errors are internal/sanitized and mapped before UI display.
- No project secret/provider credential data.

## UI contracts

Use existing frozen screens/states. Add only state wiring needed for Open/Save/Save As/recovery/cancel/error. Material visual hierarchy changes require ASTRA/UI change review.

## Acceptance

- **AC-W11-01-01** known-path Save does not reopen Save As unnecessarily.
- **AC-W11-01-02** Save As cancel leaves project/path/state unchanged.
- **AC-W11-01-03** Open cancel leaves current project unchanged.
- **AC-W11-01-04** valid Open restores the same project state.
- **AC-W11-01-05** mutations after save set dirty; successful save clears dirty.
- **AC-W11-01-06** dirty project generates recovery snapshot/generation.
- **AC-W11-01-07** startup detects newer valid recovery and offers recovery.
- **AC-W11-01-08** discard recovery does not overwrite the primary project.
- **AC-W11-01-09** corrupt/stale recovery fails safely with actionable state.
- **AC-W11-01-10** Unicode/spaces path scenarios pass.
- **AC-W11-01-11** renderer has no direct fs/dialog access.
- **AC-W11-01-12** core lifecycle works offline.
- **AC-W11-01-13** logs/evidence contain no secret material and avoid unnecessary private paths.
- **AC-W11-01-14** Windows CI and frozen UI baseline remain green.

## Mandatory tests

Unit + contract + persistence integration + component state tests + deterministic Windows E2E for save/open/autosave/recovery + current packaged smoke. Native dialog click may use test seam/path injection in CI, but production must still use the same official pipeline.

## Evidence

Wave report, task results/SHAs, test summary, E2E artifacts, relevant UI screenshot/state evidence, architecture drift review, known limitations, PROJECT_STATE/TASKS/handoff.

## Failure classes

`OPEN_CANCELLED`, `SAVE_AS_CANCELLED`, `PROJECT_NOT_FOUND`, `PROJECT_INVALID`, `PROJECT_READ_FAILED`, `PROJECT_WRITE_FAILED`, `RECOVERY_INVALID`, `RECOVERY_STALE`, `AUTOSAVE_WRITE_FAILED`.

## Rollback / recovery

Normal Git revert per coherent task checkpoint. User project files written successfully must remain readable by the prior schema-v1 baseline. Recovery artifacts are disposable only when proven not newer/needed.

## Astra review triggers

Schema v1 must materially change; persistence ownership crosses module boundary; recovery requires new security/privacy behavior; UI Freeze needs structural redesign; repeated failures expose a flawed STEP 10 seam.

## Definition of Ready

Requirement refs known — PASS. Baseline known — PASS. Dependencies known — PASS. Owner known — PASS. UI/data/error contracts known — PASS. Tests/evidence defined — PASS. Scope OUT explicit — PASS. Rollback known — PASS.
