# MODULE OWNERSHIP MAP v1.0

- Startup/composition -> `src/main/bootstrap.ts` + `src/main/composition-root.ts`
- IPC -> `src/main/ipc/` + `src/preload/`
- UI presentation -> `src/renderer/app` + `src/renderer/features`
- Project live state -> `src/renderer/state/project-session`
- UI session state -> `src/renderer/state/ui-session`
- Domain -> `src/core/domain`
- Application/use-cases -> `src/core/application/services` + `commands`
- Ports/contracts -> `src/core/application/ports` + `src/core/contracts`
- Persistence/recovery -> `src/main/infrastructure/persistence`
- Media/probe/relink -> `src/main/infrastructure/media`
- Render orchestration -> `src/main/infrastructure/render` + `src/render`
- Background jobs -> `src/main/infrastructure/jobs`
- Gemini provider -> `src/main/infrastructure/gemini`
- Secrets/vault -> `src/main/infrastructure/secrets`
- Paths/resources -> `src/main/infrastructure/paths`
- Preferences -> `src/main/infrastructure/preferences`
- Logging -> `src/main/infrastructure/logging`
- Visual engine adapter -> `src/renderer/visual`
- Tests -> `tests/<type>`

One concern must not acquire a second canonical owner for convenience.
