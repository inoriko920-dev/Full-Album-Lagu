# S09-T02 — Design Tokens + Shared Components Evidence

Status: **VERIFIED / PASS**

## Scope
S09-T02 codifies only shared visual primitives already proven by the frozen SCR-002A shell. It does not add a general-purpose design system or new product behavior.

## Implemented
- `src/renderer/ui/tokens.css`
  - existing frozen color, surface, text, border, focus, radius and toolbar tokens;
  - minimum control-size tokens used by the current shell.
- `src/renderer/ui/AppIcon.tsx`
  - typed extraction of the icon set already used by SCR-002A.
- `src/renderer/ui/controls.tsx`
  - minimal `ActionButton` variants matching existing toolbar/primary/secondary class contracts;
  - minimal `IconButton` matching existing playback/settings class contracts.
- `AppShell.tsx`
  - refactored to consume shared primitives.
- Tests:
  - `tests/component/UiPrimitives.test.tsx`;
  - `tests/contract/DesignTokens.test.ts`.

## CI evidence
- Branch SHA: `8c20acbcc4c33858cb25c6da1d53690b6881255b`
- Workflow run: `37517598647`
- Job: `112454487220`
- Result: PASS
- `npm ci`: PASS
- format / ESLint / TypeScript: PASS
- architecture / secret / portable-path / frozen UI-reference gates: PASS
- unit / contract / component tests: PASS
- runtime high-severity audit: PASS
- main / preload / renderer / render builds: PASS
- Windows x64 package: PASS
- packaged executable smoke: PASS
- portable ZIP: PASS

## Visual invariance proof
The post-refactor Electron screenshot was captured by the standard SCR-002A CI path.

- viewport: 1600x1000
- shell: 1600x1000
- capture: 1600x1000
- zoom: 1
- PNG bytes: 294776
- S09-T02 PNG SHA-256: `acb71b2ee816215cf1104c8ea4d78a0a55e9bf0e1e31545a52c354c3c3b638fa`
- S09-T01 PNG SHA-256: `acb71b2ee816215cf1104c8ea4d78a0a55e9bf0e1e31545a52c354c3c3b638fa`
- binary comparison: IDENTICAL

Therefore S09-T02 changed implementation structure but did not change the rendered SCR-002A pixels.

## Artifact
- UI evidence artifact ID: `11437611756`
- Artifact digest: `sha256:8dfdef96cfedcb3b8b6a828f2aaa87f86da2a8d5cce0af3c84e78cd089aca161`

## Out of scope honored
No new screen, no new product interaction, no provider integration, no API-key storage, no media/render engine, no FFmpeg, no persistence, and no speculative third-party component framework.

## Next
S09-T03 owns the first authoritative frozen-reference screenshot baseline/comparison workflow.
