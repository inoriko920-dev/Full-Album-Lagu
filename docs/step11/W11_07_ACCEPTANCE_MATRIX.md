# W11-07 — Acceptance Matrix (Windows implementation evidence)

The original **pre-implementation gate** was resolved by the owner-uploaded UI-IMG-002G PNG, planning DOCX, UI addendum DOCX, approved UI-IMG-002D within the frozen pack, and merged T01–T06 source. This table records the **automatable proof scope**, not final physical or pixel-perfect approval.

The authoritative **per-commit result** is generated during normal Windows CI by `scripts/run-w07-t07-acceptance.mjs` and uploaded as the `Lagu-Full-Album-T11-W07-07-Windows-Acceptance` artifact (`W07_12_AC_MATRIX.json`, `W07_GATE_SUMMARY.txt`). Do not mark a row PASS for a commit unless that commit's CI and artifact both succeed.

| ID | Acceptance requirement | Evidence tier | Still missing |
|---|---|---|---|
| AC-W11-07-01 | Legacy v1 visual documents remain readable | AUTOMATED | Human legacy project opening |
| AC-W11-07-02 | Invalid keyframes/animation rejected atomically | AUTOMATED | No identified code gate |
| AC-W11-07-03 | Entrance/exit/loop deterministic | AUTOMATED | Human smoothness review |
| AC-W11-07-04 | 0/2.5 second 85% opacity keyframe | AUTOMATED | Final displayed pixel assessment |
| AC-W11-07-05 | CommandEngine Undo/Redo and save checkpoint | AUTOMATED | Human workflow rehearsal |
| AC-W11-07-06 | Locked/deleted/duplicated and Template Try protections | AUTOMATED | Physical mouse interaction |
| AC-W11-07-07 | First/middle/last, disabled tracks and 128 tracks | AUTOMATED | User’s real library |
| AC-W11-07-08 | Reorder/relink/seek/recovery stale guards | PARTIAL_AUTOMATED | Combined long physical session/relink |
| AC-W11-07-09 | Artwork/title/artist/spectrum timeline continuity | PARTIAL_AUTOMATED | End-user audiovisual sync review |
| AC-W11-07-10 | Eight approved preset effects | PARTIAL_AUTOMATED | Pixel-level proof for every preset |
| AC-W11-07-11 | Owner UI-IMG-002G/002D and all 29 frozen states | PARTIAL_AUTOMATED | Full visual human comparison; only frozen reference fingerprints and SCR-002A real screenshot proven |
| AC-W11-07-12 | Frozen source hashes, prior regression, security and portable ZIP checksum | AUTOMATED | End-user PC acceptance |

**The physical W11-06 gate remains open**: audible speaker/headphones, actual OS Suspend/Resume, 25 native picker interactions, long-duration memory/handle plateau and final 20-AC device sign-off are all **NOT_TESTED**, regardless of successful CI. The app is not authorized for a final release or MP4 claim.

See `docs/step11/evidence/T11_W07_07_WINDOWS_ACCEPTANCE_AUDIT_20261010.md` for the test/CI contract. The user-provided image and all UI references remain untouched.
