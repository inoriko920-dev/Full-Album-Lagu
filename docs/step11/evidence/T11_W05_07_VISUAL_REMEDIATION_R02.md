# T11-W05-07 — Frozen UI remediation R02 (2026-10-08 WIB)

**Role:** SOL. **Task:** T11-W05-07 only. **Wave:** W11-05 MANUAL LAYER EDITOR + TEMPLATES.

**Gate decision: IN PROGRESS / AC-W11-05-21 NOT YET ACCEPTED**. No W11-06, W11-07, STEP 12. Draft PR #51 remains unmerged. This revises the **implementation observations** in `T11_W05_07_UI_DRIFT_GATE_FAIL.md` without rewriting historical initial observations.

## Changes in this round

1. **SCR-003B Mode Coba in editor:** `AppShell` now projects the existing transient `ProjectSessionView.templateTrialProject` through the same `buildStaticScenePreview` as canonical state. The browser renders a non-blocking banner + candidate gallery over the real Main Editor; underlying Media/Layer/Inspector, actual Album Timeline and permanent right Gemini Agent remain visible. Revert resets session-only trial; Apply still one guarded template-origin CommandEngine transaction. No duplicate state or history. UI-only trial is clean.
2. **SCR-002C Layer + Inspector:** `WorkRail` now shows the selected `VisualLayerInspector` immediately below the canonical layer list while the Layer tab is active; the separate Inspector tab remains valid. Selection and edits keep shared stable IDs and CommandEngine. Large lists scroll independently.
3. **SCR-003A frozen category rail:** distinct vertical category navigation, 3-column gallery and local category-specific illustrated CSS backgrounds replace same-color placeholder cards. Category/search remain local and validated; no external assets or network.
4. **DLG-008 over Main Editor:** opening Save-as-Template hides only the Browser window and presents the dialog over the live Editor and Timeline. The dialog includes source-scene Preview, explicit exclusions and selectable four visual groups: backgrounds/artwork, text, spectrum, progress. Selection is **functional**: allowed `VisualLayer["kind"]` list filters the project-derived scene before the existing canonical `createTemplateFromProject` and main-owned `JsonTemplateStore` write, with no track/secret/source fields. Empty group selection blocks Save.
5. Added component regressions for Main Editor-hosted trial/no history/Preview, category navigation, real Save scope, simultaneous selected Layer/Inspector and unchanged Gemini rail.

## Successful executable evidence

- Final Windows CI **#427, run `37730737210`: SUCCESS** at `0580429ec58a8af9b094f4df795f62a00f35fceb`.
- **301 Vitest tests PASS**: 153 unit + 59 contract + 47 component + 42 integration.
- Electron real full-flow and 4 actual 1600×1000 screenshot capture/reference extraction PASS; mock DOCX images are compact JPEGs, not pixel-exact target files.
- STEP 10/W11-01..04 regression, audit/architecture/secrets/portable-path, all 29 frozen UI references, exact SCR-002A screenshot baseline, executable Windows smoke and portable multi-file ZIP PASS.
- Windows screenshot/source fingerprints/evidence artifact `11529128573`, https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37730737210/artifacts/11529128573
- Windows portable test artifact `11529662901` (NOT a release), https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37730737210/artifacts/11529662901
- Exact old SCR-002A baseline artifact `11528899444`.
- Prior source SHA256/size/mtime and 128-layer / 100-template stress all PASS.

## Frozen UI direct comparison R02 — limits still open

- **SCR-003B major workflow issue fixed:** Mode Coba is back in Main Editor with actual Preview and Timeline/Gemini. Still uses static placeholders for spectrum, track-artwork rendering and progress because live audio/playhead belong to W11-06.
- **DLG-008 modal host/component scope fixed:** overlay is now over editor and scoped visual options match allowed data. Still not visually equal to compact illustrated mockup.
- **SCR-002C simultaneous property layout fixed:** list and selected Inspector coexist; scenic active artwork/album thumbnails are not available in this static-structural wave and the test fixture has two tracks versus the rich reference mockup.
- **SCR-003A vertical category rail fixed**, gallery improved with locally styled previews but approved rich individualized artwork imagery and overall composition remain visibly different.
- **Approval gate remains FAIL / PENDING explicit reference-consistent visual evidence:** do not call W11-05 COMPLETE or merge PR #51 solely on functional CI success. No invented pixel-similarity metric used.
- **Next authorized continuation:** SOL T11-W05-07 refinement of frozen 002C/003A/003B/012 static visual fidelity using source-of-truth UI references, while leaving real audio runtime W11-06 blocked. Recheck AC-W11-05-21 and final 25 AC. Update status only if reference visual gate is actually satisfied.

No changes to `main`. Draft PR #51 remains the checkpoint for a different AI/session to continue; read `AGENTS.md`, `CURRENT_HANDOFF.md`, `W11_05_ACCEPTANCE_MATRIX.md`, this R02 evidence and the original UI drift report before coding.
