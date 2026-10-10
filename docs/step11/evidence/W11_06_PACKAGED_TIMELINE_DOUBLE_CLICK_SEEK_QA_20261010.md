# W11-06 T06 / W11-07 downstream — packaged timeline double-click Seek QA

Scope: **existing feature stabilization only**, no new controls or visuals. The frozen timeline card already has `onDoubleClick` wired to the canonical playback seek path. Earlier PR #62 proposed a packaged Electron Seek probe, but the current canonical Windows runner still claimed `seekUiAvailable: false` without testing card Seek in a real packaged executable.

This test-only follow-up:
- Extends the real packaged 3- and 128-track WAV Electron `src/main/verification/w11-06-editor-ui-probe.ts` to dispatch a physical-geometry DOM double click at the midpoint of the last track while paused. Verifies main-authorized WAV seeks to expected time, pauses without spontaneous restart, preserves current Inspector selection/revision/dirty, then resumes audio with nonzero real FFT.
- Double-clicks the disabled second track and requires the timecode not to change; no disabled ghost seek.
- Adds mandatory real evidence fields `timelineDoubleClickSeekVerified`, `timelineSeekSeconds`, `disabledTimelineSeekRejected`, `seekPreservedProjectRevision` checked by `scripts/run-w06-packaged-editor-controls.mjs`.
- Retains `seekUiAvailable:false` to mean the frozen UI still has **no dedicated Seek slider**, rather than conflating this with the *existing timeline double-click seek*.
- Does NOT claim OS hardware mouse input, native picker 25 physical clicks, audible speaker QA, real Suspend/Resume, multi-hour leak plateau or final W11-06/07 acceptance. W11-07 8 PASS_AUTOMATED / 4 PARTIAL_AUTOMATED remains unchanged.
- Do not merge until latest exact-head normal Windows CI succeeds, followed by SUCCESS on post-merge main. No final release or MP4.
