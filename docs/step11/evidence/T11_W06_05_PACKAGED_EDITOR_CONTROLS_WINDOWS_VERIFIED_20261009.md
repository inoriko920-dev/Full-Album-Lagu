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

## Final added T05 live-spectrum visual proof — Windows CI #703 (2026-10-09 WIB)

- **Source commit `93537e2c0100c0f95008c4da9bdbfa9a62f883e4`, [Windows CI #703](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37917111103) COMPLETE/SUCCESS.** This augments, rather than replaces, #696/#700 baseline controls and security evidence.
- Real packaged Electron runner now applies the existing built-in **Minimal Biru** template using actual toolbar/Browser/Coba/Terapkan button flows, preserving the approved frozen UI. It never inserts a synthetic FFT layer or changes product UI to satisfy the test.
- For **3- and 128-track** actual WAV import fixtures, the runner asserts **32 visible real spectrum bars**, a **nonzero audio-driven visual peak**, a gradient **progress layer** driven by real audio clock, **all-zero bars after Pause**, and transport/zoom/disabled skip/last-track/no-dirty/source fingerprint checks. It resumes actual playback before each **1600×1000 playing-state screenshot**.
- Source artifact: `Lagu-Full-Album-T11-W06-05-Packaged-Editor-Evidence` ID `11610131118`. JSON reports maximum visible-bar heights **92.1569% (3 tracks)** and **100% (128 tracks)** at capture, and true `appliedFrozenSpectrumTemplate`, `liveProgressVerified`, `pausedSpectrumZero`, `capturedWhilePlaying`. Percentages represent DOM spectrum bar height, **not physical audio dB or volume**.
- Both paired PNGs were visually inspected; title/artwork, blue decoded-signal bars, progress track, left Media tabs, bottom timeline and permanent Gemini right rail are present. Screenshot shows the actual selected third/last track in the Media list while center Preview follows the currently playing first track. Full 128 inventory is confirmed by JSON and card inventory, not by claiming 128 cards visible simultaneously.
- Previous caveat **"active spectrum not visually shown" is now CLOSED for the Minimal Biru packaged template**. Still NO human-listened speaker signoff, 100-cycle memory/hardening T06 proof, final W11-06 AC01–20 T07 signoff, offline MP4 encoding, W11-07 or W11-08.
- Subsequent documentation-only commits require their own exact-head CI before formal T05 completion/owner merge. **PR #58 NOT MERGED; T06 remains BLOCKED** until owner approval and `main` verification.

## T05 addendum — Seek via existing frozen timeline card, CI #709
- Fixed a missing transport binding: the canonical `HtmlMediaPlaybackDriver.seek` existed but editor users could not seek from a visible timeline card. `src/renderer/app/AppShell.tsx` now attaches **onDoubleClick** only to pre-existing timeline track cards: `startMs + durationMs * clamp((clientX - rect.left)/rect.width, 0, 1)`; normal `onClick` selection is preserved.
- Trust and safety: no seek without current main-issued playback availability; reject disabled/unresolved card, missing duration/start or non-positive rect width; preserve revision/dirty and Undo/Redo; no new UI control, layout, window or raw sourcePath permissions.
- Added two component tests (**61 total component tests after this change**, up from 59), verified 2500ms second-track seeking, edge clamp at 2000/4000ms, blocked unauthenticated/disabled/unresolved and no project dirty. Schema-valid invalid audio fixture is explicitly `availability=invalid`, `errorCode=MEDIA_DURATION_UNAVAILABLE`; prior CI #708 rejection was invalid test fixture, not runtime.
- **[Windows CI #709 COMPLETE/SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37919408413)** on code `ce7c88f750309d9df1cf31ef31f4f4b1328a6c29`: 392 tests (229 unit, 59 contract, 61 component, 43 integration), all baseline Electron/UI reference Windows tests, real 3/128 imported audio/spectrum, portable build PASS.
- This addendum is a documentation-only follow-up: check exact docs commit CI. PR #58 remains unmerged pending owner authorization; T06 stress and MP4 not implemented. Seek is covered by React component and original media driver unit proof; **the T05 packaged UI runner does not yet exercise physical double-click seek** (no inflated E2E claim).
