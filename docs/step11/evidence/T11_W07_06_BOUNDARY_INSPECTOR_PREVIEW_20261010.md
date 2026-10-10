# W11-07 T11-W07-06 — Boundary Inspector and Preview evidence (2026-10-10)

## Scope: frozen UI-IMG-002D only

**IMPLEMENTED; AWAITING FINAL EXACT-HEAD NORMAL WINDOWS CI.** The prior main baseline is `429951da2267565b2ee6fa3c860b30a58c4c022f`, Windows postmerge #837 SUCCESS. W11-06 actual speaker, real Windows suspend/resume and multi-hour hardware acceptance remain **NOT_TESTED**.

The code adds no new presets, editor panels, audio timelines, Gemini rail changes or media authorities. Only existing UI-IMG-002D transition fields are edited: type (exactly eight presets), duration, easing, approved artwork and title/artist handoffs.

## Actual implementation
- `src/core/application/services/project-boundary-commands.ts`: official atomic ProjectCommand `boundary.set-transition`, validates selected directed pair is currently adjacent, enabled, resolved and has ready audio on both sides; rejects malformed presets, conflicting pair IDs, stale revision/token via the canonical history engine. No-op when a missing transition is removed, preserves no-field legacy JSON, existing unrelated boundary settings retained.
- `src/renderer/state/project-session/use-project-session.ts`: one `setBoundaryTransition` method using the existing revision/state token / history / dirty-state owner; Undo/Redo and project save/reopen remain canonical.
- `src/renderer/app/BoundaryInspector.tsx`: approved left Inspector with real per-track title/artist/time, eight named presets, duration, easing and two handoff selectors. Locked while Template Try or invalid adjacent pair. Preview button uses canonical audio seek, with disabled state if playback authority unavailable.
- `src/renderer/app/AppShell.tsx`: compact session-only boundary selection markers over the existing Album Timeline, no width or card-order change. Old/invalid selections fail closed after project swap/reorder/disabling. Selecting another layer or track clears boundary Inspector selection. Permanent Gemini Agent and original layout unchanged.
- `src/renderer/app/BoundaryVisualPreview.tsx`: dual metadata/artwork view layers and single incoming background/spectrum/progress, T04 numeric effects, selected mid-transition sample or live canonical playback time; no duplicate audio clock, file generation or render/MP4 claim.

## Automated tests and CI
- `tests/unit/project-boundary-commands.test.ts`: atomic command, stale revision/token, payload/pair validation, Undo/Redo, removal, legacy JSON save/reopen, 128 songs/127 current boundaries and seek stability.
- `tests/component/AppShell.visual-layer-editor.test.tsx`: actual Inspector selection, current metadata, Preview binding, duration edit, Undo/Redo, selection clearing and permanent Gemini.
- [Windows CI #841](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38034265340) **SUCCESS under temporary Prettier write/debug stage**, including all standard tests and packaged Windows regressions. **Do not treat #841 as immutable-source proof.**
- Exact Prettier output from #841 was applied to all eight affected source/test/style files; temporary diagnostic step removed and Windows workflow restored byte-identical to baseline main.
- **Final exact-head normal CI and post-merge main CI pending. No merge before gates.**

## Explicit nonclaims
Preview is runtime UI representation, not FFmpeg MP4 or final production export. Physical human listening, real Windows Suspend/Resume, 25 native OS picker interactions, multihour resource plateau and full W11-06 20-AC final signoff remain NOT_TESTED. T11-W07-07 further Windows/UI drift audit is required; final release BLOCKED.
