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
- S09-T02 Design Tokens + Shared Components Minimum = VERIFIED / PASS.

## S09-T02 implementation
- Existing frozen design variables moved to renderer-level `src/renderer/ui/tokens.css`.
- Repeated SVGs moved to typed `src/renderer/ui/AppIcon.tsx`.
- Repeated toolbar/action/icon buttons use minimal shared controls in `src/renderer/ui/controls.tsx`.
- SCR-002A consumes these primitives with unchanged frozen hierarchy/copy/state.
- No speculative component library/framework was introduced.

## S09-T02 evidence
- Verified branch SHA: `8c20acbcc4c33858cb25c6da1d53690b6881255b`.
- Windows CI run: `37517598647` — PASS.
- Job: `112454487220`.
- UI artifact ID: `11437611756`.
- UI artifact digest: `sha256:8dfdef96cfedcb3b8b6a828f2aaa87f86da2a8d5cce0af3c84e78cd089aca161`.
- SCR-002A: 1600x1000, 294776 bytes.
- SCR-002A SHA-256: `acb71b2ee816215cf1104c8ea4d78a0a55e9bf0e1e31545a52c354c3c3b638fa`.
- The S09-T02 PNG is byte-identical to the S09-T01 PNG, proving the refactor did not change the rendered pixels.
- Record: `docs/ui/evidence/S09_T02_DESIGN_SYSTEM_EVIDENCE.md`.

## Frozen UI authority
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
- S09-T03 still owns the authoritative frozen-reference screenshot baseline/comparison workflow.

## Next exact action
**STEP 09 / S09-T03 — First Frozen Reference Screen + Screenshot Baseline.**

Do not start until the user says `lanjutkan`.
