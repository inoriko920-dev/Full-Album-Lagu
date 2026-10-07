# Lagu Full Album

**Status:** Software Factory **STEP 11 — Feature Implementation Waves** is in progress. W11-01..04 are COMPLETE / PASS; **W11-05 is IN PROGRESS with T11-W05-01..02 PASS / VERIFIED and T11-W05-03 READY**.

Lagu Full Album is a Windows 11 x64 desktop application for producing full-album MP4 videos. The manual editor is primary; a permanent right-side Gemini Agent is designed as a copilot over the same project state and command/history system.

## Current maturity
- Product definition, discovery, UI freeze, architecture and code constitution: complete.
- Repository foundation + Windows CI/package smoke: verified.
- STEP 10 vertical slice: COMPLETE / PASS_WITH_PROVISIONAL.
- W11-01 Project Lifecycle & Recovery: COMPLETE / PASS.
- W11-02 Media Intake & Relink: COMPLETE / PASS.
- W11-03 Album Timeline + Unified Command History: COMPLETE / PASS.
- W11-04 Auto Susun + Track Binding: COMPLETE / PASS.
- W11-05 Manual Layer Editor + Templates: **T11-W05-01 Visual Scene foundation PASS / VERIFIED; T11-W05-02 Manual Layer Commands + Gesture/History PASS / VERIFIED; T11-W05-03 READY**.
- Frozen UI pack: 29 approved visual states; W11-05 reuses SCR-002C, SCR-003A, SCR-003B and DLG-008 without a new UI prompt/image stage.
- Gemini/provider, FFmpeg integration and final render runtime remain later gated work.
- Next: **SOL T11-W05-03 — Template Document + Local Store + Trial/Apply Core only**.

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
The repository is now in STEP 11. Project lifecycle, media intake/relink, album timeline/history, Auto Susun and track metadata/artwork binding are already verified. W11-05 is restricted to static visual-scene/layer editing and a local visual-only template workflow. Playback/audio-reactive visuals remain W11-06; keyframes/transitions remain W11-07; Gemini/provider and FFmpeg integration remain STEP 12/later gates.