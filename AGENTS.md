# AGENTS.md - Lagu Full Album

This file is the mandatory entry point for any AI/session modifying this repository.

## Read before changing anything
1. `PROJECT_STATE.md`
2. `docs/handoff/CURRENT_HANDOFF.md`
3. `docs/source-of-truth/INDEX.md`
4. Current planning DOCX under `docs/source-of-truth/planning/current/`
5. `docs/source-of-truth/ui/06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT.docx`
6. `docs/architecture/ARCHITECTURE.md`
7. `docs/architecture/CODE_CONSTITUTION.md`
8. `docs/architecture/REPOSITORY_MAP.md`
9. `docs/architecture/MODULE_OWNERSHIP_MAP.md`
10. `docs/architecture/DEPENDENCY_RULES.md`
11. relevant ADR/upstream/task documents.

Do not code from chat memory alone.

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
4. read Repository Map, Module Ownership, Dependency Rules;
5. read owner tests/contracts and relevant ADR;
6. explain why the canonical owner is insufficient before creating a second owner.

Modify the canonical owner first.

## Forbidden
- No feature coding while STEP 08 governance/documentation gate is incomplete.
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
