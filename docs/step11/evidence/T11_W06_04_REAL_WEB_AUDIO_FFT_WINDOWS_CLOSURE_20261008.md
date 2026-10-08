# SOL T11-W06-04 — Real WebAudio Spectrum Verified Windows Closure

**Date:** 2026-10-08 WIB. **Source SHA:** `d7ee738107f9ce57930d9dd061832cb6163bfaba`. **PR:** [#57](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/57). **Baseline main:** `052b18a368ba2314e6c4517283accab93aef63d8`. **Technical verdict: PASS at source commit**; final evidence-commit CI/PR gate and controlled merge required.

## Real Windows package test
[Windows CI #650 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37804914744) — 224 unit + 59 contract + 54 component + 43 integration = **380 tests PASS**. Existing STEP10, T11-W01..W05 Electron screenshot/regression, packaged Windows x64 smoke and ZIP PASS. No CI error.

Synthetic PCM WAV fixtures, generated inside test runner (no copyrighted audio):
- T04 Tone 440 Hz (2s) — **real AnalyserNode frequency peak 0.9058823529411765** on the actual playing media element, passing 0.15 minimum.
- T04 Silence 2s — **peak 0**, passing ≤0.04 maximum.
- `pauseZero=true`, `stopZero=true`, `tone440HzDetected=true`, `silenceNearZero=true`.
- `sourceIdentity=true`, `attachedElements=2`, `sampledFrames=32`. The native WebAudio `createMediaElementSource` was checked against each `HtmlMediaPlaybackDriver` HTMLMediaElement identity; no synthetic oscillator or generated random bars.
- Private main-issued `lfa-preview://` path, real Chromium MP3/WAV decode, HTTP Range 206/416 and cross-project denial retained from T02/T03. SHA-256, bytes and mtime of **all test sources**, including new 2s synthetic WAVs, unchanged before/after.
- Windows output is a CI proof; it is **not** a human speaker-listening certification. Physical-device listening belongs to T11-W06-07.

## Implementation summary
- `src/renderer/playback/live-spectrum-runtime.ts`: WebAudio MediaElementAudioSourceNode → AnalyserNode (FFT 2048) → destination, 32 log-spaced real frequency bars, bounds and silence/paused/stop all-zero behavior. No demo bars, no second media player and no persist/project mutation.
- `src/renderer/playback/html-media-playback-driver.ts`: optional real-spectrum hook on same element, deferred sample on media events and zeroing after pause/stop/seek/close/replace. `crossOrigin="anonymous"` set **before** private URL assignment to comply with WebAudio cross-origin security; per-window private scheme CORS remains bounded. Without this, Chromium correctly played the file but output zero analyser energy; reproduced and corrected in CI.
- 5 initial unit tests + 2 additional same-element lifecycle tests; actually verified on packaged Windows with tone/silence.
- Graph teardown disconnects source/analyser and closes AudioContext when replaced, stopped or project changes. No unbounded sample timer introduced: live transport samples on native timeupdate, and the CI probe samples 32 frames for verification.

## Gate, boundary and follow-up
- T04 code/Windows results **PASS** at source SHA `d7ee738`; final head docs-only CI must pass, project drift/review/main SHA checked before merging.
- **T11-W06-05 is not implemented yet**: frozen editor controls, visible spectrum layer, progress/timecode and timeline playhead are still static/unwired. No new Stop button or new design allowed without UI governance.
- T11-W06-06 performance/race stress and T11-W06-07 Windows human listening/20 AC closure remain subsequent serial gates; FFmpeg/MP4 is not yet part of this wave.
