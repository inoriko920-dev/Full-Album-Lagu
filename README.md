# Lagu Full Album

**Status:** Software Factory STEP 08 - Repository Foundation (documentation/governance bootstrap).

Lagu Full Album is a Windows 11 x64 desktop application for producing full-album MP4 videos from multiple audio tracks, artwork/background media, visualizers, transitions, and track metadata. The editor remains fully manual-capable; a permanent right-side **Gemini Agent** acts as a structured copilot over the same project state and command/history system.

## Current maturity

- Product Definition: complete.
- GitHub/upstream discovery: complete.
- UI/UX: frozen; 29 approved reference states.
- Architecture: complete with bounded provisional implementation details.
- Code Constitution & Repository Architecture: complete.
- Product code: **not started**.
- STEP 08 task in progress: source-of-truth/governance bootstrap.

## Read first

1. `AGENTS.md`
2. `PROJECT_STATE.md`
3. `docs/handoff/CURRENT_HANDOFF.md`
4. `docs/source-of-truth/INDEX.md`
5. `docs/architecture/ARCHITECTURE.md`
6. `docs/architecture/CODE_CONSTITUTION.md`
7. `docs/architecture/REPOSITORY_MAP.md`
8. `docs/architecture/MODULE_OWNERSHIP_MAP.md`
9. `docs/architecture/DEPENDENCY_RULES.md`

## Locked product facts

- Windows 11 x64, portable multi-file ZIP target.
- Main Editor layout: left `Media | Layer | Inspector`, center Preview, permanent right `Gemini Agent`, bottom Album Timeline.
- Gemini-only V1; maximum 100 API keys; masked/secure storage.
- Manual editing and render remain usable without Gemini.
- Manual edits and Gemini edits share one Project State + Command Engine + Undo/Redo.
- Final render is **video MP4**, not audio-only.
- Templates are visual/non-destructive.
- Source media is referenced, not modified.

## Repository rule

Feature coding is blocked until the STEP 08 documentation/governance gate is verified. This repository must preserve the planning, UI reference, Software Factory guidance, current state, and handoff before application source work begins.
