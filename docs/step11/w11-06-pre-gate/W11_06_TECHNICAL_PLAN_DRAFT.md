# ASTRA W11-06 — PRE-GATE Technical Plan: Playback + Audio-Reactive Spectrum

**Status: PRE-GATE DRAFT / NOT IMPLEMENTATION-AUTHORIZED**  
**Date:** 2026-10-08 WIB  
**Scope:** STEP 11, W11-06 (FTR-012 playback/navigation + FTR-008 audio-reactive preview)  
**Baseline:** PR #51 at 6e331c0646536f1236cbdc8d34bdacaf151771fe; Windows CI #548 SUCCESS  
**Owner intent:** prioritize usable full-album playback, real spectrum, then animation, MP4, and Gemini improvements.  
**Unresolved dependency:** W11-05 AC21 formal visual approval and AC25 final closure. PR #51 remains Draft and must not be silently merged.

This planning document is an **editable technical companion** to the detailed draft DOCX generated for the user, ASTRA_W11-06_PRE_GATE_PLAYBACK_SPECTRUM_PLAN_2026-10-08.docx. The DOCX is not yet in the repository. This planning draft must **not** be promoted to READY or used to start SOL code until the final detailed planning DOCX, validated UI references, charter, DoR, acceptance and task cards are committed. Keep this branch independent from PR #51's live work.

## 1. Goal and minimum usable wave result

After the wave has been formally authorized and closed, the Windows 11 portable test build must support an imported real-audio album with a single clock, Play, Pause, Stop, seek within/across tracks, sequential enabled-track progression, active-track metadata binding, *real* analyzer-driven spectrum and live progress. A failure of required audio or decoder must produce an understandable blocked/error state; the project and source bytes stay unchanged. At W11-06 completion it is **still not** an exported MP4 app.

Non-goals: no animated keyframes, beat-synced transitions, offline export, background video, Gemini credentials/provider, FFmpeg/FFprobe integration, external streaming/service endpoints, source audio edits, new canonical project/history owner, mock audio-reactive bars.

## 2. Existing modules: reuse before adding

| Existing authority | What W11-06 may reuse | What it must not do |
| --- | --- | --- |
| src/core/domain/album-timeline.ts projectAlbumTimeline | deterministic effective track order; startMs/endMs/totalDurationMs | persist a second playlist, boundaries or duration |
| src/core/domain/project-document.ts + media-asset.ts | track.audioAssetId and validated audio duration, availability, sourcePath | trust arbitrary paths supplied by renderer |
| src/core/application/services/project-session-history.ts | current project snapshot and history invariants | push Play/Seek/Pause onto Undo/Redo; mark dirty |
| src/core/domain/static-scene-preview.ts | scene selection and semantic layer projection | pretend static placeholder spectrum/progress is live |
| src/core/domain/visual-scene-schema.ts | existing spectrum/progress layer visibility, transform, z-order | mutate scene for every animation frame |
| src/core/contracts/lfa-bridge.ts + preload IPC | proposed typed, narrow playback DTO boundary | grant direct fs/process/network access to renderer |
| Electron main media ports | source-owned verification and cancellation lifecycle | arbitrary file protocol or unbounded preload |
| src/render/entry.ts | future renderer seam only (currently foundation descriptor) | claim completed offline video render |
| docs/upstream/UPSTREAM.md | evaluate selective licensed audio/FFT/WebGL reuse | copy unrelated upstream UI, native capture, VJ tools, ffmpeg-static |

## 3. Baseline product invariants

1. Play/Pause/Stop/seek/navigation/volume/analyser view state are ephemeral UI-session state. No ProjectDocument revision, dirty flag, autosave, template trial, or CommandEngine history mutation.
2. Enabled album order and derived boundaries have exactly one authority: projectAlbumTimeline(ProjectDocument). Disabled tracks do not play; unknown earlier duration blocks deterministic random seek across that boundary.
3. Media identities are main-owned allowlisted project assets. A successful metadata probe is **not** proof that Electron decodes that codec. Test real MP3 and WAV first; FLAC, M4A, OGG are exploratory until each is proven on Windows.
4. Renderer's decoded audio may drive WebAudio analyzer and scene overlay. The analyzer **must not** generate random bars, demo tracks, silence masquerading as active audio, or fake timeline content.
5. Visual-sample tick and audio playback clock cannot be separate authorities. A media event or currentTime is authoritative; requestAnimationFrame is presentation scheduling only.
6. Closing a project/window, switching project, source relink, failed decode, or timed-out seek must revoke the previous playback generation and release obsolete media objects.
7. Use the existing frozen shell and label semantics. If playing/paused/blocked states are not represented in the 29-state frozen UI pack, STOP for ASTRA/UI governance; do not silently redesign.
8. W11-06 must preserve all W11-05 tests, source SHA-256/size/mtime fingerprints, portable packaging and Electron trust boundary.

## 4. Media gateway decision (ASTRA technical spike; no code authorized now)

Candidate A: main-owned, project-scoped private Electron media protocol with verified asset IDs and Range support, served as a stream to a renderer HTMLMediaElement. Candidate B: alternate bounded, auditable main-owned stream mechanism with equivalent non-arbitrary read protections, if security/runtime tests disqualify A.

Mandatory threat model:
- no renderer-provided absolute/relative file paths, file:// escape, symlink path escape or arbitrary protocol URLs;
- unknown, revoked, expired, malformed or cross-project asset IDs fail closed;
- validate source fingerprints/identity when appropriate, avoid TOCTOU surprises;
- constrain Range syntax, Content-Range, MIME/headers, 206/416 and resource cancellation; never deserialize gigabyte audio as IPC base64;
- clear ownership of resources on Stop/project-change/window-close;
- auth tokens/project grants must be unguessable and short-lived if protocol semantics require them;
- security errors never rewrite project/source media.

This is a design choice awaiting formal planning decision, not a claim the protocol already exists.

## 5. Playback time and state contract

Use states idle, ready, loading, playing, paused, seeking, finished, blocked, error. Each async activation carries generation ID and project/media identity. Only the current generation may publish state, error or audio metrics.

AlbumMs = current resolved item startMs + media.currentTime * 1000; clamp within known track interval. For a target album seek, find a resolved enabled item using half-open [startMs,endMs), with explicit exact-final-end behavior, and then seek local time. On ended, advance to next enabled resolved track; no double-advance on duplicate events. Unresolved/missing/corrupt required audio blocks safely rather than auto-skipping silently.

Important races: Play twice during load; Play→Stop before canplay; seek A→seek B while A pending; switch project during network-like IO; relink during pause; close during load; suspend/resume; end event after next track activation. The old generation must not resume playback or publish stale metadata.

## 6. Spectrum and progress truth

Candidate frontend: one HTMLMediaElement and a Web Audio MediaElementAudioSourceNode→AnalyserNode graph, gated on successful user gesture/runtime permissions. Share the already decoded audio stream; never separately decode the full multi-hour album into memory. Decide analyser FFT size, smoothing, frequency bands, channel handling, gain and update throttle empirically on Windows. Preserve existing layer transforms/visibility/opacity/z-order.

Data presentation: normalized real frequency values for the active decoded source, published to Spectrum layer only while valid; silence should produce near-zero output, pause should freeze or decay by a **defined** policy; Stop and missing media clear output. Progress derives from the same time map and remains steady on pause. Offline deterministic render will need a separately designed analyzer evaluation; live DOM analyser is not sufficient evidence for future MP4 fidelity.

Test with generated 440 Hz sine and silence as test fixtures only, plus real MP3/WAV files as codec/Electron E2E. Verify non-random peaks, matching clock, no fake reactive behavior.

## 7. Serial implementation tasks — proposed, not authorized

| Task | Deliverable and stop gate |
| --- | --- |
| T11-W06-01 | Pure playback DTO/contracts + album position mapper + disabled/unresolved/boundary tests; no UI |
| T11-W06-02 | Main-owned authorized media stream/protocol; path/Range/revoke/security negative tests + Windows codec smoke |
| T11-W06-03 | Single controller; Play/Pause/Stop/Seek and transition generation guards, error/relink/teardown tests |
| T11-W06-04 | Real analyzer driven by decoded audio + scene progress projection, sine/silence/CPU tests |
| T11-W06-05 | Frozen UI wiring of transport/scrub/metadata without shell redesign; stop if new UI design is required |
| T11-W06-06 | 128-track, source failures, races, suspend/resume, memory/leak, repeated stop/close hardening |
| T11-W06-07 | Windows real-audio E2E, source fingerprint, no-dirty, older-wave regression, four screen captures, portable smoke and wave closure |

Every SOL task requires a bounded commit on its authorized working branch, realistic tests, CI PASS and evidence. Do not start T11-W06-02 until T11-W06-01 is verified and the task gate advances.

## 8. Formal completion requirements

- Accepted detailed DOCX planning plus authoritative W11-06 charter, task cards, 20-point acceptance matrix, DoR and dependency mapping **in GitHub** before SOL coding.
- W11-05 fully accepted: AC-W11-05-21 explicit UI owner signoff, AC-W11-05-25 formal final PASS, final Windows CI and controlled merge.
- W11-06 UI states mapped to frozen references, or separately approved final UI+DOCX if missing.
- Main/protocol codec/security selection grounded in tested Windows support, no fabricated capabilities.
- Closure must include actual listening/playback and test sound files, not just static screenshots/green unit tests.
- W11-07 animation/transitions and W11-08 render readiness only after W11-06 COMPLETE/PASS.
- STEP12 FFmpeg and Gemini boundaries remain separate and need their own planning/technical decisions.

## 9. Repository evidence and traceability

- PR #51: https://github.com/inoriko920-dev/Full-Album-Lagu/pull/51
- Windows CI #548: https://github.com/inoriko920-dev/Full-Album-Lagu/actions/runs/37764713137
- docs/step11/DEPENDENCY_GRAPH.md, docs/step11/FEATURE_REGISTRY.md
- docs/step11/WAVE_11_05_CHARTER.md, docs/step11/W11_05_ACCEPTANCE_MATRIX.md
- docs/architecture/ARCHITECTURE.md, docs/upstream/UPSTREAM.md
- docs/ui/manifests/UI_FREEZE_MANIFEST.json and UI_REFERENCE_MANIFEST.json

**Status as of preparation:** PRE-GATE / NOT DoR-PASS / NOT W11-06 STARTED / NOT MERGE-APPROVED.
