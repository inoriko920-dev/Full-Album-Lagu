# T11-W05-04 — Static Scene Preview + Selection/Inspector Projection

- Date: 2026-10-08 (WIB, Asia/Jakarta)
- Role: SOL
- Software Factory STEP 11 / W11-05 / **T11-W05-04 only**
- Task gate: **PASS / VERIFIED**
- Dependency: T11-W05-03 PASS / VERIFIED
- PR: https://github.com/inoriko920-dev/Full-Album-Lagu/pull/48
- Verification: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37722584947 — #365, PASS at `c1219e3d9fa6cb12fc2a21a18a9eb945a5da5986`.

## Architecture and implemented owners

1. `src/core/domain/static-scene-preview.ts`: pure validated `buildStaticScenePreview` reuses existing `resolveVisualScene`, keeps canonical back-to-front layer order and reversed left Layer list, selection outline and Inspector view model. Optional gesture transform overlays never modify persisted project data.
2. `src/renderer/state/ui-session/visual-selection-session.ts`: ephemeral canvas/list selection, hover and gesture draft; locked layers are selectable but cannot be transformed; invalid/deleted selection is reconciled without ProjectCommandEngine mutation.
3. `src/renderer/visual/StaticScenePreview.tsx` + `static-scene-preview.css`: deterministic 16:9 canvas geometry and transform; visual background solid/gradient, artwork placeholder, dynamically bound text, static structural spectrum/progress, and UI-only selection/handles. No media filesystem URL is loaded by renderer.
4. Static Preview remains deliberately unmounted in frozen `AppShell`. T11-W05-05 alone owns SCR-002C Layer + Inspector UI wiring; existing SCR-002A cannot be silently modified at this task.

## Test/CI proof

- New `tests/unit/static-scene-preview.test.ts`: legacy scene-less project; selected disabled track / first-enabled fallback; W11-04 title/artist/artwork; canonical order; Inspector/hidden/locked state; 50 ephemeral gesture projections followed by one guarded real history commit with Undo; 128-layer projection; session selection non-dirty and stale removal reconciliation.
- New `tests/component/StaticScenePreview.test.tsx`: real React 16:9 static canvas; normalized transform / style, text binding, artwork placeholder (no direct image URL), spectrum/progress placeholders, hidden-layer omission, selected overlay and locked click by stable ID; 128-layer render and selection.
- Windows CI #365 / `37722584947`: **278 tests PASS** — 153 unit, 55 contract, 32 component, 38 integration.
- 68 source files architecture check PASS; 146 scanned source/resource text files secret scan PASS; 75 portable path files PASS; frozen UI reference pack **29 visual states PASS**.
- Prior wave regression STEP 10 Save/Reopen + W11-01 lifecycle/recovery + W11-02 media + W11-03 timeline/history + W11-04 Auto Susun/binding PASS.
- Exact SCR-002A screenshot baseline PASS.
- Packaged Windows x64 executable smoke PASS; multi-file portable ZIP artifact ID `11526750544` on run #365; frozen screenshot artifact ID `11526398855`.

## Scope and safety

- Preview selection, hover, temporary gesture and Inspector are presentation-only and never create history/revisions.
- Existing W11-04 dynamic bindings are resolved live and never duplicated into project/scene persistence.
- Canonical layer array remains the sole z-order; never saves a separate z-index.
- Artwork uses safe structural placeholder until an explicitly authorized main-owned read-only preview seam; no renderer filesystem, credentials, network, subprocess or external provider.
- Spectrum and Progress are static placeholders only. No audio analyzer/waveform/playback/playhead (W11-06), no animation/keyframes/transitions (W11-07), no Gemini/FFmpeg (STEP 12).
- AppShell and approved UI layout are untouched. No new UI prompt/image stage is required.
- W11-05 **is not complete**, despite this task's PASS. Frozen SCR-002C Layer + Inspector wiring is a separate future step.

## Handoff

- **T11-W05-04 PASS / VERIFIED.**
- Next exact authorized action after user's `lanjutkan`: **SOL T11-W05-05 — Frozen Layer + Inspector UI Wiring only.**
- W11-05 remains IN PROGRESS; T11-W05-06 and T11-W05-07 remain BLOCKED.
