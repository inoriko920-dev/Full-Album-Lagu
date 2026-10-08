# SOL T11-W06-03 — Playback Transport & Windows Real-Driver Closure

**Date:** 2026-10-08 WIB. **Wave:** W11-06 T03. **PR:** [#56](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/56). **Source HEAD verified:** `71be262e7c0c35f4c5acd8155cd79df8a6493137`; **baseline:** `main@1cfaf7afc974b55569e6991bad78bdcb5a43cc8f`.

**Scope closure verdict:** **T03 TRANSPORT/DRIVER IMPLEMENTATION PASS**, subject to latest documentation-commit CI, final PR review, merge and verification of `main`. **Not W11-06 full-wave completion**. W11-06 T04 true WebAudio FFT, T05 frozen UI control binding, T06 stress and T07 packaged listening/closure are **NOT STARTED / BLOCKED**, in serial order.

## Exact Windows evidence

[CI #632 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37799006358), same source commit:
- Unit 216 PASS, contract 59 PASS, component 54 PASS, integration 43 PASS = **372 tests PASS**.
- Canonical STEP10 + W11-01..05 Electron regression, 29 frozen UI reference states, Windows x64 packaging, portable ZIP and smoke PASS.
- Real **packaged** Chromium decoding and native HTML media: WAV 8078 bytes / MP3 2655 bytes; actual muted playback advanced the media clock by **37ms WAV / 53ms MP3**, plus Pause/Seek checks, byte-range 206/416, main-grant/cross-project defense, fingerprint SHA-256/size/mtime unchanged.
- Packaged `HtmlMediaPlaybackDriver` runtime proof returned **all true** for `mainIssuedGrant`, `pauseSeekNextPrevious`, `relinkRevoked`, `realMainRelinkAuthorized`, `unrelatedAssetDenied`, `projectSwitchStopped` and `closeStopped`; **5 HTMLAudioElement instances** were created in succession and all had source removed after switch/close.
- CI audio artifact: `Lagu-Full-Album-T11-W06-02-Audio-Decode-Evidence` (CI #632, ID 11558959121). Driver and packaged decoder proof run in same executable process and are evaluated by `scripts/run-w06-preview-protocol-smoke.mjs`, which fails if any indicator is false.

## Architecture and safety sign-off

- `AlbumPlaybackTransport` remains pure and session-only: canonical `projectAlbumTimeline` mapping, Play/Pause/Stop/Seek/Next/Previous, disabled-track skip, generation fences for stale load/clock/ended callbacks, decoder failure and retry; does NOT mutate `ProjectDocument`, revision, dirty-state or Undo/Redo.
- `HtmlMediaPlaybackDriver` owns HTMLAudioElements, consumes **only** main-issued `lfa-preview://media/<64hex>` tokens via typed `requestAudioPreview` IPC, and rejects arbitrary `file://` / network grants. Controller is the sole playback state owner; live `currentTime` is its sole clock source.
- When Stop/Seek/Next/Previous/project-switch/relink/close/suspend occurs, generation invalidation and media source teardown reject late IPC or old media events and prevent ghost audio. Pause 45s+ refreshes stream token before resume. System power suspend revokes renderer media authority rather than auto-resuming.
- Main-owned OS picker/probed-ready import and main-owned OS relink picker/probe are the only permitted grant origins. A saved/recovered source path **is never authorization**. Other unrelinked media remain blocked until reauthorized. Tokens bound to project/window and source fingerprint.
- No unapproved UI, no changed 29 frozen references, no new visible Stop control, no Gemini/FFmpeg/provider scope changes. No application MP4 export or real FFT yet.

## Explicit limitations / deferred gates

- **Audio was muted in headless Windows CI** to exercise real clock and decoder without reliance on a speaker or manual listening. This is **not** proof that a human heard sound on a physical device. Actual device listening acceptance remains in T07; driver creates ordinary unmuted `Audio()` outside CI.
- **The visible Play/Pause/Seek UI is not wired to the driver yet**; W11-06 T05 owns frozen transport UI integration. UI states must remain identical to approved references or return to ASTRA/UI stop gate.
- W11-06 T04 real AnalyserNode FFT and its sine/silence/reactivity evidence are not implemented. MP4 export belongs to later STEP12.

## Completion gate

T03 may be merged only if this evidence + project handoff are committed, final exact PR head Windows CI SUCCESS, review has no CHANGES_REQUESTED, and `main` has not advanced unexpectedly. Only after PR #56 merges and new `main` is verified may SOL start T11-W06-04. No implementation beyond T03 in this PR.
