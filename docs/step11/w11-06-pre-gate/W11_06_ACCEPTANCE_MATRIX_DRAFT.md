# ASTRA W11-06 — PRE-GATE Acceptance Matrix (DRAFT)

**All 20 rows are proposed, not PASS.** Formal acceptance identifiers to be reconciled with the final ASTRA charter/DOCX before SOL implementation.

| ID | Acceptance criterion | Required evidence | Status |
| --- | --- | --- | --- |
| AC-W11-06-01 | No playable enabled ready-audio leaves Play safely disabled/blocked with clear reason | missing/empty/disabled audio Windows and contract tests | NOT STARTED |
| AC-W11-06-02 | Album active order follows ProjectDocument.tracks + enabled without second persisted playlist | 128-track projection comparison | NOT STARTED |
| AC-W11-06-03 | start/end/total duration derive exclusively from projectAlbumTimeline | pure mapping and save/reopen test | NOT STARTED |
| AC-W11-06-04 | Real Windows MP3 and WAV sounds can Play/Pause/Stop audibly; no fabricated audio | packaged Electron E2E with test audio | NOT STARTED |
| AC-W11-06-05 | Seek exact within track, boundary and cross-track with defined final-end behavior | mapping + real audio position tolerance | NOT STARTED |
| AC-W11-06-06 | Ended advances exactly once to next enabled track, skipping disabled | duplicate-ended and 3-track fixture | NOT STARTED |
| AC-W11-06-07 | Active title, artist and artwork resolve from current track without writing derived source metadata | project cross-binding E2E | NOT STARTED |
| AC-W11-06-08 | Visual progress follows actual audio clock, stays stable on Pause, jumps correctly on seek | frame/time assertions | NOT STARTED |
| AC-W11-06-09 | Spectrum reacts to decoded sound (440Hz peak) and silence; not random/demo | sine/silence + actual file FFT tests | NOT STARTED |
| AC-W11-06-10 | Play/Pause/Stop/seek do not increment revision, dirty, autosave or UndoDepth | session snapshots before/after all transitions | NOT STARTED |
| AC-W11-06-11 | Missing/relinked/corrupt/unsupported codec and decoder failure cannot alter source bytes or project unexpectedly | filesystem SHA-256/size/mtime + negative test | NOT STARTED |
| AC-W11-06-12 | Playback gateway denies arbitrary renderer paths, unknown IDs, cross-project tokens and symlink escapes | automated adversarial security tests | NOT STARTED |
| AC-W11-06-13 | Byte-range stream honors valid/invalid ranges; no whole-file IPC base64 | gateway boundary tests with simulated large file | NOT STARTED |
| AC-W11-06-14 | Stale load/seek/ended events cannot modify a new project or start ghost audio | generation/cancel race component/E2E | NOT STARTED |
| AC-W11-06-15 | Stop, project switch, recovery, app close and error release audio nodes and streams | resource lifecycle test and Windows tracing | NOT STARTED |
| AC-W11-06-16 | Existing Spectrum/Progress layer visibility, transform, lock and z-order survive live projection | scene projection tests + screenshots | NOT STARTED |
| AC-W11-06-17 | Frozen left rail, right Gemini panel and Album Timeline remain intact; any missing playing UI has signed final reference before coding | full frozen UI snapshot + design-owner signoff | NOT STARTED |
| AC-W11-06-18 | 128-track project, seek/restart/disabled transition and repeated Play/Stop are deterministic without unbounded memory growth | Windows stress with evidence and documented budget | NOT STARTED |
| AC-W11-06-19 | Regression: STEP10 + W11-01..05, path/secret/architecture/source immutability gates all pass | canonical CI + physical fingerprints | NOT STARTED |
| AC-W11-06-20 | Real Windows packaged playback, multi-track spectrum, UX failure states, portable ZIP smoke, DoD/drift/handoff all PASS | signed final wave closure evidence + artifacts | NOT STARTED |

## Gate mapping

- 01–03, 10: T11-W06-01.
- 04, 11–13: T11-W06-02 + 03.
- 05–08, 14–15: T11-W06-03 + 05.
- 09, 16: T11-W06-04 + 05.
- 17: T11-W06-05 plus UI governance.
- 18: T11-W06-06.
- 19–20: T11-W06-07.

## Required measurement decisions

Define before task 01: allowable playback clock drift, seek convergence delay, FPS target under actual Windows hardware, analyzer energy tolerance and resource/memory envelope. Do **not** invent numeric targets before benchmark/proof. Keep test fixtures license-safe, offline and reproducible. No AC may be marked PASS merely because a placeholder preview is visible.

## Blocked authority

W11-05 AC21 formal UI approval and AC25 final closure are OPEN/HELD; PR #51 remains Draft. This is a draft, not a completed Definition of Ready or authorization to implement playback.
