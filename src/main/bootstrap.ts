import { app, BrowserWindow, powerMonitor, protocol } from "electron";
import { PLAYBACK_POWER_CHANNEL } from "../core/contracts/playback-power";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createCompositionRoot } from "./composition-root";
import { registerIpcHandlers } from "./ipc/register-ipc";
import { NodePreviewAudioLeaseStore } from "./infrastructure/media/node-preview-audio-lease-store";
import { PreviewAudioAccessService } from "./infrastructure/media/preview-audio-access-service";
import {
  PREVIEW_AUDIO_SCHEME,
  createPreviewAudioProtocolResponse,
} from "./infrastructure/media/preview-audio-protocol";
import { captureW1105State } from "./verification/w11-05-ui-capture";
import { captureW1106EditorInteractions } from "./verification/w11-06-editor-ui-probe";

// Scheme registration must precede app readiness. Never bypass CSP or enable Node.
protocol.registerSchemesAsPrivileged([
  {
    scheme: PREVIEW_AUDIO_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const PACKAGED_SMOKE_FLAG = "--smoke-test";
const UI_TEST_SCREEN = "SCR-002A";
const CANONICAL_VIEWPORT = { width: 1600, height: 1000 } as const;

function readArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value?.slice(prefix.length);
}

async function writeJsonEvidence(
  path: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const target = resolve(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(payload, null, 2), "utf8");
}

function createMainWindow(): BrowserWindow {
  const uiTestScreen = readArgValue("ui-test");
  const screenshotPath = readArgValue("screenshot");
  const slcProbe = readArgValue("slc-probe");
  const slcEvidencePath = readArgValue("slc-evidence");
  const slcScreenshotPath = readArgValue("slc-screenshot");
  const w05Capture = readArgValue("w05-capture");
  const w05Screenshot = readArgValue("w05-screenshot");
  const isW05Capture = w05Capture !== undefined;
  if (
    isW05Capture &&
    (process.env.LFA_W05_TEST !== "1" ||
      !w05Screenshot ||
      ![
        "SCR-002C",
        "SCR-003A",
        "SCR-003B",
        "DLG-008",
        "FLOW",
        "FLOW_SECOND",
      ].includes(w05Capture))
  ) {
    throw new Error(
      "W05 capture is CI-only and requires an authorized screen and destination.",
    );
  }
  const w06Probe = readArgValue("w06-probe");
  const w06EvidencePath = readArgValue("w06-evidence");
  const isW06Probe = w06Probe !== undefined;
  if (
    isW06Probe &&
    (process.env.LFA_W06_TEST !== "1" ||
      !["decode", "editor"].includes(w06Probe) ||
      !w06EvidencePath)
  ) {
    throw new Error("W06 codec probe requires CI authorization and evidence.");
  }
  const w11Probe = readArgValue("w11-probe");
  const w11EvidencePath = readArgValue("w11-evidence");
  const isUiCapture = uiTestScreen !== undefined;
  const isSlcProbe = slcProbe !== undefined;
  const isW11Probe = w11Probe !== undefined;

  if (isUiCapture && uiTestScreen !== UI_TEST_SCREEN) {
    throw new Error(`Unsupported UI test screen: ${uiTestScreen}`);
  }

  if (isUiCapture && !screenshotPath) {
    throw new Error("--screenshot=<path> is required with --ui-test.");
  }

  if (isSlcProbe && !slcEvidencePath) {
    throw new Error("--slc-evidence=<path> is required with --slc-probe.");
  }

  if (isW11Probe && !w11EvidencePath) {
    throw new Error("--w11-evidence=<path> is required with --w11-probe.");
  }

  const window = new BrowserWindow({
    width:
      isUiCapture || isW05Capture || w06Probe === "editor"
        ? CANONICAL_VIEWPORT.width
        : 1440,
    height:
      isUiCapture || isW05Capture || w06Probe === "editor"
        ? CANONICAL_VIEWPORT.height
        : 900,
    minWidth: 1280,
    minHeight: 800,
    useContentSize: isUiCapture || isW05Capture || w06Probe === "editor",
    show: false,
    paintWhenInitiallyHidden: true,
    backgroundColor: "#F3F5F8",
    webPreferences: {
      // Per-window ephemeral storage partition; preview tokens never cross windows.
      partition: `lfa-preview-session-${randomUUID()}`,
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling:
        !isUiCapture &&
        !isW05Capture &&
        !isSlcProbe &&
        !isW11Probe &&
        !isW06Probe,
    },
  });

  const ownerWebContentsId = window.webContents.id;
  // Suspend invalidates grants before notifying the renderer. Resume never
  // mints a new token or restarts audio; main picker authorization is required.
  const onSystemSuspend = (): void => {
    previewAudioAccess.revokeWindow(ownerWebContentsId);
    if (!window.webContents.isDestroyed()) {
      window.webContents.send(PLAYBACK_POWER_CHANNEL, "suspend");
    }
  };
  const onSystemResume = (): void => {
    if (!window.webContents.isDestroyed()) {
      window.webContents.send(PLAYBACK_POWER_CHANNEL, "resume");
    }
  };
  powerMonitor.on("suspend", onSystemSuspend);
  powerMonitor.on("resume", onSystemResume);
  window.webContents.session.protocol.handle(
    PREVIEW_AUDIO_SCHEME,
    async (request) => {
      const rendererOrigin = new URL(window.webContents.getURL()).origin;
      // Electron supplies initiatorOrigin from Chromium, not from the
      // request\x27s forgeable Origin header. Browser-initiated media requests
      // may legitimately have no initiator origin.
      const initiatorOrigin =
        "initiatorOrigin" in request &&
        typeof request.initiatorOrigin === "string"
          ? request.initiatorOrigin
          : undefined;
      if (initiatorOrigin !== undefined && initiatorOrigin !== rendererOrigin) {
        return new Response(null, {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        });
      }

      const context = previewAudioAccess.context(ownerWebContentsId);
      const response =
        context === null
          ? new Response(null, {
              status: 403,
              headers: { "Cache-Control": "no-store" },
            })
          : await createPreviewAudioProtocolResponse(
              request,
              context,
              previewAudioStore,
            );
      // file:// renderer has an opaque ("null") origin. The scheme is
      // private, per-session and token-protected; only that editor origin may
      // fetch decoded audio for WebAudio/FFT. Never use a wildcard ACAO.
      response.headers.set("Access-Control-Allow-Origin", rendererOrigin);
      response.headers.set("Vary", "Origin");
      return response;
    },
  );
  if (isW06Probe) {
    window.webContents.session.webRequest.onErrorOccurred((details) => {
      if (details.url.startsWith(`${PREVIEW_AUDIO_SCHEME}:`)) {
        console.error("W06 private protocol request error: " + details.error);
      }
    });
  }
  window.webContents.on("did-navigate", () => {
    previewAudioAccess.revokeWindow(ownerWebContentsId);
  });
  window.webContents.on("destroyed", () => {
    previewAudioAccess.revokeWindow(ownerWebContentsId);
    powerMonitor.removeListener("suspend", onSystemSuspend);
    powerMonitor.removeListener("resume", onSystemResume);
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());

  if (
    !isUiCapture &&
    !isW05Capture &&
    !isSlcProbe &&
    !isW11Probe &&
    !isW06Probe
  ) {
    window.once("ready-to-show", () => window.show());
  }

  if (w06Probe === "decode" && w06EvidencePath) {
    window.webContents.once("did-finish-load", async () => {
      let memoryTimer: ReturnType<typeof setInterval> | null = null;
      try {
        // CI-only OS process memory samples for the *actual* packaged
        // Chromium renderer. No privileged API is exposed to the renderer.
        const rendererPid = window.webContents.getOSProcessId();
        const sampleRendererMemory = () => {
          const metric = app
            .getAppMetrics()
            .find((item) => item.pid === rendererPid);
          return metric === undefined
            ? null
            : {
                pid: rendererPid,
                workingSetKiB: metric.memory.workingSetSize,
                peakWorkingSetKiB: metric.memory.peakWorkingSetSize,
                privateKiB: metric.memory.privateBytes,
              };
        };
        const beforeMemory = sampleRendererMemory();
        const memorySamples: Array<{
          elapsedMs: number;
          pid: number;
          workingSetKiB: number;
          privateKiB: number;
        }> = [];
        const samplesStartedAt = Date.now();
        const captureMemorySample = () => {
          const sample = sampleRendererMemory();
          if (
            sample &&
            typeof sample.privateKiB === "number" &&
            Number.isSafeInteger(sample.privateKiB) &&
            sample.privateKiB >= 0 &&
            Number.isSafeInteger(sample.workingSetKiB) &&
            sample.workingSetKiB > 0
          ) {
            memorySamples.push({
              elapsedMs: Date.now() - samplesStartedAt,
              pid: sample.pid,
              workingSetKiB: sample.workingSetKiB,
              privateKiB: sample.privateKiB,
            });
          }
        };
        captureMemorySample();
        memoryTimer = setInterval(captureMemorySample, 50);
        const report = (await window.webContents.executeJavaScript(
          '(async () => {\n  const project = {\n    schemaVersion: 1,\n    projectId: "w06-real-decoder-probe",\n    name: "W06 Decode Probe",\n    revision: 0,\n    tracks: [],\n  };\n  const wait = async (getStatus) => {\n    for (let attempt = 0; attempt < 300; attempt += 1) {\n      const result = await getStatus();\n      if (result.status !== "discovering" && result.status !== "probing" &&\n          result.status !== "committing") {\n        return result;\n      }\n      await new Promise((resolve) => setTimeout(resolve, 20));\n    }\n    throw new Error("Timed out waiting for main-owned media import");\n  };\n  const discovered = await window.lfa.pickAudioFiles();\n  if (discovered.status !== "started") throw new Error("Picker did not return batch ID");\n  const discovery = await wait(() =>\n    window.lfa.getMediaDiscoveryStatus(discovered.batchId));\n  if (discovery.status !== "completed") throw new Error("Main discovery failed");\n  const started = await window.lfa.startMediaIntake({\n    discoveryBatchId: discovered.batchId,\n    project,\n  });\n  if (started.status !== "started") throw new Error("Intake did not start");\n  const intake = await wait(() =>\n    window.lfa.getMediaIntakeStatus(started.batchId));\n  if (intake.status !== "completed") throw new Error("Probe intake did not complete");\n  const output = { wav: null, mp3: null };\n  const assets = intake.project.mediaAssets || [];\n  for (const kind of ["wav", "mp3"]) {\n    const asset = assets.find((candidate) =>\n      candidate.availability === "ready" &&\n      candidate.fileName.toLowerCase().endsWith("." + kind));\n    if (!asset) throw new Error("No main-probed ready asset: " + kind);\n    const grant = await window.lfa.requestAudioPreview({\n      batchId: started.batchId,\n      projectId: project.projectId,\n      assetId: asset.id,\n    });\n    if (grant.status !== "granted") throw new Error("Secure audio lease blocked: " + kind);\n    const unauthorized = await window.lfa.requestAudioPreview({\n      batchId: started.batchId,\n      projectId: "forged-project",\n      assetId: asset.id,\n    });\n    if (unauthorized.status !== "blocked") throw new Error("Cross-project IPC leak");\n    const partial = await fetch(grant.url, {\n      headers: { Range: "bytes=0-3" },\n    });\n    if (partial.status !== 206 ||\n        (await partial.arrayBuffer()).byteLength !== 4 ||\n        !partial.headers.get("Content-Range")) {\n      throw new Error("Private audio byte-range 206 failed: " + kind);\n    }\n    const denied = await fetch(grant.url, {\n      headers: { Range: "bytes=999999999-" },\n    });\n    if (denied.status !== 416) throw new Error("Invalid range did not return 416");\n    const response = await fetch(grant.url);\n    if (response.status !== 200) throw new Error("Private audio stream is not HTTP 200");\n    const compressedBytes = await response.arrayBuffer();\n    const streamedBytes = compressedBytes.byteLength;\n    const ctx = new AudioContext();\n    try {\n      const decoded = await ctx.decodeAudioData(compressedBytes);\n      if (decoded.duration <= 0 || decoded.numberOfChannels < 1) {\n        throw new Error("Real " + kind + " decoder returned no audio frames");\n      }\n      // T03: real Chromium media element playback, distinct from WebAudio\n      // decodeAudioData. The source is synthetic and muted for headless CI.\n      const native = new Audio();\n      native.muted = true;\n      native.preload = "auto";\n      native.src = grant.url;\n      let playbackProgressMs = 0;\n      let seekPositionMs = 0;\n      try {\n        await new Promise((resolve, reject) => {\n          const timeout = setTimeout(() => reject(new Error(\n            "HTML audio metadata timed out: " + kind)), 5000);\n          native.addEventListener("loadedmetadata", () => {\n            clearTimeout(timeout);\n            resolve();\n          }, { once: true });\n          native.addEventListener("error", () => {\n            clearTimeout(timeout);\n            reject(new Error("HTML audio failed loading: " + kind));\n          }, { once: true });\n          native.load();\n        });\n        if (!(native.duration > 0)) {\n          throw new Error("HTML audio duration unavailable: " + kind);\n        }\n        await native.play();\n        const deadline = Date.now() + 4000;\n        while (\n          native.currentTime < 0.025 &&\n          !native.ended &&\n          Date.now() < deadline\n        ) {\n          await new Promise((done) => setTimeout(done, 30));\n        }\n        playbackProgressMs = Math.round(native.currentTime * 1000);\n        if (playbackProgressMs < 25) {\n          throw new Error("HTML audio did not progress while playing: " + kind);\n        }\n        native.pause();\n        const pausedAt = native.currentTime;\n        await new Promise((done) => setTimeout(done, 70));\n        if (Math.abs(native.currentTime - pausedAt) > 0.03) {\n          throw new Error("HTML audio continued progressing after pause: " + kind);\n        }\n        const target = Math.min(0.1, native.duration * 0.5);\n        native.currentTime = target;\n        await new Promise((done) => setTimeout(done, 100));\n        seekPositionMs = Math.round(native.currentTime * 1000);\n        if (Math.abs(native.currentTime - target) > 0.09) {\n          throw new Error("HTML audio seek failed: " + kind);\n        }\n      } finally {\n        native.pause();\n        native.removeAttribute("src");\n        native.load();\n      }\n      output[kind] = {\n        nativePlayback: true,\n        playbackProgressMs,\n        seekPositionMs,\n        decoded: true,\n        durationSeconds: decoded.duration,\n        channels: decoded.numberOfChannels,\n        sampleRate: decoded.sampleRate,\n        streamedBytes,\n        range206: true,\n        range416: true,\n        crossProjectBlocked: true,\n      };\n    } finally {\n      await ctx.close();\n    }\n  }\n  const deadline = Date.now() + 8000;\n  while (typeof window.__w06DriverProbe !== "function" && Date.now() < deadline) {\n    await new Promise((done) => setTimeout(done, 25));\n  }\n  if (typeof window.__w06DriverProbe !== "function") {\n    throw new Error("Packaged T03 driver helper was not installed");\n  }\n  if (typeof window.__w06SpectrumProbe !== "function") {\n    throw new Error("Packaged T04 analyser probe helper not installed");\n  }\n  const spectrum = await window.__w06SpectrumProbe(intake.project, started.batchId);\n  const driver = await window.__w06DriverProbe(intake.project, started.batchId);\n  return { success: true, ...output, spectrum, driver };\n})()',
          true,
        )) as Record<string, unknown>;
        if (report.success !== true) {
          throw new Error("Packaged codec probe returned an invalid result");
        }
        if (memoryTimer !== null) clearInterval(memoryTimer);
        memoryTimer = null;
        captureMemorySample();
        const afterMemory = sampleRendererMemory();
        if (
          memorySamples.length < 12 ||
          !beforeMemory ||
          !afterMemory ||
          !Number.isFinite(afterMemory.workingSetKiB) ||
          afterMemory.workingSetKiB <= 0 ||
          !Number.isFinite(afterMemory.peakWorkingSetKiB) ||
          afterMemory.peakWorkingSetKiB < afterMemory.workingSetKiB
        ) {
          throw new Error(
            "T06 Windows renderer process memory telemetry unavailable",
          );
        }
        await writeJsonEvidence(w06EvidencePath, {
          ...report,
          t06RendererMemory: {
            source: "Electron app.getAppMetrics / Windows OS",
            units: "KiB",
            baseline: beforeMemory,
            afterAllProbes: afterMemory,
            // The samples cover all codec, FFT and 300 restart probes.
            // They are observations, NOT a claim of GC or leak-free memory.
            samples: memorySamples,
            samplingIntervalMs: 50,
            peakScope: "renderer process lifetime, not one WAV cycle",
          },
        });
        console.log("W06 packaged private protocol and decoder PASS");
        window.destroy();
        app.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("W06 packaged decoder FAIL: " + message);
        if (!window.isDestroyed()) window.destroy();
        app.exit(10);
      } finally {
        if (memoryTimer !== null) clearInterval(memoryTimer);
      }
    });
  }

  if (w06Probe === "editor" && w06EvidencePath) {
    window.webContents.once("did-finish-load", async () => {
      try {
        const expectedTracks = Number(readArgValue("w06-expected-tracks"));
        if (![3, 128].includes(expectedTracks)) {
          throw new Error("T05 packaged UI probe requires 3 or 128 fixtures");
        }
        await captureW1106EditorInteractions(
          window,
          w06EvidencePath,
          expectedTracks,
        );
        console.log("W11-06-05 packaged editor interactions PASS");
        window.destroy();
        app.exit(0);
      } catch (error) {
        console.error(
          "W11-06-05 packaged editor interactions FAIL: " +
            (error instanceof Error ? error.message : String(error)),
        );
        if (!window.isDestroyed()) window.destroy();
        app.exit(12);
      }
    });
  }

  if (isUiCapture && screenshotPath) {
    window.webContents.once("did-finish-load", async () => {
      try {
        window.setContentSize(
          CANONICAL_VIEWPORT.width,
          CANONICAL_VIEWPORT.height,
          false,
        );
        window.webContents.setZoomFactor(1);

        const readiness = (await window.webContents.executeJavaScript(`
          new Promise((resolve, reject) => {
            let attempt = 0;
            const inspect = () => {
              const shell = document.querySelector(".app-shell");
              const bodyText = document.body.innerText;
              if (
                shell &&
                bodyText.includes("Gemini Agent") &&
                bodyText.includes("Belum ada visual") &&
                bodyText.includes("Belum ada track")
              ) {
                const rect = shell.getBoundingClientRect();
                requestAnimationFrame(() =>
                  requestAnimationFrame(() =>
                    resolve({
                      innerWidth: window.innerWidth,
                      innerHeight: window.innerHeight,
                      shellWidth: Math.round(rect.width),
                      shellHeight: Math.round(rect.height),
                      textLength: bodyText.length,
                      hasGeminiAgent: bodyText.includes("Gemini Agent"),
                      hasPreviewEmpty: bodyText.includes("Belum ada visual"),
                      hasTimelineEmpty: bodyText.includes("Belum ada track"),
                    }),
                  ),
                );
                return;
              }

              attempt += 1;
              if (attempt >= 100) {
                reject(
                  new Error("Timed out waiting for SCR-002A renderer readiness."),
                );
                return;
              }
              setTimeout(inspect, 50);
            };
            inspect();
          })
        `)) as {
          innerWidth: number;
          innerHeight: number;
          shellWidth: number;
          shellHeight: number;
          textLength: number;
          hasGeminiAgent: boolean;
          hasPreviewEmpty: boolean;
          hasTimelineEmpty: boolean;
        };

        const target = resolve(screenshotPath);
        const evidenceTarget = target.replace(/\.png$/i, "-dom.json");
        await mkdir(dirname(target), { recursive: true });

        const screenshot = await window.webContents.capturePage();
        if (screenshot.isEmpty()) {
          throw new Error("Electron returned an empty SCR-002A screenshot.");
        }

        const captureSize = screenshot.getSize();
        await writeFile(target, screenshot.toPNG());
        await writeFile(
          evidenceTarget,
          JSON.stringify(
            {
              screen: UI_TEST_SCREEN,
              requestedViewport: CANONICAL_VIEWPORT,
              innerViewport: {
                width: readiness.innerWidth,
                height: readiness.innerHeight,
              },
              shell: {
                width: readiness.shellWidth,
                height: readiness.shellHeight,
              },
              capture: captureSize,
              zoom: window.webContents.getZoomFactor(),
              textLength: readiness.textLength,
              hasGeminiAgent: readiness.hasGeminiAgent,
              hasPreviewEmpty: readiness.hasPreviewEmpty,
              hasTimelineEmpty: readiness.hasTimelineEmpty,
            },
            null,
            2,
          ),
          "utf8",
        );

        console.log(
          [
            `UI screenshot PASS: ${UI_TEST_SCREEN} -> ${target}`,
            `viewport=${readiness.innerWidth}x${readiness.innerHeight}`,
            `shell=${readiness.shellWidth}x${readiness.shellHeight}`,
            `capture=${captureSize.width}x${captureSize.height}`,
            `text=${readiness.textLength}`,
          ].join("; "),
        );

        window.destroy();
        app.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`UI screenshot FAIL: ${message}`);
        if (!window.isDestroyed()) window.destroy();
        app.exit(7);
      }
    });
  }

  if (isW05Capture && w05Capture && w05Screenshot) {
    window.webContents.once("did-finish-load", async () => {
      try {
        window.setContentSize(
          CANONICAL_VIEWPORT.width,
          CANONICAL_VIEWPORT.height,
          false,
        );
        window.webContents.setZoomFactor(1);
        await captureW1105State(window, w05Capture, w05Screenshot);
        console.log(`W05 frozen UI probe PASS: ${w05Capture}`);
        window.destroy();
        app.exit(0);
      } catch (error) {
        console.error(
          `W05 frozen UI probe FAIL: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (!window.isDestroyed()) window.destroy();
        app.exit(11);
      }
    });
  }

  if (isSlcProbe && slcEvidencePath) {
    window.webContents.once("did-finish-load", async () => {
      try {
        const probeResult = (await window.webContents.executeJavaScript(`
          new Promise((resolve, reject) => {
            let attempt = 0;
            let saveClicked = false;
            const mode = ${JSON.stringify(slcProbe)};

            const inspect = () => {
              const shell = document.querySelector(".app-shell");
              const saveButton = document.querySelector(
                'button[data-action="save-project"]',
              );

              if (shell) {
                if (
                  (mode === "save" || mode === "save-cancel") &&
                  !saveClicked &&
                  saveButton
                ) {
                  saveClicked = true;
                  saveButton.click();
                }

                const persistenceState =
                  shell.getAttribute("data-persistence-state");
                const projectSource = shell.getAttribute("data-project-source");
                const projectId = shell.getAttribute("data-project-id");
                const projectName = shell.getAttribute("data-project-name");
                const projectRevision =
                  shell.getAttribute("data-project-revision");

                const saveReady =
                  mode === "save" && persistenceState === "saved";
                const cancelReady =
                  mode === "save-cancel" &&
                  persistenceState === "cancelled";
                const openReady =
                  mode === "open" && projectSource === "loaded";

                if (saveReady || cancelReady || openReady) {
                  resolve({
                    mode,
                    persistenceState,
                    projectSource,
                    projectId,
                    projectName,
                    projectRevision: Number(projectRevision),
                    bodyTextLength: document.body.innerText.length,
                  });
                  return;
                }

                if (
                  persistenceState === "error" ||
                  projectSource === "load-error"
                ) {
                  reject(
                    new Error(
                      "SLC renderer entered error state: persistence=" + persistenceState + "; source=" + projectSource,
                    ),
                  );
                  return;
                }
              }

              attempt += 1;
              if (attempt >= 200) {
                reject(new Error("Timed out waiting for SLC probe " + mode + "."));
                return;
              }
              setTimeout(inspect, 50);
            };

            inspect();
          })
        `)) as Record<string, unknown>;

        await writeJsonEvidence(slcEvidencePath, {
          ...probeResult,
          platform: process.platform,
          arch: process.arch,
        });

        if (slcScreenshotPath) {
          const screenshotTarget = resolve(slcScreenshotPath);
          await mkdir(dirname(screenshotTarget), { recursive: true });
          const screenshot = await window.webContents.capturePage();
          if (screenshot.isEmpty()) {
            throw new Error(`SLC screenshot is empty for ${slcProbe}.`);
          }
          await writeFile(screenshotTarget, screenshot.toPNG());
        }

        console.log(`SLC probe PASS: ${slcProbe} -> ${slcEvidencePath}`);
        window.destroy();
        app.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`SLC probe FAIL: ${message}`);
        if (!window.isDestroyed()) window.destroy();
        app.exit(9);
      }
    });
  }

  if (isW11Probe && w11EvidencePath) {
    window.webContents.once("did-finish-load", async () => {
      try {
        const result = (await window.webContents.executeJavaScript(`
          (async () => {
            const mode = ${JSON.stringify(w11Probe)};
            const startup = await window.lfa.getStartupProject();

            if (startup.status !== "loaded") {
              throw new Error("W11 lifecycle probe requires a loaded startup project.");
            }

            const nextProject = (project, revision, name) => ({
              ...project,
              revision,
              name,
            });

            const waitForDiscovery = async (batchId) => {
              let polls = 0;
              let sawProgress = false;
              let rendererTicks = 0;
              const heartbeat = setInterval(() => {
                rendererTicks += 1;
              }, 1);

              try {
                await new Promise((resolveWait) => setTimeout(resolveWait, 5));
                while (polls < 1000) {
                  const status =
                    await window.lfa.getMediaDiscoveryStatus(batchId);
                  polls += 1;
                  if (status.status === "discovering") {
                    sawProgress = true;
                    await new Promise((resolveWait) =>
                      setTimeout(resolveWait, 5),
                    );
                    continue;
                  }
                  return { status, polls, sawProgress, rendererTicks };
                }
                throw new Error("Timed out waiting for media discovery.");
              } finally {
                clearInterval(heartbeat);
              }
            };

            const waitForIntake = async (batchId) => {
              let polls = 0;
              let sawProgress = false;
              let rendererTicks = 0;
              const heartbeat = setInterval(() => {
                rendererTicks += 1;
              }, 1);

              try {
                await new Promise((resolveWait) => setTimeout(resolveWait, 5));
                while (polls < 2000) {
                  const status = await window.lfa.getMediaIntakeStatus(batchId);
                  polls += 1;
                  if (
                    status.status === "probing" ||
                    status.status === "committing"
                  ) {
                    sawProgress = true;
                    await new Promise((resolveWait) =>
                      setTimeout(resolveWait, 5),
                    );
                    continue;
                  }
                  return { status, polls, sawProgress, rendererTicks };
                }
                throw new Error("Timed out waiting for media intake.");
              } finally {
                clearInterval(heartbeat);
              }
            };

            if (mode === "known-save") {
              const project = nextProject(
                startup.project,
                startup.project.revision + 1,
                "Known Save Ω",
              );
              const save = await window.lfa.saveProject({ project });
              return {
                mode,
                startupStatus: startup.status,
                saveStatus: save.status,
                saveRevision:
                  save.status === "saved" ? save.projectRevision : null,
                location:
                  save.status === "saved" ? save.location.kind : null,
                projectId: project.projectId,
                projectRevision: project.revision,
              };
            }

            if (mode === "save-as-valid") {
              const saveAsProject = nextProject(
                startup.project,
                startup.project.revision + 1,
                "Save As Ω",
              );
              const saveAs = await window.lfa.saveProjectAs({
                project: saveAsProject,
              });
              if (saveAs.status !== "saved") {
                return {
                  mode,
                  startupStatus: startup.status,
                  saveAsStatus: saveAs.status,
                };
              }

              const knownSaveProject = nextProject(
                saveAsProject,
                saveAsProject.revision + 1,
                "Save As Then Save Ω",
              );
              const save = await window.lfa.saveProject({
                project: knownSaveProject,
              });
              return {
                mode,
                startupStatus: startup.status,
                saveAsStatus: saveAs.status,
                saveStatus: save.status,
                location:
                  save.status === "saved" ? save.location.kind : null,
                projectId: knownSaveProject.projectId,
                projectRevision: knownSaveProject.revision,
              };
            }

            if (mode === "save-as-cancel") {
              const saveAs = await window.lfa.saveProjectAs({
                project: startup.project,
              });
              const afterCancel = nextProject(
                startup.project,
                startup.project.revision + 1,
                "After Save As Cancel Ω",
              );
              const save = await window.lfa.saveProject({
                project: afterCancel,
              });
              return {
                mode,
                startupStatus: startup.status,
                saveAsStatus: saveAs.status,
                saveStatus: save.status,
                location:
                  save.status === "saved" ? save.location.kind : null,
                projectId: afterCancel.projectId,
                projectRevision: afterCancel.revision,
              };
            }

            if (mode === "open-cancel") {
              const opened = await window.lfa.openProject();
              const afterCancel = nextProject(
                startup.project,
                startup.project.revision + 1,
                "After Open Cancel Ω",
              );
              const save = await window.lfa.saveProject({
                project: afterCancel,
              });
              return {
                mode,
                startupStatus: startup.status,
                openStatus: opened.status,
                saveStatus: save.status,
                location:
                  save.status === "saved" ? save.location.kind : null,
                projectId: afterCancel.projectId,
                projectRevision: afterCancel.revision,
              };
            }

            if (mode === "open-valid") {
              const opened = await window.lfa.openProject();
              if (opened.status !== "opened") {
                return {
                  mode,
                  startupStatus: startup.status,
                  openStatus: opened.status,
                };
              }

              const revised = nextProject(
                opened.project,
                opened.project.revision + 1,
                "Opened Then Saved Ω",
              );
              const save = await window.lfa.saveProject({ project: revised });
              return {
                mode,
                startupStatus: startup.status,
                openStatus: opened.status,
                openedProjectId: opened.project.projectId,
                saveStatus: save.status,
                location:
                  save.status === "saved" ? save.location.kind : null,
                projectId: revised.projectId,
                projectRevision: revised.revision,
              };
            }

            if (mode === "open-error") {
              const opened = await window.lfa.openProject();
              const afterError = nextProject(
                startup.project,
                startup.project.revision + 1,
                "After Open Error Ω",
              );
              const save = await window.lfa.saveProject({
                project: afterError,
              });
              return {
                mode,
                startupStatus: startup.status,
                openStatus: opened.status,
                openCode:
                  opened.status === "error" ? opened.code : null,
                saveStatus: save.status,
                location:
                  save.status === "saved" ? save.location.kind : null,
                projectId: afterError.projectId,
                projectRevision: afterError.revision,
              };
            }

            if (mode === "recovery-autosave") {
              const project = nextProject(
                startup.project,
                startup.project.revision + 1,
                "Autosave Recovery Ω",
              );
              const autosave = await window.lfa.autosaveProject({
                project,
                savedRevision: startup.project.revision,
              });
              return {
                mode,
                startupStatus: startup.status,
                autosaveStatus: autosave.status,
                generation:
                  autosave.status === "saved" ? autosave.generation : null,
                projectRevision: project.revision,
              };
            }

            if (mode === "recovery-detect") {
              const recovery = await window.lfa.getRecoveryStatus({
                primaryProject: startup.project,
              });
              return {
                mode,
                startupStatus: startup.status,
                recoveryStatus: recovery.status,
                recoveryCode:
                  recovery.status === "stale" ||
                  recovery.status === "invalid"
                    ? recovery.code
                    : null,
                generation:
                  recovery.status === "available"
                    ? recovery.generation
                    : null,
                recoveryRevision:
                  recovery.status === "available"
                    ? recovery.project.revision
                    : null,
              };
            }

            if (mode === "recovery-accept") {
              const accepted = await window.lfa.acceptRecovery({
                primaryProject: startup.project,
              });
              return {
                mode,
                startupStatus: startup.status,
                acceptStatus: accepted.status,
                generation:
                  accepted.status === "recovered"
                    ? accepted.generation
                    : null,
                recoveryRevision:
                  accepted.status === "recovered"
                    ? accepted.project.revision
                    : null,
              };
            }

            if (mode === "recovery-discard") {
              const discarded = await window.lfa.discardRecovery({
                projectId: startup.project.projectId,
              });
              return {
                mode,
                startupStatus: startup.status,
                discardStatus: discarded.status,
              };
            }

            if (mode === "media-import") {
              const selected = await window.lfa.pickAudioFiles();
              if (selected.status !== "started") {
                return {
                  mode,
                  startupStatus: startup.status,
                  selectionStatus: selected.status,
                };
              }

              const discoveryRun = await waitForDiscovery(selected.batchId);
              const discovery = discoveryRun.status;
              if (discovery.status !== "completed") {
                return {
                  mode,
                  startupStatus: startup.status,
                  selectionStatus: selected.status,
                  discoveryStatus: discovery.status,
                  discoveryPolls: discoveryRun.polls,
                  rendererTicks: discoveryRun.rendererTicks,
                };
              }

              const intakeStart = await window.lfa.startMediaIntake({
                discoveryBatchId: selected.batchId,
                project: startup.project,
              });
              if (intakeStart.status !== "started") {
                return {
                  mode,
                  startupStatus: startup.status,
                  selectionStatus: selected.status,
                  discoveryStatus: discovery.status,
                  intakeStartStatus: intakeStart.status,
                  discoveryPolls: discoveryRun.polls,
                  rendererTicks: discoveryRun.rendererTicks,
                };
              }

              const intakeRun = await waitForIntake(intakeStart.batchId);
              const intake = intakeRun.status;
              if (intake.status !== "completed") {
                return {
                  mode,
                  startupStatus: startup.status,
                  selectionStatus: selected.status,
                  discoveryStatus: discovery.status,
                  intakeStatus: intake.status,
                  discoveryPolls: discoveryRun.polls,
                  intakePolls: intakeRun.polls,
                  rendererTicks:
                    discoveryRun.rendererTicks + intakeRun.rendererTicks,
                };
              }

              const save = await window.lfa.saveProject({
                project: intake.project,
              });
              const orderedTitles = intake.project.tracks
                .slice(0, 10)
                .map((track) => track.title);
              const lastTrack =
                intake.project.tracks[intake.project.tracks.length - 1];

              return {
                mode,
                startupStatus: startup.status,
                selectionStatus: selected.status,
                discoveryStatus: discovery.status,
                discoveryRootsSelected: discovery.summary.rootsSelected,
                discovered: discovery.summary.filesDiscovered,
                duplicatesSkipped: discovery.summary.duplicatesSkipped,
                discoveryIssueCount: discovery.summary.issues.length,
                intakeStatus: intake.status,
                accepted: intake.summary.accepted,
                rejected: intake.summary.rejected,
                saveStatus: save.status,
                projectRevision: intake.project.revision,
                trackCount: intake.project.tracks.length,
                mediaAssetCount: intake.project.mediaAssets?.length ?? 0,
                orderedTitles,
                lastTitle: lastTrack?.title ?? null,
                discoveryPolls: discoveryRun.polls,
                intakePolls: intakeRun.polls,
                discoveryProgressObserved: discoveryRun.sawProgress,
                intakeProgressObserved: intakeRun.sawProgress,
                rendererTicks:
                  discoveryRun.rendererTicks + intakeRun.rendererTicks,
              };
            }

            if (mode === "media-missing-relink") {
              const before = await window.lfa.scanMissingMedia({
                project: startup.project,
              });
              const relink = await window.lfa.relinkMissingMediaFolder({
                project: before.project,
              });

              if (relink.status !== "completed") {
                return {
                  mode,
                  startupStatus: startup.status,
                  missingBefore: before.items.length,
                  requiredBlockersBefore: before.readiness.blockers.length,
                  readyBefore: before.readiness.ready,
                  relinkStatus: relink.status,
                };
              }

              const after = await window.lfa.scanMissingMedia({
                project: relink.project,
              });
              const save = await window.lfa.saveProject({
                project: after.project,
              });

              return {
                mode,
                startupStatus: startup.status,
                missingBefore: before.items.length,
                requiredBlockersBefore: before.readiness.blockers.length,
                readyBefore: before.readiness.ready,
                relinkStatus: relink.status,
                relinkedCount: relink.results.filter(
                  (item) => item.status === "relinked",
                ).length,
                ambiguousCount: relink.results.filter(
                  (item) => item.status === "ambiguous",
                ).length,
                noMatchCount: relink.results.filter(
                  (item) => item.status === "no-match",
                ).length,
                missingAfter: after.items.length,
                requiredBlockersAfter: after.readiness.blockers.length,
                readyAfter: after.readiness.ready,
                saveStatus: save.status,
              };
            }

            if (
              mode === "timeline-history-flow" ||
              mode === "timeline-history-reopen"
            ) {
              const waitFor = async (predicate, message, maxAttempts = 500) => {
                for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                  if (predicate()) return;
                  await new Promise((resolveWait) =>
                    setTimeout(resolveWait, 20),
                  );
                }
                throw new Error(message);
              };

              const shell = () => document.querySelector(".app-shell");
              const mediaRows = () =>
                Array.from(document.querySelectorAll("[data-media-track-id]"));
              const timelineRows = () =>
                Array.from(
                  document.querySelectorAll("[data-timeline-track-id]"),
                );
              const buttonByText = (label) =>
                Array.from(document.querySelectorAll("button")).find(
                  (button) => button.textContent?.trim() === label,
                );
              const mediaRowById = (trackId) =>
                mediaRows().find(
                  (row) => row.getAttribute("data-media-track-id") === trackId,
                );

              const snapshotUi = () => {
                const root = shell();
                if (!root) throw new Error("App shell is unavailable.");

                return {
                  projectId: root.getAttribute("data-project-id"),
                  projectRevision: Number(
                    root.getAttribute("data-project-revision"),
                  ),
                  projectSource: root.getAttribute("data-project-source"),
                  persistenceState: root.getAttribute(
                    "data-persistence-state",
                  ),
                  dirty: root.getAttribute("data-project-dirty") === "true",
                  canUndo: root.getAttribute("data-can-undo") === "true",
                  canRedo: root.getAttribute("data-can-redo") === "true",
                  selectedTrackId:
                    root.getAttribute("data-selected-track-id") ?? "",
                  timelineZoom: Number(
                    root.getAttribute("data-timeline-zoom"),
                  ),
                  mediaOrder: mediaRows().map((row) =>
                    row.getAttribute("data-media-track-id"),
                  ),
                  timelineOrder: timelineRows().map((row) =>
                    row.getAttribute("data-timeline-track-id"),
                  ),
                  enabled: mediaRows().map((row) => ({
                    trackId: row.getAttribute("data-media-track-id"),
                    enabled:
                      row.querySelector('input[type="checkbox"]')?.checked ??
                      false,
                  })),
                  timeline: timelineRows().map((row) => ({
                    trackId: row.getAttribute("data-timeline-track-id"),
                    title:
                      row.querySelector("strong")?.textContent?.trim() ?? "",
                    timing:
                      row.querySelector("small")?.textContent?.trim() ?? "",
                    disabled: row.classList.contains(
                      "timeline-track--disabled",
                    ),
                  })),
                };
              };

              await waitFor(
                () => {
                  const root = shell();
                  return (
                    root?.getAttribute("data-project-source") === "loaded" &&
                    mediaRows().length >= 3 &&
                    timelineRows().length === mediaRows().length
                  );
                },
                "Timed out waiting for W11-03 album renderer readiness.",
              );

              const initial = snapshotUi();

              if (mode === "timeline-history-reopen") {
                return {
                  mode,
                  startupStatus: startup.status,
                  initial,
                };
              }

              if (initial.dirty || initial.canUndo || initial.canRedo) {
                throw new Error(
                  "W11-03 full-flow must start from a clean loaded history.",
                );
              }

              const firstId = initial.mediaOrder[0];
              const secondId = initial.mediaOrder[1];
              const thirdId = initial.mediaOrder[2];
              if (!firstId || !secondId || !thirdId) {
                throw new Error("W11-03 full-flow requires at least 3 tracks.");
              }

              const firstTimeline = timelineRows().find(
                (row) =>
                  row.getAttribute("data-timeline-track-id") === firstId,
              );
              const zoomIn = document.querySelector(
                'button[aria-label="Perbesar timeline"]',
              );
              firstTimeline?.click();
              zoomIn?.click();

              await waitFor(
                () => {
                  const root = shell();
                  return (
                    root?.getAttribute("data-selected-track-id") === firstId &&
                    root?.getAttribute("data-timeline-zoom") === "125"
                  );
                },
                "Session-only selection/zoom did not settle.",
              );
              const sessionOnly = snapshotUi();

              const thirdRow = mediaRowById(thirdId);
              const moveUp = thirdRow?.querySelector(
                'button[aria-label$="ke atas"]',
              );
              if (!(moveUp instanceof HTMLButtonElement)) {
                throw new Error("Track reorder control was not found.");
              }
              moveUp.click();

              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === initial.projectRevision + 1 &&
                    current.dirty &&
                    current.mediaOrder[0] === firstId &&
                    current.mediaOrder[1] === thirdId &&
                    current.mediaOrder[2] === secondId
                  );
                },
                "Track reorder did not update canonical UI state.",
              );
              const reordered = snapshotUi();

              const secondRow = mediaRowById(secondId);
              const enabledToggle = secondRow?.querySelector(
                'input[type="checkbox"]',
              );
              if (!(enabledToggle instanceof HTMLInputElement)) {
                throw new Error("Track enabled toggle was not found.");
              }
              enabledToggle.click();

              await waitFor(
                () => {
                  const current = snapshotUi();
                  const secondEnabled = current.enabled.find(
                    (item) => item.trackId === secondId,
                  )?.enabled;
                  const secondTimeline = current.timeline.find(
                    (item) => item.trackId === secondId,
                  );
                  return (
                    current.projectRevision === initial.projectRevision + 2 &&
                    current.dirty &&
                    secondEnabled === false &&
                    secondTimeline?.disabled === true &&
                    secondTimeline.timing === "Nonaktif"
                  );
                },
                "Track disable did not update project/timeline state.",
              );
              const disabled = snapshotUi();

              const saveButton = document.querySelector(
                'button[data-action="save-project"]',
              );
              if (!(saveButton instanceof HTMLButtonElement)) {
                throw new Error("Save control was not found.");
              }
              saveButton.click();

              await waitFor(
                () => {
                  const root = shell();
                  return (
                    root?.getAttribute("data-persistence-state") === "saved" &&
                    root?.getAttribute("data-project-dirty") === "false"
                  );
                },
                "Saved checkpoint did not become clean.",
              );
              const saved = snapshotUi();

              const toggleAfterSave = mediaRowById(secondId)?.querySelector(
                'input[type="checkbox"]',
              );
              if (!(toggleAfterSave instanceof HTMLInputElement)) {
                throw new Error(
                  "Track enabled toggle was unavailable after Save.",
                );
              }
              toggleAfterSave.click();

              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === saved.projectRevision + 1 &&
                    current.dirty &&
                    current.enabled.find(
                      (item) => item.trackId === secondId,
                    )?.enabled === true
                  );
                },
                "Post-Save command did not make the project dirty.",
              );
              const postSaveCommand = snapshotUi();

              const undoButton = buttonByText("Undo");
              if (!(undoButton instanceof HTMLButtonElement)) {
                throw new Error("Undo control was not found.");
              }
              undoButton.click();

              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === saved.projectRevision + 2 &&
                    !current.dirty &&
                    current.canRedo &&
                    current.enabled.find(
                      (item) => item.trackId === secondId,
                    )?.enabled === false
                  );
                },
                "Undo did not return exactly to the saved checkpoint.",
              );
              const undoToSaved = snapshotUi();

              const redoButton = buttonByText("Redo");
              if (!(redoButton instanceof HTMLButtonElement)) {
                throw new Error("Redo control was not found.");
              }
              redoButton.click();

              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === saved.projectRevision + 3 &&
                    current.dirty &&
                    current.enabled.find(
                      (item) => item.trackId === secondId,
                    )?.enabled === true
                  );
                },
                "Redo did not move away from the saved checkpoint.",
              );
              const redoAway = snapshotUi();

              const finalUndoButton = buttonByText("Undo");
              if (!(finalUndoButton instanceof HTMLButtonElement)) {
                throw new Error("Final Undo control was not found.");
              }
              finalUndoButton.click();

              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === saved.projectRevision + 4 &&
                    !current.dirty &&
                    current.enabled.find(
                      (item) => item.trackId === secondId,
                    )?.enabled === false
                  );
                },
                "Final Undo did not restore the saved logical state.",
              );
              const finalState = snapshotUi();

              return {
                mode,
                startupStatus: startup.status,
                firstId,
                secondId,
                thirdId,
                initial,
                sessionOnly,
                reordered,
                disabled,
                saved,
                postSaveCommand,
                undoToSaved,
                redoAway,
                finalState,
              };
            }


            if (
              mode === "auto-binding-flow" ||
              mode === "auto-binding-reopen" ||
              mode === "auto-arrange-stress"
            ) {
              const waitFor = async (predicate, message, maxAttempts = 750) => {
                for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                  if (predicate()) return;
                  await new Promise((resolveWait) =>
                    setTimeout(resolveWait, 20),
                  );
                }
                throw new Error(message);
              };

              const shell = () => document.querySelector(".app-shell");
              const mediaRows = () =>
                Array.from(document.querySelectorAll("[data-media-track-id]"));
              const timelineRows = () =>
                Array.from(
                  document.querySelectorAll("[data-timeline-track-id]"),
                );
              const buttonByText = (label) =>
                Array.from(document.querySelectorAll("button")).find(
                  (button) => button.textContent?.trim() === label,
                );
              const mediaRowById = (trackId) =>
                mediaRows().find(
                  (row) => row.getAttribute("data-media-track-id") === trackId,
                );
              const inputByLabel = (label) =>
                document.querySelector('input[aria-label="' + label + '"]');
              const setInputValue = (input, value) => {
                if (!(input instanceof HTMLInputElement)) {
                  throw new Error("Input not found: " + value);
                }
                const descriptor = Object.getOwnPropertyDescriptor(
                  HTMLInputElement.prototype,
                  "value",
                );
                descriptor?.set?.call(input, value);
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
              };
              const selectTrack = (trackId) => {
                const row = mediaRowById(trackId);
                const mainButton = row?.querySelector(".media-row__main");
                if (!(mainButton instanceof HTMLButtonElement)) {
                  throw new Error("Track selection control not found: " + trackId);
                }
                mainButton.click();
              };
              const openInspector = () => {
                const inspectorTab = Array.from(
                  document.querySelectorAll('button[role="tab"]'),
                ).find((button) => button.textContent?.trim() === "Inspector");
                if (!(inspectorTab instanceof HTMLButtonElement)) {
                  throw new Error("Inspector tab was not found.");
                }
                inspectorTab.click();
              };
              const snapshotUi = () => {
                const root = shell();
                if (!root) throw new Error("App shell is unavailable.");
                const inspector = document.querySelector(
                  "[data-inspector-track-id]",
                );
                const artworkSection = inspector?.querySelector(
                  '[aria-label="Artwork track"]',
                );
                return {
                  projectId: root.getAttribute("data-project-id"),
                  projectRevision: Number(
                    root.getAttribute("data-project-revision"),
                  ),
                  projectSource: root.getAttribute("data-project-source"),
                  persistenceState: root.getAttribute(
                    "data-persistence-state",
                  ),
                  dirty: root.getAttribute("data-project-dirty") === "true",
                  canUndo: root.getAttribute("data-can-undo") === "true",
                  canRedo: root.getAttribute("data-can-redo") === "true",
                  selectedTrackId:
                    root.getAttribute("data-selected-track-id") ?? "",
                  autoArrangeState:
                    root.getAttribute("data-auto-arrange-state") ?? "",
                  artworkState: root.getAttribute("data-artwork-state") ?? "",
                  mediaReady: root.getAttribute("data-media-ready") === "true",
                  missingMediaCount: Number(
                    root.getAttribute("data-missing-media-count"),
                  ),
                  mediaOrder: mediaRows().map((row) =>
                    row.getAttribute("data-media-track-id"),
                  ),
                  timelineOrder: timelineRows().map((row) =>
                    row.getAttribute("data-timeline-track-id"),
                  ),
                  titleOverride:
                    inputByLabel("Override judul") instanceof HTMLInputElement
                      ? inputByLabel("Override judul").value
                      : null,
                  artistOverride:
                    inputByLabel("Override artis") instanceof HTMLInputElement
                      ? inputByLabel("Override artis").value
                      : null,
                  albumOverride:
                    inputByLabel("Override album") instanceof HTMLInputElement
                      ? inputByLabel("Override album").value
                      : null,
                  yearOverride:
                    inputByLabel("Override tahun") instanceof HTMLInputElement
                      ? inputByLabel("Override tahun").value
                      : null,
                  inspectorText: inspector?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
                  artworkText:
                    artworkSection?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
                  geminiPresent:
                    document.body.innerText.includes("Gemini Agent"),
                };
              };

              await waitFor(
                () => {
                  const root = shell();
                  return (
                    root?.getAttribute("data-project-source") === "loaded" &&
                    mediaRows().length >= 3 &&
                    timelineRows().length === mediaRows().length
                  );
                },
                "Timed out waiting for W11-04 renderer readiness.",
              );

              const initial = snapshotUi();

              if (mode === "auto-arrange-stress") {
                const arrange = buttonByText("Auto Susun Album");
                if (!(arrange instanceof HTMLButtonElement)) {
                  throw new Error("Auto Susun control was not found.");
                }
                const startedAt = performance.now();
                arrange.click();
                await waitFor(
                  () => {
                    const root = shell();
                    return (
                      root?.getAttribute("data-auto-arrange-state") === "applied" &&
                      Number(root.getAttribute("data-project-revision")) ===
                        initial.projectRevision + 1
                    );
                  },
                  "128-track Auto Susun did not apply.",
                );
                const applied = snapshotUi();
                const elapsedMs = Math.round(performance.now() - startedAt);
                arrange.click();
                await waitFor(
                  () =>
                    shell()?.getAttribute("data-auto-arrange-state") === "noop",
                  "Repeated 128-track Auto Susun did not become a no-op.",
                );
                const noop = snapshotUi();
                return {
                  mode,
                  startupStatus: startup.status,
                  elapsedMs,
                  initial,
                  applied,
                  noop,
                };
              }

              const targetTrackId = "track-002";
              if (!mediaRowById(targetTrackId)) {
                throw new Error("W11-04 fixture target track is unavailable.");
              }
              selectTrack(targetTrackId);
              openInspector();
              await waitFor(
                () =>
                  document.querySelector(
                    '[data-inspector-track-id="' + targetTrackId + '"]',
                  ) !== null,
                "Inspector did not open for W11-04 target track.",
              );

              if (mode === "auto-binding-reopen") {
                return {
                  mode,
                  startupStatus: startup.status,
                  initial: snapshotUi(),
                };
              }

              if (initial.dirty || initial.canUndo || initial.canRedo) {
                throw new Error(
                  "W11-04 full-flow must start from a clean loaded history.",
                );
              }

              const titleInput = inputByLabel("Override judul");
              const artistInput = inputByLabel("Override artis");
              const albumInput = inputByLabel("Override album");
              const yearInput = inputByLabel("Override tahun");
              setInputValue(titleInput, "Closure Manual Title Ω");
              setInputValue(artistInput, "Closure Artist Ω");
              setInputValue(albumInput, "Closure Album Ω");
              setInputValue(yearInput, "2026");
              await new Promise((resolveWait) => setTimeout(resolveWait, 50));
              const draft = snapshotUi();

              const applyMetadata = buttonByText("Terapkan Metadata");
              if (!(applyMetadata instanceof HTMLButtonElement)) {
                throw new Error("Apply metadata control was not found.");
              }
              applyMetadata.click();
              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === initial.projectRevision + 1 &&
                    current.dirty &&
                    current.inspectorText.includes("Closure Manual Title Ω") &&
                    current.inspectorText.includes("Closure Artist Ω")
                  );
                },
                "Metadata override did not apply atomically.",
              );
              const metadataApplied = snapshotUi();

              const arrange = buttonByText("Auto Susun Album");
              if (!(arrange instanceof HTMLButtonElement)) {
                throw new Error("Auto Susun control was not found.");
              }
              arrange.click();
              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.autoArrangeState === "applied" &&
                    current.projectRevision === initial.projectRevision + 2
                  );
                },
                "Auto Susun did not apply through the shared history.",
              );
              const autoApplied = snapshotUi();

              arrange.click();
              await waitFor(
                () =>
                  shell()?.getAttribute("data-auto-arrange-state") === "noop",
                "Repeated Auto Susun did not become a no-op.",
              );
              const autoNoop = snapshotUi();

              const pickArtwork = buttonByText("Pilih Artwork Track");
              if (!(pickArtwork instanceof HTMLButtonElement)) {
                throw new Error("Track artwork control was not found.");
              }
              pickArtwork.click();
              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === initial.projectRevision + 3 &&
                    current.artworkText.includes("Track Cover Ω.png")
                  );
                },
                "Track artwork import/bind did not complete.",
              );
              const artworkApplied = snapshotUi();

              const saveButton = document.querySelector(
                'button[data-action="save-project"]',
              );
              if (!(saveButton instanceof HTMLButtonElement)) {
                throw new Error("Save control was not found.");
              }
              saveButton.click();
              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.persistenceState === "saved" &&
                    current.dirty === false
                  );
                },
                "W11-04 saved checkpoint did not become clean.",
              );
              const saved = snapshotUi();

              const clearMetadata = buttonByText("Hapus Override Metadata");
              if (!(clearMetadata instanceof HTMLButtonElement)) {
                throw new Error("Clear metadata control was not found.");
              }
              clearMetadata.click();
              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === saved.projectRevision + 1 &&
                    current.dirty &&
                    !current.inspectorText.includes("Closure Manual Title Ω")
                  );
                },
                "Post-save metadata mutation did not become dirty.",
              );
              const postSaveMutation = snapshotUi();

              const undoButton = buttonByText("Undo");
              if (!(undoButton instanceof HTMLButtonElement)) {
                throw new Error("Undo control was not found.");
              }
              undoButton.click();
              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === saved.projectRevision + 2 &&
                    current.dirty === false &&
                    current.canRedo &&
                    current.inspectorText.includes("Closure Manual Title Ω")
                  );
                },
                "Undo did not restore the exact W11-04 saved checkpoint.",
              );
              const undoToSaved = snapshotUi();

              const redoButton = buttonByText("Redo");
              if (!(redoButton instanceof HTMLButtonElement)) {
                throw new Error("Redo control was not found.");
              }
              redoButton.click();
              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === saved.projectRevision + 3 &&
                    current.dirty &&
                    !current.inspectorText.includes("Closure Manual Title Ω")
                  );
                },
                "Redo did not move away from the saved checkpoint.",
              );
              const redoAway = snapshotUi();

              const finalUndo = buttonByText("Undo");
              if (!(finalUndo instanceof HTMLButtonElement)) {
                throw new Error("Final Undo control was not found.");
              }
              finalUndo.click();
              await waitFor(
                () => {
                  const current = snapshotUi();
                  return (
                    current.projectRevision === saved.projectRevision + 4 &&
                    current.dirty === false &&
                    current.inspectorText.includes("Closure Manual Title Ω") &&
                    current.artworkText.includes("Track Cover Ω.png")
                  );
                },
                "Final Undo did not return to the saved W11-04 state.",
              );
              const finalState = snapshotUi();

              return {
                mode,
                startupStatus: startup.status,
                targetTrackId,
                initial,
                draft,
                metadataApplied,
                autoApplied,
                autoNoop,
                artworkApplied,
                saved,
                postSaveMutation,
                undoToSaved,
                redoAway,
                finalState,
              };
            }

            if (mode === "artwork-missing-relink") {
              const before = await window.lfa.scanMissingMedia({
                project: startup.project,
              });
              const assetId = "artwork-missing";
              const relink = await window.lfa.relinkMediaAsset({
                project: before.project,
                assetId,
              });
              if (relink.status !== "relinked") {
                return {
                  mode,
                  startupStatus: startup.status,
                  beforeReady: before.readiness.ready,
                  beforeBlockers: before.readiness.blockers.length,
                  beforeMissingCount: before.items.length,
                  relinkStatus: relink.status,
                };
              }
              const after = await window.lfa.scanMissingMedia({
                project: relink.project,
              });
              const save = await window.lfa.saveProject({
                project: after.project,
              });
              const artworkAsset = after.project.mediaAssets?.find(
                (asset) => asset.id === assetId,
              );
              return {
                mode,
                startupStatus: startup.status,
                beforeReady: before.readiness.ready,
                beforeBlockers: before.readiness.blockers.length,
                beforeMissingCount: before.items.length,
                missingWasOptional: before.items.some(
                  (item) => item.assetId === assetId && item.required === false,
                ),
                relinkStatus: relink.status,
                afterReady: after.readiness.ready,
                afterBlockers: after.readiness.blockers.length,
                afterMissingCount: after.items.length,
                savedStatus: save.status,
                bindingPreserved:
                  after.project.albumPresentation?.defaultArtworkAssetId ===
                  assetId,
                relinkedAvailability: artworkAsset?.availability ?? null,
                relinkedRequired: artworkAsset?.required ?? null,
              };
            }

            throw new Error("Unsupported W11 lifecycle probe mode: " + mode);
          })()
        `)) as Record<string, unknown>;

        await writeJsonEvidence(w11EvidencePath, {
          ...result,
          platform: process.platform,
          arch: process.arch,
        });

        console.log(`W11 lifecycle probe PASS: ${w11Probe}`);
        window.destroy();
        app.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`W11 lifecycle probe FAIL: ${message}`);
        if (!window.isDestroyed()) window.destroy();
        app.exit(10);
      }
    });
  }

  window.webContents.once(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedUrl) => {
      console.error(
        `UI renderer load FAIL: ${errorCode} ${errorDescription} ${validatedUrl}`,
      );
      if (!window.isDestroyed()) window.destroy();
      app.exit(8);
    },
  );

  const devUrl = process.env.LFA_DEV_SERVER_URL;
  if (devUrl) void window.loadURL(devUrl);
  else
    void window.loadFile(join(__dirname, "../renderer/index.html"), {
      query: w06Probe === "decode" ? { "w06-driver": "1" } : {},
    });

  return window;
}

// Isolated CI closure fixture only; do not override normal installed-user paths.
const w06Data = readArgValue("w06-user-data");
if (w06Data && process.env.LFA_W06_TEST === "1") {
  app.setPath("userData", resolve(w06Data));
}
const w05Data = readArgValue("w05-user-data");
if (w05Data && process.env.LFA_W05_TEST === "1") {
  app.setPath("userData", resolve(w05Data));
}
const compositionRoot = createCompositionRoot(process.argv);
const previewAudioStore = new NodePreviewAudioLeaseStore();
const previewAudioAccess = new PreviewAudioAccessService(
  previewAudioStore,
  compositionRoot.projectIpc.mediaIntakeService,
);
registerIpcHandlers({
  previewAudioAccess,
  ...compositionRoot.projectIpc,
  templateStore: compositionRoot.templateStore,
});

app.whenReady().then(() => {
  if (process.argv.includes(PACKAGED_SMOKE_FLAG)) {
    app.exit(0);
    return;
  }

  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("before-quit", () => previewAudioAccess.close());
app.on("window-all-closed", () => app.quit());
