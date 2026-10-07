# W11-05 — Task Cards

Planning baseline: `main@8f145a6684177286f8bae3bb9c50515d6f5703b7`  
Planning role: **ASTRA**  
Planning gate: **PASS**  
Implementation: **NOT STARTED**  
Serial implementation only.

## T11-W05-01 — Visual Scene + Layer Schema & Pure Projection
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: READY **only after planning PR merge**
- Dependencies: W11-04 COMPLETE / PASS; FTR-013 verified.
- Goal:
  - establish additive schema-v1 `visualScene` and supported layer contracts;
  - define stable IDs/canonical order/logical canvas;
  - pure deterministic selected-track scene projection using W11-04 bindings.
- In scope:
  - background/artwork/text/spectrum/progress structural layer schema;
  - transform/common state;
  - text roles/style contract;
  - legacy schema-v1 round-trip;
  - dynamic title/artist/artwork projection;
  - no derived value duplication.
- Out of scope:
  - commands/UI/template store;
  - audio-reactive runtime;
  - playback/keyframes/transitions;
  - Gemini/FFmpeg.
- Mandatory proof:
  - legacy project compatibility;
  - unique/stable layer IDs;
  - canonical array order;
  - invalid/malformed layer reject;
  - pure/offline projection;
  - no source mutation;
  - prior-wave regression gate.
- Exit gate: PASS / VERIFIED before 02 may start.

## T11-W05-02 — Manual Layer Commands + Gesture/History Semantics
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: BLOCKED
- Dependency: T11-W05-01 PASS / VERIFIED.
- Goal:
  - implement official manual command family over shared CommandEngine.
- In scope:
  - add/remove/duplicate/reorder;
  - transform/common/text style;
  - visibility/lock;
  - stale guards;
  - locked-layer rejection;
  - one continuous gesture -> one coalesced history entry;
  - 128-layer core stress.
- Protected behavior:
  - remove never deletes source media;
  - duplicate creates new ID;
  - command references stable IDs;
  - one explicit action = one revision/history unit unless a batch is explicitly required.
- Out of scope:
  - renderer UI gestures;
  - template storage/UI;
  - playback/audio-reactive/keyframes/transitions.
- Exit gate: PASS / VERIFIED before 03.

## T11-W05-03 — Template Document + Local Store + Trial/Apply Core
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: BLOCKED
- Dependency: T11-W05-02 PASS / VERIFIED.
- Goal:
  - create reusable visual-only TemplateDocument and main-owned local catalog/store;
  - implement try/revert/apply/save semantics without project damage.
- In scope:
  - versioned template schema;
  - frozen categories;
  - deterministic starter catalog including `Minimal Biru`;
  - built-in read-only resource templates;
  - user-template main storage via PathService/store ports;
  - session-only trial plan;
  - one `template`-origin atomic Apply;
  - Save as Template;
  - stale/corrupt/incompatible behavior.
- Safety:
  - no playlist/audio/order/duration/credentials/full project snapshot;
  - no absolute user media paths;
  - no renderer fs;
  - no marketplace/network.
- Mandatory proof:
  - try non-dirty/no history;
  - revert exact;
  - apply one history unit;
  - stale reject atomic;
  - save does not dirty project;
  - second-project dynamic binding;
  - 100-template catalog stress contribution.
- Exit gate: PASS / VERIFIED before 04.

## T11-W05-04 — Static Scene Preview + Selection/Inspector Projection
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED
- Dependency: T11-W05-03 PASS / VERIFIED.
- Goal:
  - make manual layer changes visible without pulling W11-06 runtime forward.
- In scope:
  - deterministic static structural Preview;
  - selected track / first enabled track binding context;
  - static spectrum/progress structural placeholder;
  - selected-layer overlay projection;
  - layer/Inspector view model;
  - renderer-safe artwork placeholder/optional narrow main preview seam if strictly needed.
- Out of scope:
  - play/pause/scrub;
  - audio analyzer;
  - real waveform;
  - animation/keyframes/transitions.
- Mandatory proof:
  - selection is UI-session/non-dirty;
  - transforms/styles visibly project;
  - renderer stays fs/process/provider-free;
  - responsive projection under large layer set.
- Exit gate: PASS / VERIFIED before 05.

## T11-W05-05 — Frozen Layer + Inspector UI Wiring
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED
- Dependency: T11-W05-04 PASS / VERIFIED.
- UI authority: frozen SCR-002C / UI-IMG-002C.
- In scope:
  - Layer list and selection sync;
  - canvas selection affordance;
  - add/remove/duplicate/reorder;
  - transform/text/common controls through left Inspector;
  - global Undo/Redo;
  - permanent Gemini right rail;
  - Album Timeline unchanged.
- Mandatory proof:
  - exact shell hierarchy;
  - Layer list contains required frozen items;
  - canvas/list same stable selection;
  - draft gesture state non-dirty until commit;
  - locked behavior;
  - no right-side manual Inspector;
  - exact SCR-002A regression remains PASS.
- Stop rule:
  - missing frozen state => STOP / ASTRA UI review.
- Exit gate: PASS / VERIFIED before 06.

## T11-W05-06 — Frozen Template Browser / Try / Save UI Wiring
- Owner: SOL
- Priority: P0
- Risk: HIGH
- Status: BLOCKED
- Dependency: T11-W05-05 PASS / VERIFIED.
- UI authority:
  - SCR-003A / UI-IMG-003A;
  - SCR-003B / UI-IMG-003B;
  - DLG-008 / UI-IMG-012.
- In scope:
  - local category/filter grid;
  - selected template detail;
  - Try state banner;
  - revert/apply;
  - Save Template dialog;
  - safe scope/exclusion copy;
  - no marketplace/network.
- Mandatory proof:
  - `Urutan track dan durasi tidak berubah.`;
  - `Mode Coba — perubahan belum disimpan ke proyek.`;
  - Try is not dirty/history;
  - Apply uses template-origin history;
  - Save excludes protected project data;
  - return to editor preserves project/Agent context.
- Exit gate: PASS / VERIFIED before 07.

## T11-W05-07 — Wave E2E, Stress, Drift Review & Evidence Closure
- Owner: SOL
- Priority: P0
- Risk: MEDIUM
- Status: BLOCKED
- Dependency: T11-W05-06 PASS / VERIFIED.
- Scope:
  - canonical Windows full-flow;
  - create/transform/text/reorder layers;
  - Save/Reopen + saved checkpoint Undo/Redo;
  - Try -> revert;
  - Try -> Apply -> Undo/Redo;
  - Save as Template -> open another project -> Apply dynamic bindings;
  - invalid/stale template rejection;
  - 128-layer stress;
  - 100-template catalog stress;
  - protected-state diff;
  - source SHA-256/size/mtime;
  - AC-W11-05-01..25 mapping;
  - architecture/UI/trust-boundary drift review;
  - prior-wave + package/smoke/ZIP regressions.
- Closure rule:
  - W11-05 closes only if every AC is PASS and no material drift exists.
