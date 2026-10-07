# W11-01 — Architecture Drift Review

Status: **PASS — NO MATERIAL DRIFT**

Review baseline: `main@5b7cd0328dcdfdbb242a2e88999209446daacf12`  
Wave: `W11-01 Project Lifecycle & Recovery Core`  
Features: FTR-001 + FTR-002 + FTR-018 cross-cut

## Review purpose
Verify that the completed lifecycle/recovery wave did not silently change protected architecture, trust boundaries, UI hierarchy, persistence ownership, provider/tool policy, or portability rules.

## Boundary review

### Renderer trust boundary — PASS
Repository search and the canonical architecture gate found no renderer imports/usages of:
- `node:fs` / filesystem APIs;
- `node:child_process`;
- direct Electron APIs;
- `ipcRenderer`;
- `safeStorage`;
- Gemini/provider SDKs;
- main-process infrastructure modules.

Renderer lifecycle/recovery access remains through `window.lfa`, whose methods are defined by the typed `LfaBridge` contract and implemented by the preload allowlist.

### Preload / IPC boundary — PASS
- `src/preload/index.ts` exposes only the typed `lfaBridge`.
- `src/preload/api.ts` validates requests and responses with the existing contracts before/after IPC.
- `src/main/ipc/register-ipc.ts` validates incoming payloads and maps persistence/recovery errors to sanitized public results.
- No arbitrary filesystem, dialog, subprocess, provider, or secret API is exposed to renderer.

### Canonical ownership — PASS
No second owner was introduced for lifecycle/recovery concerns:
- current project path: `ProjectPathSession`;
- lifecycle orchestration: `ProjectLifecycleService`;
- normal project persistence: `JsonProjectStore`;
- recovery orchestration: `ProjectRecoveryService`;
- recovery persistence: `JsonProjectRecoveryStore`;
- renderer live project/session state: `useProjectSession`;
- native Open/Save As dialogs: Electron main composition root.

This remains consistent with `MODULE_OWNERSHIP_MAP.md` and the one-owner rule in the Code Constitution.

### Persistence contract — PASS
- Primary project remains versioned schema-v1 JSON.
- User Save/Open and recovery remain separate concepts.
- Recovery autosave never impersonates user Save.
- Primary and recovery writes remain main-owned.
- Recovery accept returns live recoverable state without overwriting primary.
- Recovery discard removes recovery only.
- Atomic write/recovery behavior remains covered by integration and Windows E2E evidence.

### UI freeze — PASS
- Default SCR-002A hierarchy is unchanged.
- Permanent right Gemini Agent rail remains present.
- Recovery/lifecycle notice is conditional and absent from default frozen state.
- Exact approved SCR-002A production baseline passed in canonical Windows CI.

### Provider/tool scope — PASS
- No Gemini SDK/provider/vault implementation was pulled into W11-01.
- No FFmpeg/FFprobe/render implementation was pulled into W11-01.
- STEP 12 ownership for exact Gemini and external media-tool integration is unchanged.

### Portability / private-path / secrets — PASS
- Portable-path verification passes.
- No hardcoded `C:\` or `D:\` source path was found in the reviewed product source.
- Secret scan passes.
- Lifecycle/recovery public E2E evidence intentionally omits raw fixture path fields.

## Canonical automated proof
Windows CI run `37578082369` (run #85), job `112651361529`, on `main@5b7cd0328dcdfdbb242a2e88999209446daacf12`: **PASS**.

The run passed:
- full `npm run verify`;
- format/lint/typecheck;
- architecture, secret, portable-path, and UI-reference gates;
- unit, contract, component, and integration suites;
- runtime high-severity dependency audit;
- STEP 10 save/reopen E2E;
- T11-W01-02 lifecycle E2E;
- T11-W01-03 recovery E2E;
- SCR-002A capture + exact frozen visual baseline;
- Windows x64 package;
- packaged executable smoke;
- portable ZIP.

## Review conclusion
**NO MATERIAL ARCHITECTURE DRIFT.** No ASTRA review trigger was crossed by W11-01. The wave can close without an ADR, schema migration, UI re-freeze, dependency-policy change, or trust-boundary exception.
