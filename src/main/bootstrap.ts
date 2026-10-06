import { app, BrowserWindow } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { registerIpcHandlers } from "./ipc/register-ipc";

const PACKAGED_SMOKE_FLAG = "--smoke-test";
const UI_TEST_SCREEN = "SCR-002A";

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
    width: isUiCapture ? 1600 : 1440,
    height: isUiCapture ? 1000 : 900,
    minWidth: 1280,
    minHeight: 800,
    useContentSize: isUiCapture,
    show: isUiCapture,
    backgroundColor: "#F3F5F8",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());

  if (!isUiCapture) {
    window.once("ready-to-show", () => window.show());
  }

  if (isUiCapture && screenshotPath) {
    window.webContents.once("did-finish-load", async () => {
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
              reject(new Error("Timed out waiting for SCR-002A renderer readiness."));
              return;
            }
            setTimeout(inspect, 50);
          };
          inspect();
        })
      `)) as {
        shellWidth: number;
        shellHeight: number;
        textLength: number;
        hasGeminiAgent: boolean;
        hasPreviewEmpty: boolean;
        hasTimelineEmpty: boolean;
      };

      window.setContentSize(1600, 1000, false);
      window.show();
      window.focus();
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));

      const target = resolve(screenshotPath);
      const evidenceTarget = target.replace(/\.png$/i, "-dom.json");
      await mkdir(dirname(target), { recursive: true });

      const screenshot = await window.webContents.capturePage({
        x: 0,
        y: 0,
        width: 1600,
        height: 1000,
      });
      if (screenshot.isEmpty()) {
        throw new Error("Electron returned an empty SCR-002A screenshot.");
      }

      await writeFile(target, screenshot.toPNG());
      await writeFile(
        evidenceTarget,
        JSON.stringify(
          {
            screen: UI_TEST_SCREEN,
            viewport: { width: 1600, height: 1000, zoom: 1 },
            ...readiness,
          },
          null,
          2,
        ),
        "utf8",
      );
      console.log(
        `UI screenshot PASS: ${UI_TEST_SCREEN} -> ${target}; DOM ${readiness.shellWidth}x${readiness.shellHeight}; text=${readiness.textLength}`,
      );
      window.destroy();
      app.exit(0);
    });
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
