# CURRENT HANDOFF

## Project
Lagu Full Album — `inoriko920-dev/Full-Album-Lagu`

## Read first
AGENTS -> PROJECT_STATE -> source-of-truth INDEX -> current planning DOCX 00-09 -> machine-readable UI manifests -> Final UI Reference -> Software Factory guide -> Architecture -> Code Constitution -> Repository Map -> Module Ownership -> Dependency Rules -> current task.

## Current Software Factory step
**STEP 09 App Shell / UI Implementation = IN_PROGRESS.**

Completed:
- STEP 08 Repository Foundation = COMPLETED / PASS_WITH_PROVISIONAL.
- S09-T01 Global App Shell + Shared Layout Skeleton = VERIFIED / PASS_WITH_TOLERANCE.

## S09-T01 implementation
- Real renderer shell replaces the STEP 08 foundation card.
- Left rail: `Media | Layer | Inspector`.
- Center: 16:9 Preview with empty-project state.
- Right: permanent `Gemini Agent`; no-key status `Gemini • Belum dikonfigurasi • 0/100 key`; `Kelola API` + `Tambahkan API Key`.
- Bottom: Album Timeline empty state.
- Gemini rail remains visible while switching left tabs.
- Fixture-only implementation: no real provider/media/render/persistence integration.

## S09-T01 evidence
- Candidate Windows CI run: `37514665767` — PASS.
- Job: `112444384293`.
- UI evidence artifact: `Lagu-Full-Album-S09-T01-UI-Evidence`.
- Artifact ID: `11437311307`.
- Screenshot: `SCR-002A.png`, 1600x1000, PNG 294776 bytes.
- DOM evidence: viewport/shell/capture all 1600x1000 at zoom 1; required Gemini/preview/timeline markers present.
- Visual review: PASS_WITH_TOLERANCE against frozen hierarchy/copy/state. Automated bitmap diff against the embedded final-reference DOCX image remains S09-T03 scope.
- Record: `docs/ui/evidence/S09_T01_APP_SHELL_EVIDENCE.md`.

## Frozen UI pack — exact authority
- Reference manifest: `docs/ui/manifests/UI_REFERENCE_MANIFEST.json`
- Freeze manifest: `docs/ui/manifests/UI_FREEZE_MANIFEST.json`
- Pack ID: `LFA-UI-REFERENCE-v1.1`
- Freeze ID: `LFA-UI-FREEZE-v1.0`
- Approved visual states: 29
- Visual reference: `docs/source-of-truth/ui/06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT_SMALL.docx`

Never silently redesign the frozen pack.

## Known limitations
- Eight moderate dev/tooling advisories/deprecated transitives remain tracked; runtime high-severity audit passes.
- FFmpeg/FFprobe choice remains later render integration work.
- Gemini SDK/model choice remains STEP 12 work.
- S09-T01 is a shell/fixture task, not proof of real media/Gemini/render behavior.

## Next exact action
**STEP 09 / S09-T02 — Design Tokens + Shared Components Minimum.**

Implement only the minimum shared tokens/primitives proven necessary by the frozen UI. Do not start until the user says `lanjutkan`.
