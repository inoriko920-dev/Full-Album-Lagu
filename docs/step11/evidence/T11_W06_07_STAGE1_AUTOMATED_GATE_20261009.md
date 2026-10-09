# T11-W06-07 — Windows acceptance and portable gate (Stage 1)

**Status: IMPLEMENTED / latest branch Windows CI PENDING. NOT YET VERIFIED.**

- Dependency PASS: PR #61 merged to `main@9100f2f39b6ebfe32b2988b103f91ebb82744ff6`, post-merge Windows CI #766 SUCCESS.
- Owner deferral: physical Windows Suspend/Resume, real audible device listening, 25 actual picker-click interactions and hours-long OS resource observations are explicitly deferred to final validation. **NOT_TESTED; NOT PASS.**
- Active code: [Draft PR #63](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/63) on separate `sol/t11-w06-07-acceptance-gate-20261009` branch. Do not merge absent new permission.

## Stage 1 executable CI acceptance

A new standalone Windows CI harness `scripts/run-w06-t07-automated-acceptance.mjs` executes **after** existing packaged decoder, actual 3/128-track real-editor runners and portable ZIP creation. It fails the CI job if source proof is absent or inconsistent and writes `artifacts/step11/T11-W06-07/evidence/T07_WINDOWS_AUTOMATED_ACCEPTANCE.json`. The workflow uploads the JSON under `Lagu-Full-Album-T11-W06-07-Automated-Acceptance`.

Checked by actual machine code (not inferred from documentation): packaged native MP3/WAV decode/playback and 206/416 Range, corruption/unsupported rejection and lifecycle revocation, decoded 440 Hz/silence FFT, 3 × 100 packaged WAV restart cycles with resource cleanup, observed Windows renderer memory/handle samples, real-editor 3/128-track smoke with source immutability and PNG signatures, runnable packaged EXE, foundation multi-file Windows ZIP plus exact SHA-256SUMS equality.

**Important evidence boundary:** the harness consolidates checks already performed by the preceding CI steps; it does not repeat human speaker listening, certify zero memory leaks, certify native OS wake/sleep or independently mark 20/20 AC PASS. It serially runs after the underlying probes, so a preceding failing probe still fails the entire job. `automatedGate: PASS` is a technical proof only. `waveClosure: BLOCKED_PHYSICAL_VALIDATION` and `releaseAuthorized: false` are mandatory outputs.

## Final 20-AC closure / release gates

Use `docs/step11/W11_06_ACCEPTANCE_MATRIX.md`; assess every AC-W11-06-01..20 separately. Do not retrofit a global PASS from aggregate machine checks. Audio monitoring on a physical Windows 11 PC, multi-hour resource/HandleCount recording, actual OS power events, genuine file picker clicks and full user-visible portable playback signoff remain **NOT_TESTED**; if mandatory for final release they stay **BLOCKING** until performed.

W11-07 animation, W11-08 renderer and STEP 12 FFmpeg MP4 are future tasks, **not implemented in this T07 code**. No final build/release is authorized.

## Combined 20-AC ledger from previously parallel PR #65

The former independent T07 acceptance matrix on Draft PR #65 is now integrated into this branch as `scripts/run-w06-t07-acceptance-matrix.mjs`. The unified Windows workflow calls both the strict source/ZIP acceptance verifier and the 20-AC evidence ledger, in order, using one T07 evidence artifact directory. There must be one canonical T07 workflow and no duplicate PR merges.

The matrix distinguishes `VERIFIED` automated acceptance, `IMPLEMENTED` with outstanding physical proof and `NOT_TESTED` validation. It explicitly withholds final wave completion, physical speaker listening, hardware Suspend/Resume and multi-hour resource certification. The matrix's automated VERIFIED entries do **not** imply real-world end-user signoff. The new combined exact-head Windows CI is still required before considering this integration technically PASS.

No new UI reference asset is needed for this scope. Do not generate imagery or change the frozen editor.
