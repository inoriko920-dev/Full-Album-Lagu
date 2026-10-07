# W11-04 — Auto Susun + Track Binding Charter

Role: **ASTRA**  
Planning baseline: `main@b89326e99e03ec7a7cd596f3b2c4c7a5338c4442`  
Features: **FTR-005 Auto Susun Album + FTR-006 Artwork/Metadata/Dynamic Track Binding**  
Cross-cut: **FTR-013 Unified Command History + FTR-018 Error/Offline**  
Planning status: **COMPLETE / PASS**  
Implementation status: **IN PROGRESS — T11-W04-01..02 PASS / VERIFIED; T11-W04-03 READY**  
UI decision: **reuse frozen UI; no new UI prompt/image stage is required now**

## Goal

Make an imported album structurally useful through one deterministic Auto Susun operation and establish a single track-centric metadata/artwork binding model that future Preview, Visual, Transition and Render waves can consume.

## Locked boundaries

- Auto Susun is offline and deterministic; it is not Gemini/AI/cloud.
- Canonical order stays `ProjectDocument.tracks[]`.
- Existing `track.enabled` state is preserved.
- One Auto Susun apply = one `CommandBatch`, origin `auto-susun`, one revision, one Undo/Redo step.
- Manual metadata/artwork overrides must survive Auto Susun.
- Binding/display values are resolved dynamically; derived values are not persisted merely because they were computed.
- Artwork is optional visual media (`required=false`) and missing artwork alone must not block required-audio readiness.
- No source audio/image mutation.
- No Manual Layer Editor, Templates, Preview Playback, Transitions, Keyframes, Render, Gemini provider, credential vault, FFmpeg/FFprobe, or persistent Undo history.

## Proposed additive schema-v1 contract

```ts
ProjectDocument.albumPresentation?: {
  defaultArtworkAssetId?: string;
}

ProjectTrack.binding?: {
  titleOverride?: string;
  artistOverride?: string;
  albumOverride?: string;
  yearOverride?: number;
  artworkAssetId?: string;
}
```

The implementation may refine names, but not semantics, without returning to ASTRA.

Artwork references must point to `kind=image` assets. Unknown artwork asset IDs are invalid project references; missing artwork files are availability problems, not broken referential identity.

## Resolved track presentation

A pure resolver such as `resolveTrackPresentation(project, trackId)` must return value + provenance without I/O or mutation.

Priority:
1. title: manual override -> audio metadata title -> track.title -> filename stem;
2. artist: manual override -> audio metadata artist -> neutral empty fallback;
3. album: manual override -> audio metadata album -> project.name;
4. year: manual override -> audio metadata year -> undefined;
5. track number: audio metadata track number -> current canonical 1-based position for display only;
6. artwork: per-track artwork -> album default artwork -> placeholder/undefined.

Provenance should distinguish manual override, audio metadata, track fallback, album default and placeholder.

## Deterministic Auto Susun algorithm

Stable ordering priority:
1. positive audio metadata `trackNumber`;
2. leading numeric media filename token;
3. normalized filename/title;
4. original canonical index, with stable track ID only as final total-order tie break.

Rules:
- no filesystem/network access in the planner;
- no async completion-order dependence;
- disabled tracks stay disabled;
- track IDs, audio links and source references remain stable;
- repeated Auto Susun on unchanged input is idempotent/no-op;
- stale plan revision/state token rejects atomically;
- no duplicate persisted order list.

## Artwork intake

Supported baseline static artwork: PNG, JPEG/JPG, WebP.

- selection/validation remains main-owned;
- renderer never reads filesystem;
- external image is referenced, never rewritten;
- imported artwork is `required=false`;
- import+bind performed as one user operation should be one atomic history step;
- relink should reuse W11-02 identity/high-confidence patterns instead of inventing a second relink engine.

## Frozen UI mapping

Existing frozen/current surfaces are sufficient:
- Top toolbar: `Auto Susun Album`;
- Left rail: Media;
- Left rail: Inspector;
- Bottom: Album Timeline;
- Global Undo/Redo;
- permanent Gemini Agent right rail stays present but remains provider-disconnected.

Draft form values, selected Inspector control, picker/dialog state and plan-preview state are UI-session state and must not dirty Project State until explicit apply.

**Stop rule:** if a required W11-04 visual state cannot be represented by the frozen pack, SOL must stop and return to ASTRA/UI governance. No silent redesign.

## Serial tasks

1. **T11-W04-01 — Binding Schema + Resolver Contracts** — PASS / VERIFIED.
2. **T11-W04-02 — Deterministic Auto Susun Planner + CommandBatch** — PASS / VERIFIED.
3. **T11-W04-03 — Artwork Intake + Binding Commands** — READY.
4. **T11-W04-04 — Metadata Override + Dynamic Binding Integration** — BLOCKED by 03.
5. **T11-W04-05 — Frozen Auto Susun + Inspector UI Wiring** — BLOCKED by 04.
6. **T11-W04-06 — Wave E2E, Stress, Drift Review & Evidence Closure** — BLOCKED by 05.

Only one task may be executed per user turn.

## Mandatory regression gates

Every implementation task must preserve:
- STEP 10 save/reopen;
- W11-01 lifecycle/recovery;
- W11-02 media intake/relink;
- W11-03 timeline/history;
- exact frozen SCR-002A baseline;
- architecture/secret/portable-path checks;
- Windows package, packaged executable smoke and portable ZIP.

## Stress target

At least 128 tracks with mixed track numbers, filename numbers, missing metadata, disabled tracks and artwork/default references. Planner/apply/Undo/Redo must remain deterministic and responsive, with no renderer O(n²) lockup.

## Planning verdict

**PASS.** Planning remains authoritative. T11-W04-01..02 are verified; only T11-W04-03 is authorized next for SOL. W11-05+, STEP 12 integrations and all out-of-scope features remain blocked.
