# SOL T11-W06-02 — Scoped Windows Audio Gateway Closure Evidence

**Date:** 2026-10-08 WIB. **Source HEAD tested:** `201df5c1d07cd29b5d01c457896569ad769ad873`. **PR:** [#55](https://github.com/inoriko920-dev/Full-Album-Lagu/pull/55). **Baseline:** `main@6b45b65bf97bae27baee5bb7545109335c529966`. **Gate:** implementation and negative tests **PASS** at source SHA; controlled planning/evidence commit and final exact-head CI required before merge.

## Windows verification
- [Windows CI #607 SUCCESS](https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37787003909) on exact tested source commit, no errors; 191 unit + 59 contract + 54 component + 43 integration = **347** tests PASS.
- Existing STEP10, W11-01..05 Electron regression and frozen reference checks PASS.
- Windows x64 app packaged, portable ZIP and executable smoke PASS.
- Windows **packaged real decoder** synthetic WAV **8078 bytes, 0.25s**, MP3 **2655 bytes, 0.25s**. Both decoded with WebAudio/Chromium; captured buffer byteLength *before* transferring ArrayBuffer to decodeAudioData; gate requires same count as original source file size and >0.
- HTTP single-range 206 (exact content & Content-Range), unsatisfiable/malformed 416, valid full 200, rejected forged cross-project requests PASS; evidence artifact `Lagu-Full-Album-T11-W06-02-Audio-Decode-Evidence`, artifact ID `11554841916`.
- Source SHA-256, file size and mtime unchanged before/after packed decoder/protocol run. No source media edits.
- Additional 256 MiB sparse-source unit: streamed **first four bytes** and **last four bytes** with bounded Range requests, without decoding or buffering the 256 MiB file.

## Secure protocol and lifecycle
- `lfa-preview://media/<64-hex-token>` registered pre-ready with dedicated Electron partition per window; secure/standard fetch-capable scheme, no `file://` exposure from the renderer bridge and no wildcard CORS.
- Only main-owned OS picker discovery -> completed, probed-ready import may mint a token; renderer cannot supply raw source path for issue.
- 256-bit cryptographic token, bounded TTL, same project+WebContents binding, canonical file identity (dev/ino/size/mtime), symlink rejection, read-only Node stream, malformed/multi-range denial.
- Explicit revocation on project open, successful single/folder relink, accepted recovery, new intake, navigation, window destruction, app exit. Tests cover token expiry, wrong owner/project, revoked stream, mutated source.
- Chromium `Request` in this codebase does not type `initiatorOrigin`; optional runtime check is guarded before property access. The strong authorization boundary remains per-window isolated protocol session, main-issued token and current project. Never interpret Origin alone as authentication.

## Strict scope of Task 02
- **Included:** secure local file stream/codec proof on packaged Windows. **Not included:** audibly played album controller, seek/next/previous, real FFT/spectrum, final image/video render, MP4.
- Project open/relink intentionally revokes old leases and needs a *fresh main-verifiable source reauthorization path* for future playback. T03 must explicitly cover project switch/relink and refuse stale saved `sourcePath` as trust.
- W11-06 T03..T07 remain serially gated. T03 may start only after successful final documentation-commit CI, PR #55 merge and verification of main.
- No change to frozen white/blue Filmora-like UI, Gemini rail or 29 reference screens.

**CLOSURE PRECONDITION:** No merge unless newest PR HEAD Windows CI SUCCESS, current PR diff reviewed and no unresolved required checks. Documentation-only followup must not be misrepresented as tested source SHA until CI completes.
