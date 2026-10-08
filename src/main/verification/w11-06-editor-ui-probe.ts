import type { BrowserWindow } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/**
 * CI-only packaged Electron interaction proof for approved W11-06 editor UI.
 * Uses real main-owned picker/intake, real audio, and DOM button clicks.
 * Does not expose a renderer debugging API or change product controls.
 */
export async function captureW1106EditorInteractions(
  browser: BrowserWindow,
  evidencePath: string,
  expectedTracks: number,
): Promise<void> {
  browser.setContentSize(1600, 1000, false);
  browser.webContents.setZoomFactor(1);

  const report = (await browser.webContents.executeJavaScript(
    `(async () => {
      const expectedTracks = ${expectedTracks};
      const wait = async (check, reason, attempts = 800) => {
        for (let index = 0; index < attempts; index++) {
          const result = check();
          if (result) return result;
          await new Promise((done) => setTimeout(done, 50));
        }
        throw new Error("T05 packaged UI: " + reason);
      };
      const assert = (value, reason) => {
        if (!value) throw new Error("T05 packaged UI: " + reason);
      };
      const shell = await wait(
        () => document.querySelector(".app-shell"),
        "editor did not mount",
      );
      const button = (name) =>
        Array.from(document.querySelectorAll(".transport-bar button"))
          .find((element) => element.getAttribute("aria-label") === name);
      const click = (element, reason) => {
        assert(element && !element.disabled, reason);
        element.click();
      };
      const pos = () => {
        const value = document.querySelector(".timeline-body .playhead")?.style.left;
        return value ? Number.parseFloat(value) : NaN;
      };
      const timecode = () =>
        document.querySelector(".transport-bar .timecode")?.textContent || "";
      const elapsedSeconds = () => {
        const first = timecode().split("/")[0].trim().split(":").map(Number);
        return first.length === 3
          ? first[0] * 3600 + first[1] * 60 + first[2]
          : NaN;
      };
      assert(button("Putar")?.disabled === true,
        "untrusted new project must have disabled playback");
      const importButton = Array.from(
        document.querySelectorAll('[aria-label="Aksi proyek"] button'),
      ).find((element) => element.textContent?.includes("Impor Audio"));
      click(importButton, "native audio import button missing");
      await wait(
        () => shell.getAttribute("data-media-state") === "completed" &&
          document.querySelectorAll(".timeline-track").length === expectedTracks &&
          button("Putar") && !button("Putar").disabled,
        "main-authorized picker import never enabled packaged editor",
      );
      const imported = {
        tracks: document.querySelectorAll(".timeline-track").length,
        mediaRows: document.querySelectorAll(".media-row").length,
        revision: shell.getAttribute("data-project-revision"),
        dirty: shell.getAttribute("data-project-dirty"),
        projectId: shell.getAttribute("data-project-id"),
      };
      assert(imported.mediaRows === expectedTracks, "media panel track count drift");
      assert(document.querySelector('[aria-label="Gemini Agent"]'),
        "frozen Gemini right rail is missing");
      assert(document.querySelector('[aria-label="Album Timeline"]'),
        "frozen Album Timeline is missing");
      assert(document.querySelector('[aria-label="Preview video"]'),
        "frozen Preview video is missing");
      assert(document.querySelectorAll(".timeline-track").length === expectedTracks,
        "128-track cards were truncated");

      // This user edit intentionally changes revision BEFORE the playback-only baseline.
      const disabledTrack = document.querySelectorAll(".media-row")[1];
      const toggle = disabledTrack?.querySelector('input[type="checkbox"]');
      click(toggle, "second track enabled toggle missing");
      await wait(() => disabledTrack?.classList.contains("media-row--disabled"),
        "second track did not become disabled");
      const playbackRevision = shell.getAttribute("data-project-revision");
      const playbackDirty = shell.getAttribute("data-project-dirty");

      click(button("Putar"), "Play button remained disabled");
      await wait(() => button("Jeda"), "Play never entered loading/playing phase");
      await wait(() => elapsedSeconds() >= 1,
        "real packaged audio did not advance timeline timecode", 180);
      const firstPlayhead = pos();
      assert(Number.isFinite(firstPlayhead) && firstPlayhead >= 18,
        "playing playhead has no geometry");
      const playingSeconds = elapsedSeconds();

      click(button("Bisukan"), "Mute button did not appear");
      await wait(() => button("Suarakan"), "Mute did not update");
      click(button("Suarakan"), "Unmute button did not appear");
      await wait(() => button("Bisukan"), "Unmute did not update");

      // Second track is disabled; Next must move to third, not second.
      click(button("Track berikutnya"), "Next is disabled");
      await wait(() => Number.isFinite(pos()) && pos() > 300,
        "Next failed to skip disabled second track");
      const thirdPlayhead = pos();
      click(document.querySelector('[aria-label="Perbesar timeline"]'),
        "timeline zoom-in unavailable");
      await wait(() => shell.getAttribute("data-timeline-zoom") === "125",
        "zoom did not reach 125%");
      const zoomedPlayhead = pos();
      assert(zoomedPlayhead > thirdPlayhead + 40,
        "playhead did not follow actual card widths at 125% zoom");

      click(button("Track sebelumnya"), "Previous is disabled");
      await wait(() => Number.isFinite(pos()) && pos() < 220,
        "Previous failed to return to first enabled track");
      await wait(() => button("Jeda"), "Previous did not enter active playback");
      click(button("Jeda"), "Pause button is disabled");
      await wait(() => button("Putar"), "Pause did not return to Putar");
      const pausedTime = timecode();
      await new Promise((done) => setTimeout(done, 250));
      assert(timecode() === pausedTime,
        "timecode changed after paused editor transport");

      const lastCard = Array.from(document.querySelectorAll(".timeline-track")).at(-1);
      click(lastCard, "last timeline card missing");
      await wait(
        () => shell.getAttribute("data-selected-track-id") ===
          lastCard?.getAttribute("data-timeline-track-id"),
        "last track selection failed",
      );
      assert(shell.getAttribute("data-project-revision") === playbackRevision,
        "playback/selection mutated ProjectDocument revision");
      assert(shell.getAttribute("data-project-dirty") === playbackDirty,
        "playback/selection changed project dirty state");
      assert(document.querySelectorAll(".timeline-track").length === expectedTracks,
        "album changed during transport interaction");

      await new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)));
      return {
        success: true,
        tested: "real-packaged-editor-controls",
        expectedTracks,
        imported,
        playbackRevision,
        playbackDirty,
        playingSeconds,
        firstPlayhead,
        thirdPlayhead,
        zoomedPlayhead,
        zoom: shell.getAttribute("data-timeline-zoom"),
        pausedTime,
        lastTrackSelected: true,
        frozenShellPresent: true,
        controls: ["Play", "Pause", "Previous", "Next", "Mute",
          "Unmute", "Zoom", "Last track selection"],
        seekUiAvailable: false,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
    })()`,
    true,
  )) as Record<string, unknown>;

  if (report.success !== true || report.expectedTracks !== expectedTracks) {
    throw new Error("W11-06-05 editor control evidence failed");
  }
  const screenshot = await browser.webContents.capturePage();
  const size = screenshot.getSize();
  if (screenshot.isEmpty() || size.width !== 1600 || size.height !== 1000) {
    throw new Error("W11-06-05 screenshot did not match frozen 1600x1000 viewport");
  }
  const destination = resolve(evidencePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify({
    ...report,
    capture: size,
  }, null, 2), "utf8");
  await writeFile(destination + ".png", screenshot.toPNG());
}
