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
            catalogStatus: catalog.status, catalogCode: catalog.code, catalogError: catalog.message,
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
        const combined = document.querySelector(".visual-layer-combined");
        const layerPane = combined?.querySelector(".visual-layer-panel");
        const layerList = combined?.querySelector(".visual-layer-list");
        const inspectorPane = combined?.querySelector(".visual-layer-inspector");
        const inspectorName = inspectorPane?.querySelector('[aria-label="Nama Layer"]');
        const rail = document.querySelector(".work-rail__content");
        if (!layerPane || !layerList || !inspectorPane || !inspectorName || !rail) {
          throw new Error("Frozen SCR-002C Layer/Inspector shared selection is missing");
        }
        const layerBounds = layerPane.getBoundingClientRect();
        const inspectorBounds = inspectorPane.getBoundingClientRect();
        const railBounds = rail.getBoundingClientRect();
        const nameBounds = inspectorName.getBoundingClientRect();
        if (layerBounds.bottom > inspectorBounds.top + 1 ||
            inspectorBounds.bottom > railBounds.bottom + 1 ||
            inspectorBounds.height < 175 ||
            nameBounds.bottom > inspectorBounds.bottom + 1 ||
            getComputedStyle(layerList).overflowY !== "auto" ||
            getComputedStyle(inspectorPane).overflowY !== "auto") {
          throw new Error("Frozen SCR-002C Layer and Inspector must be independently scrollable without overlap or clipping");
        }
      } else {
        press("Template");
        await wait(() => document.querySelectorAll(".template-browser__item").length >= 9, "nine local templates");
        const browserPanel = document.querySelector(".template-browser");
        if (mode === "SCR-003A") {
          const trialButton = () => Array.from(browserPanel.querySelectorAll("button")).find(
            el => el.textContent?.trim() === "Coba Template"
          );
          await wait(() => !!trialButton() && !trialButton().disabled, "loaded template");
          const alreadySelected = browserPanel.querySelector(".template-browser__item.is-selected");
          if (!alreadySelected) throw new Error("No selected local template to reselect");
          const catalogCards = Array.from(browserPanel.querySelectorAll(".template-browser__item"));
          if (catalogCards.slice(0, 3).some(card => {
            const art = card.querySelector(".template-browser__thumbnail");
            const bounds = art?.getBoundingClientRect();
            return !bounds || bounds.width < 150 || bounds.height < 75;
          })) {
            throw new Error("Template Browser illustration cards are clipped or too small");
          }
          const selectedName = alreadySelected.querySelector("strong")?.textContent?.trim();
          alreadySelected.click();
          if (!selectedName || trialButton()?.disabled ||
              browserPanel.querySelector(".template-browser__detail h3")?.textContent?.trim() !== selectedName) {
            throw new Error("Reselecting the loaded template disabled Try or changed its detail");
          }
          const category = browserPanel.querySelector('[aria-label="Kategori Template"]');
          const search = browserPanel.querySelector('[aria-label="Cari Template"]');
          if (!category || !search) throw new Error("Frozen local template filters missing");
          const setNativeValue = (element, value, eventType) => {
            const prototype = element.tagName === "SELECT"
              ? window.HTMLSelectElement.prototype
              : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
            if (!setter) throw new Error("Native filter setter unavailable");
            setter.call(element, value);
            element.dispatchEvent(new Event(eventType, { bubbles: true }));
          };
          setNativeValue(category, "Neon", "change");
          await wait(() => {
            const selected = browserPanel.querySelector(".template-browser__item.is-selected strong")?.textContent?.trim();
            return !!selected &&
              browserPanel.querySelector(".template-browser__detail h3")?.textContent?.trim() === selected &&
              browserPanel.querySelectorAll(".template-browser__item").length > 0;
          }, "visible category selection reconciliation");
          setNativeValue(search, "R09 nonexistent template", "input");
          await wait(() => browserPanel.querySelectorAll(".template-browser__item").length === 0 &&
            trialButton()?.disabled === true, "no-match filter safely disables Try");
          setNativeValue(search, "", "input");
          setNativeValue(category, "Semua", "change");
          await wait(() => browserPanel.querySelectorAll(".template-browser__item").length >= 9, "restored local catalog");
          const minimal = Array.from(browserPanel.querySelectorAll(".template-browser__item")).find(
            item => item.textContent?.includes("Minimal Biru")
          );
          if (!minimal) throw new Error("Frozen Minimal Biru catalog item missing");
          minimal.click();
          await wait(() => browserPanel.querySelector(".template-browser__details h3")?.textContent?.trim() === "Minimal Biru" &&
            trialButton()?.disabled === false, "restored frozen default template");
          if (Number(shell.getAttribute("data-project-revision")) !== beforeRevision ||
              shell.getAttribute("data-project-dirty") !== beforeDirty) {
            throw new Error("Template filter changed canonical project");
          }
        } else if (mode === "SCR-003B") {
          await wait(() => Array.from(browserPanel.querySelectorAll("button")).some(el => el.textContent?.trim()==="Coba Template" && !el.disabled), "template ready");
          press("Coba Template", browserPanel);
          await wait(() => !!document.querySelector(".template-trial-overlay") && document.body.textContent?.includes("Mode Coba — perubahan belum disimpan ke proyek."), "trial banner");
          const trialScene = document.querySelector(".preview-frame--visual");
          const trialGallery = document.querySelector(".template-trial-overlay__gallery");
          if (!trialScene || !trialGallery) {
            throw new Error("Trial Preview/gallery geometry unavailable");
          }
          const sceneEdge = trialScene.getBoundingClientRect().right;
          const galleryBounds = trialGallery.getBoundingClientRect();
          if (sceneEdge + 8 > galleryBounds.left ||
              galleryBounds.width < 220 ||
              galleryBounds.right > window.innerWidth - 8 ||
              galleryBounds.bottom > window.innerHeight - 8) {
            throw new Error("Trial gallery is too small, out of bounds or obscures static Preview");
          }
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
          const dialogBounds = dialog.getBoundingClientRect();
          if (dialogBounds.left < 8 || dialogBounds.right > window.innerWidth - 8 ||
              dialogBounds.top < 8 || dialogBounds.bottom > window.innerHeight - 8) {
            throw new Error("Save as Template modal is clipped outside the Windows viewport");
          }
        } else if (mode === "FLOW" || mode === "FLOW_SECOND") {
          const localItems = () => Array.from(document.querySelectorAll(".template-browser__item"));
          const choose = mode === "FLOW"
            ? localItems().find(item => !item.textContent?.includes("Minimal Biru"))
            : localItems().find(item => item.textContent?.includes("Closure Saved Template"));
          if (!choose) throw new Error("Expected alternate/local saved template unavailable");
          const chosenName = choose.querySelector("strong")?.textContent?.trim();
          if (!chosenName) throw new Error("Chosen template has no name");
          choose.click();
          await wait(() =>
            browserPanel.querySelector(".template-browser__details h3")?.textContent?.trim() === chosenName &&
            Array.from(browserPanel.querySelectorAll("button")).some(el => el.textContent?.trim()==="Coba Template" && !el.disabled),
            "selected template loaded");
          press("Coba Template", browserPanel);
          await wait(() => !!document.querySelector(".template-trial-overlay") && document.body.textContent?.includes("Mode Coba — perubahan belum disimpan ke proyek."), "trial started");
          if (Number(shell.getAttribute("data-project-revision")) !== beforeRevision ||
              shell.getAttribute("data-project-dirty") !== beforeDirty) {
            throw new Error("Trial mutated canonical project");
          }
          press("Kembali ke Sebelumnya");
          await wait(() => !document.querySelector(".template-trial-overlay") && !!document.querySelector(".template-browser"), "reverted");
          if (Number(shell.getAttribute("data-project-revision")) !== beforeRevision) {
            throw new Error("Revert mutated project revision");
          }
          await wait(() => Array.from(browserPanel.querySelectorAll("button")).some(el => el.textContent?.trim()==="Coba Template" && !el.disabled), "ready for second trial");
          press("Coba Template", browserPanel);
          await wait(() => !!document.querySelector(".template-trial-overlay"), "trial restarted");
          press("Terapkan Template");
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
        hasTrialBanner: !!document.querySelector(".template-trial-overlay__banner"),
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
