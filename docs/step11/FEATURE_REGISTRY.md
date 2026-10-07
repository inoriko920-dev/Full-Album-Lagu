# STEP 11 FEATURE REGISTRY

Planning role: **ASTRA**  
Planning baseline analyzed: `main@da5b6786d0daa472c474a33ffd83a5834af24f82`  
Status: **NORMALIZED / W11-01 COMPLETE; W11-02 IN PROGRESS**  
Implementation status: **W11-01 COMPLETE / PASS; W11-02 T11-W02-01..04 PASS; T11-W02-05 READY**

The complete planning authority is the companion DOCX:
`docs/source-of-truth/planning/current/10_STEP_11_FEATURE_REGISTRY_DEPENDENCY_GRAPH_WAVE_01_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`.

| ID | Capability | Requirement refs | Priority | Main dependencies | Status |
|---|---|---|---|---|---|
| FTR-001 | Project Lifecycle | F-001; FR-001..003 | MUST | STEP 10 persistence seam | VERIFIED W11-01 |
| FTR-002 | Autosave & Crash Recovery | F-001/F-017; FR-004 | MUST | FTR-001 | VERIFIED W11-01 |
| FTR-003 | Media Intake & Validation | F-002; FR-005..008 | MUST | FTR-001 | IN PROGRESS W11-02 |
| FTR-004 | Track Timeline & Track State | F-003; FR-009..011 | MUST | FTR-003 | PLANNED W11-03 |
| FTR-005 | Auto Susun Album | F-004; FR-012 | MUST | FTR-003,FTR-004,FTR-013 | PLANNED W11-04 |
| FTR-006 | Artwork/Metadata/Dynamic Track Binding | F-005; FR-013..015 | MUST | FTR-003,FTR-004 | PLANNED W11-04 |
| FTR-007 | Manual Layer Editor | F-006; FR-016..019 | MUST | FTR-013 + UI Freeze | PLANNED W11-05 |
| FTR-008 | Audio-Reactive Visual Engine | F-007; FR-020..022 | MUST | FTR-003,FTR-012; later tool boundary | PLANNED W11-06 |
| FTR-009 | Animation & Limited Keyframes | F-008; FR-023..024 | MUST | FTR-007,FTR-013 | PLANNED W11-07 |
| FTR-010 | Track-Boundary Transition System | F-009; FR-025..027 | MUST | FTR-004,FTR-006,FTR-009 | PLANNED W11-07 |
| FTR-011 | Template Workflow | F-010; FR-028..030 | MUST | FTR-007,FTR-013 | PLANNED W11-05 |
| FTR-012 | Preview Playback & Navigation | F-011; FR-031..033 | MUST | FTR-003,FTR-004 | PLANNED W11-06 |
| FTR-013 | Unified Command History / Undo-Redo | F-012; FR-034..035 | MUST | project state contracts | PLANNED W11-03 |
| FTR-014 | Gemini Agent + AI Risk/Plan Policy | F-013/F-014; FR-036..041 | MUST | FTR-013,FTR-015 | DEFER STEP 12 |
| FTR-015 | Gemini Credential Vault & Failover | F-015/F-016; FR-042..047 | MUST | OS secure storage / provider | DEFER STEP 12 |
| FTR-016 | Missing Media Detection & Relink | F-017; FR-049..050 | MUST | FTR-003 | CORE VERIFIED W11-02; UI NEXT |
| FTR-017 | MP4 Render & Preflight | F-018; FR-051..054 | MUST | most visual/media capabilities + STEP 12 tool integration | PLANNED W11-08 |
| FTR-018 | Error/Diagnostics/Offline Cross-Cutting | F-019/F-020; FR-048,055..056 | MUST | all waves | W11-01 PASS / W11-02 READY CROSS-CUT |
| FTR-019 | Background Video | F-021; FR-057 | SHOULD | media/render capability | CONDITIONAL |
| FTR-020 | Extended Effects & Branding | F-022/F-024; FR-058..059 | SHOULD | visual engine | CONDITIONAL |
| FTR-021 | 1440p / 4K Render Presets | F-023 | SHOULD | render capability/hardware | CONDITIONAL |
| FTR-022 | Lyrics/Subtitles | F-025; FR-060 | COULD | media/timeline | FUTURE |
| FTR-023 | Persistent Undo History | F-026 | COULD | FTR-013 + persistence | FUTURE |

## Rules

- A feature is not DONE because code exists; acceptance + mandatory tests + evidence must pass.
- External provider/tool specifics are not pulled forward into STEP 11. Gemini and FFmpeg integration remain STEP 12 owned.
- Frozen UI may be wired for states but not silently redesigned.
- `FTR-018` is cross-cutting and must be verified in every wave that introduces a failure mode.


## W11-01 closure

- FTR-001: VERIFIED in W11-01.
- FTR-002: VERIFIED in W11-01.
- FTR-018 cross-cut for W11-01: PASS; remains active for later waves.
- All W11-01 acceptance AC-01..14: PASS.
- Evidence: `evidence/W11_01_WAVE_CLOSURE_EVIDENCE.md`.
- W11-02 Media Intake Foundation planning: PASS.
- T11-W02-01 media domain/contracts/project compatibility: PASS / VERIFIED.
- T11-W02-02 picker/drop discovery, bounded queue/progress/cancel: PASS / VERIFIED.
- T11-W02-03 audio probe/validation/metadata/deterministic initial order: PASS / VERIFIED.
- T11-W02-04 missing-media scan + deterministic relink core: PASS / VERIFIED.
- W11-02 planning authority: `WAVE_11_02_CHARTER.md`, `TASK_CARDS_W11_02.md`, `W11_02_ACCEPTANCE_MATRIX.md` and source-of-truth planning DOCX.
- Next implementation task: T11-W02-05 only.
