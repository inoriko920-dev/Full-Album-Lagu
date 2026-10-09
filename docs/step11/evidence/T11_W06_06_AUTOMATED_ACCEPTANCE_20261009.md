# T11-W06-06 — Windows playback stress automated acceptance

Status: **AUTOMATED GATES VERIFIED up to Windows CI #759 / final branch recheck pending**. **FULL TASK NOT CLOSED** until unavailable physical-system checks are explicitly dispositioned by the owner. This report is evidence, not release authorization.

Repository: `inoriko920-dev/Full-Album-Lagu`; isolated branch `sol/t11-w06-06-playback-stress-20261009`, [Draft PR #61](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/61), [issue #60](https://github.com/inoriko920-dev/Full-Album-Lagu/issues/60). Base: `main@b3f4495af13c4840ca298d8c647d997a0fbfc541` (post-T05 merge and CI #712 PASS). **No merge of PR #61 is authorized**.

## Windows automated evidence already verified

- [CI #755](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37931015798) PASS on `e6983710eee9a7cc19224636ed4eeead582cc6c8` — 396 tests, 300 actual native WAV Play/Stop cycles in three independent 100-cycle rounds on packaged Electron, source SHA-256 + length + mtime unchanged.
- [CI #759](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37934060789) PASS on `86d46f125049418f13c7d9208acc029dcd10cc91` — 397 tests (234 unit + 59 contract + 61 component + 43 integration), every Windows workflow step SUCCESS and portable multi-file ZIP, validates the **new security regression** for in-flight main audio grant arriving after same-project reimport.
- All licensed real media are self-generated test fixtures: WAV and bundled test MP3. Audio is played/decoded and FFT produced in Windows CI, **NOT listened to through a real speaker by a human**.

## Acceptance matrix

| Acceptance | Automated result | Limits |
| --- | --- | --- |
| 100 start/stop cycles and listener/resource cleanup | PASS 300 cycles on actual packaged Windows HTMLAudioElement; 100 unit cycles + late callback unit tests | Does not certify hours-long playback |
| 128 tracks, disabled tracks, rapid Seek, Play/Pause/Next/Previous | PASS unit and real packaged Windows editor E2E; frozen UI retained | Human UI smoothness not claimed |
| Repeated main-picker batch provenance | PASS 25 batch service integration; older track can request new grant, old token revoked | 25 actual Windows dialog clicks NOT performed |
| Large source byte-range, errors | PASS 256 MiB sparse-file range tests, 206/416, malformed WAV and unsupported non-audio rejected by genuine Windows import | Not a full-duration 256 MiB audible decode |
| Source identity and project immutability | PASS SHA-256/size/mtime, ProjectDocument unchanged by playback | No user's real media used |
| Relaunch/relink, stale grants, project and window cancellation | PASS bounded E2E + isolated tests | Real Windows wake/sleep hardware NOT tested |
| Suspend/Resume recovery | PASS renderer-side power-event simulation; no auto resume, explicit reauthorization | Physical sleep/resume and OS power-monitor delivered event on a sleeping machine NOT tested |
| Renderer memory observations | PASS genuine Electron `app.getAppMetrics()` active + three post-Stop samples | Single CI process; NOT leak-free/multi-hour proof |
| OS process handle observations | PASS external PowerShell CI-only handle collector (ToolProcessGateway ownership respected by keeping spawning OUTSIDE product `src/main`) | One session, not multi-hour boundedness |
| 29 frozen UI comparisons, 4 W05 screens, main Gemini panel | PASS as part of Windows CI | Speaker acceptance remains T07 |
| Portable test artifact | PASS Windows x64 build + smoke + ZIP | **Foundation build only**, no MP4 encoder |

## Security bug fixed in T06

`PreviewAudioAccessService.issue()` previously verified that batch provenance still existed after an asynchronous file-grant allocation. A new import of the **same project** keeps older batch provenance, so a grant allocated before the new import could theoretically return *after* old window tokens were revoked. T06 adds a per-owner revocation epoch and checks it after the awaited file operation; stale tokens are revoked instead of returning to the renderer. The deterministic regression test deliberately parks the older grant and resolves it only after reimport. Unrelated windows and fresh post-reimport authority continue to function. The owner epoch is discarded with closed-window authority.

## Resource measurements (packaged Windows CI #755)

Renderer PID 8408; 50 native active and 21 idle process HandleCount samples: first active **306 handles**, last idle **302 handles**. Renderer working set `80,796 → 123,720 KiB`; private `38,584 → 66,688 KiB`. Three post-stop idle samples remained at 123,720 KiB working set / 66,688 KiB private. **Do not interpret this as absence of leaks or a sustainable long-duration memory ceiling**.

## Closure conditions and next step

1. Final Windows CI SUCCESS on the *exact latest branch head*, including the cleanup of closed-window revocation epoch. Record exact run and artifact URLs in PR #61 review comment.
2. External hardware/device sleep/wake and sustained multi-session/long-running OS resource observations: **NOT_TESTED** in hosted CI. If the owner defers them, preserve the explicit risk; never label them PASS.
3. T07 is the separate 20-AC / human-audible wave closure and remains serially gated on T06 disposition, verified main, and the owner's separately explicit merge permission.
4. Subsequent W11-07 animations, W11-08 render and STEP12 FFmpeg H.264 MP4 remain **NOT IMPLEMENTED**; do not claim a finished video exporter or distribute a production portable release.

No changes to frozen UI, project schema, architecture/security ownership, user source files or `main` are authorized in this PR.
