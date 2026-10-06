# CODE CONSTITUTION v1.0

1. Search -> Understand -> Modify.
2. One concern has one canonical owner.
3. Manual UI and Gemini mutate Project State only through CommandEngine.
4. Renderer UI does not own filesystem, subprocess, secrets or provider SDK.
5. Domain remains framework/infrastructure independent.
6. No mutable global singleton state outside composition-owned services.
7. Long work is cancellable, observable and outside the UI event loop.
8. Portable path/resource resolution goes through PathService.
9. No plaintext Gemini key in project/repo/log/renderer.
10. External tools run only through ToolProcessGateway.
11. Project writes are versioned, validated, atomic and recovery-aware.
12. Generated UI text drift never overrides Product Definition/UI Freeze.
13. Do not add abstraction/dependency/framework without a concrete current need.
14. Feature coding remains blocked until STEP 08 docs/governance is committed and verified.
