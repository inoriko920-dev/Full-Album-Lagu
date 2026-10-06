# REPOSITORY MAP v1.0

Target ownership (folders are created only when their task needs them):

```text
Full-Album-Lagu/
├─ AGENTS.md
├─ README.md
├─ PROJECT_STATE.md
├─ PLAN.md
├─ TASKS.md
├─ docs/
│  ├─ source-of-truth/{planning/current,planning/archive,ui,factory}
│  ├─ architecture/
│  ├─ upstream/
│  └─ handoff/
├─ resources/
├─ scripts/
├─ src/
│  ├─ main/{ipc,infrastructure}
│  ├─ preload/
│  ├─ renderer/{app,features,state,visual}
│  ├─ core/{domain,application,contracts}
│  └─ render/
└─ tests/{unit,contract,component,integration,e2e,render,fixtures}
```

Root package/build/TS/lint files and .github workflows are introduced by STEP 08 foundation tasks, not by documentation bootstrap.
