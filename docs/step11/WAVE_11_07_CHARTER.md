# W11-07 — Animation, Limited Keyframes and Track-Boundary Transition Charter (ASTRA pre-gate)

Status: **PRE-GATE / BLOCKED_BINARY_UPLOAD**. This is planning, not implementation, not an approved wave, and not render/MP4 proof.

## Authority
- Current product FR-023/FR-024/FTR-009 entrance/exit/loop and limited keyframe animation.
- Current product FR-025/FR-026/FR-027/FTR-010 coordinated per-track-boundary transition, timing/duration/easing/handoff.
- Existing frozen UI-IMG-002B/002C and boundary UI-IMG-002D; **new addendum UI-IMG-002G** references owner-supplied image for left Inspector animation and keyframe controls.
- Old 29 frozen images remain unchanged; permanent Gemini rail remains at right.
- Baseline main: `6f003e9fb71a610bde69d063c865c62eb95864c0`, Windows CI #783 SUCCESS (automation only). W11-06 hardware audio and physical acceptance remain NOT_TESTED.

## Required actual assets before any implementation
1. `docs/source-of-truth/ui/07_W11_07_UI_IMG_002G.png` — binary PNG SHA-256 `2e82582bce81f8d0f5ad344d71968731f4f9593e90b5dea39dd0864b421eb073`; source **1586x992**, prompt target **1600x1000**, documented visual tolerance must not be mislabeled exact.
2. `docs/source-of-truth/ui/07_STEP_04_W11_07_UI_REFERENCE_UI_IMG_002G_v1_0_REVIEW.docx` — binary owner-source-image/UI contract and review.
3. `docs/source-of-truth/planning/current/16_STEP_11_W11_07_ANIMATION_TRANSITION_CHARTER_v1_0_PRE_GATE.docx` — binary detailed ASTRA planning/serial handoff.

The DOCX files exist as handoff artifacts in the user conversation but **have not been verified in GitHub**. GitHub API text-file actions do not ingest these binary files from the execution container. Do not fabricate git SHAs or claim uploaded. User must upload if the tool cannot.

## Core architecture
Use canonical ProjectDocument/VisualScene schema v1; validated additive optional animation/keyframe settings; shared ProjectSession/CommandEngine for mutations. Pure animation evaluation reads canonical album clock, never writes media, project revision or playlist per frame. UI selection/preview stays session-only; main process keeps FS and secure media ownership. Track-boundary change event coordinates title/artist/artwork/background/easing while visualizer continues on live playback.

## Presets
Entrance fade/slide/zoom, exit fade/slide/shrink, loop slow zoom/float/pulse. Per-boundary: crossfade, fade through black/blur, slide, zoom, dissolve, light glitch, soft flash and Premium Album Change. Unsupported capabilities fail honestly; do not silently fake their implementation. Keyframe manual V1 initially proposal: position, scale and opacity (FR-024/Q-005 provisional), validated against final reference.

## Gate
W11-07 tasks are serial, T01..T07. No code until PNG+both required DOCX are committed and verified in the correct GitHub tree, UI acceptance and planning gate are recorded, and current code baseline/regressions remain valid. No final W11-06 physical PASS, no final release, no MP4 claim.

**STOP — MENUNGGU FILE WAJIB TERUNGGAH KE GITHUB.**
