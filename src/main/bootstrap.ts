import { app, BrowserWindow } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { registerIpcHandlers } from "./ipc/register-ipc";

const PACKAGED_SMOKE_FLAG = "--smoke-test";
const UI_TEST_SCREEN = "SCR-002A";
const CANONICAL_VIEWPORT = { width: 1600, height: 1000 } as const;

function readArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value?.slice(prefix.length);
}

function createMainWindow(): BrowserWindow {
  const uiTestScreen = readArgValue("ui-test");
  const screenshotPath = readArgValue("screenshot");
  const isUiCapture = uiTestScreen !== undefined;

  if (isUiCapture && uiTestScreen !== UI_TEST_SCREEN) {
    throw new Error(`Unsupported UI test screen: ${uiTestScreen}`);
  }

  if (isUiCapture && !screenshotPath) {
    throw new Error("--screenshot=<path> is required with --ui-test.");
  }

  const window = new BrowserWindow({
    width: isUiCapture ? CANONICAL_VIEWPORT.width : 1440,
    height: isUiCapture ? CANONICAL_VIEWPORT.height : 900,
    minWidth: 1280,
    minHeight: 800,
    useContentSize: isUiCapture,
    show: false,
    backgroundColor: "#F3F5F8",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      offscreen: isUiCapture,
      backgroundThrottling: !isUiCapture,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());

  if (!isUiCapture) {
    window.once("ready-to-show", () => window.show());
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
  }

  const devUrl = process.env.LFA_DEV_SERVER_URL;
  if (devUrl) void window.loadURL(devUrl);
  else void window.loadFile(join(__dirname, "../renderer/index.html"));

  return window;
}

registerIpcHandlers();

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

app.on("window-all-closed", () => app.quit());
