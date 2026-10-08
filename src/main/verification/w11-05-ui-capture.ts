import type { BrowserWindow } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/** CI-only real Electron screenshot and W05-07 renderer workflow probe. */
export async function captureW1105State(
  browser: BrowserWindow,
  screen: string,
  screenshotPath: string,
): Promise<void> {
  const rendererEvidence = (await browser.webContents.executeJavaScript(`
    (async () => {
      const mode = ${JSON.stringify(screen)};
      const wait = async (predicate, reason) => {
        for (let index = 0; index < 160; index += 1) {
          const value = predicate();
          if (value) return value;
          await new Promise((resolveWait) => setTimeout(resolveWait, 65));
        }
        if (reason === "nine local templates") {
          const catalog = await window.lfa.listTemplates().catch(error => ({
            status: "exception", message: String(error),
          }));
          const browser = document.querySelector(".template-browser");
          const alerts = Array.from(document.querySelectorAll('[role="alert"]')).map(el => el.textContent?.trim());
          throw new Error("W05 local template diagnosis: " + JSON.stringify({
            catalogStatus: catalog.status, catalogError: catalog.message,
            catalogEntries: catalog.entries?.length ?? null,
            browserMounted: !!browser,
            gridCount: document.querySelectorAll(".template-browser__item").length,
            alerts,
          }));
        }
        throw new Error("W05 UI probe timed out: " + reason);
      };
      const press = (label, scope = document) => {
        const button = Array.from(scope.querySelectorAll("button")).find(
          (element) => element.textContent?.trim() === label,
        );
        if (!button) throw new Error("W05 UI button missing: " + label);
        button.click();
      };
      const readShell = () => {
        const shell = document.querySelector(".app-shell");
        if (!shell) throw new Error("W05 missing Main Editor shell");
        return shell;
      };
      await wait(() => document.querySelector(".app-shell")?.getAttribute("data-project-id") ===
        (mode === "FLOW_SECOND" ? "w05-second-project" : "w05-closure-project"), "loaded seed project");
      const shell = readShell();
      const beforeRevision = Number(shell.getAttribute("data-project-revision"));
      const beforeDirty = shell.getAttribute("data-project-dirty");
      const mainEditor = {
        hasGemini: document.body.textContent.includes("Gemini Agent"),
        hasAlbumTimeline: !!document.querySelector('[aria-label="Album Timeline"]'),
        hasLeftTabs: ["media","layer","inspector"].every(id => !!document.getElementById("work-tab-" + id)),
      };
      if (!mainEditor.hasGemini || !mainEditor.hasAlbumTimeline || !mainEditor.hasLeftTabs) {
        throw new Error("Frozen editor hierarchy missing");
      }

      if (mode === "SCR-002C") {
        document.getElementById("work-tab-layer").click();
        await wait(() => document.querySelectorAll('.visual-layer-row[data-layer-id]').length === 6, "six frozen layers");
        const title = Array.from(document.querySelectorAll(".visual-layer-row")).find(
          node => node.textContent?.includes("Judul Track")
        );
        title?.querySelector("button")?.click();
        await wait(() => !!shell.getAttribute("data-selected-layer-id"), "selected layer");
      } else {
        press("Template");
        await wait(() => document.querySelectorAll(".template-browser__item").length >= 9, "nine local templates");
        const browserPanel = document.querySelector(".template-browser");
        if (mode === "SCR-003A") {
          await wait(() => !browserPanel.querySelector('button')?.disabled &&
            !!Array.from(browserPanel.querySelectorAll("button")).find(el => el.textContent?.trim()==="Coba Template" && !el.disabled), "loaded template");
        } else if (mode === "SCR-003B") {
          await wait(() => Array.from(browserPanel.querySelectorAll("button")).some(el => el.textContent?.trim()==="Coba Template" && !el.disabled), "template ready");
          press("Coba Template", browserPanel);
          await wait(() => browserPanel.textContent?.includes("Mode Coba — perubahan belum disimpan ke proyek."), "trial banner");
          if (Number(shell.getAttribute("data-project-revision")) !== beforeRevision ||
              shell.getAttribute("data-project-dirty") !== beforeDirty) {
            throw new Error("Trial changed project revision/dirty");
          }
        } else if (mode === "DLG-008") {
          press("Simpan Template", browserPanel);
          await wait(() => !!document.querySelector('[role="dialog"][aria-label="Simpan sebagai Template"]'), "save template dialog");
          const dialog = document.querySelector('[role="dialog"][aria-label="Simpan sebagai Template"]');
          if (!dialog.textContent?.includes("kredensial AI") ||
              !dialog.querySelector('[aria-label="Pratinjau Template Disimpan"]')) {
            throw new Error("Frozen save dialog exclusion copy or thumbnail missing");
          }
        } else if (mode === "FLOW" || mode === "FLOW_SECOND") {
          const localItems = () => Array.from(document.querySelectorAll(".template-browser__item"));
          const choose = mode === "FLOW"
            ? localItems().find(item => !item.textContent?.includes("Minimal Biru"))
            : localItems().find(item => item.textContent?.includes("Closure Saved Template"));
          if (!choose) throw new Error("Expected alternate/local saved template unavailable");
          choose.click();
          await wait(() => Array.from(browserPanel.querySelectorAll("button")).some(el => el.textContent?.trim()==="Coba Template" && !el.disabled), "selected template loaded");
          press("Coba Template", browserPanel);
          await wait(() => browserPanel.textContent?.includes("Mode Coba — perubahan belum disimpan ke proyek."), "trial started");
          if (Number(shell.getAttribute("data-project-revision")) !== beforeRevision ||
              shell.getAttribute("data-project-dirty") !== beforeDirty) {
            throw new Error("Trial mutated canonical project");
          }
          press("Kembali ke Sebelumnya", browserPanel);
          await wait(() => !browserPanel.textContent?.includes("Mode Coba — perubahan belum disimpan ke proyek."), "reverted");
          if (Number(shell.getAttribute("data-project-revision")) !== beforeRevision) {
            throw new Error("Revert mutated project revision");
          }
          press("Coba Template", browserPanel);
          await wait(() => browserPanel.textContent?.includes("Mode Coba — perubahan belum disimpan ke proyek."), "trial restarted");
          press("Terapkan Template", browserPanel);
          await wait(() => !document.querySelector(".template-browser"), "template applied and returned");
          await wait(() => Number(shell.getAttribute("data-project-revision")) > beforeRevision, "template revision");
          const appliedRevision = Number(shell.getAttribute("data-project-revision"));
          press("Undo");
          await wait(() => shell.getAttribute("data-project-dirty") === "false", "Undo to clean");
          press("Redo");
          await wait(() => shell.getAttribute("data-project-dirty") === "true", "Redo to dirty");
          if (mode === "FLOW") {
            press("Template");
            await wait(() => !!document.querySelector(".template-browser"), "browser re-open");
            press("Simpan Template", document.querySelector(".template-browser"));
            const dlg = await wait(() => document.querySelector('[role="dialog"][aria-label="Simpan sebagai Template"]'), "save user template dialog");
            const name = dlg.querySelector('[aria-label="Nama Template"]');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(name, "Closure Saved Template");
            name.dispatchEvent(new Event("input", { bubbles: true }));
            name.dispatchEvent(new Event("change", { bubbles: true }));
            await wait(() => Array.from(dlg.querySelectorAll("button")).some(el => el.textContent?.trim()==="Simpan Template" && !el.disabled), "ready to save");
            press("Simpan Template", dlg);
            await wait(() => !document.querySelector('[role="dialog"][aria-label="Simpan sebagai Template"]'), "saved user template");
            const listing = await window.lfa.listTemplates();
            if (listing.status !== "ok" || !listing.entries.some(item => item.name === "Closure Saved Template")) {
              throw new Error("Saved local template was not listed");
            }
            press("Kembali ke Editor");
          }
          press("Simpan");
          await wait(() => shell.getAttribute("data-persistence-state") === "saved", "saved project");
          return {
            mode, beforeRevision, beforeDirty,
            appliedRevision, lastRevision: Number(shell.getAttribute("data-project-revision")),
            afterDirty: shell.getAttribute("data-project-dirty"),
            frozen: mainEditor,
            localTemplateSaved: mode === "FLOW",
          };
        }
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const rect = shell.getBoundingClientRect();
      return {
        mode, beforeRevision, afterRevision: Number(shell.getAttribute("data-project-revision")),
        beforeDirty, afterDirty: shell.getAttribute("data-project-dirty"),
        frozen: mainEditor, layerCount: document.querySelectorAll(".visual-layer-row").length,
        catalogCount: document.querySelectorAll(".template-browser__item").length,
        hasTrialBanner: !!document.querySelector(".template-browser__trial-banner"),
        hasSaveDialog: !!document.querySelector('[role="dialog"][aria-label="Simpan sebagai Template"]'),
        viewport: { width: window.innerWidth, height: window.innerHeight },
        shell: { width: Math.round(rect.width), height: Math.round(rect.height) },
      };
    })()
  `)) as Record<string, unknown>;

  const destination = resolve(screenshotPath);
  await mkdir(dirname(destination), { recursive: true });
  if (screen.startsWith("SCR-") || screen === "DLG-008") {
    const image = await browser.webContents.capturePage();
    if (image.isEmpty())
      throw new Error(`W05 screenshot capture empty: ${screen}`);
    await writeFile(destination, image.toPNG());
    rendererEvidence.capture = image.getSize();
  }
  await writeFile(
    destination.replace(/\.png$/i, "-dom.json"),
    JSON.stringify(rendererEvidence, null, 2),
    "utf8",
  );
}
