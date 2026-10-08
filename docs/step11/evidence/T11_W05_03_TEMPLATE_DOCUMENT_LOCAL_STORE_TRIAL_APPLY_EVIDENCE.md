# T11-W05-03 — Template Document + Local Store + Trial/Apply Core

- Date: 2026-10-08 (Asia/Jakarta)
- Role: SOL
- Software Factory: STEP 11 / W11-05 / **T11-W05-03 only**
- Task gate: **PASS / VERIFIED** (subject to final branch CI/check of evidence-only updates)
- Dependency: T11-W05-02 PASS / VERIFIED
- PR: https://github.com/inoriko920-dev/Full-Album-Lagu/pull/47
- Implementation branch: `sol/t11-w05-03-template-core-20261008`
- Regression CI: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37721012581 (#352, PASS at `993605ef443015673fb3e0f0baa95e675483d495`).
- Extra Windows portable catalog smoke validation: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37721278066 (#353; added after CI #352). The final PR-head CI must also PASS before merge.

## Implemented contracts and canonical owners

1. `src/core/domain/template-document.ts` — strict additive template schema v1; allows **only** template metadata and validated canonical `VisualScene`, rejects unknown properties, incompatible version, absolute user paths and file URLs.
2. `src/core/application/ports/template-store.ts` — one framework-free store port and sanitized read-only catalog entries; typed failures.
3. `src/core/application/services/template-workflow-service.ts` — canonical reusable visual-only export; `TemplateTrialSession` with original revision/state token; Try returns a pure non-persisted candidate and Revert returns an exact base; Apply is **one** `template`-origin `ProjectSessionHistory.execute` transaction with stale guards; Save is main-store-only and does not mutate project.
4. `resources/templates/catalog.json` — deterministic starter presets for the nine frozen categories: Minimal, Premium, Neon, Ambient, Classic Album, Dark, Light, Retro, Motion. `Minimal Biru` is present. Assets use semantic `active-track-artwork`, `title` and `artist` bindings; Spectrum/Progress remain static structural layers.
5. `src/main/infrastructure/persistence/json-template-store.ts` — read-only package catalog; user templates rooted in Electron userData; validated names/IDs/size/content, individual corrupt user files isolated from catalog; local create-only/no-overwrite via same-directory temporary file and hard-link publication; no direct renderer disk access.
6. `src/main/composition-root.ts` — composition-owned packaged/development resource path and userData template store. Future IPC/browser is deliberately NOT part of W05-03.
7. `electron-builder.yml`, `scripts/smoke-packaged-windows.mjs` — package starter catalog in portable Windows resources and check presence/required entries during packaged smoke.

## Tests and observable evidence

- `tests/unit/template-workflow.test.ts`: strict visual-only schema; path/unknown/incompatible rejection; Try non-dirty/no history; exact Revert; single template-origin Apply with Undo/Redo; atomic stale rejection; dynamic second-project binding.
- `tests/integration/json-template-store.test.ts`: nine packaged starter templates and categories; built-in read-only and user overwrite rejection; corrupt JSON handling and no project mutation; 100 user-template save/list/load/try stress (109 total including starters).
- #352 Windows CI: 22 unit test files / **145 PASS**, 11 contract files / **55 PASS**, 4 component files / **28 PASS**, 10 integration files / **38 PASS** — total **266 PASS**.
- #352: architecture check 65 source files PASS; secrets scan 140 foundation files PASS; portable-path check 71 files PASS; 29 frozen UI reference states PASS.
- #352: STEP 10 SLC save/reopen; W11-01 recovery/lifecycle; W11-02 media; W11-03 album timeline/history; W11-04 Auto Susun/binding regression; frozen SCR-002A visual baseline PASS.
- #352: Windows x64 packaged executable smoke PASS; portable multi-file ZIP produced, artifact ID `11525927277`; frozen visual artifact `11526261191`.
- #353 adds explicit starter template-resource packaged smoke to ensure generated ZIP includes the new catalog; final branch CI must validate that change and docs handoff.

## Safety and deferred boundaries

- Template does **not** embed playlist/order/duration, audio/image source IDs/paths, project-specific track metadata, credentials, provider state or full `ProjectDocument` snapshots.
- Built-ins cannot be overwritten; collisions reject without changing existing template bytes.
- Manual edit and template Apply use one existing `ProjectCommandEngine` history owner, with no parallel project state; Try and Save Template cannot dirty the current project.
- Original media references and audio files are not written by this task. Source-byte/mtime SHA-256 final closure remains W05-07.
- No Template Browser, editor Preview/selection UI or new prompt images in this task; W05-04/05/06 are separate serial tasks. No audio analyzer (W11-06), animation/keyframe/transitions (W11-07), Gemini or FFmpeg integration (STEP 12).

## Acceptance contribution and handoff

- AC-W11-05-12..20: template core at task level PASS, with local-browser UI items deferred to W05-06.
- AC-W11-05-24: 100-template catalog stress contribution PASS, renderer/E2E closure deferred to W05-07.
- AC-W11-05-23/25: architecture, secrets, prior wave, frozen UI and packaged Windows regression contribution PASS.
- **W11-05 as a whole remains IN PROGRESS**; nothing here claims full wave closure.
- After final Windows CI PASS and PR merge: **T11-W05-04 — Static Scene Preview + Selection/Inspector Projection becomes the only READY next task**. W05-05..07 stay BLOCKED.
