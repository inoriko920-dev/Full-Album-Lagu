# T11-W07-07 — Windows integration evidence and acceptance audit

**Status on initial commit: IMPLEMENTED; exact-head Windows CI PENDING.**

## Frozen scope and predecessor
- T11-W07-01..06 merged. T06 [PR #72](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/72) merged to `main@26a55ad7209b5313cc2278e2d876f4eee47dc8b8`; [postmerge CI #858](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38035108907) SUCCESS exact `main`.
- Keep existing 29-state `LFA-UI-REFERENCE-v1.1`, UI-IMG-002D, the user-provided UI-IMG-002G PNG and owner-accepted review DOCX **unchanged**.
- No redesign, logo, new presets, feature expansion, new generated images, new playback clock, or new release claims.

## What this step actually tests in Windows
The new `scripts/run-w07-t07-acceptance.mjs` runs as a mandatory Windows CI step **after** `npm run verify`, Electron E2E waves, frozen screenshot verification, packaged native MP3/WAV probes, 128-song tests and portable ZIP creation. The audit refuses to run outside Windows or without exact `GITHUB_SHA`.

Strict proof:
1. Verify 29-state frozen references and UI freeze manifests, and unchanged original git blobs for the owner-generated UI-IMG-002G PNG, UI addendum DOCX, and W11-07 charter DOCX. Fingerprint key implementation files with SHA-256.
2. Read the real SCR-002A 1600×1000 capture and DOM evidence from Electron; ensure permanent Gemini agent, Preview and timeline remain present.
3. Verify packaged Windows `.exe`, ZIP magic, ZIP SHA-256 against `SHA256SUMS.txt`, and package fingerprints.
4. Require the actual previous W11-06 20-AC evidence remain marked **release blocked**, with actual speaker/hardware Suspend/Resume NOT_TESTED.
5. Enumerate all twelve W11-07 criteria in a machine-readable matrix, including precisely what the existing automated Windows tests proved and what they **did not** prove. Output `W07_12_AC_MATRIX.json` and `W07_GATE_SUMMARY.txt` as a separately named CI artifact.

## Deliberate acceptance boundaries
- `AC-W11-07-01..07`, `12`: automated CI coverage only. They do **not** assert final end-user visual acceptance.
- `AC-W11-07-08..11`: **PARTIAL_AUTOMATED**. Real-device relink/seek prolonged session, full audiovisual synchronization, eight-preset pixel parity, and 002G/002D/all 29-state visual review are **not** certified by the existing CI.
- W11-06: real physical audible speaker/headphones, real Suspend/Resume, 25 real Windows picker interactions, and multi-hour resource plateau remain **NOT_TESTED**.
- Final video MP4 rendering is W11-08/STEP12. `releaseAuthorized=false` and `finalMp4Available=false` irrespective of green CI.

## Gate for merge and next step
- Merge only when full **normal** Windows CI (no temporary formatter) succeeds on the exact last PR commit, no unrelated PR conflicts, and the audit artifact records all twelve AC.
- Verify postmerge `main` CI succeeds on the actual merge commit. If any required evidence or reference is missing, mark FAIL and **do not release**.
- T07 automated evidence may be complete while wave/final release acceptance is **BLOCKED_PHYSICAL_AND_VISUAL_QA**.
