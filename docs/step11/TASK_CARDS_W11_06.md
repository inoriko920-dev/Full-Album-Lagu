# W11-06 — Final Serial Task Cards (ASTRA v1.0)

**Dependency:** W11-05 merged. **Execution:** only one task after approved ASTRA charter+DOCX+DoR merge; T11-W06-01 then 02..07 strictly serial. Every later task remains BLOCKED until predecessor CI/evidence PASS.

| Task | Exact deliverable | Mandatory negative/positive tests | Scope gate |
|---|---|---|---|
| 01 | Pure typed playback transport state/clock mapping, no UI/main process | enabled/disabled, gaps, unknown media duration, exact boundary, 128 tracks, NaN/Infinity/negative, exact end, no mutations | T01 PASS unlocks 02 |
| 02 | Main-owned scoped media stream/protocol, Range, security & codec discovery | real packaged Windows MP3/WAV decode, 206/416, token revocation, traversal/symlink, expired/cross-project grants, large-source bounded memory | T02 PASS unlocks 03 |
| 03 | One controller for Play/Pause/Stop/Seek, Next/Previous; async generation guards | duplicate ended, double play, stale load/seek, relink, project switch/close/sleep, decoder error, no ghost audio or dirty | T03 PASS unlocks 04 |
| 04 | True decoded-audio AnalyserNode FFT and live progress | 440Hz tone and silence, pause/stop/mute/seek, low FPS, canvas transform/z-order, no demo-reactivity | T04 PASS unlocks 05 |
| 05 | Wire controls into existing frozen UI, timecode and timeline playhead | selected vs playing track, errors, no new Stop button, no 29-reference drift, Gemini permanent, no additional UI shell | T05 PASS unlocks 06 |
| 06 | 128-track stress, rapid transitions, memory/cancel/recovery hardening | 100 stop/start cycles, large files, unsupported decoder, fast seek, sleep/resume, fingerprints and history stability | T06 PASS unlocks 07 |
| 07 | Windows end-to-end, 20-AC closure, packaged portable build | real audible MP3/WAV, multi-track progression, spectrum tone/silence, no-dirty, immutable source, exact reference screenshots, older wave regressions, portable smoke/ZIP | Wave COMPLETE only if all 20 AC PASS |

**Task 01 canonical owner:** pure framework-independent code in src/core/domain/ with direct tests/unit. Reuse `projectAlbumTimeline`, never introduce a second project schema, store, transport command owner, or renderer timers. Avoid modifying app shell for T01.
**Task 02 security decision:** app-private main-owned scheme must be auditable before any renderer media access; no `file://` or renderer-provided user path.
**Task 05 freeze rule:** existing Play/Pause, Previous/Next, timecode, volume, progress and timeline positions from approved UI-IMG-002B/002D; no visible Stop control. Missing new UI state => stop and return to ASTRA/user.
