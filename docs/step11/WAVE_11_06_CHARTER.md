# ASTRA W11-06 — Playback Audio Asli dan Spectrum Reaktif (Final Charter v1.0)

**Role:** ASTRA planning. **Status:** FINAL PLANNING / DoR to be assessed; no SOL code before planning merge. **Baseline:** main@9cb78dd9b8dd8ccb1b84705eb3d231ff9c4dc967. **W11-05:** COMPLETE / 25 AC PASS / merged PR #51 (Windows CI #557 PASS).
**Features:** FTR-012 Playback Preview and Navigation; FTR-008 Real Audio-Reactive Visuals. **Out of scope:** W11-07 motion/transitions, W11-08 render preflight, STEP12 FFmpeg/MP4 and Gemini provider.
**Source-of-truth:** Product Definition + current UI references + STEP 06/07 + W11-05 closure. Full final companion DOCX at docs/source-of-truth/planning/current/15_STEP_11_W11_06_PLAYBACK_SPECTRUM_CHARTER_LAGU_FULL_ALBUM_v1_0.docx.

## 1. Locked delivery
An imported/validated local album can audibly Play, Pause and continue through enabled ordered tracks; previous/next and seeking follow one deterministic album clock. Real FFT uses **decoded playing audio**, not random/demo bars. Progress and active metadata/artwork derive from that same clock. Playback controls and analyzer are UI-session only and never mark the project dirty. Source files stay read-only. The portable Windows 11 x64 Electron test build must prove this on real MP3 and WAV sound files and recover gracefully from missing/unsupported media. Completion of this wave is NOT MP4 output.

## 2. Frozen UI decision — reuse approved 002B / 002C / 002D
The approved Final UI Reference v1.1, whose embedded real images were inspected, already shows Play/Pause button position, prev/next, volume slider, timecode, progress strip, visual spectrum and timeline playhead in the existing editor. Preserve left Media/Layer/Inspector, middle Preview, right permanent Gemini and bottom Album Timeline. No new window, toolbar or independent player shell.
**Stop policy:** implement a fully functional internal Stop/reset/revoke command, called on close/new/open/relink/transport reset; **no additional visible Stop button** is introduced in this wave. If a visible Stop action is later mandated, STOP for new UI governance before drawing it. Play/Pause toggle reuses the existing central control. Seek uses the existing ruler/playhead or approved track-boundary area; introducing a new scrub slider/handle outside existing reference requires stop/approval. No UI image generation is needed for this bounded wave as currently scoped.
Error and loading copy must reuse approved existing shared status/warning patterns. Do not claim static visual samples are actual FFT until audio is running. Artwork and time labels must be honest.

## 3. Single state/clock owner
ProjectDocument.tracks and mediaAssets remain canonical; projectAlbumTimeline derives enabled order and cumulative timing. A pure total/known-prefix mapper converts album time to one enabled track and local position via half-open [start,end) intervals. Invalid, negative, Infinity, NaN, unresolved timing or media not-ready reject with explicit result, and album-end is a distinct finished result. Disabled tracks never play. Track selection vs playing track are two **ephemeral UI-session projections**, not a second persisted playlist.
Player state values: idle / ready / loading / playing / paused / seeking / finished / blocked / error, with generation ID and project ID on every async operation. Only one current generation may publish state or resume audio. Media.currentTime is primary playback clock; RAF is visual sampling scheduling, not another time authority. Pause freezes progress; Stop releases media and resets spectrum; playback resumes at correct local time.

## 4. Trust and data protection
Electron main owns source media, path identity, file checks, asset grants and lifecycle. Proposed design: **private scoped app-owned media protocol** or equivalently audited main-owned bounded byte stream with required Range handling; finalized under T11-W06-02 safety acceptance. Renderer requests a typed asset ID or opaque short-lived grant, never arbitrary paths. Disallow traversal, symlink escape, cross-project IDs, expired tokens, invalid byte ranges and unbounded whole-file IPC buffers. No source edits, disk writes, ffmpeg shelling, network/cloud, safeStorage/keys in renderer. Failed/unreadable/corrupt codec must show blocked error, not play a fake sample. Probe metadata ≠ decoder support; actual packaged Windows MP3/WAV decoding is required and other formats remain unverified until proven.

## 5. Audio → real visual contract
Use one playing HTMLMediaElement with a WebAudio MediaElementAudioSourceNode→AnalyserNode graph, or an equivalent measured verified adapter, without decoding hours of audio into RAM. FFT bars reflect only actual decoded audio energy and respond to test 440Hz tone/silence. No random bars, hardcoded heights, demo waveform or silent fake success in active playback. Render within existing spectrum/progress layer transform/visibility/z-order. Throttle sample publishing for Windows resources. Define pause/silence/stop behavior explicitly; avoid stale analyzer frames. Live FFT cannot automatically stand in for future deterministic offline MP4 spectrum: that belongs to STEP12 render design.

## 6. Proposed bounded implementation order
01: pure typed playback contract + pure album time map tests. 02: main-owned secure media gateway + real codec smoke. 03: single playback state machine with generation guards, Play/Pause/Stop/Seek/Next/Prev. 04: real WebAudio FFT and progress runtime, sine/silence test. 05: frozen transport/timecode/timeline/visual wiring. 06: 128-track load, race and resource hardening. 07: genuine Windows listening/E2E, fingerprints, no-dirty, portable ZIP, drift/DoD and closure. Every task is individually verified; only one task proceeds at a time.

## 7. Non-negotiable gates
- W11-05 completion and merge are verified; W11-06 formal DOCX/charter/DoR/20 AC/task cards must be committed **to main before coding**.
- No newly required UI state outside 29 frozen references; if a new design is necessary, stop for prompt and user image approval and final UI DOCX.
- Windows CI original tools/checks, prior-wave regressions, source SHA-256/size/mtime, safety/recovery and packaged executable smoke PASS after each implemented task.
- Never mark W11-06 COMPLETE without real MP3/WAV playback and real FFT on packaged Windows. Provider/MP4/motion remain future gates.
