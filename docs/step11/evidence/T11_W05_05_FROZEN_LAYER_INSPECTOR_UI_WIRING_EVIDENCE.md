# T11-W05-05 — Frozen Layer + Inspector UI Wiring

- Date: 2026-10-08 WIB
- Role: SOL
- Software Factory: STEP 11 / W11-05 / T11-W05-05 only
- Gate: **PASS / VERIFIED for task implementation**; wave W11-05 remains IN PROGRESS
- Dependency: T11-W05-04 PASS / VERIFIED
- PR: https://github.com/inoriko920-dev/Full-Album-Lagu/pull/49
- CI: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37724632656 (#378, PASS at `7bdd0ee79ebf528182d9f2e5ae7da30967988c37`). Final docs-only PR-head gate must also pass before merge.

## Delivered within W05-05 scope

- `src/renderer/app/AppShell.tsx`: mounts the existing `StaticScenePreview` into the center Preview **only when the canonical visualScene has layers**. Legacy/empty SCR-002A stays unchanged. Permanent Gemini right rail, bottom Album Timeline, top toolbar, and left `Media | Layer | Inspector` tabs stay in place.
- `src/renderer/app/VisualLayerControls.tsx`, `visual-layer-defaults.ts`, `visual-layer-controls.css`: left Layer-list and left Inspector for six frozen structural families (Background, Artwork, Judul Track, Artis, Spectrum, Progress Bar). Manual add/duplicate/remove/reorder; visibility and lock; transform position/size/rotation/opacity/anchor; text font/size/alignment/weight/color/italic. Existing track metadata inspector remains available when no visual layer is selected.
- `src/renderer/state/ui-session/visual-selection-session.ts` reused as sole temporary selected-layer/gesture owner, shared between canvas and left list. Selection is not persisted and does not dirty a project. Locked layers can be selected but protected mutating controls are disabled. After a new layer, remove, undo or project load, selected IDs reconcile.
- `src/renderer/state/project-session/use-project-session.ts`: all visible manual mutations route through one existing guarded `ProjectSessionHistory.execute` and CommandEngine. Live range slider Preview remains session-only; pointer/keyboard release commits one `LayerTransformGestureSession` command/Undo node with captured base revision/state token.
- `src/core/application/services/project-layer-commands.ts`: canonical `layer.set-static-text` command for supported static text; rejects non-static or locked layer targets and validates through visualLayerSchema.
- No renderer direct filesystem/media URL access, no separate Project State, no right-side Inspector, no Gemini/FFmpeg integration, no waveform/audio-reactive/playback, no keyframes/transitions, no Template Browser.

## Observable tests / evidence

- `tests/component/AppShell.visual-layer-editor.test.tsx` validates baseline blank SCR-002A layout, six names, canvas+list selected stable ID, permanent Gemini and Album Timeline, left Inspector, locked explicit unlock, style Undo/Redo, transient pointer range updates vs exactly one committed history unit.
- Fast validation #1 / `37724487666`: TypeScript PASS and 37 component tests PASS.
- Windows CI #378 / `37724632656` PASS at `7bdd0ee79ebf528182d9f2e5ae7da30967988c37`; 283 tests (153 unit, 55 contract, 37 component, 38 integration), architecture/secrets/portable paths, 29 frozen UI reference states, SCR-002A visual baseline, STEP 10/W11-01..04 E2E, Windows packaged smoke + portable multi-file ZIP PASS.
- Windows portable ZIP artifact `11526923816`; frozen SCR-002A visual artifact `11527251867` from CI #378.
- The frozen UI reference pack validates 29 reference states; automated **pixel screenshot comparison for SCR-002C itself is not yet attached**, and final full UI drift review belongs to W05-07. Do not claim W11-05 wave closure on this task result.
- Source audio/image media bytes were not written by W05-05; final source SHA-256/size/mtime fingerprint proof is deferred to W05-07.

## Next handoff

- Task T11-W05-05: **PASS / VERIFIED** after final branch CI. W11-05 overall: IN PROGRESS.
- Next exact authorized task after user says `lanjutkan`: **SOL T11-W05-06 — Frozen Template Browser / Try / Save UI Wiring only**.
- W05-07, W11-06/07, STEP 12 and final release remain BLOCKED by the gate order.
