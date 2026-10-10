# W11-07 — Deferred layer animation command target snapshot QA

**Scope:** Stability fix within existing approved FTR-009 / W11-07 T03 CommandEngine, without any UI, animation preset, project schema, media/clock, or release-scope change.

## Defect
`createLayerSetAnimationCommand` already validates and snapshots animation/keyframe payloads before a deferred apply, but the target identifier was read as `input.layerId` *inside* the future `apply` closure. A mutable reused input object could therefore silently retarget an edit or removal to another layer. A command initially targeting a locked layer could be redirected to an unlocked layer, contrary to the immutable user-command intent.

## Repair
Freeze the primitive `layerId` at command creation and use it consistently both in the command's visible label and in `findLayer` when CommandEngine later applies the command. Preserve existing input validation timing, locked-layer checks, history semantics, Undo/Redo, serialization, and all prior behavior for honest calls. Do not add a feature or any UI element.

## Regression
`tests/unit/visual-animation-commands.test.ts` adds three tests:
1. Mutate caller ID to a locked neighboring layer and mutate caller keyframes before executing a deferred `SET`. Only the originally requested layer is edited, the payload stays the original snapshot, and Undo/Redo preserves both layer values.
2. Mutate caller ID before deferred `REMOVE`, then verify the original layer alone is cleared/restored by Undo/Redo.
3. Start with a locked target, mutate caller ID to an unlocked target, then prove CommandEngine still rejects without project/history/revision mutation.

## Windows gate and limitations
- Known main baseline `1f24c834560d372c54f387f4b78a56a64951396e`, [Windows CI #955 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38057255194).
- Initial normal Windows [#956](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38058393134): **FAIL — Prettier formatting in test file only**, before tests.
- Diagnostic Windows [#957](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/38058551092): all **352 unit / 59 contract / 97 component / 44 integration PASS**, but Electron save/reopen screenshot probe returned `UnknownVizError`. This is **NOT** accepted as final proof. Diagnostic run had a temporary formatter step; its exact diff was applied to committed test source.
- **Normal final exact-head Windows CI PENDING** after temporary formatting step removal. No merge until full CI succeeds. Verify the post-merge `main` commit with its own CI.

No physical Windows listening, Suspend/Resume, 25 native pickers, multi-hour resource plateau, or full visual owner comparison is claimed. W11-07 retains four PARTIAL_AUTOMATED AC items; W11-06 physical acceptance NOT_TESTED; final release / MP4 BLOCKED.
