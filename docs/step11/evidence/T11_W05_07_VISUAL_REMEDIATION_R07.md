# T11-W05-07 — R07 Editor SCR-002C Independent Layer/Inspector Panes (2026-10-08 WIB)

**Owner / scope:** SOL, STEP 11 / W11-05 / T11-W05-07 only  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51 (**DRAFT, NOT MERGED**)  
**Whole-wave gate:** **W11-05 IN_PROGRESS; technical PASS / frozen UI AC-W11-05-21 still OPEN**  
**Blocked:** W11-06, W11-07 and STEP 12.

## Verified visual problem and controlled correction

R06 Windows `SCR-002C` at 1600×1000 had a single scrollable left content area; Inspector controls began only below the full layer panel, leaving little viewport for Transform and style controls. This made the frozen design's simultaneous Layer/Inspector workflow difficult, especially with a long layer list.

R07 makes a bounded two-pane left control **only when the Layer tab is active**:

- `src/renderer/app/visual-layer-controls.css`: `.visual-layer-combined` is a full-height grid with bounded `0.9fr / 1.1fr` panes. Layer list receives its own vertical scrolling; Inspector receives independently bounded vertical scrolling. The UI keeps add/reorder/duplicate/remove and current Inspector controls intact.
- `src/main/verification/w11-05-ui-capture.ts`: the real Electron `SCR-002C` probe now requires the Layer list and Inspector to both exist, have independent `overflow-y:auto`, not overlap, remain within left-rail bounds, provide at least 175 CSS px for Inspector, and keep the selected layer's Name control visible.
- Scope remains **CSS layout and CI verification only**. No changes to frozen UI authority, project schema, CommandEngine, selection/history, source audio/artwork, template database, timeline semantics, Gemini, playback, audio analysis, waveform, FFmpeg, export or keyframes.

**Implementation commits:** `8fb4abed7868f90dbe80c0eac080180891531df4` (UI) and `bcf71fba85b4bcdec206e740973a5c8afd293438` (Windows visual geometry regression).

## Actual Windows evidence

- **CI #462 PASS**, verified implementation head `bcf71fba85b4bcdec206e740973a5c8afd293438`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37738776119
- **301 Vitest tests PASS**: 153 unit, 59 contract, 47 component, 42 integration. Formatting, lint/types/architecture, secret/path checks PASS.
- **Real Windows Electron `SCR-002C` geometry check PASS.** The latest 1600×1000 screenshot was reviewed after capture: the Layer list has a bounded scrollbar and Inspector has a separate scrollbar, with the selected layer's fields and initial Transform controls on screen together. Other frozen states were captured and reference comparisons generated.
- Windows Save/Reopen/Undo/Redo and second-project dynamic binding; source SHA-256/size/mtime fingerprints; 128-layer and 100-template stress; STEP 10 + previous feature-wave regression, packaged Windows executable smoke and portable multi-file ZIP PASS.
- Four-screen reference/real Electron screenshot/DOM artifact **11532932400**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37738776119/artifacts/11532932400
- Portable Windows **test artifact** (not a published final release): **11533540023**.

## Mandatory UI acceptance note

- **Targeted SCR-002C Layer/Inspector simultaneous bounded accessibility:** PASS in real Electron/CI.
- **AC-W11-05-21 complete frozen design:** **OPEN / NOT ACCEPTED**. Frozen UI-IMG-002C contains a painterly scenic full-canvas composition with a populated visual timeline; current real static scene reflects the canonical template and sparse source-grounded two-track Windows test fixture. It is not legitimate to fabricate audio-driven waveform, source artwork, playback, or rendered footage before their scheduled owning waves.
- **W11-05 overall:** IN_PROGRESS, PR #51 DRAFT, `main` unchanged. All later waves remain blocked. No whole-wave PASS or release claim.

## Authorized next

Continue **SOL T11-W05-07** and review remaining truthful static-preview visual fidelity gaps against final UI DOCX, or obtain explicit approval for mockup differences requiring later audio/animation runtime. Maintain full acceptance matrix AC-W11-05-01..25, retest Windows after code changes, and merge PR #51 only if the frozen design authority and all gates pass.
