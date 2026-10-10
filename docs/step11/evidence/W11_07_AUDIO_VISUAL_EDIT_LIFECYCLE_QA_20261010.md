# W11-07 — Preserve live audio across manual visual edits (2026-10-10)

## Scope and reason
- Baseline `main@6ceba57a00b2c2199969f00691e009b4377e1e45`, [Windows #919 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38046258344); W11-07 T01–T07, PR #72–81 merged. Original project/UI/frozen 29 visual states unchanged.
- QA found a new runtime-risk: `useAlbumPreviewPlayback` created and destroyed `HtmlMediaPlaybackDriver` with an effect depending on the **entire** `ProjectDocument`. Every manual keyframe/animation/preset edit creates a new immutable project revision; this unintended driver teardown can interrupt audible playback or clear FFT.
- This patch touches the **existing canonical renderer playback hook**, not CommandEngine/project schema/HTMLAudioElement/authorization security paths. No new preset, feature, UI element or asset.

## Corrective behavior
- The lifecycle effect is now keyed by stable audio-only identity: project ID + schema version, ordered track IDs, enable/disable, linked audio ID/source, linked audio assets' location/availability/error/duration, and the trusted main-issued batch.
- Visual Scene, animation/keyframe, transition, track display titles, artwork and album UI data are excluded from driver invalidation. `projectAlbumTimeline` and Preview React data still use the up-to-date ProjectDocument for metadata and visual presentation.
- Track reorder, audio relink, audio asset availability/duration change, changes in batch authority and switching project ID still close the previous driver, revoke the old source, and establish a new transport generation.
- The driver's snapshot may retain earlier non-audio metadata during a visual edit; this is deliberate because the transport only derives timing and source identity from the audio fields. Preview rendering itself uses current React project.

## New automated regressions
`tests/component/use-album-preview-playback-lifecycle.test.tsx` mounts the real React hook and media driver while counting actual power-listener subscriptions and cleanups:
1. Keyframe entrance, boundary preset and title edits do not remount the driver or reset the generation.
2. Audio track reorder, source path relink, enabling/disabling or replacing the main-issued trusted batch must cleanly release the old media driver.
3. A different project ID and missing batch must tear down the old driver; preview availability fails closed.

## Evidence and explicit limitations
- First exact-source [Windows CI #920](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38047129709) failed on **Prettier formatting only** in the new test.
- Diagnostic [Windows CI #921 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38047236138) ran a *temporary formatter step* and then passed 347 unit, 59 contract, 97 component, 44 integration plus original Electron save/reopen, MP3/WAV, 128-track playback and ZIP packaging checks. **It is NOT authoritative final source CI**.
- Exact diff from Windows formatter was committed to the source test. Temporary CI step was removed and workflow verified byte-identical to the baseline `main` workflow.
- **Current status IMPLEMENTED / FINAL NORMAL EXACT-HEAD CI PENDING.** PR #82 stays Draft until that CI and all required checks pass; a subsequent postmerge `main` CI must pass before QA closure.
- Physical speaker/headphone audition, real Suspend/Resume, 25 native OS picker interactions and multi-hour resource plateau **remain NOT_TESTED**. The 12 W11-07 acceptance counts remain 8 PASS_AUTOMATED / 4 PARTIAL_AUTOMATED; final release is BLOCKED, no MP4 has been produced. Physical listening cannot be claimed from the mocked hook lifecycle.
