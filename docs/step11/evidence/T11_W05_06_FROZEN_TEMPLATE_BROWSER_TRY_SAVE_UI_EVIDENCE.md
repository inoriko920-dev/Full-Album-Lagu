# T11-W05-06 — Frozen Template Browser / Try / Save UI

- Date: 2026-10-08 WIB (Asia/Jakarta)
- Role: SOL
- Software Factory STEP 11 / W11-05 / **T11-W05-06 only**
- Dependency: T11-W05-05 PASS / VERIFIED
- Task gate: **PASS / VERIFIED**; overall W11-05 remains IN PROGRESS
- PR: https://github.com/inoriko920-dev/Full-Album-Lagu/pull/50
- CI: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37726555465 (#394, success)

## Product delivery

- Frozen template collection screen `src/renderer/app/TemplateBrowser.tsx` + scoped `template-browser.css`, opened from the existing top toolbar button. Existing Main Editor and permanent right-side Gemini Agent stay mounted; returning restores the user's project, selected track, Album Timeline and workspace context.
- Local-only category and search grid backed by the nine built-in starter templates including **Minimal Biru** and the main-owned user-template catalog. No marketplace, network fetch or renderer filesystem access.
- Detail and deterministic static 16:9 Preview reuse the W05-04 scene projector; UI uses the same selected track and W11-04 dynamic bindings rather than storing resolved song/title/artwork inside the template.
- Exact safety copy `Urutan track dan durasi tidak berubah.` and trial banner `Mode Coba — perubahan belum disimpan ke proyek.`. `Coba Template` constructs `TemplateTrialSession` in transient ProjectSession memory, never changes revision, dirty checkpoint, media references, track order or history; `Kembali ke Sebelumnya` discards it exactly.
- `Terapkan Template` delegates to the existing guarded `template`-origin CommandEngine transaction, one history node, with atomic rejection of stale revision/state token and safe no-op on identical scenes. Unified Undo/Redo works.
- `Simpan sebagai Template` / DLG-008 includes name/category and safe scope text; uses `createTemplateFromProject` to produce **visual-only** schema-v1 data, then main-owned `JsonTemplateStore` via narrow IPC. Saving does not dirty project, overwrite built-in templates, add media paths, playlist, audio bytes, metadata, or credentials. Saving is disabled during trial to prevent unintentionally saving the underlying canonical scene instead of the visible trial preview.
- Invalid/corrupt/missing/duplicated templates produce safe UI errors without modifying project.

## Architecture

- `src/core/contracts/template-ipc.ts`: strict runtime-validated catalog/list/load/save envelopes and identity/category/document validation. Rejects extra payload properties, path traversal, incompatible versions and protected-source fields.
- `src/main/ipc/register-ipc.ts` + `src/main/bootstrap.ts`: main-owned injection of the existing `CompositionRoot.templateStore`; safe error mapping, no raw path disclosure.
- `src/preload/api.ts` + `src/core/contracts/lfa-bridge.ts`: safe typed preload methods, renderer does not load raw files.
- `src/renderer/state/project-session/use-project-session.ts`: transient Try/Revert, guarded Apply and async Save use the existing canonical session/history; no alternate Project State.
- `src/renderer/app/AppShell.tsx`: opens/closes template UI without rebuilding Main Editor or changing frozen shell while browser is closed.

## Verification

- `tests/component/AppShell.visual-layer-editor.test.tsx` adds browser/return-context, local filters and search, initial clean state, Try no dirty/history, Revert exact, Apply/Undo/Redo, Save visual-only, corrupt load safe rejection.
- `tests/contract/template-ipc.test.ts` checks strict IPC list/load/save, schema/category/version, path traversal and protection against audio/project data.
- Fast checks `37725744264` and `37726061804` PASS (final contract 59 / component 42). Final lint-repair check `37726458031` PASS (lint + TS + 42 component). Temporary CI formatting files removed before merge.
- Windows CI #394 / `37726555465` PASS at `0961b284d0d4152bfa47c6d634906125659bb904`; **292 tests PASS** (153 unit, 59 contract, 42 component, 38 integration), architecture/secrets/portable-path checks, 29 frozen UI reference states, exact SCR-002A baseline, STEP 10 and W11-01..04 E2E, packaged Windows executable smoke and portable multi-file ZIP PASS.
- Windows portable ZIP artifact ID **11527449093**; SCR-002A visual evidence artifact ID **11527764688**.
- Full **SCR-003A, SCR-003B and DLG-008 pixel-by-pixel screenshot comparison is not yet proved**; visual authority and 100-template end-to-end drift review remain W05-07.
- Protected source SHA-256/size/mtime final fingerprints and full Save/Reopen/second-project template scenarios are the W05-07 closure scope; task-level tests do not substitute for wave closure.

## Governance / next gate

- **T11-W05-06 PASS / VERIFIED.**
- **T11-W05-07 READY only — Wave E2E, Stress, Drift Review & Evidence Closure.**
- W11-05 wave remains IN PROGRESS. No W11-06 audio-reactive playback, W11-07 keyframes/transitions, STEP 12 Gemini/FFmpeg or final release work until their own gates.
- One task per user turn. Await next `lanjutkan`.
