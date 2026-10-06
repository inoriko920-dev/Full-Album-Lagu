# Lagu Full Album - STEP 06 Architecture

Status: PASS_WITH_PROVISIONAL

## Chosen architecture
Electron Windows 11 x64 modular monolith, React + TypeScript product UI, framework-agnostic ProjectSession/CommandEngine, infrastructure adapters in Electron main, typed adapter around retained SoundVisualizer WebGL2 code, dedicated render renderer, external FFmpeg/FFprobe boundary.

## Core boundaries
- Renderer UI: presentation + live ProjectSession only; no filesystem, subprocess, secrets or provider SDK.
- Main: filesystem, paths, persistence, jobs, media tools, Gemini provider/vault, logging.
- Render renderer: deterministic WebGL render from immutable snapshot.
- FFmpeg/ffprobe: ToolProcessGateway only.
- Gemini: optional cloud boundary, structured commands only.

## Persistence
Versioned JSON project folder, external media references, atomic save/autosave/backups, no secrets in project.

## Portable
electron-builder directory output zipped as multi-file package; resource/tool paths are relative via PathService.

## Provisional
Exact Electron/Vite/React versions; exact FFmpeg binary/encoder/license; exact official Gemini SDK/model.
