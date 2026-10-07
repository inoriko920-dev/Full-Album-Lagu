# W11-02 ACCEPTANCE MATRIX — MEDIA INTAKE FOUNDATION

| ID | Requirement / proof target | Planned task(s) | Mandatory evidence |
|---|---|---|---|
| AC-W11-02-01 | 20+ native picker import | 02,03,05,06 | Windows batch E2E + UI state |
| AC-W11-02-02 | 100+ import with progress and responsive UI | 02,03,06 | 100+ deterministic E2E summary |
| AC-W11-02-03 | drag-drop file uses canonical intake service | 02,06 | contract/integration/E2E |
| AC-W11-02-04 | folder discovery deterministic/recursive/cancellable | 02,06 | fixture tree E2E |
| AC-W11-02-05 | non-destructive source media | 01,02,03,04,06 | before/after size/hash/mtime checks |
| AC-W11-02-06 | valid supported audio has usable duration | 03,06 | probe fixtures |
| AC-W11-02-07 | invalid/corrupt/unsupported explicit | 01,03,05,06 | codes + UI + E2E |
| AC-W11-02-08 | metadata read + safe fallback | 03,06 | metadata fixtures |
| AC-W11-02-09 | deterministic initial order | 03,06 | comparator unit + mixed dataset E2E |
| AC-W11-02-10 | same physical path deduped within one batch | 02,06 | duplicate fixture |
| AC-W11-02-11 | missing scan differentiates required audio vs optional visual | 01,04,05,06 | project fixture + UI |
| AC-W11-02-12 | missing required audio exposes render-block readiness | 01,04,06 | readiness contract |
| AC-W11-02-13 | single relink updates reference only after validation | 04,05,06 | moved-file integration/E2E |
| AC-W11-02-14 | folder relink safe unique match; ambiguous stays unresolved | 04,05,06 | candidate scoring tests |
| AC-W11-02-15 | Unicode/spaces/moved folder on Windows | 02,03,04,06 | Windows fixtures |
| AC-W11-02-16 | renderer has no direct fs/dialog/subprocess/provider | 01..06 | architecture gate/drift review |
| AC-W11-02-17 | offline + sanitized diagnostics | 01..06 | offline E2E + secret/path checks |
| AC-W11-02-18 | W11-01/UI/package regressions remain green | 05,06 | canonical Windows CI |
