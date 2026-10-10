# W11-07 — Deferred legacy layer command input snapshot QA

**Scope:** Feature-frozen stabilization of the existing manual layer editor. No UI, presets, workflow, renderer, media, clocks or release changes.

## Defect and fix

W11-07 PR #88 already protected the animation setter from a caller mutating `input.layerId` after command creation but before CommandEngine execution. The other existing layer commands had the same mutable-input gap: several `apply` closures still read `input.layerId`, `input.toIndex`, `input.newLayerId`, or `input.text` at execution time. A delayed or queued action could inadvertently target a different layer, insertion position or caption without changing the original command label.

In `src/core/application/services/project-layer-commands.ts`, record all source/target IDs, requested indices, and static text at **command creation** for the existing add, remove, duplicate, reorder, transform, common, text-style and static-text commands. Existing validated/cloned transforms, layer data, style and normalized patches are retained. No additional user-facing action or permissive fallback was introduced. Stale state tokens, lock checks, dirty checkpoints and Undo/Redo remain owned by the canonical CommandEngine.

## Regression

`tests/unit/w11-07-layer-command-input-snapshot.test.ts` includes nine tests: mutable add index and cloned layer content, remove target, duplicate source/copy ID/index, reorder target/index, transform target/payload, common locked state, text style target/payload, static text target/value, and locked-target rejection after deferred construction. The tests execute commands **after mutating their original input objects** and assert the unchanged intended target, undo/redo and no partial history on rejected actions.

[Windows diagnostic CI #963](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38060038492) SUCCESS with temporary Prettier stage: **361 unit, 59 contract, 97 component, 44 integration tests PASS** and Windows packaged regressions/portable ZIP PASS. This is not final immutable-source verification. Exact formatter output was applied to source, then the temporary CI step was removed and the workflow matched `main` byte-for-byte. **Normal exact-head Windows CI must PASS before merge; postmerge `main` CI must also PASS.**

## Explicit gates still open

W11-07 official audit stays **8 PASS_AUTOMATED / 4 PARTIAL_AUTOMATED**; these tests do not prove owner pixel-level UI parity or physical AV sync. W11-06 physical speakers/headphones, real Windows suspend/resume, native OS picker trials and multi-hour resource plateau remain **NOT_TESTED**. Do not claim final release, audio hardware approval or MP4 export.
