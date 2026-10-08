# ASTRA W11-06 — PRE-GATE Definition of Ready (DRAFT)

**Verdict: FAIL / BLOCKED — by design.** No W11-06 code, tests specific to W11-06, transport, FFT adapter or UI modifications have been authorized.

| DoR requirement | Current status | Required before READY |
| --- | --- | --- |
| W11-01..04 dependency closure | PASS (historical evidence) | preserve source-of-truth |
| W11-05 complete wave acceptance | **FAIL / AC21 OPEN; AC25 FINAL HELD** | user explicitly accepts frozen SCR-002C, SCR-003A, SCR-003B and DLG-008 or requests bounded change; then full 25 AC final audit and controlled merge |
| W11-05 final Windows test head | CI #548 SUCCESS at 6e331c0 | reconfirm if W11-05 branch changes |
| Final W11-06 master DOCX in repo | **PARTIAL / native PRE-GATE DOCX committed, final approval still missing** | review and commit approved formal detailed DOCX in docs/source-of-truth/planning/current after W11-05 closure |
| Wave 06 charter, acceptance, tasks in GitHub | PARTIAL / pre-gate DOCX and Markdown drafts only | finalize after final source-of-truth DOCX, owner/dependency decisions |
| Authorized media gateway design | PENDING | decide main-controlled stream, origin, Range, revoke, lifecycle and security |
| Windows codec support | PENDING | real packaged Electron MP3/WAV playback proof |
| Audio clock and source of truth | DRAFT | approve projectAlbumTimeline-based mapper + stale generation cancellation |
| FFT / visual output contract | DRAFT | decide analyzer graph, update FPS, silence and pause policies |
| Frozen UI transport/scrub states | PARTIAL / CURRENT CODE AUDITED, DESIGN AUTHORITY PENDING | Existing Prev/Putar/Next/Volume disabled; static timecode/playhead/spectrum. See `W11_06_EXISTING_UI_SURFACE_AUDIT.md`; formally map Pause/Stop/Seek states to frozen references, or STOP for UI governance before SOL wiring |
| Trust / security | DRAFT | review known pathways and negative tests before runtime code |
| 20-AC measurable plan | PRE-GATE DRAFT | final approve IDs, tolerances, fixture policy |
| Tool/provider stage boundaries | PASS (planning) | no FFmpeg/Gemini or W11-07 motion in Wave 06 |
| Serial task execution | PLAN | only T11-W06-01 after all DoR PASS, later tasks gated one by one |
| Release / packaging proof | FUTURE | Windows real-playback E2E, packaged exe, portable ZIP and source fingerprint verification |

## Source of truth & limitations

The original detailed draft DOCX **ASTRA_W11-06_PRE_GATE_PLAYBACK_SPECTRUM_PLAN_2026-10-08.docx** remains a downloadable conversation artifact. A **separately generated native pre-gate Word copy** has been added at `docs/step11/w11-06-pre-gate/ASTRA_W11_06_PLAYBACK_SPECTRUM_PRE_GATE_DRAFT.docx`, derived from this branch's four Markdown drafts. It is **not identical to the conversation DOCX** and **does not satisfy the final approved-planning DOCX gate**. Do not alter the frozen UI manifest or create undocumented UI states.

## First unlock procedure (not yet authorized)

1. W11-05 screen/design owner provides explicit AC21 decision.
2. Verify all 25 AC and last code SHA, CI, no-drift, portable evidence.
3. Merge W11-05 only after authorization and repo gate.
4. Rebase/review this planning branch against merged main, then complete final W11-06 DOCX and UI if necessary.
5. Obtain formal ASTRA DoR PASS; only then authorize SOL task 01.
6. Keep Wave07/08 + STEP12 separate.

**Current conclusion: Planning documentation prepared. Implementation remains BLOCKED.**
