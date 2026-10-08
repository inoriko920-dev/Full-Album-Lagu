# T11-W05-07 — UI drift review, blocker register and gate decision

**Date:** 2026-10-08 WIB | **Role:** SOL | **Branch:** `sol/t11-w05-07-wave-closure-20261008` | **PR:** #51 (DRAFT; DO NOT MERGE)

## Mandatory gate decision

**T11-W05-07: IN_PROGRESS / GATE FAIL (frozen UI material drift).**
**W11-05 overall: IN PROGRESS, NOT COMPLETE.**
**W11-06, W11-07, STEP 12: BLOCKED by W11-05 gate.**
The all-green technical CI does **not** constitute UI design approval. AC-W11-05-21 remains FAIL / BLOCKER; therefore do not close the acceptance matrix or claim the wave PASS.

## Actual verified test evidence

- **Windows CI #407 / run `37729207171`: SUCCESS** at implementation head `ab3d70b9f0a718f6315b359cba57c26a7a6e8e30`.
- **298 tests pass:** 153 unit + 59 contract + 44 component + 42 integration; 128 live layers, 100 local templates in renderer, 128 layer / 64 edit history stress, and physical source SHA-256/size/mtime PASS.
- CI real Electron workflow PASS: frozen-screen capture, Try/Revert/Apply, Undo/Redo, Save/Reopen, second-project dynamic bindings, correct protected track order and source hashes.
- Four production 1600×1000 screenshots, four genuine compact embedded frozen DOCX reference images, extracted-image SHA-256 evidence, and side-by-side comparison files produced by `scripts/build-w05-frozen-visual-evidence.ps1`.
- Windows prior-wave E2E STEP 10 and W11-01..04, architecture/secrets/portable-path, 29 approved reference inventory, SCR-002A strict baseline, packaged executable smoke + portable multi-file ZIP all PASS.
- Artifact (comparison screenshots, DOM/flow/fingerprint JSON): `11529287105` — https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37729207171/artifacts/11529287105
- Portable Windows artifact: `11528598368` (testing build, **not** final release).
- Baseline screenshot artifact: `11528448706`.

## Material mismatches verified by inspecting four side-by-side images

| Frozen authority | Observed real Electron screen | Gate |
|---|---|---|
| SCR-002C / UI-IMG-002C | Frozen shows richly composed scenic canvas, artwork/spectrum, simultaneous layer/properties rail and detailed album timeline; current view is simplified solid-navy canvas/structural placeholders with a six-item layer list, while Inspector controls require switching to another left tab. Playback/waveform content in the reference belongs to later W11-06, **not** an excuse to simulate working playback now. | MATERIAL DRIFT |
| SCR-003A / UI-IMG-003A | Frozen template library uses application-integrated category navigation and differentiated image thumbnails. Actual implementation is a centered white overlay with uniform dark-blue placeholder thumbnail cards, plus different category/navigation placement and density. | MATERIAL DRIFT |
| SCR-003B / UI-IMG-003B | Frozen Mode Coba remains visually in an Editor scene with candidate Preview, album timeline and clear temporary banner/gallery. Actual Mode Coba stays in the standalone Template Browser overlay, hiding the live Main Editor presentation. Functional non-dirty semantics PASS, visual state FAIL. | CRITICAL DRIFT |
| DLG-008 / UI-IMG-012 | Frozen Save dialog overlays Main Editor and provides thumbnail plus explicit selectable scope of visual components. Actual Save dialog overlays the Template Browser and has name/category/thumbnail/exclusion copy but lacks matching scoped component-selection presentation. | MATERIAL DRIFT |

**Reference limitations:** frozen mockups are compact, lossy 520×325 JPEGs; Electron images are 1600×1000 PNGs. Direct equality of individual pixels is not a legitimate gate. This failure is based on major hierarchy, workflow-surface, content-density and interaction presentation differences, **not** an invented numeric pixel threshold. The screenshot comparison JSON records `SIDE_BY_SIDE_REVIEW_REQUIRED`, and does not claim accepted visual match.

## Verified good technical boundaries and related fixes

- Real Electron W05-07 found a functional development-path issue: built-in templates failed to load because `app.getAppPath()` in direct Electron bootstrap mode does not necessarily point to the source root. Resolved by anchoring dev catalog to compiled bootstrap `__dirname` while keeping packaged `process.resourcesPath` unchanged; actual local nine-template selection verified.
- One asynchronous selected-template loading race in W05 Electron probe was fixed by waiting for selected detail and enabled Try action.
- SCR-003A 3-column template library, DLG-008 scope exclusion copy, thumbnail and action label aligned partially with frozen reference; the visual mismatch remains material despite these corrections.
- No provider keys, network marketplace, FFmpeg/playhead/runtime/keyframes/transition implementation introduced.
- Protected source audio/artwork bytes, size and mtime were compared before/after actual Electron and integration flows. Evidence contains no raw local media paths.

## Required remediation (same W05-07 gate; no next wave)

1. Bring SCR-003B Mode Coba back onto the Main Editor presentation while keeping transient `TemplateTrialSession` as sole temporary state, right Gemini ownership, timeline, and non-dirty behavior; do not create a second canonical project.
2. Align SCR-003A library's category rail, template card visual variation and density with the frozen composition using local-only assets; no marketplace or network calls.
3. Align DLG-008 modal host, component-scope presentation and actions with its frozen authority while ensuring saved data remains strictly visual-only and exclusions are truthful.
4. Bring SCR-002C selected layer/properties composition closer to the frozen layout; use static structural placeholders for features gated to W11-06, never fake working audio-reactive playback.
5. Rerun and inspect side-by-side reference/actual images plus exact SCR-002A unchanged baseline; require no remaining material hierarchy/copy drift. Then update all AC-W11-05-01..25 with final evidence and only then grant wave PASS / merge PR.

The user must not be told W11-05 is complete. Resume **T11-W05-07 corrective work only** on the next `lanjutkan`, preserving exact planning and frozen UI authority.
