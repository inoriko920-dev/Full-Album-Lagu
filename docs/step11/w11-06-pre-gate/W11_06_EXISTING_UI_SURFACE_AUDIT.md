# ASTRA W11-06 — Existing Playback UI Surface Audit (PRE-GATE)

**Status:** Read-only source mapping / NOT UI owner approval / NOT authorization for implementation.
**Audited source head:** `dcae09de33d3b7a1c36ce323034e4df4852c9c37`.
**Relationship:** stacked Draft PR #53 targets Draft PR #51 W11-05 branch; neither may be silently merged.

## Verified actual renderer affordances

| Source / exact area | Current behavior (as read from implementation) | Proposed W11-06 integration policy |
| --- | --- | --- |
| `src/renderer/app/AppShell.tsx`, PreviewPanel lines 750–787 | Existing transport bar: Prev, **Putar**, Next, Volume all explicitly `disabled`; timecode hardcoded `00:00:00 / 00:00:00` | Reuse frozen locations and controls; gate enabling on valid media/project; timecode from one playback clock, never fabricated |
| `src/renderer/app/AppShell.tsx`, TimelinePanel lines 884–895 | Ruler has literal time labels; `playhead playhead--zero` never moves | Drive playhead from canonical album time projection; timeline seek/click must be specified before coding |
| `src/renderer/app/AppShell.tsx`, timeline track item lines ~900–940 | Track button click is current *selection*, not playback jump | Keep selection and playing track distinct as session-only states; choose explicit gesture mapping before build |
| `src/renderer/visual/StaticScenePreview.tsx`, lines 20+ and 126–149 | Spectrum uses constant `spectrumBarHeights` values; Progress has structural track only | Replace visual **runtime** evaluation with verified actual decoded-audio FFT/progress while preserving scene layer shape, z-order and transforms |
| `src/core/domain/album-timeline.ts` | Enabled effective order and derived duration/boundaries are already authoritative | Reuse projectAlbumTimeline; no separate persisted playback timeline |
| `src/core/contracts/lfa-bridge.ts` | No native playback media stream gateway in current bridge | Requires safe main-owned read/stream protocol and scoped DTO, with security tests |

## Gap decision — what is not yet covered by the existing renderer

1. **Play/Pause:** The UI currently provides `Putar` but no observed Pause state in current implementation. Propose Play toggles to Pause in the same existing button only if an approved frozen state/reference permits.
2. **Stop:** No dedicated Stop control is present in the current transport. W11-06 acceptance requires stopping and releasing resources. Implement the state behavior in the controller, but **DO NOT silently add a new visible Stop button**: obtain an explicit UI decision for placement/label/keyboard alternative consistent with accessibility.
3. **Seek/scrub:** No interactive timeline scrub gesture is present; ruler labels are static. Define seek from ruler click or another approved affordance, and exact boundary/disabled-track behavior. New visible slider/handle must follow UI freeze governance.
4. **Volume/mute:** An existing disabled Volume icon can be wired after final behavior/state/interaction review; decide whether a slider or step controls require new reference.
5. **Feedback:** Loading, Paused, error, decoder unsupported, required-media missing and seeking states need truthful status. Confirm which of the 29 frozen UI states cover these before altering renderer. Current source alone **cannot prove** the design pack authorizes new state layouts.
6. **Audio-reactive truth:** Existing visual is explicitly static. True FFT and progress must derive from the same decoded audio playhead, without random bars or independent timing.
7. **User priority:** minimum shippable app still requires future WAV/MP3 sound playback and later MP4 render. No W11-06 test or MP4 feature exists at this checkpoint.

## Specific ASTRA recommendations — not authorizations

- **Preferred minimal scope:** preserve original left/center/right/timeline shell and enable the current Prev–Play/Pause–Next/Volume cluster in place; display real timecode; animate the current layer spectrum/progress only from audio. Do not add panels.
- **UI review required** for Stop and scrub/scrub-handle representation if not already authorized by final image/reference. Rather than pretending functionality exists, prepare a tiny state-only design request after the W11-05 UI decision.
- **Prohibited shortcut:** hard-code a playhead tick, random FFT bars, or dummy `audio` samples just to make screenshots appear finished. Tests must use actual Windows audio.
- **Formal sequence:** W11-05 AC21 explicit design acceptance → AC25 wave closure and approved merge → reconcile W11-06 final DOCX/UI → ASTRA DoR PASS → SOL T11-W06-01 contract code.

## Technical evidence scope

This is a code-reading audit, **not** an Electron interaction or screenshot acceptance test. It intentionally does not declare whether the *approved UI reference DOCX* contains suitable Pause/Stop/Scrub states; that document must be reviewed in the formal W11-06 UI mapping gate.

**Final verdict:** current shell has reusable *placeholders*, not an operational player. W11-06 UI mapping = **PARTIAL / reviewer decision pending**. W11-05 AC21 remains OPEN; W11-06 DoR remains FAIL/BLOCKED.


## Direct review of 29-state frozen source-of-truth DOCX (2026-10-08 WIB)

**Authoritative binary read:** `docs/source-of-truth/ui/06_STEP_04_FINAL_UI_REFERENCE_LAGU_FULL_ALBUM_v1_1_REPO_COMPACT_SMALL.docx`, Git blob `39ba5ef29d92cfe4d8759ad317a0cdaa911de981`. Its real OOXML `word/document.xml` was read, rather than relying on a secondary PR screenshot or guessed labels. The document explicitly inventories **29 approved image states**.

Relevant Album Editor entries exactly recorded in the source:

- `UI-IMG-002A` — Album Editor — empty project.
- `UI-IMG-002B` — Album Editor — album ready.
- `UI-IMG-002C` — Album Editor — visual layer selected.
- `UI-IMG-002D` — Album Editor — track boundary selected.
- `UI-IMG-002E` — Album Editor — Gemini low-risk result.
- `UI-IMG-002F` — Album Editor — missing media warning.

The frozen DOCX's 29 state **titles do not separately name** a Play, Pause, Stop, seek/scrub or audio-reactive playback state. **This does not prove** that the album-ready/boundary screenshots lack transport controls or that the supporting STEP 03/04 text does not define their interactions. The compact reference identifies image authority; canonical behavior and labels still belong to Product Definition, STEP 03/04 and STEP 05 UI Freeze. Do not infer a right to redesign merely from missing titles.

### Narrowed mapping / exact next design review

| W11-06 feature | First approved baseline to visually inspect | Current source-code affordance | Classification |
| --- | --- | --- | --- |
| Play / Pause and true timecode | `UI-IMG-002B` album ready, then `002D` boundary selected | Existing disabled Play/timecode in PreviewPanel | REUSE LIKELY; Pause state/copy not formally mapped |
| Previous/Next and active-track shift | `UI-IMG-002B` + `002D` | Existing disabled Prev/Next and selectable timeline tracks | REUSE LIKELY; interaction semantics require review |
| Seek/playhead position | `UI-IMG-002D` boundary selected | Static ruler and `playhead--zero` | VISUAL AUTHORITY UNRESOLVED; do not invent handle |
| Stop | `UI-IMG-002B` + `002D` | No Stop button in current PreviewPanel | UI DECISION REQUIRED if visible Stop is needed |
| Volume/mute | `UI-IMG-002B` | Existing disabled volume icon | REUSE LIKELY; slider and accessibility state unresolved |
| Live Spectrum/Progress | `UI-IMG-002C` visual layer selected + `002B` | Structural static layers only | RUNTIME W11-06; placement reuse, no fake FFT |
| Blocked / missing audio | `UI-IMG-002F` missing media warning | W11-02/05 non-destructive missing-media notices | REUSE LIKELY, decode-failure status requires mapping |

**Gate:** Inspect the **actual embedded images** for `002B` and `002D` and read canonical STEP 03/04 copy/interaction contract before deciding whether new prompt images are needed. A named-state inventory alone is insufficient to certify full UI coverage. If a genuinely new Stop/Pause/scrub display is necessary, trigger the project's STOP-at-UI-prompt governance. W11-05 AC21/AC25 must close first; do not start SOL coding or merge either PR from this note.
