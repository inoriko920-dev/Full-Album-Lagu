# W11-05 — Manual Layer Editor + Templates Charter

Role: **ASTRA**  
Planning baseline: `main@8f145a6684177286f8bae3bb9c50515d6f5703b7`  
Features: **FTR-007 Manual Layer Editor + FTR-011 Template Workflow**  
Cross-cut: **FTR-013 Unified Command History + FTR-018 Error/Offline**  
Planning status: **COMPLETE / PASS**  
Implementation status: **IN PROGRESS — T11-W05-01..05 PASS / VERIFIED; T11-W05-06 READY**  
UI decision: **reuse frozen SCR-002C, SCR-003A, SCR-003B and DLG-008; no new UI prompt/image stage required**

## Source authority

This plan is grounded in the repository Product Definition, Product Definition Baseline, UI UX Inventory, frozen Prompt Pack/UI Freeze, Architecture/Code Constitution, W11-04 closure, and the current Feature Registry/Dependency Graph.

Locked product requirements include:
- FR-016 Canvas Selection;
- FR-017 Layer Transform;
- FR-018 Layer CRUD/Reorder;
- FR-019 Text Editing;
- FR-028 Template Apply;
- FR-029 Try/Revert Template;
- FR-030 Save as Template;
- WF-002 Manual Edit Visual;
- WF-006 Template Workflow.

A governance gap was found during planning: the INDEX referenced `10_STEP_11_FEATURE_REGISTRY_DEPENDENCY_GRAPH_WAVE_01_CHARTER_LAGU_FULL_ALBUM_v1_0.docx`, but that DOCX was absent from repository checkout. This planning turn restores that mandatory read path as a **clearly labelled reconstruction**, not as a claim of byte-identical historical recovery.

## Goal

Create one canonical persistent visual-scene/layer model that the manual editor can mutate and save, then build a local non-destructive template workflow over that same state.

Manual Editor remains the source of truth. Template operations use the same Project State + CommandEngine/history. There is no parallel “template project state” or AI state.

## Locked scope boundary

W11-05 owns:
- additive schema-v1 visual scene/layer contracts;
- stable layer IDs and canonical layer order;
- manual layer selection, CRUD, reorder, transform, visibility/lock;
- supported text editing;
- deterministic static structural Preview;
- local template document/catalog/store;
- Try / Revert / Apply / Save as Template semantics;
- frozen Layer/Inspector and Template Browser/Try/Save UI wiring;
- Windows E2E/stress/drift/evidence closure.

W11-05 explicitly does **not** own:
- real audio-reactive spectrum/waveform evaluation — W11-06;
- preview playback, playhead-driven progress, scrub/jump — W11-06;
- animation/keyframe execution — W11-07;
- boundary transition execution — W11-07;
- background video — FTR-019 conditional/later;
- concrete Gemini/provider/credential integration — STEP 12;
- FFmpeg/FFprobe/render integration — STEP 12/W11-08 ownership.

## W11-05 layer families

The frozen SCR-002C Layer list is authoritative for the W11-05 surface:
- Background;
- Artwork;
- Judul Track;
- Artis;
- Spectrum;
- Progress Bar.

Planning semantics:
- **Background**: color/gradient structural layer + common transform/visibility/lock.
- **Artwork**: semantic dynamic artwork binding using W11-04 resolver; no per-track value duplication.
- **Text**: title/artist/track-number/progress-text/static roles with supported font/alignment/style subset.
- **Spectrum**: structural/selectable/transformable layer only in W11-05; audio-reactive analyzer/runtime stays W11-06.
- **Progress**: structural/selectable/transformable layer only; playhead evaluation stays W11-06.

## Proposed additive schema-v1 semantics

Field names may be refined by SOL if semantics remain equivalent, legacy schema-v1 projects remain valid, and no destructive migration/schemaVersion bump is required.

```ts
ProjectDocument.visualScene?: {
  sceneVersion: 1;
  layers: VisualLayer[]; // canonical back-to-front order
}

VisualLayerBase {
  id: string;           // stable
  kind: "background" | "artwork" | "text" | "spectrum" | "progress";
  name: string;
  visible: boolean;
  locked: boolean;
  transform: ResolutionIndependentTransform;
}

TextLayer {
  role: "title" | "artist" | "track-number" | "progress-text" | "static";
  text?: string;        // static only
  style: SupportedTextStyle;
}

ArtworkLayer {
  binding: "active-track-artwork" | "album-artwork";
}
```

Layer array order is the canonical z-order. Do not create a second independent z-index authority.

The exact logical coordinate representation must be deterministic and render-resolution-independent; T11-W05-01 must document the chosen logical canvas contract and validation bounds.

## Selection and gesture semantics

- Canvas and Layer list select the same stable layer ID.
- Selection, hover, active left tab, resize handles and live pointer-drag preview are **UiSession** state and must not dirty Project State.
- Continuous transform gestures may preview locally, but gesture end commits exactly one coalesced `manual` transaction.
- Locked layers remain selectable; mutations targeting a locked layer reject/no-op except explicit unlock.
- Commands reference stable IDs, never transient array positions.

## Manual command family

Expected semantics:
- `layer.add`;
- `layer.remove`;
- `layer.duplicate`;
- `layer.reorder`;
- `layer.set-transform`;
- `layer.set-common`;
- `layer.set-text-style`.

All are `manual` origin and use the shared CommandEngine. Remove means remove from project only; it never deletes source media.

## Static Preview boundary

W11-05 must make FR-017 changes visible, but it does not implement W11-06 playback/audio-reactive runtime.

The center Preview deterministically projects `visualScene` using:
- selected track when available, otherwise first enabled track as binding context;
- W11-04 dynamic title/artist/artwork resolver;
- static structural Spectrum and Progress placeholders;
- UI-only selection outline/handles.

Renderer must not directly open local files. If real image pixel preview is introduced, it must use a narrow main-owned read-only preview contract. Otherwise, deterministic artwork placeholders are acceptable until W11-06.

## Template document and local catalog

Template is visual configuration, **not** a project.

Minimum template semantics:

```ts
TemplateDocument {
  templateSchemaVersion: 1;
  templateId: string;
  name: string;
  category: TemplateCategory;
  scene: TemplateSafeVisualScene;
  reservedExtensions?: FutureVersionedVisualSections;
}
```

Frozen categories:
- Minimal;
- Premium;
- Neon;
- Ambient;
- Classic Album;
- Dark;
- Light;
- Retro;
- Motion.

`Semua` is a browser filter, not a stored category.

Built-in templates are read-only package resources. User templates are local main-owned JSON documents resolved through PathService/template-store ports. Renderer receives validated DTOs only. No marketplace/store/network is introduced.

The starter local catalog must be deterministic and exercise all frozen categories; `Minimal Biru` is the canonical frozen selected reference.

## Template safety

Template must never contain:
- playlist or track order;
- source audio bytes;
- album duration;
- credentials/provider state;
- full ProjectDocument snapshot;
- absolute user media paths.

Project-specific media IDs/paths must be stripped or converted to semantic bindings.

The frozen Save Template dialog keeps the visual scope labels:
- Layer visual;
- style teks;
- visualizer;
- animasi/transisi.

In W11-05, future sections are included only when canonical Project State for those features exists. The implementation must not fabricate visualizer/animation/transition data just to satisfy the dialog copy.

## Try / Revert / Apply semantics

**Coba Template**
- creates a candidate visual scene against current revision/state token;
- remains session-only;
- does not change revision, dirty, history or canonical Project State.

**Kembali ke Sebelumnya**
- discards trial candidate exactly;
- never touches protected project state.

**Terapkan Template**
- validates the same base revision/state token;
- publishes one `template`-origin atomic transaction;
- one revision, one Undo/Redo step;
- preserves playlist/audio/order/duration/metadata/credentials.

A stale trial/apply rejects atomically and must be restarted.

## Save as Template

- writes a validated local template through main-owned storage;
- does not dirty the open project by itself;
- must be reusable in a second project;
- dynamic bindings resolve using the target project;
- no implicit destructive overwrite of an existing user template in W11-05.

## Frozen UI mapping

### SCR-002C / UI-IMG-002C
- left `Media | Layer | Inspector`;
- Layer active;
- Background, Artwork, Judul Track, Artis, Spectrum, Progress Bar visible;
- selected layer highlighted in list and outlined in Preview;
- manual property editing remains in left Inspector;
- right rail remains permanent Gemini Agent;
- timeline remains the existing Album Timeline.

### SCR-003A / UI-IMG-003A
- local Template Browser;
- frozen categories;
- 3–4-column template grid;
- `Minimal Biru` selected;
- details pane says affected visual/layer/animation/transition scope;
- explicit `Urutan track dan durasi tidak berubah.`;
- `Coba Template` + primary `Terapkan Template`;
- no marketplace/store.

### SCR-003B / UI-IMG-003B
- banner `Mode Coba — perubahan belum disimpan ke proyek.`;
- preview of candidate;
- `Kembali ke Sebelumnya` + `Terapkan Template`;
- track count/duration summary unchanged;
- must not look committed.

### DLG-008 / UI-IMG-012
- title `Simpan sebagai Template`;
- name/category/thumbnail;
- visual-only scope;
- explicit exclusion: track order, audio files, album duration, credentials;
- `Batal` + primary `Simpan Template`.

**UI stop rule:** if implementation needs a state outside frozen 002C/003A/003B/012 plus established shared loading/error patterns, STOP and return to ASTRA/UI governance before creating any new prompt/image or redesign.

## Error / trust policy

- unknown layer/property: reject before mutation;
- duplicate ID/malformed transform: validation reject;
- locked-layer mutation: reject/no-op;
- corrupt/incompatible template: reject; project unchanged;
- template store read/write failure: no fake success; project unchanged;
- stale trial: Apply reject; restart trial;
- missing artwork: placeholder/warning; required-audio readiness semantics remain unchanged;
- renderer direct fs/process/provider/secrets access: architecture gate FAIL.

## Serial implementation order

1. **T11-W05-01 — Visual Scene + Layer Schema & Pure Projection**
2. **T11-W05-02 — Manual Layer Commands + Gesture/History Semantics**
3. **T11-W05-03 — Template Document + Local Store + Trial/Apply Core**
4. **T11-W05-04 — Static Scene Preview + Selection/Inspector Projection**
5. **T11-W05-05 — Frozen Layer + Inspector UI Wiring**
6. **T11-W05-06 — Frozen Template Browser / Try / Save UI Wiring**
7. **T11-W05-07 — Wave E2E, Stress, Drift Review & Evidence Closure**

Execution is strictly serial. T11-W05-01..05 are PASS / VERIFIED; only T11-W05-06 is READY.

## Stress targets

Closure must prove:
- at least 128 visual layers for command/projection/history determinism;
- at least 100 local template catalog entries for filter/select/try responsiveness;
- no renderer lockup;
- no source-media mutation;
- no raw credential/provider leakage;
- public evidence contains no unsafe raw paths.

## Mandatory regression

Every implementation task preserves:
- STEP 10 Save/Reopen;
- W11-01 lifecycle/recovery;
- W11-02 media intake/relink;
- W11-03 timeline/history;
- W11-04 Auto Susun/track binding;
- exact frozen SCR-002A baseline;
- architecture/secrets/portable-path/UI reference gates;
- Windows package, packaged executable smoke and portable multi-file ZIP.

## Planning verdict

**PASS.** W11-05 planning remains authoritative. T11-W05-01..05 are PASS / VERIFIED; **only T11-W05-06** is authorized next for SOL. No new UI prompt/image stage is required.


## T11-W05-01 verified implementation
- Status: PASS / VERIFIED.
- Verified implementation head: `137e8d31a08b804498b56a9b9cb094bcc4add8f0`.
- Windows CI: `37682820030` / #321 PASS.
- Evidence: `evidence/T11_W05_01_VISUAL_SCENE_SCHEMA_PROJECTION_EVIDENCE.md`.
- Additive schema-v1 visualScene, normalized logical canvas, stable IDs/canonical layer order, pure track-bound projection and persistence compatibility are proven.
- Scope boundary remains intact: no manual commands/UI/template store/playback/keyframes/Gemini/FFmpeg were introduced.
- Dependency unlock: T11-W05-02 PASS / VERIFIED; T11-W05-03 READY; T11-W05-04..07 remain blocked.


## T11-W05-02 verified implementation
- Status: PASS / VERIFIED.
- Verified implementation head: `308a4800bcbfcf4e85828795e6573893622dd722`.
- Windows CI: `37687361672` / #336 PASS.
- Evidence: `evidence/T11_W05_02_LAYER_COMMANDS_GESTURE_HISTORY_EVIDENCE.md`.
- Shared CommandEngine now owns stable-ID layer CRUD/reorder/transform/common/text-style mutations.
- Locked/stale/duplicate/invalid targets reject atomically; semantic no-op creates no revision/history.
- Transform gesture preview is session-only and commits once at gesture end.
- 128-layer / 64-edit full Undo/Redo stress PASS.
- Scope boundary remains intact: no renderer UI, template store/UI, playback, keyframes, Gemini or FFmpeg were introduced.
- Dependency unlock: T11-W05-03 READY; T11-W05-04..07 remain blocked.


## T11-W05-03 verified implementation
- Nine versioned, local, visual-only template starters; strict user template schema/store; non-dirty Try/Revert; one guarded template-origin Apply; no template/browser UI.
- Evidence: `evidence/T11_W05_03_TEMPLATE_DOCUMENT_LOCAL_STORE_TRIAL_APPLY_EVIDENCE.md`.
- W05-04 READY; W05-05..07 BLOCKED; wave still IN PROGRESS.

## T11-W05-04 verified implementation
- Isolated static Preview/Layer/Inspector projection; reused canonical W11-04 binding and W05-01/02 scene/command, no secondary state.
- UI-session selection/gesture is non-dirty; 128-layer stress and visible static renderer component PASS.
- Windows CI #365 / `37722584947` PASS at `c1219e3d9fa6cb12fc2a21a18a9eb945a5da5986` — **278 tests PASS** (153 unit, 55 contract, 32 component, 38 integration), STEP 10 + W11-01..04, frozen SCR-002A, Windows portable package/smoke/ZIP PASS.
- Evidence: `evidence/T11_W05_04_STATIC_PREVIEW_SELECTION_INSPECTOR_EVIDENCE.md`.
- W05-05 READY; W05-06..07 remain BLOCKED; no frozen AppShell wiring yet.

## T11-W05-05 verified implementation
- Frozen Main Editor now wires left Layer/Inspector and center StaticScenePreview with session-only selection, guarded commands, coalesced manual gesture and Undo/Redo; no new UI states or provider/runtime work.
- Windows CI #378 / `37724632656` PASS at `7bdd0ee79ebf528182d9f2e5ae7da30967988c37`; 283 tests (153 unit, 55 contract, 37 component, 38 integration), architecture/secrets/portable paths, 29 frozen UI reference states, SCR-002A visual baseline, STEP 10/W11-01..04 E2E, Windows packaged smoke + portable multi-file ZIP PASS.
- Evidence: `evidence/T11_W05_05_FROZEN_LAYER_INSPECTOR_UI_WIRING_EVIDENCE.md`.
- W05-06 READY, W05-07 BLOCKED; exact SCR-002C pixel screenshot proof remains later full W05-07 drift review. Wave IN PROGRESS.
