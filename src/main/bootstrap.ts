import { app, BrowserWindow } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createCompositionRoot } from "./composition-root";
import { registerIpcHandlers } from "./ipc/register-ipc";

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
    width: isUiCapture ? CANONICAL_VIEWPORT.width : 1440,
    height: isUiCapture ? CANONICAL_VIEWPORT.height : 900,
    minWidth: 1280,
    minHeight: 800,
    useContentSize: isUiCapture,
    show: false,
    paintWhenInitiallyHidden: true,
    backgroundColor: "#F3F5F8",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: !isUiCapture && !isSlcProbe && !isW11Probe,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());

  if (!isUiCapture && !isSlcProbe && !isW11Probe) {
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
  else void window.loadFile(join(__dirname, "../renderer/index.html"));

  return window;
}

const compositionRoot = createCompositionRoot(process.argv);
registerIpcHandlers(compositionRoot.projectIpc);

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
