# ASTRA W11-06 — PRE-GATE Serial Task Cards (DRAFT)

**Status: planning only. All seven tasks BLOCKED until W11-05 closes, final planning DOCX is committed, W11-06 DoR PASS, and each sequential authorization is granted.**

| Task | Proposed technical changes | Required failure cases | Evidence and stop rule |
| --- | --- | --- | --- |
| T11-W06-01 | Define typed transport state and pure albumMs→trackId/localMs mapping; no project schema change, no new playlist/history authority | no track, disabled first/middle/final track, missing/zero/unknown duration, exact boundary, >128 tracks, impossible negative/out-of-range seek | Vitest unit + contract; proof Play/Seek cannot mark project dirty. Only unlock 02 after PASS |
| T11-W06-02 | Main-owned bounded asset gateway for preview, structured error taxonomy, stream cancellation, Range, source authorization and codec capability audit | invalid token/asset, traversal, symlink escape, revoked cross-project ID, non-byte-safe range, huge file, rapid revoke, unreadable source | Windows MP3/WAV decode smoke; real bytes untouched; main owns all FS; architecture/security CI; only then 03 |
| T11-W06-03 | Single renderer session playback controller and state machine, immutable identity+generation tokens, bounded async/cancel lifecycle | double Play, stop during load, stale canplay/ended, A→B seek race, switch/open/recover while active, decode error, missing/relinked, end-of-album | deterministic races + Windows sound playback Play/Pause/Stop/Seek, no ghost audio, no-dirty; then 04 |
| T11-W06-04 | WebAudio analyser from actual decoded PCM and presentation-only spectrum+progress values; reuse scene visibility and transforms | silence, 440 Hz tone, pause/stop, seek, mute, hidden layer, low FPS/back-tab throttling, end cleanup | test analyzer frequency semantics, 16:9 preview, project never dirtied; Windows CPU sample and real media; then 05 |
| T11-W06-05 | Wire transport/scrub/active track into approved frozen UI, no new editor shell; confirm selected track vs playing track semantics | missing media, unknown duration, paused/stale display, transition, template trial, Gemini rail overlap, changing project while playing | UI screenshot reference review + component tests; if needed UI state absent, mandatory STOP for new UI prompt/image approval |
| T11-W06-06 | Recovery, long-album and resource lifecycle hardening | ≥128 enabled tracks, 100 restarts/stop cycles, 4GB-sized-source simulation bounded IO, corrupt codec, OS sleep/resume, repeated seeks, replace source | deterministic stress, memory resource budget documented from Windows trace; source fingerprint unchanged; then 07 |
| T11-W06-07 | Real Windows end-to-end playback/spectrum acceptance and final wave drift/DoD | project save/reopen, multi-track transition, last track, undo unrelated change while paused, relink, disabled, codec incompatibility, packaged Windows runtime | final 20-AC matrix, scenario logs, screenshots, audio verification, security, portable ZIP smoke, no unapproved UI/architecture drift |

## Task gate discipline

- Only ONE task may be implemented and verified at a time.
- ASTRA planning roles own the preconditions and final choices. SOL never invents credential/media privileges or rewrites frozen UI reference.
- Each task includes change list, affected src files, typed contracts, unit/contract/component/integration tests, negative tests, and source SHA/reference evidence.
- No W11-06 code belongs on PR #51 while AC21 OPEN. Draft planning may be reviewed in a stacked PR, but must not be merged early.
- Do not mark future tasks PASS solely from green static mock tests. W11-06 requires actual Windows playback.

## Required design questions before T11-W06-01

1. Confirm precise codec support with actual packaged Electron decoding, not just metadata probe.
2. Decide secure asset delivery mechanism (scoped protocol vs equivalent) and planned Range/stream behavior.
3. Confirm frozen UI transport states and focus behavior. If absent, trigger the UI prompt/stop workflow.
4. Decide how current selected track and currently playing track differ without two persisted playlist authorities.
5. Establish rendering clock model shared with future offline export, while noting live spectrum will not automatically equal offline MP4 samples.

**Planning status: PRE-GATE / NOT AUTHORIZED TO CODE.**
