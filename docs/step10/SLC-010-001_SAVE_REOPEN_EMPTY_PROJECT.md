# SLC-010-001 — Save & Reopen Empty Project

Status: VERIFIED / PASS_WITH_PROVISIONAL
Owner: SOL
Baseline: `main@49417d7fb2e10115b2a698fcf0d74be40ff1aee1`
Target: Windows 11 x64 / Electron
UI authority: `LFA-UI-REFERENCE-v1.1`
UI freeze: `LFA-UI-FREEZE-v1.0`
Architecture: STEP 06 v1.0
Code Constitution: v1.0

## User Intent
Sebagai pengguna, saya dapat menekan **Simpan** pada proyek baru, mendapatkan file proyek nyata yang aman ditulis, lalu membuka kembali file itu dan mendapatkan state proyek yang sama tanpa Gemini/cloud.

## Why this slice
Ini adalah slice terkecil yang bernilai pengguna sekaligus melewati boundary arsitektur utama: renderer UI -> ProjectSession -> typed preload bridge -> IPC -> application use case -> persistence port -> Electron-main filesystem adapter -> JSON project output -> load/validation -> ProjectSession kembali. Slice ini tidak membutuhkan FFmpeg atau Gemini yang memang dimiliki STEP 12.

## Entry Condition
- SCR-002A terbuka.
- Project kosong bernama `Proyek Baru`.
- Gemini boleh belum dikonfigurasi.
- Tidak ada media yang diperlukan.

## Happy Path
1. Pengguna menekan `Simpan`.
2. Renderer hanya mengirim snapshot project melalui ProjectSession/typed bridge.
3. Main memilih path melalui path selector; CI memakai injected deterministic path, produksi memakai native save dialog.
4. Application use case memvalidasi lalu menyimpan melalui ProjectStore.
5. JsonProjectStore melakukan temp-write lalu rename atomic.
6. File JSON nyata terbentuk.
7. App ditutup.
8. App dibuka kembali dengan project path yang sama.
9. Main memuat dan memvalidasi JSON.
10. Renderer ProjectSession menerima startup project.
11. Project ID/name/schema yang sama dapat diamati kembali.

## Real Output
File `*.lfa.json` berisi schema version, stable project ID, project name, revision, dan track list. Tidak mengandung API key/secret.

## Layers Involved
- UI: `src/renderer/app`
- ProjectSession: `src/renderer/state/project-session`
- Typed bridge/contracts: `src/core/contracts`, `src/preload`
- Application use cases + ports: `src/core/application`
- Persistence adapter: `src/main/infrastructure/persistence`
- Composition/IPC: `src/main`

## Contract Walkthrough
| Seam | Input -> Output | Validation / Error | Side effect / owner |
| --- | --- | --- | --- |
| AppShell -> ProjectSession | save intent -> persistence state | duplicate save guarded | renderer session |
| ProjectSession -> preload | ProjectDocument -> SaveProjectResult | typed schema | IPC only |
| IPC -> SaveProjectUseCase | selected path + ProjectDocument -> saved/cancel/error | runtime schema | main |
| Use case -> ProjectStore | path + validated project -> receipt | mapped storage error | application port |
| JsonProjectStore -> filesystem | JSON -> atomic file | write/rename failure | main infrastructure |
| startup load -> ProjectSession | path -> validated ProjectDocument | invalid/corrupt mapped | main -> renderer |

## Thread / Process Ownership
- UI intent and ProjectSession run in renderer.
- Filesystem and native dialogs run in Electron main.
- No filesystem access from renderer.
- No long-running process is introduced.

## Cancel / Retry / Idempotency
- Save-dialog cancellation returns `cancelled`; no file is created and the editor stays usable.
- No automatic retry for writes in STEP 10.
- Re-saving the same snapshot to the selected path is logically idempotent for project content.

## Persistence Owner
`src/main/infrastructure/persistence/JsonProjectStore`.

## Logging Owner
No new persistent logging subsystem in this slice. CI/E2E evidence is sanitized and contains fixture paths only.

## Negative Path
**SAVE_CANCELLED**: path selection is cancelled. Expected: no crash, no output file, project remains usable, persistence state returns `cancelled`.

Additionally, integration tests reject malformed/corrupt JSON without overwriting it.

## Acceptance Criteria
- UI `Simpan` drives the real bridge/persistence path.
- Renderer has no `fs`, `dialog`, or main-infrastructure import.
- Save writes a schema-versioned JSON file atomically.
- Close/reopen restores same project ID/name/revision/tracks.
- Cancelled save creates no output and does not crash.
- Corrupt project load is rejected without modification.
- Path with spaces + Unicode is exercised in Windows CI.
- Unit/contract/component/integration/E2E gates pass on the same relevant head.
- Runtime high-severity audit and Windows package smoke stay green.
- No secret or developer path is committed.

## Required Tests
- unit: project factory/schema behavior;
- contract: IPC request/response schema and allowlisted channels;
- component: UI Save intent -> ProjectSession observable state;
- integration: JsonProjectStore save/load + corrupt input;
- E2E: real Electron save -> exit -> reopen, plus cancelled save;
- packaged smoke: existing Windows packaged smoke.

## Evidence Required
- `docs/step10/evidence/SLC-010-001_REPORT.md`
- CI run/job/SHA
- generated `TEST_SUMMARY.json`
- saved fixture project + SHA-256
- save/reopen/cancel renderer evidence JSON
- Windows portable artifact/checksum

## Out of Scope
- real New/Open/Save As project hub workflow;
- autosave/recovery generations;
- project migration beyond schema v1;
- file locking;
- media import/probe/relink;
- CommandEngine mutations;
- Gemini;
- FFmpeg/render;
- broad STEP 11 feature work.

## Rollback
Normal Git revert of SLC-010-001 commits. No project migration or destructive external state is introduced.

## Astra Review Trigger
Required only if implementation would change a protected architecture pillar, UI freeze, project format strategy, or Electron/renderer security boundary. The planned slice follows existing STEP 06/07 boundaries and therefore does not trigger an architecture change by itself.

## Final Verification
- Tested source SHA: `8425849ca1300a2f35fdb9490f04f4b78fbb9b7e`
- PR verification run: `37526403614`
- Job: `112484540995`
- SLC evidence artifact: `Lagu-Full-Album-S10-SLC-010-001-Evidence`
- Artifact ID: `11441669149`
- Artifact digest: `sha256:4bc87fbfcf2137f7e0d643425c8028c6dbacfaea6c67ac76b6ff4e9062453bc5`
- Real project output SHA-256: `9bd9f34be707efd9c7dea9ef8fdfd668d16cf70260490f24d6a605b5d02c133a`
- Windows package artifact ID: `11442058480`
- Visual regression artifact ID: `11442373095`

All required automated gates passed. The slice verdict is `PASS_WITH_PROVISIONAL` because CI intentionally injects the deterministic save path and does not automate the native Windows save-dialog interaction itself. The same production path-selection dependency feeds the same IPC/use-case/store pipeline, so this does not block STEP 11.
