# T11-W06-05 — Packaged Windows Editor Controls / Album 128 Tracks
Date: 2026-10-09 WIB
Owner: SOL
Scope: PR #58 only (do not merge automatically)
Evidence baseline: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37826288115

## Exactly verified source and CI
- PR branch: `sol/t11-w06-05-frozen-ui-binding-20261008`
- CI #685, workflow run `37826288115`, **SUCCESS** on exact code commit `e5392cafd210d518d10dff614b56b4611a58370a`.
- Prettier, ESLint, strict TypeScript, architecture, secrets, portability checks and 29 frozen UI reference manifest checks succeeded.
- Vitest: **387/387 PASS** (229 unit + 59 contract + 56 component + 43 integration).
- Legacy Electron SLC/W11-01..05 regression, four frozen W11-05 screen captures/comparison, Windows x64 package/smoke, secure packaged MP3/WAV decode and FFT 440 Hz previous gates all succeeded.
- T05 dedicated packaged UI test step **SUCCESS** for generated 3- and 128-track WAV albums. Evidence artifact: `Lagu-Full-Album-T11-W06-05-Packaged-Editor-Evidence` (artifact ID `11571691622`).
- Windows portable ZIP build and upload **SUCCESS**; CI artifact is a test build, not a final release.

## Added CI-only automation (no product UI redesign)
- `src/main/verification/w11-06-editor-ui-probe.ts`: executes real clicks inside packaged Electron main editor with main-owned OS-picker substitute fixture. This is **not** a fake test driver and does not alter UI controls.
- `scripts/run-w06-packaged-editor-controls.mjs`: synthesizes WAVs at runtime and checks original source SHA-256, size and mtime before/after.
- `src/main/bootstrap.ts`: additional guarded `--w06-probe=editor`, only when `LFA_W06_TEST=1`; decode/FFT probe remains intact and production startup remains unchanged.
- Windows workflow now executes dedicated packaged UI check after package + decoder smoke and uploads the JSON/PNG proof.

## Acceptance directly covered
- Untrusted new project: Play disabled until main-authorized picker discovery/intake completes; trusted source only.
- Packaged editor: Play -> progressing real timecode -> Pause, Previous/Next skip disabled second track, Mute/Unmute.
- Timeline: 3 and 128 track card inventory, 125% zoom playhead positions relative to track cards, final-track user selection.
- Project integrity: playback/selection never changes revision/dirty value after intentionally disabling a track to establish baseline; source WAV SHA-256, size and mtime unchanged.
- UI freeze: left/right editor shell (Gemini permanent), preview, album timeline and 1600x1000 screenshot for each fixture; existing W05 four frozen screenshots still pass.
- 25 same-project sequential imports and generation guard for 128-track rapid transport remain covered by preexisting unit tests from CI #676 and re-run CI #685; do not misrepresent as 25/128 actual import batches in this new packaged test.

## Scope and unresolved evidence
- There is **no user-approved visible Seek control** in the frozen design; `HtmlMediaPlaybackDriver.seek` is tested in the earlier driver/codec suite, not through a newly invented button.
- The real packaged test verifies audio clock and UI interactions, but it does **not** constitute a human-listened physical-speaker quality signoff.
- Reopened or manually relinked audio without new main authorization continues fail-closed by design; not a claim that all saved projects can instantly preview.
- No offline MP4 renderer, W11-07 or next wave has been implemented.
- T05 code gate is technically **VERIFIED** at CI #685. Formal T05 closure still requires this documentation/handoff update to PASS CI at the **final documentation commit**, review of the captured artifacts, and a controlled merge decision.
- **DO NOT MERGE PR #58 or start T11-W06-06 before those final gates pass.**

## Runbook
1. Review PR #58 and this CI artifact without altering reference UI assets.
2. Verify latest head equals the documentation commit; run Windows CI again.
3. Review exact-head source and artifact for any drift, stale auth, or source mutation.
4. Close T05 only when all technical plus evidence gates PASS; merge only by appropriate controlled approval.
5. T11-W06-06 follows serially after T05 is merged and main verified.

## Follow-up — Playing-track title/artist/artwork context and cross-project guard (2026-10-09 WIB)
- During final T05 inspection, discovered that the center Preview's dynamic title/artist/artwork projection followed `selectedTrackIdState` (Inspector selection), even when `playback.clock.activeTrackId` pointed to another playing track. That contradicted AC-W11-06-07 and could display stale metadata while using Next/Previous.
- Corrected within the canonical `src/renderer/app/AppShell.tsx` presentation owner: a distinct **session-only** `playbackVisualModel` uses the real active track for center Preview, while `visualModel` for Media/Layer/Inspector remains bound to the user's manual selection. When playback is unavailable, active track missing/disabled, or `clock.projectId` mismatches the current project, it falls back to the previously approved static view.
- New `tests/component/AppShell.playback-preview-context.test.tsx` covers three cases: selected A versus playing B (including title/artist/artwork), playback pause and loss of trust, unknown track, and stale cross-project clock with reused track IDs; revision and dirty stay unchanged. Temporary format/typecheck/component diagnostic was removed from Windows CI.
- **[Windows CI #696 attempt 2 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37914837517)** on implementation head `82c6c6a3d7e7d80d179a62d7fdaa8b9f0ff2603d`: **390/390 tests** (229 unit, 59 contract, 59 component, 43 integration), complete previous STEP10/W11-01..05 E2E, frozen screenshots/reference check, real MP3/WAV decode/FFT, executable smoke, packaged editor Play/Pause/Prev/Next/Mute+128 tracks, portable ZIP and DOCX verification all PASS.
- **CI anomaly:** attempt 1 failed only STEP 10 SLC Electron save/open with `SLC probe FAIL: UnknownVizError` after full verify PASS; exact-SHA repeat attempt 2 passed SLC and complete workflow. This non-repeatable failure is recorded, not misrepresented as impossible.
- **Formal gate remains:** final documentation-commit Windows CI PASS and controlled owner-authorized merge. This document is historical evidence; no MP4 encoder, physical speaker certification or T06 implementation is claimed.
