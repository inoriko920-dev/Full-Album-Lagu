# Lagu Full Album

**Status:** Software Factory **STEP 09 App Shell / UI Implementation is complete — PASS_WITH_TOLERANCE**. STEP 10 is next.

Lagu Full Album is a Windows 11 x64 desktop application for producing full-album MP4 videos. The manual editor is primary; a permanent right-side Gemini Agent is designed as a copilot over the same project state and command/history system.

## Current maturity
- Product definition, discovery, UI freeze, architecture and code constitution: complete.
- Repository foundation + Windows CI/package smoke: verified.
- Frozen UI pack: 29 approved visual states.
- S09-T01 real editor shell: verified.
- S09-T02 shared design tokens/controls: verified.
- S09-T03 frozen-reference extraction + production screenshot baseline: verified.
- First production reference state `SCR-002A / UI-IMG-002A`: PASS_WITH_TOLERANCE.
- Real media/Gemini/render engines: not yet implemented.
- Next: **STEP 10 — Minimum End-to-End Vertical Slice**.

## UI authority
- `docs/ui/manifests/UI_REFERENCE_MANIFEST.json`
- `docs/ui/manifests/UI_FREEZE_MANIFEST.json`
- `docs/ui/manifests/UI_SCREEN_BASELINES.json`
- `docs/source-of-truth/ui/06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT_SMALL.docx`

No silent redesign.

## STEP 09 evidence
- `docs/ui/evidence/S09_T01_APP_SHELL_EVIDENCE.md`
- `docs/ui/evidence/S09_T02_DESIGN_SYSTEM_EVIDENCE.md`
- `docs/ui/evidence/S09_T03_FROZEN_REFERENCE_BASELINE_EVIDENCE.md`

CI now extracts the exact frozen `UI-IMG-002A` from the reference DOCX, hash-checks it, captures real Electron `SCR-002A` at 1600x1000, validates the approved screenshot hash/geometry/DOM, and produces side-by-side evidence.

## Locked product facts
- Windows 11 x64 portable multi-file ZIP.
- Main Editor: left `Media | Layer | Inspector`, center Preview, permanent right `Gemini Agent`, bottom Album Timeline.
- Gemini-only V1; max 100 API keys.
- Manual editing remains usable without Gemini.
- Manual and Gemini edits share one Project State + Command Engine + Undo/Redo.
- Final render is video MP4.
- Templates are visual/non-destructive.
- Source media is referenced, not modified.

## Implementation boundary
STEP 09 proves the frozen UI shell and screenshot baseline using deterministic fixture state. STEP 10 begins the smallest real end-to-end workflow; real project lifecycle, media import, persistence, Auto Susun, playback, visualizer, render pipeline and Gemini connectivity remain later work.
