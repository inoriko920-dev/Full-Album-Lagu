# W11-07 T11-W07-04 — Canonical album boundary visual frame evidence

**Status: IMPLEMENTED / AWAITING FINAL NORMAL WINDOWS CI.** This is a pure data- and effect-projection component, **not** proof that pixels in Preview have changed.

## Baseline and scope
- Previous T01/T02/T03 merged; verified `main@fb14b3f2f3480b5f3d77472bb56596e12d4a1a0d` and [postmerge CI #814 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38027065979).
- Only the agreed eight presets: `crossfade`, `fade-through-black-blur`, `slide`, `zoom`, `dissolve`, `light-glitch`, `soft-flash`, `premium-album-change`. These are numeric effect data; they have not been connected to the pixel compositor.
- Source: `src/core/domain/album-boundary-visual.ts`. Tests: `tests/unit/album-boundary-visual.test.ts`.
- No new product features, UI/asset generation, new timeline, background audio loop, stale frame queue or Electron/renderer access.

## Runtime projection contract
1. Resolve album absolute time through existing `resolveAlbumPlaybackPosition` and project the existing `projectAlbumTimeline`; no second track clock and no frame-step accumulation.
2. Find only the two **currently adjacent enabled resolved** tracks. A saved pair that no longer matches after reorder/remove/disable is inert; prevent ghost events. Both assets must be `ready`; otherwise the frame is blocked, not faked.
3. An exact song boundary belongs to the incoming track. Start the visual transition at its canonical start time, then clip the visual duration to the incoming song's resolved duration. Never change album duration, audio playback position, effective playlist order or the live spectrum clock.
4. Reuse `resolveTrackPresentation` and `resolveVisualScene` to provide both real source/target artwork, title, artist and a stable unchanged background; apply approved `at-boundary` vs `during-transition` handoff modes separately to artwork and title/artist.
5. Evaluate bounded deterministic numeric effect fields for each preset (opacity, slide offset, scale, blur, black/white overlay, glitch/dissolve channels); interpolate according to saved `linear/ease-in/ease-out/ease-in-out` easing. No random sampling. Preview composition is an explicit future integration gate.

## Regression evidence
- Exact boundary (999, 1000, 1400, 1800ms), metadata / artwork binding, independent title+artist / artwork handoffs.
- Incoming song shorter than configured transition; no duration shift or event after track end.
- Disabled track adjacency, removal, reorder, deliberately configured adjacent enabled pair across disabled song, prior unknown duration, missing source or target audio.
- Eight preset profiles at 0%, 50%, 100%; clipping, finite/bounded output, repeated seek backwards and immutability.
- 128 tracks / 127 boundaries, including multiple repeated seek passes without state drift.
- [Windows CI #816](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38027512354) **SUCCESS with temporary Prettier diagnostic stage**; all standard checks, tests, package Windows and ZIP succeeded. This is useful diagnostic proof, **NOT the final immutable-source CI gate**.
- The exact Prettier diffs from runner were applied to GitHub code/tests and temporary stage **removed**; workflow confirmed byte-identical to `main`.
- Latest-head normal CI and post-merge main CI still required before labeling VERIFIED.

## Explicit limitations
No actual renderer/preview side-by-side pixel output, image generation, Inspector control, project edit command for boundary presets, or FFmpeg/MP4 claim. Those belong to T05–T07 / later waves. W11-06 physical speaker sound, genuine OS suspend/resume and multi-hour resource plateau remain **NOT_TESTED**. Final release **BLOCKED**.
