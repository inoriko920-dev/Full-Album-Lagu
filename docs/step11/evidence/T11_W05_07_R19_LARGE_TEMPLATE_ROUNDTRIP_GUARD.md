# T11-W05-07 — R19 Large Template Save/Read Round-Trip Integrity (2026-10-08 WIB)

**Owner/scope:** SOL, STEP 11 / W11-05 only.  
**Branch:** `sol/t11-w05-07-wave-closure-20261008`  
**PR:** [#51](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51) — **DRAFT / NOT MERGED**  
**Whole-wave gate:** W11-05 **IN_PROGRESS**. `AC-W11-05-21` frozen UI design-owner acceptance **OPEN**. `AC-W11-05-25` technical regression green but final closure **HELD**. Later waves BLOCKED.

## Root cause: successful template save could produce an unreadable file

`src/core/domain/visual-scene-schema.ts` permits **up to 512 valid visual layers**, each static text layer allowing up to 2,000 UTF-16 characters. Unicode text content can serialize to more than **2 MiB** of UTF-8 JSON while remaining fully schema-valid.

Before R19:
- `JsonTemplateStore.saveUserTemplate()` validated the document but wrote the JSON **without checking serialized byte size**.
- `readTemplateFile()` used `lstat` and rejected a user template file larger than **2 MiB**.
- Therefore an allowed and successfully written template could later fail to load and be silently omitted from `list()`, even while the UI had truthfully received a save-success response at the filesystem level.

This is a **persisted round-trip consistency** defect, not a cosmetic issue.

## Bounded correction

In `src/main/infrastructure/persistence/json-template-store.ts`:
1. Keep the built-in catalog's defensive maximum at **2 MiB** (`MAX_BUILT_IN_CATALOG_BYTES`).
2. Set the user template file maximum to **8 MiB** (`MAX_USER_TEMPLATE_BYTES`), safely above current schema-valid multi-layer Unicode samples while keeping a finite read bound.
3. Serialize the **exact UTF-8 payload once** and use `Buffer.byteLength(payload, "utf8")` before writing. Exceeding 8 MiB fails with `TEMPLATE_INVALID` *before creating a successful output file*.
4. Save writes precisely the payload whose size was checked; subsequent user-template reads apply the exact same 8 MiB cap.
5. Preserve the existing strict schema, identity matching, no-overwrite same-directory hard-link publication, temporary cleanup, corrupt-user-file isolation, source-path guards and built-in immutability. No template schema changes, audio/runtime changes, or frozen UI reference/layout changes.

**Implementation commit:** `523575e9f759545c13c3722537defe73f0c8c4db`.

## Deterministic integration regression

Added a main-owned `JsonTemplateStore` integration test using a real schema-valid user-owned scene: **440 uniquely identified static text layers**, each containing 2,000 CJK characters. It:
- Asserts the actual serialized UTF-8 file is **larger than 2 MiB** and **smaller than 8 MiB**.
- Calls the real `store.saveUserTemplate()`, checks the physical UTF-8 file size equals the expected serialized payload.
- Verifies the new template remains discoverable in `store.list()`.
- Calls `store.load()` and asserts **exact equality** with the saved schema-valid document, including text/layer content.
- Uses a temporary test directory and removes it in the existing suite teardown.

**Test commit:** `3cb3bf41659b87282cd20a799c15d83014a2c9ec`; formatting `be5dd822db6bb94fd8b80b54b984343aab432593`.

## Real Windows evidence

- **CI #538 SUCCESS** at `be5dd822db6bb94fd8b80b54b984343aab432593`: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37758688373
- **309 Vitest tests PASS** = 153 unit + 59 contract + 54 component + **43 integration**.
- Strict original Prettier format check, TypeScript/lint, architecture/trust/secrets, frozen reference and portable path safety PASS.
- Real Windows Electron W11-05 scene/browser/template workflow, project Save/Reopen/cross-project, immutable source SHA-256/size/mtime, 128-layer/100-template regressions, STEP 10 and W11-01..04 E2Es, Windows executable smoke and portable ZIP PASS.
- Genuine W11-05 screenshot/flow evidence artifact **11541217865**: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37758688373/artifacts/11541217865
- Windows portable **CI test build, not a final published release** artifact **11541855297**.

## Acceptance state and next handoff

R19 strengthens template storage's technical safe-save, local-catalog and reopen guarantees, especially technical evidence related to `AC-W11-05-14`, `AC-W11-05-19` and `AC-W11-05-20`. It does **not** satisfy an outstanding visual design-owner approval or waive differences in frozen screenshots.

R09's 25-AC matrix and R10 four-screen review packet remain controlling, including `SCR-002C`, `SCR-003A`, `SCR-003B`, `DLG-008`. There are **23 acceptance rows with technical evidence; AC21 UI approval OPEN; AC25 final held by AC21**.

**W11-05 IN_PROGRESS; PR #51 DRAFT/NOT MERGED; `main` unchanged.** Do not infer signoff from generic `lanjutkan`, edit 29 frozen UI reference states, begin W11-06 spectrum/audio, W11-07 animation, or STEP 12, or merge this PR until an explicit reviewer decision and final all-25 gate checks are satisfied.
