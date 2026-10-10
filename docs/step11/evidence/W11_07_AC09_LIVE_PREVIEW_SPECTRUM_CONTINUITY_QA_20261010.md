# W11-07 AC09 — Live Preview spectrum/progress boundary continuity QA (2026-10-10)

## Scope lock and source of truth
- Verified `main@1376450f5d393c8c6818fa106a9cd1acc53f6d08`, Windows [CI #891 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38040264022). W11-07 T01–T07 and additional AC08/AC10/animation continuity QA were merged.
- This PR #77 adds **one test case only** in `tests/component/AppShell.playback-preview-context.test.tsx`; no runtime source, UI, audio clock, preset, project schema, or asset changed.
- The UI-IMG-002G user PNG and approved UI-IMG-002D / frozen 29-state references remain unchanged.

## What the new AppShell test actually proves
Test creates one two-song album with saved `crossfade`, real configured background, artwork, title, artist, spectrum and progress layers. It exercises the **real React AppShell and BoundaryVisualPreview components** with an explicit mocked audio driver snapshot to isolate the visual binding:
1. At album position **1999ms**, Preview displays outgoing song title and one real-preview FFT bar array with provided nonzero decoded-spectrum levels.
2. At the exact canonical boundary **2000ms**, Preview switches to the incoming song's configured boundary frame, maintains **exactly one** background, one spectrum and one progress source, retains incoming and outgoing titles/artists and the same FFT sample (no fabricated second spectrum).
3. At **2400ms**, the transition is 50% complete, updated current FFT levels (31%, 80%) propagate to the live spectrum, and the album progress remains 60% **without resetting to track-local time**.
4. At **2800ms**, Preview returns to ordinary incoming-song presentation, still with exactly one live spectrum.
5. Reverse seek to **2400ms** must recreate the same rendered transition opacity, FFT and album progress. A clock bearing a **different project ID** must never activate a boundary. Entire persisted project source and dirty/revision stay unchanged.

The associated existing low-level tests separately cover real WebAudio FFT and HTMLMedia playback/driver; existing real-file AC08 integration covers physical MP3 bytes on a test filesystem, missing/relink/seek/reorder and JSON reopen. This test **does not** play sound through a human speaker, decode audio itself, check AV-sync with a physical OS/device, or certify pixel-level UI fidelity.

## Verification and final gate
- First standard CI [#892](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38041244278) failed on source formatting, before application checks.
- Diagnostic [Windows CI #893 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38041305599) completed with a temporary `prettier --write` stage: all component/contract/integration tests, Electron save/reopen, packaged MP3/WAV and portable ZIP checks and W11-07 acceptance audit succeeded.
- Exact successful Windows Prettier diff was applied to committed test source; temporary formatter stage removed and production CI workflow confirmed **byte-for-byte equal to current main**.
- **Status on documentation creation: IMPLEMENTED; normal exact-head CI and post-merge main CI still PENDING.** Do not merge or state final PASS until both clear.

## Acceptance limitations and release
- AC-W11-07-09 **remains PARTIAL_AUTOMATED** despite stronger proof, because end-user physical audiovisual timing/speaker quality is unverified. AC08, AC10 and AC11 also remain PARTIAL_AUTOMATED.
- W11-07 aggregate remains **8 PASS_AUTOMATED / 4 PARTIAL_AUTOMATED**; W11-06 physical speaker/headphones, actual OS Suspend/Resume, 25 native file-picker interactions, multi-hour resource/handle plateau and full UI visual comparison are **NOT_TESTED**.
- No W11-08/FFmpeg MP4 claim; final release **BLOCKED** pending separate gates.
