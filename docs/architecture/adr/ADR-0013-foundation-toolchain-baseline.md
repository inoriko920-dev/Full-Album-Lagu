# ADR-0013 — Foundation Toolchain Baseline

Status: ACCEPTED

S08-T02 resolves the exact Node-side foundation package baseline. Electron remains pinned to the SoundVisualizer-compatible major selected by STEP 06; all top-level npm specs are saved exact and package-lock.json is authoritative.

## Top-level packages

- `@eslint/js@10.0.1` — MIT
- `@testing-library/jest-dom@7.0.1` — MIT
- `@testing-library/react@16.3.3` — MIT
- `@types/node@26.6.4` — MIT
- `@types/react@19.3.0` — MIT
- `@types/react-dom@19.3.0` — MIT
- `@vitejs/plugin-react@6.1.2` — MIT
- `electron@43.6.0` — MIT
- `electron-builder@26.15.3` — MIT
- `esbuild@0.28.2` — MIT
- `eslint@10.12.0` — MIT
- `eslint-plugin-react-hooks@7.1.1` — MIT
- `globals@17.13.0` — MIT
- `jsdom@30.1.2` — MIT
- `prettier@3.9.9` — MIT
- `react@19.3.0` — MIT
- `react-dom@19.3.0` — MIT
- `typescript@6.0.3` — Apache-2.0
- `typescript-eslint@8.71.1` — MIT
- `vite@8.3.3` — MIT
- `vitest@5.0.3` — MIT
- `zod@4.6.5` — MIT

Changing the Electron/React/TypeScript pillar or introducing a new framework requires ASTRA review. Normal patch/security updates still require the full foundation gate.
