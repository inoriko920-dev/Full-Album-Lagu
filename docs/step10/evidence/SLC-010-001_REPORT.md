# SLC-010-001 — VERIFIED EVIDENCE REPORT

Verdict: **PASS_WITH_PROVISIONAL**

## Identity
- Repository: `inoriko920-dev/Full-Album-Lagu`
- Source ref: `main`
- Tested source SHA: `f83be0af076bc6dba9f1d8a8fdd2e9342ccc2998`
- Workflow SHA: `f83be0af076bc6dba9f1d8a8fdd2e9342ccc2998`
- Windows CI run: `37527340961`
- Job: `112487575482`
- Platform: Windows x64
- Node: v22.23.3

## User flow proven
`Simpan` in the real Electron renderer -> ProjectSession -> typed preload bridge -> IPC -> SaveProjectUseCase -> ProjectStore -> JsonProjectStore -> real schema-v1 JSON file -> app exit -> startup load -> LoadProjectUseCase -> ProjectSession.

## Happy path evidence
- real project file created: PASS
- schemaVersion = 1: PASS
- same project ID after reopen: PASS
- same project name after reopen: PASS
- same revision after reopen: PASS
- empty track list round-tripped: PASS
- renderer save state = saved: PASS
- renderer reopen source state = loaded: PASS
- path containing spaces + Unicode: PASS

Real project output:
- bytes: 138
- SHA-256: `bf60b59804a4e5af85a3e0e6b07439d0000c5deaf400893b1f0aa6528bdae08a`

## Negative path
Representative failure path: **SAVE_CANCELLED**.
- renderer persistence state = cancelled: PASS
- no crash: PASS
- no write failure state: PASS

Additional integration negative path:
- malformed/corrupt JSON rejected as `PROJECT_INVALID`: PASS
- corrupt source file remains unchanged: PASS

## Test / gate summary
- format: PASS
- ESLint: PASS
- TypeScript strict: PASS
- architecture check: PASS
- secret scan: PASS
- portable-path scan: PASS
- frozen UI reference verification: PASS
- unit tests: 3 PASS
- contract tests: 20 PASS
- component tests: 6 PASS
- integration tests: 2 PASS
- real Electron E2E SLC: PASS
- runtime dependency audit at high severity: PASS
- SCR-002A visual baseline: PASS
- Windows x64 packaging: PASS
- packaged executable smoke: PASS
- portable ZIP + checksum: PASS

## Artifacts
- SLC evidence: `Lagu-Full-Album-S10-SLC-010-001-Evidence`
  - ID: `11443565012`
  - digest: `sha256:d73ee15ea2db48261db1db52f794eb2766dd0a4530ada5bb3cda5bfda3b8d08a`
  - contains `SLC_REPORT.md`, `TEST_SUMMARY.json`, `BUILD_MANIFEST.json`, `KNOWN_LIMITATIONS.md`, save/reopen/cancel renderer JSON, three real Electron screenshots, sanitized step log, and the real project output.
- S09 visual-regression artifact: ID `11442418404`.
- Windows portable artifact: ID `11442836595`.
- Windows portable ZIP SHA-256: `b18dc369035eb0c1e4a5f7c8fb49b78001976ddcffca4fbc2e5fd338b49bb033`.

## Provisional
The native Windows save dialog is production code but its mouse/keyboard interaction is not automated on the hosted runner. The E2E injects the deterministic selected path at composition time while still exercising the same UI Save intent, typed IPC, application use case and real filesystem adapter. This is explicitly retained as provisional and does not block the next feature-wave planning step.

## Scope not proven
Media import/probe/relink, autosave/recovery generations, file locking, migration beyond schema v1, playback/visualizer, MP4 rendering, Gemini credentials/provider/key rotation.

## ASTRA review
No architecture pillar, UI Freeze or project-format strategy was materially changed. No STEP 10 Astra escalation was triggered.