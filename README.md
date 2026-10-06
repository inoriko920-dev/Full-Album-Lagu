# Lagu Full Album

**Status:** Software Factory STEP 09 App Shell / UI Implementation is in progress. S09-T01 and S09-T02 are verified; S09-T03 is next.

Lagu Full Album is a Windows 11 x64 desktop application for producing full-album MP4 videos from multiple audio tracks, artwork/background media, visualizers, transitions and track metadata. The editor remains fully manual-capable; a permanent right-side **Gemini Agent** is designed as a structured copilot over the same project state and command/history system.

## Current maturity
- Product Definition: complete.
- GitHub/upstream discovery: complete.
- UI/UX: frozen; 29 approved visual states.
- Architecture: complete with bounded later integration details.
- Code Constitution & Repository Architecture: complete.
- Source-of-truth/governance: verified.
- Electron + React + TypeScript foundation: verified.
- Machine-readable UI Reference/Freeze manifests and integrity gate: verified.
- Persistent Windows CI + packaged executable smoke + foundation portable ZIP artifact: verified.
- Frozen UI shell implementation: S09-T01 verified.
- Minimal renderer design tokens/shared controls: S09-T02 verified with pixel-identical SCR-002A output.
- Real media/Gemini/render product engines: **not started**.
- Next task: `S09-T03 First Frozen Reference Screen + Screenshot Baseline`.

## Foundation evidence
Authoritative STEP 08 evidence is recorded in:
- `docs/architecture/S08_T02_LOCKFILE_VERIFICATION.md`
- `docs/architecture/S08_T03_CI_PACKAGING_EVIDENCE.md`
- `docs/architecture/adr/ADR-0013-foundation-toolchain-baseline.md`

The persistent Windows CI verifies clean dependency restore, format/lint/type/architecture/security/path/UI-reference gates, real foundation tests, build targets, runtime audit, Windows x64 packaging, packaged-process startup smoke, portable ZIP checksum and artifact upload.

## Frozen UI authority
- `docs/ui/manifests/UI_REFERENCE_MANIFEST.json`
- `docs/ui/manifests/UI_FREEZE_MANIFEST.json`
- `docs/source-of-truth/ui/06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT_SMALL.docx`

The production UI must follow the frozen pack; no silent redesign.

## Read first
1. `AGENTS.md`
2. `PROJECT_STATE.md`
3. `docs/handoff/CURRENT_HANDOFF.md`
4. `docs/source-of-truth/INDEX.md`
5. `docs/ui/manifests/UI_REFERENCE_MANIFEST.json`
6. `docs/ui/manifests/UI_FREEZE_MANIFEST.json`
7. `docs/architecture/ARCHITECTURE.md`
8. `docs/architecture/CODE_CONSTITUTION.md`
9. `docs/architecture/REPOSITORY_MAP.md`
10. `docs/architecture/MODULE_OWNERSHIP_MAP.md`
11. `docs/architecture/DEPENDENCY_RULES.md`

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
The app now contains the first real frozen editor shell using fixture data plus a minimal shared token/control layer. SoundVisualizer, Gemini, FFmpeg, real project workflows and release-grade packaging remain later work.
