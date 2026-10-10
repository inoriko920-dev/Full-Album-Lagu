# W11-07 AC09 — torn-track audio-clock Preview QA (2026-10-10)

**Scope-locked stabilization only.** This is an additive guard and regression suite for the previously approved album Preview; it does not add product features, UI layouts, audio clocks, animation presets, image assets or playback actions.

## Discovered edge case
The existing `AlbumPlaybackTransport.reportAudioClock` clamps outgoing `localTimeMs` to the track duration. When an audio timeupdate arrives at exactly that duration but before the `ended` event, `albumTimeMs` equals the start of the *next* track while `activeTrackId` still names the *old* source. Half-open canonical album intervals correctly assign that time to the next song. Before this guard, AppShell could resolve the incoming boundary visual frame using that mismatched outgoing audio snapshot, creating a one-frame ghost transition.

## Implemented fix
- `src/renderer/playback/preview-clock-authority.ts` is a pure guard: compare the driver snapshot to `resolveAlbumPlaybackPosition` and accept only authorized `playing/paused` clocks with a matching project ID, track ID and local timestamp (one-millisecond tolerance for integer conversion). Reject unknown/missing/disabled tracks, nonfinite or drifted time, loading/ready, revoked audio and album end.
- `src/renderer/app/AppShell.tsx` reuses the **same guard** for dynamic title/artist/artwork projection, layer keyframe timing, and live boundary effect frames. A still-playing driver holding an incoherent position does not make a manually selected boundary midpoint masquerade as live audio.
- No changes to `ProjectDocument`, CommandEngine, original transition/easing behavior, Gemini rail, underlying transport or project revision. All previous frozen visual sources remain unchanged.
- Tests in `tests/unit/preview-clock-authority.test.ts` cover authorized song-time mapping, first-track exact end, incoming zero timestamp, skewed finite/nonfinite local times, stale/disabled projects and no mutation.
- `tests/component/AppShell.playback-preview-context.test.tsx` checks actual AppShell Preview at outgoing 2000ms with old active ID, incoming 0ms, 400ms midpoint, stale active ID and stale local timestamp; no seek or project dirty/revision changes. Two older mocks updated to use physically coherent clocks before asserting ordinary playback behavior.

## Evidence gate
- Baseline `main@8b7089928f7b39e132bcb1f7cc093ff5a45bfb52` [Windows CI #910 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38045102583).
- [CI #911](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38045722724) failed Prettier formatting; diagnostic #913 caught a missing useMemo clock-object dependency. Exact Windows Prettier changes have been committed and missing dependency fixed. Temporary Prettier step must be removed before final standard CI.
- **Current status: CODE IMPLEMENTED / FINAL EXACT-HEAD NORMAL WINDOWS CI PENDING**. Merge only if final branch CI and later `main` CI PASS; update this record only after verified outcome.
- W11-07 original matrix remains **8 PASS_AUTOMATED / 4 PARTIAL_AUTOMATED**. Do not upgrade AC09 to physical PASS from a mocked-driver AppShell regression.
- W11-06 physical speaker/headphones, native Suspend/Resume, 25 OS picker actions, multi-hour resource plateau, owner visual approval still **NOT_TESTED**. Final release **BLOCKED**, no FFmpeg MP4 claim or automatic advancement to W11-08.
