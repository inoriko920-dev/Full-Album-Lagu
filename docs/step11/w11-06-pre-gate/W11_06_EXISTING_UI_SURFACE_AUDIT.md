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
