# ASTRA W11-06 — PRE-GATE Definition of Ready (DRAFT)

**Verdict: FAIL / BLOCKED — by design.** No W11-06 code, tests specific to W11-06, transport, FFT adapter or UI modifications have been authorized.

| DoR requirement | Current status | Required before READY |
| --- | --- | --- |
| W11-01..04 dependency closure | PASS (historical evidence) | preserve source-of-truth |
| W11-05 complete wave acceptance | **FAIL / AC21 OPEN; AC25 FINAL HELD** | user explicitly accepts frozen SCR-002C, SCR-003A, SCR-003B and DLG-008 or requests bounded change; then full 25 AC final audit and controlled merge |
| W11-05 final Windows test head | CI #548 SUCCESS at 6e331c0 | reconfirm if W11-05 branch changes |
| Final W11-06 master DOCX in repo | **FAIL / only local pre-gate DOCX exists** | review, expand if necessary and commit formal detailed DOCX at docs/source-of-truth/planning/current |
| Wave 06 charter, acceptance, tasks in GitHub | PARTIAL / pre-gate markdown drafts only | finalize after source-of-truth DOCX, owner/dependency decisions |
| Authorized media gateway design | PENDING | decide main-controlled stream, origin, Range, revoke, lifecycle and security |
| Windows codec support | PENDING | real packaged Electron MP3/WAV playback proof |
| Audio clock and source of truth | DRAFT | approve projectAlbumTimeline-based mapper + stale generation cancellation |
| FFT / visual output contract | DRAFT | decide analyzer graph, update FPS, silence and pause policies |
| Frozen UI transport/scrub states | PENDING | map to 29 frozen screenshots or STOP for UI image/ref final DOCX |
| Trust / security | DRAFT | review known pathways and negative tests before runtime code |
| 20-AC measurable plan | PRE-GATE DRAFT | final approve IDs, tolerances, fixture policy |
| Tool/provider stage boundaries | PASS (planning) | no FFmpeg/Gemini or W11-07 motion in Wave 06 |
| Serial task execution | PLAN | only T11-W06-01 after all DoR PASS, later tasks gated one by one |
| Release / packaging proof | FUTURE | Windows real-playback E2E, packaged exe, portable ZIP and source fingerprint verification |

## Source of truth & limitations

The detailed draft DOCX **ASTRA_W11-06_PRE_GATE_PLAYBACK_SPECTRUM_PLAN_2026-10-08.docx** was created as a downloadable artifact in the conversation. It is **not** inside this GitHub branch, nor a substitute for a final planning document. This repository contains Markdown pre-gate handoff drafts only. Do not alter the existing frozen UI reference manifest or create undocumented UI states.

## First unlock procedure (not yet authorized)

1. W11-05 screen/design owner provides explicit AC21 decision.
2. Verify all 25 AC and last code SHA, CI, no-drift, portable evidence.
3. Merge W11-05 only after authorization and repo gate.
4. Rebase/review this planning branch against merged main, then complete final W11-06 DOCX and UI if necessary.
5. Obtain formal ASTRA DoR PASS; only then authorize SOL task 01.
6. Keep Wave07/08 + STEP12 separate.

**Current conclusion: Planning documentation prepared. Implementation remains BLOCKED.**
