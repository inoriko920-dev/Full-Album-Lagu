# W11-06 — Final 20-AC Acceptance Matrix (ASTRA v1.0)

**Planning gate:** Approved charter/DOCX and merged main required before SOL Task01. **Implementation:** NOT STARTED; every row below is **NOT TESTED**, not PASS. Measurement tolerances for audio clock drift/seek convergence/performance must be recorded from Windows baseline during T02–T03, not invented now.

| ID | Verification target | Status |
|---|---|---|
| AC-W11-06-01 | No audio / disabled / missing audio correctly blocks playback | NOT TESTED |
| AC-W11-06-02 | Effective playback track order derives from ProjectDocument via projectAlbumTimeline | NOT TESTED |
| AC-W11-06-03 | Album boundaries/time derived only from canonical timeline; no separate persisted playlist | NOT TESTED |
| AC-W11-06-04 | Real packaged Windows MP3 and WAV Play/Pause/Stop audible and truthful | NOT TESTED |
| AC-W11-06-05 | Seek inside track and across exact boundaries is deterministic | NOT TESTED |
| AC-W11-06-06 | Ended advances once, skipping disabled tracks | NOT TESTED |
| AC-W11-06-07 | Title/artist/artwork follow playing track from W11-04 resolver | NOT TESTED |
| AC-W11-06-08 | Timecode/progress follows audio clock; Pause freezes; seek updates | NOT TESTED |
| AC-W11-06-09 | True FFT responds to 440Hz tone and silence; no random demo bars | NOT TESTED |
| AC-W11-06-10 | Playback never modifies revision, dirty flag, Undo/Redo or autosave | NOT TESTED |
| AC-W11-06-11 | Corrupt/missing/unsupported codec errors are non-destructive | NOT TESTED |
| AC-W11-06-12 | Main media gateway rejects arbitrary path, traversal, stale/cross-project asset grant | NOT TESTED |
| AC-W11-06-13 | Byte Range behavior bounded and validated; no giant IPC base64 | NOT TESTED |
| AC-W11-06-14 | Stale load/seek/ended events cannot revive old project audio | NOT TESTED |
| AC-W11-06-15 | Stop, close, relink, new/open/recovery all release media resources | NOT TESTED |
| AC-W11-06-16 | Spectrum/Progress preserve canonical layer transforms/visibility/z-order | NOT TESTED |
| AC-W11-06-17 | Approved frozen UI reused, Gemini rail permanent, no unapproved new control | NOT TESTED |
| AC-W11-06-18 | ≥128 tracks and repeated seek/stop with bounded responsive memory | NOT TESTED |
| AC-W11-06-19 | W11-01..05 and architecture/secret/paths/fingerprint regression all PASS | NOT TESTED |
| AC-W11-06-20 | Actual Windows portable playback/FFT E2E and wave drift/DoD PASS | NOT TESTED |

**Test matrix:** deterministic unit pure-domain mapper, typed IPC/contract, Electron component, real-audio Windows Play/Pause/Seek/Ended/FFT sine vs silence, security revocation/range, 128-track/100-restart stress and source SHA-256/size/mtime. Final CI includes format, TS/lint, architecture/secrets/portable-path/29 UI states, STEP 10 + W11-01..05, app package and Windows portable smoke.

**Closure:** only when AC01–20 PASS, full DoD and regression PASS on exact PR commit, no material UI/architecture/trust drift, and the user has real playable preview. W11-07 / W11-08 / STEP12 are separate.
