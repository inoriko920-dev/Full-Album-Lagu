# Lagu Full Album

**Status:** Software Factory STEP 08 - Repository Foundation. S08-T01 and S08-T02 are verified; S08-T03 is next.

Lagu Full Album is a Windows 11 x64 desktop application for producing full-album MP4 videos from multiple audio tracks, artwork/background media, visualizers, transitions and track metadata. The editor remains fully manual-capable; a permanent right-side **Gemini Agent** acts as a structured copilot over the same project state and command/history system.

## Current maturity

- Product Definition: complete.
- GitHub/upstream discovery: complete.
- UI/UX: frozen; 29 approved reference states.
- Architecture: complete with bounded provisional external-tool/provider details.
- Code Constitution & Repository Architecture: complete.
- Source-of-truth/governance bootstrap: verified.
- Electron + React + TypeScript foundation skeleton: verified from a clean Windows lockfile install.
- Product feature implementation: **not started**.
- Next: persistent CI + Windows packaging smoke (S08-T03).

## Foundation evidence

Clean Windows GitHub Actions verification proves:
- `npm ci` reproducibility;
- formatting/lint/typecheck/architecture/security/path gates;
- unit, contract and component tests;
- main/preload/renderer/render builds;
- runtime dependency audit at high severity threshold.

See `docs/architecture/S08_T02_LOCKFILE_VERIFICATION.md` and `docs/architecture/adr/ADR-0013-foundation-toolchain-baseline.md`.

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
- Main Editor: left `Media | Layer | Inspector`, center Preview, permanent right `Gemini Agent`, bottom Album Timeline.
- Gemini-only V1; maximum 100 API keys; masked/secure storage.
- Manual editing and render remain usable without Gemini.
- Manual and Gemini edits share one Project State + Command Engine + Undo/Redo.
- Final render is **video MP4**, not audio-only.
- Templates are visual/non-destructive.
- Source media is referenced, not modified.

## Current implementation boundary

The current UI is deliberately a foundation-only shell. Frozen product screens, SoundVisualizer integration, Gemini integration and FFmpeg render integration belong to later factory work and must not be inferred as complete.
