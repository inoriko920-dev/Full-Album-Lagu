# AGENTS.md - Lagu Full Album

This is the mandatory entry point for any AI/session modifying this repository.

## OWNER-MANDATED FEATURE FREEZE — FINAL TRIAL BUILD (2026-10-11 WIB)

**Binding instruction from the repository owner. This rule applies to SOL, ASTRA, all coding agents, PRs, scripts and every subsequent development session.**

- **FEATURE SET IS LOCKED.** Treat the behavior, functions, workflows, UI layout, labels, icons, logos, animations, transitions, presets, interfaces, and scope already approved by the owner as frozen. Do **not** autonomously add, remove, replace, redesign, expand, or silently change any approved feature or behavior.
- **DEFAULT WORK = MAINTENANCE OF EXISTING FEATURES ONLY.** Permitted work: reproduce/fix verified bugs; correctness and regression repairs; stability, performance and resource-leak fixes; security hardening; compatibility repairs; automated/manual QA; build, packaging and release-candidate preparation; and correcting UI drift against the **existing approved** reference. Changes must preserve user-visible approved behavior and workflow. Add tests/evidence for fixes. Refactoring is allowed only when necessary and behavior-preserving.
- **EXPLICIT OWNER REQUEST IS THE ONLY WAY TO UNLOCK FEATURE CHANGE.** A new feature, changed feature, removed feature, additional preset, altered UI/UX, or new functional scope requires a **specific, affirmative instruction from the owner identifying the desired change**. Generic prompts such as "lanjutkan", "selesaikan", "perbaiki", "buat final", "build", "cari bug", or "rapikan" are **not** authorization to introduce/change features. Agent suggestions, old roadmaps and its own interpretation are not owner approval.
- **PREPLANNED BUT NOT YET IMPLEMENTED IS NOT AUTOMATICALLY UNLOCKED.** Do not advance into W11-08/STEP12, new MP4 functionality, or other deferred scopes merely because they exist in planning. Require an explicit new owner instruction **and** previously required QA/Software Factory gates. Keep physical W11-06/W11-07 acceptance marked NOT_TESTED until actual owner-device evidence exists.
- **UI AND VISUAL ASSET GOVERNANCE STAYS IN FORCE.** Use only owner-approved UI/images and the frozen source-of-truth pack; never autonomously generate, replace, or reinterpret reference images or modify approved logos. If an essential new/revised image is required, supply the prompt to the owner and stop at the established UI gate.
- **WHEN UNSURE, DO NOT EXPAND SCOPE.** Keep the existing feature unchanged, document the proposed change separately, and require explicit owner authorization before implementing it. A bug fix must not become a new feature disguised as maintenance.
- **CURRENT RELEASE POSTURE:** prepare/preserve the existing Windows portable build as a **final trial/release candidate for owner testing**, not a certified production-final release. After owner testing, focus on repairing defects found in the already existing features. No final physical PASS claim or production release without real acceptance evidence.
- A specific later owner instruction may authorize a narrowly defined exception **only for the named change**; all other features remain locked. Any such approval must be documented before implementation and must respect remaining architecture, UI, QA, and release gates.

## Read before changing anything
1. `PROJECT_STATE.md`
2. `docs/handoff/CURRENT_HANDOFF.md`
3. `docs/source-of-truth/INDEX.md`
4. Current planning DOCX under `docs/source-of-truth/planning/current/`
5. `docs/source-of-truth/ui/06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT_SMALL.docx`
6. `docs/source-of-truth/factory/SOFTWARE_FACTORY_V2_COMPLETE_GUIDE.txt`
7. `docs/architecture/ARCHITECTURE.md`
8. `docs/architecture/CODE_CONSTITUTION.md`
9. `docs/architecture/REPOSITORY_MAP.md`
10. `docs/architecture/MODULE_OWNERSHIP_MAP.md`
11. `docs/architecture/DEPENDENCY_RULES.md`
12. relevant upstream/task/ADR material.

Do not code from chat memory alone. Do not use `planning/archive/` as current requirements.

## Project identity
- Product: Lagu Full Album
- V1: Windows 11 x64, portable multi-file ZIP
- Architecture: Electron modular monolith, React + TypeScript strict, ports/adapters
- Visual foundation: controlled SoundVisualizer-derived WebGL2 adapter
- AI: Gemini only, maximum 100 API keys
- Final render: MP4 video
- UI language: Bahasa Indonesia

## Frozen UI
Main Editor keeps left `Media | Layer | Inspector`, center Preview, permanent right `Gemini Agent`, bottom Album Timeline. Never replace Gemini right rail with Inspector.

## Architecture boundaries
- Renderer UI: presentation + ProjectSession only.
- Domain/application: framework/infrastructure independent.
- Electron main: filesystem, paths, persistence, jobs, Gemini provider/vault, logging, external tools.
- `src/renderer/visual` is the only product-facing gateway to retained visual internals.
- `src/render` consumes immutable render state.
- All project mutation after load/migration goes through CommandEngine.
- Raw keys never enter renderer/project/logs.

## Search -> Understand -> Modify
Before creating a file/service/helper:
1. search exact concept + synonyms;
2. search related interfaces/services/tests/config/docs;
3. search imports/call sites/registrations/reverse dependencies;
4. read Repository Map, Module Ownership and Dependency Rules;
5. read owner tests/contracts and relevant ADR;
6. explain why the canonical owner is insufficient before creating a second owner.

Modify the canonical owner first.

## Forbidden
- No feature coding before the active Software Factory gate allows it.
- No CommandEngine bypass.
- No renderer access to filesystem, child process, safeStorage, or Gemini SDK.
- No hardcoded C:/D:/checkout path or global FFmpeg/Node/Python dependency.
- No API keys, user vault, logs, caches, user project/media, build output, partial render in Git.
- No blind upstream UI/live/VJ/network/native copy.
- No force-reset of another session's work.
- No VERIFIED claim without evidence.

## Status language
PLANNED / IMPLEMENTED / VERIFIED / NOT_TESTED / BLOCKED.

## ASTRA review triggers
Stop for review if changing product/UI, Electron/React/TypeScript pillar, JSON project source of truth, ProjectSession/CommandEngine model, AI-provider policy, major dependency/license posture, portable contract, destructive migration, or cross-module architecture.

## After each meaningful task
Run relevant gates, update TASKS/PROJECT_STATE/CURRENT_HANDOFF, record commit/CI/artifact evidence, preserve source-of-truth.
