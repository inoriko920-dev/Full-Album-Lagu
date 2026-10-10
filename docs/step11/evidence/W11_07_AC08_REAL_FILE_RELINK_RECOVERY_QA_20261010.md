# W11-07 AC08 — Real MP3 move/relink and boundary recovery regression (2026-10-10)

## Verified source baseline
- W11-07 T01–T07 source, owner UI and 29-state freeze already merged. Latest exact-main baseline: `e918aeb4155aee89be00c0f2a570e846cd8f63f2`, Windows [CI #883 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38038991012).
- Only added `tests/integration/w11-07-boundary-relink-recovery.test.ts`. No app behavior, feature, preset, UI design, project schema, audio clock, or asset changed.

## New real-path coverage
1. Create two distinct MP3 files from the repository-owned synthetic audio fixture on the actual test filesystem, probe their durations through `MusicMetadataProbePort`, and use the real canonical album timeline.
2. Enable one existing `crossfade` directed boundary; assert the incoming song is active at the exact boundary time.
3. Physically move the second MP3 to a Unicode directory. `MissingMediaService.scan` must report it missing and prevent the boundary from resolving as active. Original project and configured pair remain unmodified.
4. Reject a corrupt MP3 replacement without creating a project or promoting a false ready status. Relink to the real moved MP3 through `MediaRelinkService` with actual decoder metadata and canonical realpath.
5. JSON save/reopen preserves the boundary settings, track order and new media path. Forward/reverse seek returns identical frames at identical timestamps, without any extra playback clock.
6. Reorder the two real tracks through the existing `ProjectSessionHistory` and `createTrackReorderCommand`. The old directed boundary must be inert; Undo restores the identical transition output.

## CI, gate and scope
- [Windows diagnostic CI #885 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38039625568): 335 unit, 59 contract, 89 component, **44 integration** tests PASS, standard packaged Windows MP3/WAV and ZIP checks PASS, and canonical T07 matrix reports **8 PASS_AUTOMATED / 4 PARTIAL_AUTOMATED**.
- Diagnostic #885 used a temporary `prettier --write` stage. Exact Windows formatter output was applied to test source; workflow restored **byte-identical to main** before final verification.
- **Final exact-head CI: PENDING at this documentation commit.** Do not merge without completed SUCCESS for exact PR head and postmerge `main` CI.
- This is useful additional automated evidence toward AC-W11-07-08, **not physical acceptance**. Combined real-device reconnect/relink/seek session remains untested.
- AC08–AC11 remain `PARTIAL_AUTOMATED`. W11-06 physical sound, OS Suspend/Resume, 25 picker interactions, multi-hour memory/handle plateau and full visual/pixel parity are **NOT_TESTED**. No final app release or MP4 certification.
