# S09-T01 App Shell Evidence

## Scope
- Task: `S09-T01 Global App Shell + Shared Layout Skeleton`
- Role: SOL
- UI authority: `LFA-UI-REFERENCE-v1.1`
- UI Freeze: `LFA-UI-FREEZE-v1.0`
- Screen/state exercised: `SCR-002A / UI-IMG-002A / PROMPT-UI-SCR-002A`
- Canonical viewport: 1600x1000 at 100% zoom
- Implementation type: deterministic fixture UI only

## Real-app evidence
Windows CI candidate run `37514665767`, job `112444384293`, completed PASS.

UI artifact:
- Name: `Lagu-Full-Album-S09-T01-UI-Evidence`
- Artifact ID: `11437311307`
- Artifact digest: `sha256:e6de70ef806778b15e65bfb393cbd871bb966b643136eea7c20ef720131e49a2`
- Screenshot: `SCR-002A.png`
- PNG bytes: 294776
- DOM evidence: `SCR-002A-dom.json`
- Evidence summary: `SCR-002A-evidence.txt`

Captured facts:
- inner viewport: 1600x1000
- app shell: 1600x1000
- PNG capture: 1600x1000
- zoom: 1
- required marker `Gemini Agent`: present
- required marker `Belum ada visual`: present
- required marker `Belum ada track`: present

## Acceptance review
| Contract | Result | Evidence |
| --- | --- | --- |
| Top project toolbar and `Proyek Baru` | PASS | real screenshot |
| `Impor Audio` visible | PASS | real screenshot/component test |
| `Auto Susun Album` disabled in empty state | PASS | component test + screenshot |
| `Template`, `Simpan`, `Render` present | PASS | real screenshot |
| Left `Media | Layer | Inspector` | PASS | screenshot + tab interaction test |
| Media empty state + `Impor Audio` | PASS | screenshot |
| Center 16:9 preview + `Belum ada visual` | PASS | screenshot + DOM evidence |
| Permanent right `Gemini Agent` | PASS | screenshot + component test |
| No-key status `Gemini • Belum dikonfigurasi • 0/100 key` | PASS | screenshot + component test |
| `Kelola API` and `Tambahkan API Key` | PASS | screenshot/component test |
| Manual editor remains usable without Gemini | PASS | shell renders and left tabs switch with no key |
| Bottom `Album Timeline` + `Belum ada track` | PASS | screenshot + DOM evidence |
| Transport controls visible/disabled | PASS | screenshot |
| No Inspector/AI competing tabs on right | PASS | screenshot |
| No provider selector | PASS | screenshot/source review |
| Renderer trust boundary preserved | PASS | architecture gate |
| Foundation verify/build | PASS | CI run `37514665767` |
| Runtime high-severity audit | PASS | CI run `37514665767` |
| Windows package/smoke/portable ZIP | PASS | CI run `37514665767` |

## Visual parity decision
**PASS_WITH_TOLERANCE.**

The implemented screen matches the frozen shell hierarchy, state ownership, canonical copy, no-key Gemini behavior, and canonical geometry. The screenshot was manually reviewed as a real Electron capture. No material redesign was found.

Tolerance retained:
- S09-T01 establishes the real shell and required state; automated pixel-diff against the authoritative bitmap embedded in the Final UI Reference DOCX is intentionally deferred to `S09-T03 First Frozen Reference Screen + Screenshot Baseline`.
- Minor renderer/font rasterization differences are acceptable only if hierarchy, copy, state and interaction remain unchanged.

## Out of scope honored
No real Gemini SDK/API, API-key vault, media engine, SoundVisualizer feature integration, FFmpeg/render engine, persistence/project workflow, or business logic was implemented.

## Recovery
Normal Git revert of S09-T01 commits restores the STEP 08 foundation renderer.
