# S09-T03 — Frozen Reference Screenshot Baseline Evidence

**Status: VERIFIED / PASS_WITH_TOLERANCE**

## Scope
Close the remaining STEP 09 requirement for `SCR-002A / UI-IMG-002A / PROMPT-UI-SCR-002A`: real production UI plus repeatable ACTUAL-vs-FROZEN-REFERENCE evidence.

## Frozen reference provenance
Source: `docs/source-of-truth/ui/06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT_SMALL.docx`

- DOCX blob: `39ba5ef29d92cfe4d8759ad317a0cdaa911de981`
- relationship: `rId11`
- embedded target: `media/image3.jpg`
- dimensions: 520x325
- SHA-256: `071836f564d6f23e51c223edbf9a7992bd2278c7a09fac1f473996b68621b2d7`
- extractor: `scripts/extract-ui-reference.ps1`

## Approved production baseline
- tested SHA: `190741e4c7366a3a59880f7d364252c08a6fd497`
- Electron capture: 1600x1000 @ 100%
- SHA-256: `fbb8d14690cf201d4e342a39d25c7a97c118966ebe10228c55f365574f3ada7b`
- manifest: `docs/ui/manifests/UI_SCREEN_BASELINES.json`
- comparator: `scripts/build-ui-comparison.ps1`

The production screen follows the frozen hierarchy: top project actions; left Media/Layer/Inspector; center 16:9 Preview; permanent right Gemini Agent with no-key setup; bottom empty Album Timeline and disabled transport.

## Comparison policy
CI hard-gates:
1. exact frozen-reference SHA-256 and provenance;
2. exact approved production screenshot SHA-256;
3. canonical 1600x1000 geometry and required DOM markers;
4. generation of side-by-side PNG plus comparison JSON.

A direct cross-image pixel-distance threshold is not used because the frozen reference is a compact 520x325 lossy generated JPEG while production is a crisp 1600x1000 Electron capture.

## Visual decision
**PASS_WITH_TOLERANCE.** Side-by-side review found no material silent redesign. Tolerance only covers raster/font/icon/decorative differences; it does not permit moving panels, changing state ownership, omitting required controls/copy, or adding another AI provider.

## CI proof
- run: `37520683978`
- job: `112464996428`
- result: PASS
- artifact: `Lagu-Full-Album-S09-T03-Visual-Baseline`
- artifact ID: `11440930725`
- digest: `sha256:bc4c6cd71e9028795e3ea56f5a84205a9d95bc51487fa64743bf353ee69e91c4`

Passed: clean install, format/lint/typecheck, architecture/security/path/UI-reference gates, tests, build, runtime audit, Electron screenshot, DOM/geometry verification, frozen-baseline verification, Windows package, packaged smoke and portable ZIP.

## STEP 09 gate
**STEP 09 = COMPLETED / PASS_WITH_TOLERANCE.**

Next: **STEP 10 — Minimum End-to-End Vertical Slice**. Do not start without user authorization.
