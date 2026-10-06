# DEPENDENCY RULES v1.0

- D-001 `src/core/domain`: only domain-safe types; no React/Electron/fs/network/provider/FFmpeg/renderer/main.
- D-002 `src/core/application`: domain + contracts + ports; no concrete infrastructure/provider SDK/UI.
- D-003 `src/renderer`: core/application/contracts/domain + renderer local; no fs/child_process/safeStorage/provider SDK/main infrastructure.
- D-004 `src/main/infrastructure`: implements application ports; no renderer feature components or ProjectSession bypass.
- D-005 main bootstrap/composition: wiring only.
- D-006 `src/renderer/visual`: only owner allowed to wrap retained visual-engine internals.
- D-007 `src/render`: immutable render contracts only; no live editor session.
- D-008 preload: narrow allowlisted typed methods only.
- D-009 only ToolProcessGateway may spawn processes.
- D-010 only GeminiProviderAdapter may import Gemini SDK.
- D-011 only CredentialVault may access safeStorage/raw keys.
- D-012 any boundary exception requires ADR + owner + tests + review trigger.
