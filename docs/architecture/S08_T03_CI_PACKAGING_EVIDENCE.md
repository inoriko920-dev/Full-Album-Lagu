# S08-T03 — CI Foundation & Windows Packaging Smoke Evidence

Status: **VERIFIED / PASS**

## Tested source
- Repository: `inoriko920-dev/Full-Album-Lagu`
- Branch: `main`
- Tested SHA: `84e81bd8c86e62c0c7705307c471b3c720f822c4`
- Workflow: `Windows Foundation CI`
- Run: `37504790643`
- Job: `112410556606`
- Runner: Windows hosted runner
- Node: `v22.23.3`
- npm: `10.9.9`

## Verified gates
- clean install `npm ci`: PASS
- foundation `npm run verify`: PASS
- formatter / ESLint / TypeScript strict: PASS
- architecture / secret / portable-path checks: PASS
- UI Reference Pack integrity: PASS
- UI pack ID: `LFA-UI-REFERENCE-v1.1`
- approved visual states declared and hash-verified: `29`
- unit / contract / component tests: PASS
- main / preload / renderer / render build: PASS
- runtime audit `npm audit --omit=dev --audit-level=high`: PASS
- electron-builder Windows x64 directory package: PASS
- packaged executable startup smoke: PASS
- portable multi-file ZIP creation: PASS
- artifact upload: PASS

## Artifact evidence
- Artifact name: `Lagu-Full-Album-Windows-x64-Foundation`
- Artifact ID: `11431018177`
- Actions artifact archive size: `158,587,396` bytes
- Actions artifact digest: `sha256:cce2ac2d0b235e6d33cd488699127482714664d8881ce221d0627bd6d77a8e85`
- Inner portable ZIP: `Lagu-Full-Album-0.0.0-foundation-windows-x64.zip`
- Inner portable ZIP size: `158,759,686` bytes
- Inner portable ZIP SHA-256: `c2c4638448c6856602c16cb331fe4a9805e5875a528c03c3c75cd2d1a5d074f6`
- Run URL: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37504790643
- Artifact URL: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37504790643/artifacts/11431018177

## Scope and limitations
This artifact is a **foundation artifact**, not a release candidate and not the final STEP 14 portable package. It proves clean-machine dependency restore, repository quality gates, UI-reference integrity, Windows packaging, packaged-process startup, ZIP creation and traceability.

It does **not** yet prove frozen production UI visual parity, real album workflow behavior, GPU/WebGL/media playback behavior, SoundVisualizer integration, FFmpeg render behavior, Gemini integration, long-session stability, or end-user release signing/distribution. Those belong to later Software Factory steps.

The full development/tooling dependency graph still reports eight moderate advisories and deprecated transitives. Runtime high-severity audit passes. Do not use forced breaking dependency upgrades without compatibility evidence.
