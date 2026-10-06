# TASK LEDGER

## S08-T01 - Source-of-Truth & Governance Bootstrap
- Owner: SOL
- Priority: P0
- Risk: LOW
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS
- Goal: convert the empty repository into a documentation-governed project before code.
- Evidence: current planning/reference/factory/handoff/governance source of truth is committed; superseded UI planning archived; 29-image UI reference committed.

## S08-T02 - Repository Skeleton & Quality Tooling
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: DONE
- Work status: IMPLEMENTED
- Evidence status: VERIFIED
- Gate: PASS_WITH_PROVISIONAL
- Verified foundation commit: `98333b5196ec0bdc3cff867c33cbd639f6d95bf6`
- Clean-lock evidence commit: `dbf3c7f65374fb4c508c0e502f8aade365a282db`
- GitHub Actions clean-lock run: `37502197633`
- Acceptance evidence:
  - exact `package-lock.json` committed;
  - `npm ci` PASS on `windows-latest`;
  - formatting, ESLint, TypeScript strict, architecture check, secret scan and portable-path scan PASS;
  - unit: 1/1 PASS;
  - contract: 2/2 PASS;
  - component: 1/1 PASS;
  - main/preload/renderer/render foundation builds PASS;
  - runtime audit `npm audit --omit=dev --audit-level=high` PASS;
  - Electron renderer boundary uses context isolation, Node integration disabled and a narrow typed preload;
  - no product feature implementation, SoundVisualizer import, Gemini SDK or FFmpeg binary was introduced.
- Provisional:
  - full dev/tooling install currently reports 8 moderate advisories plus deprecated transitive packages from tooling; do not hide or auto-force-upgrade them. Reassess in S08-T03/dependency maintenance with compatibility evidence.
  - FFmpeg/FFprobe distribution and Gemini SDK/model remain later bounded decisions.

## S08-T03 - CI Foundation & Windows Packaging Smoke
- Owner: SOL
- Priority: P1
- Risk: MEDIUM
- Status: IN_PROGRESS
- Work status: IMPLEMENTED
- Evidence status: PENDING_CI
- Goal: make persistent GitHub Actions clean-machine verification authoritative and prove the foundation creates/starts a Windows x64 unpacked + portable ZIP artifact.
- Implemented:
  - persistent Windows CI workflow;
  - clean install + full foundation verification + runtime audit;
  - electron-builder Windows x64 directory package;
  - packaged executable smoke flag and smoke runner;
  - explicit multi-file portable ZIP + SHA256 artifact upload.
- Out of scope honored: no product UI, product feature behavior, SoundVisualizer feature integration, Gemini real integration or FFmpeg render binary.
- Gate remains open until the new persistent CI run and uploaded artifact are verified.
