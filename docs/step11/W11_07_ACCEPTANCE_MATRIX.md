# W11-07 — Acceptance Matrix (planned, not tested)

All entries **NOT_TESTED** until demonstrable evidence on actual implementation/Windows CI. Do not convert mockup screenshot to implementation proof.

| ID | Acceptance requirement | Current status |
|---|---|---|
| AC-W11-07-01 | Old schema v1 visual projects without animation remain valid | NOT_TESTED |
| AC-W11-07-02 | Unknown/invalid animation/keyframes reject atomically | NOT_TESTED |
| AC-W11-07-03 | Entrance/exit/loop are deterministic and evaluable | NOT_TESTED |
| AC-W11-07-04 | Opacity keyframes 0.0s and 2.5s / 85% interpolate correctly | NOT_TESTED |
| AC-W11-07-05 | Edits follow one CommandEngine/Undo/Redo + saved checkpoint | NOT_TESTED |
| AC-W11-07-06 | Locked/duplicated/deleted layers and Template Try revert safely | NOT_TESTED |
| AC-W11-07-07 | First/middle/last boundaries, disabled tracks, 128 tracks deterministic | NOT_TESTED |
| AC-W11-07-08 | Reorder/relink/seek/recovery block stale boundary visual events | NOT_TESTED |
| AC-W11-07-09 | Artwork/title/artist transition and visualizer clock continuity | NOT_TESTED |
| AC-W11-07-10 | All required transition presets implemented/proved or honestly BLOCKED | NOT_TESTED |
| AC-W11-07-11 | UI-IMG-002G+002D and frozen 29-state + permanent Gemini rail visual checks | NOT_TESTED |
| AC-W11-07-12 | Source checksums, offline, secrets, previous waves, Windows ZIP CI | NOT_TESTED |

Pre-implementation gate is **BLOCKED_BINARY_UPLOAD**. Current source PNG: 1586x992 (1600x1000 requested), recorded without silently resizing. Planning DOCX and UI DOCX must be committed to GitHub before code. W11-06 final physical listening/hardware checks remain independent NOT_TESTED.
