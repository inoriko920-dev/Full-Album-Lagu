# W11-07 — Serial SOL Task Cards

Planning status: **PRE-GATE / NOT IMPLEMENTED**. These tasks are future execution only, blocked on owner UI-source PNG, reference DOCX and planning DOCX present in GitHub.

| Task | Real deliverable | Mandatory tests |
|---|---|---|
| T11-W07-01 | Additive validated animation/keyframe and boundary contracts; schema v1 older-project migration/read parity | missing/invalid/malformed, NaN/Inf, legacy save/reopen, no project revision noise |
| T11-W07-02 | Pure animation and keyframe evaluator (entrance, exit, loop, easing), deterministic time mapping | 0/2.5s opacity 85%, seek replay, exact boundaries, 128 layers, no frame-dependent random |
| T11-W07-03 | Official ProjectCommandEngine mutation and history for animation/keyframes | atomic update, stale/locked reject, one Undo/Redo, replay/save/reopen |
| T11-W07-04 | Canonical boundary pair transition event + handoffs + presets | 128 tracks, disabled/reordered/removed tracks, 8 presets, exact boundary, no ghost events |
| T11-W07-05 | Wire existing left Inspector using **UI-IMG-002G**, real project settings and preview | four control groups visible, correct selection, no Gemini relocation, real Windows capture |
| T11-W07-06 | Wire existing **UI-IMG-002D** boundary Inspector / Preview Boundary | user edits type/duration/easing, current/resolved metadata, safe seek and project history |
| T11-W07-07 | Real Windows integration, acceptance evidence, drift audit and portable regression | Windows exact-commit CI, 29 frozen states untouched, source fingerprints, package ZIP |

Do not write any implementation source until **both** UI and planning gates are met. Every task requires its predecessor's exact-head CI and full tests. Physical audio gate not falsely certified; downstream FFmpeg MP4 is W11-08/STEP12.
