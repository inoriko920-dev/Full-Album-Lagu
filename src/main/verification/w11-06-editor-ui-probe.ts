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

      // Apply the actual approved built-in visual template through UI controls.
      // A fixture without visual layers cannot verify that decoded FFT reaches
      // the frozen spectrum layer displayed to real Windows users.
      const templateButton = Array.from(
        document.querySelectorAll('[aria-label="Aksi proyek"] button'),
      ).find((element) => element.textContent?.trim() === "Template");
      click(templateButton, "Template toolbar control missing");
      const tryTemplate = await wait(() => {
        const candidate = Array.from(
          document.querySelectorAll(".template-browser__actions button"),
        ).find((element) => element.textContent?.trim() === "Coba Template");
        return candidate && !candidate.disabled ? candidate : null;
      }, "built-in template never became ready", 180);
      click(tryTemplate, "cannot try frozen built-in template");
      const applyTemplate = await wait(() =>
        Array.from(document.querySelectorAll(
          ".template-trial-overlay__controls button",
        )).find((element) => element.textContent?.trim() === "Terapkan Template"),
        "template trial did not open",
      );
      click(applyTemplate, "cannot apply frozen built-in template");
      await wait(
        () => document.querySelector(
          ".preview-frame--visual .static-scene-preview__spectrum",
        ) && !document.querySelector(".template-trial-overlay"),
        "approved template with spectrum never appeared in editor",
      );
      const visibleBars = () => Array.from(document.querySelectorAll(
        ".preview-frame--visual .static-scene-preview__spectrum .static-scene-preview__bar",
      ));
      const spectrumPeakPercent = () => Math.max(
        0,
        ...visibleBars().map((bar) => Number.parseFloat(bar.style.height) || 0),
      );
      assert(visibleBars().length === 32,
        "preview must expose 32 real decoded-audio FFT bars");

      // W11-07 packaged proof: drive the actual frozen Boundary Inspector and
      // its two-track Preview through real React events, then Undo/Redo every
      // change BEFORE measuring playback. This is not an owner pixel verdict.
      const boundaryBaseRevision = shell.getAttribute("data-project-revision");
      const boundaryBaseDirty = shell.getAttribute("data-project-dirty");
      const firstBoundary = await wait(
        () => document.querySelector(".timeline-boundary-marker[data-boundary-from][data-boundary-to]"),
        "no canonical adjacent audio boundary in packaged editor",
      );
      const fromId = firstBoundary.getAttribute("data-boundary-from");
      const toId = firstBoundary.getAttribute("data-boundary-to");
      assert(fromId && toId && fromId !== toId,
        "boundary marker contains invalid directed track IDs");
      click(firstBoundary, "cannot select canonical boundary");
      const boundaryInspector = await wait(
        () => document.querySelector('[aria-label="Inspector Boundary"]'),
        "selecting timeline boundary did not open the existing left Inspector",
      );
      assert(boundaryInspector.getAttribute("data-boundary-from") === fromId &&
        boundaryInspector.getAttribute("data-boundary-to") === toId,
        "Inspector selected a different or stale track pair");
      assert(document.querySelector('[aria-label="Gemini Agent"]'),
        "boundary selection removed the permanent Gemini rail");
      assert(document.querySelector('[aria-label="Album Timeline"]'),
        "boundary selection removed the original album timeline");
      const presetControl = boundaryInspector.querySelector('[aria-label="Jenis Transisi"]');
      assert(presetControl && presetControl.value === "" && !presetControl.disabled,
        "existing boundary should be editable with no implicit preset");
      presetControl.value = "crossfade";
      presetControl.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(
        () => boundaryInspector.querySelector('[aria-label="Jenis Transisi"]')?.value === "crossfade" &&
          shell.getAttribute("data-project-revision") !== boundaryBaseRevision,
        "crossfade did not commit via packaged CommandEngine",
      );
      const sampledTransition = await wait(
        () => document.querySelector('.boundary-visual-preview[data-boundary-preset="crossfade"]'),
        "real packaged two-track Preview did not render the approved preset",
      );
      assert(sampledTransition.getAttribute("data-boundary-from") === fromId &&
        sampledTransition.getAttribute("data-boundary-to") === toId &&
        sampledTransition.querySelectorAll(".boundary-visual-preview__side").length === 2,
        "Preview sampled wrong artwork/title pair or missing transition sides");
      assert(sampledTransition.getAttribute("data-boundary-progress") === "0.500",
        "selected boundary sample did not use deterministic halfway progress");

      // W11-07 AC10 QA: exercise all eight owner-approved presets inside the
      // REAL packaged Windows editor, never a synthetic React-only fixture.
      // Test CSS/composited DOM behavior, then Undo every added edit so the
      // existing W11-06 playback test retains its original clean checkpoint.
      // This is automated renderer evidence, NOT owner-approved pixel parity.
      const approvedPresets = [
        "crossfade", "fade-through-black-blur", "slide", "zoom",
        "dissolve", "light-glitch", "soft-flash", "premium-album-change",
      ];
      const boundaryPresetSamples = [];
      for (const preset of approvedPresets) {
        if (preset !== "crossfade") {
          const current = boundaryInspector.querySelector('[aria-label="Jenis Transisi"]');
          assert(current && !current.disabled,
            "packaged boundary preset control unexpectedly became unavailable");
          current.value = preset;
          current.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const preview = await wait(
          () => {
            const current = document.querySelector(".boundary-visual-preview");
            const control = boundaryInspector.querySelector('[aria-label="Jenis Transisi"]');
            return control?.value === preset &&
              current?.getAttribute("data-boundary-preset") === preset &&
              current?.getAttribute("data-boundary-progress") === "0.500"
              ? current : null;
          },
          "real Windows Preview did not render approved preset " + preset,
          150,
        );
        await new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)));
        const sides = Array.from(preview.querySelectorAll(".boundary-visual-preview__side"));
        assert(sides.length === 2 && sides.every((side) =>
          side.getBoundingClientRect().width > 0 &&
          side.style.transform.includes("scale(") &&
          side.style.filter.includes("contrast(")),
          "real compositor omitted or hid a transition side for " + preset);
        assert(preview.querySelectorAll(
          ".boundary-visual-preview__foundation .static-scene-preview__spectrum"
        ).length === 1,
          "transition duplicated or dropped the real spectrum for " + preset);
        assert(document.querySelector('[aria-label="Gemini Agent"]') &&
          document.querySelector('[aria-label="Album Timeline"]'),
          "transition altered frozen editor rails for " + preset);
        const black = preview.querySelector(".boundary-visual-preview__overlay--black");
        const white = preview.querySelector(".boundary-visual-preview__overlay--white");
        if (preset === "fade-through-black-blur") {
          assert(Number(black?.style.opacity) > 0.5,
            "real black-blur preset did not render its overlay");
        } else if (preset === "slide") {
          // The existing Inspector defaults to Ease Out: at raw 50% it must
          // use eased 75% (not incorrectly assume linear -50%/+50%).
          const outgoingX = Number(sides[0].style.transform.match(
            /translateX\\((-?[0-9.]+)%\\)/)?.[1]);
          const incomingX = Number(sides[1].style.transform.match(
            /translateX\\((-?[0-9.]+)%\\)/)?.[1]);
          assert(Math.abs(outgoingX + 75) < 0.001 &&
            Math.abs(incomingX - 25) < 0.001,
            "real slide preset did not follow the approved Ease Out 75% position");
        } else if (preset === "zoom") {
          const outgoingScale = Number(sides[0].style.transform.match(
            /scale\\(([0-9.]+)\\)/)?.[1]);
          const incomingScale = Number(sides[1].style.transform.match(
            /scale\\(([0-9.]+)\\)/)?.[1]);
          assert(Math.abs(outgoingScale - 1.09) < 0.001 &&
            Math.abs(incomingScale - 0.97) < 0.001,
            "real zoom preset did not follow the approved Ease Out 75% scale");
        } else if (preset === "light-glitch") {
          assert(!sides[0].style.filter.includes("contrast(1)"),
            "real glitch preset did not apply contrast");
        } else if (preset === "soft-flash") {
          assert(Number(white?.style.opacity) > 0.25,
            "real soft-flash preset did not render white flash");
        } else if (preset === "premium-album-change") {
          assert(Number(white?.style.opacity) > 0.1 &&
            !sides[0].style.filter.includes("blur(0px)"),
            "real premium album preset did not render zoom/blur/flash");
        }
        boundaryPresetSamples.push({
          preset,
          progress: preview.getAttribute("data-boundary-progress"),
          fromTrackId: preview.getAttribute("data-boundary-from"),
          toTrackId: preview.getAttribute("data-boundary-to"),
          outgoingTransform: sides[0].style.transform,
          incomingTransform: sides[1].style.transform,
          outgoingFilter: sides[0].style.filter,
          incomingFilter: sides[1].style.filter,
          blackOverlayOpacity: black ? Number(black.style.opacity) : 0,
          whiteOverlayOpacity: white ? Number(white.style.opacity) : 0,
          foundationSpectrumCount: 1,
        });
      }
      const historyControl = (label) => Array.from(document.querySelectorAll("button"))
        .find((element) => element.getAttribute("aria-label") === label ||
          element.textContent?.trim() === label);
      // Seven newer preset edits must Undo back to the original Crossfade.
      // This proves ordered independent CommandEngine history in a real app,
      // and keeps the original Crossfade -> absent Undo/Redo proof intact.
      for (let index = approvedPresets.length - 1; index > 0; index--) {
        click(historyControl("Undo"),
          "Undo unavailable while restoring eight-preset Windows QA");
        const previous = approvedPresets[index - 1];
        await wait(
          () => boundaryInspector.querySelector('[aria-label="Jenis Transisi"]')?.value === previous &&
            document.querySelector(".boundary-visual-preview")?.getAttribute(
              "data-boundary-preset") === previous,
          "Undo failed to restore approved preset " + previous,
        );
      }
      assert(boundaryPresetSamples.length === 8 &&
        new Set(boundaryPresetSamples.map((sample) => sample.preset)).size === 8,
        "packaged eight-preset proof was incomplete");
      click(historyControl("Undo"), "boundary Undo action unavailable");
      await wait(
        () => boundaryInspector.querySelector('[aria-label="Jenis Transisi"]')?.value === "" &&
          !document.querySelector(".boundary-visual-preview"),
        "boundary Undo did not remove preset and sample",
      );
      click(historyControl("Redo"), "boundary Redo action unavailable");
      await wait(
        () => boundaryInspector.querySelector('[aria-label="Jenis Transisi"]')?.value === "crossfade" &&
          document.querySelector('.boundary-visual-preview[data-boundary-preset="crossfade"]'),
        "boundary Redo did not restore the same two-track sample",
      );
      click(historyControl("Undo"), "cannot return to unedited boundary state");
      await wait(
        () => Number.isSafeInteger(Number(shell.getAttribute("data-project-revision"))) &&
          Number(shell.getAttribute("data-project-revision")) > Number(boundaryBaseRevision) &&
          shell.getAttribute("data-project-dirty") === boundaryBaseDirty &&
          boundaryInspector.querySelector('[aria-label="Jenis Transisi"]')?.value === "" &&
          !document.querySelector(".boundary-visual-preview"),
        "boundary Undo must restore the semantic project and dirty flag while revision remains monotonic",
      );
      assert(document.querySelectorAll(".timeline-track").length === expectedTracks,
        "boundary QA changed album track count");

      // AC09: prove the real packaged WAV decoder/FFT clock actually drives
      // the existing two-track visual compositor, not the static 0.500 sample.
      // This is deliberately BEFORE disabling track 2 for the existing W06 QA.
      presetControl.value = "crossfade";
      presetControl.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(
        () => boundaryInspector.querySelector('[aria-label="Jenis Transisi"]')?.value === "crossfade" &&
          document.querySelector('.boundary-visual-preview[data-boundary-progress="0.500"]'),
        "real-audio boundary setup did not save a crossfade",
      );
      const transitionDuration = boundaryInspector.querySelector('[aria-label="Durasi Transisi"]');
      assert(transitionDuration && !transitionDuration.disabled,
        "real-audio duration field is disabled");
      // Use the native value setter so React's controlled input detects the
      // same input event as a real keyboard edit (2.0 seconds is a valid preset
      // duration, not a new feature). This gives the decoder a stable window.
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype, "value",
      )?.set;
      assert(valueSetter, "native duration input setter missing");
      const beforeDurationRevision = shell.getAttribute("data-project-revision");
      valueSetter.call(transitionDuration, "2");
      transitionDuration.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(
        () => boundaryInspector.querySelector('[aria-label="Durasi Transisi"]')?.value === "2" &&
          shell.getAttribute("data-project-revision") !== beforeDurationRevision,
        "real-audio transition duration did not commit through Inspector",
      );
      const previewBoundary = boundaryInspector.querySelector('[aria-label="Preview Boundary"]');
      click(previewBoundary, "packaged Preview Boundary seek is disabled");
      // Preview Boundary issues an actual decoder load with autoPlay=false.
      // Its transport label is Jeda while loading, then Putar when paused;
      // starting too early falsely reports a missing/disabled Play control.
      await wait(
        () => elapsedSeconds() >= 4 && elapsedSeconds() < 6 &&
          button("Putar") && !button("Putar").disabled,
        "Preview Boundary did not reach a paused, seeked audio track", 180,
      );
      click(button("Putar"), "packaged audio cannot start after paused boundary seek");
      const liveFrame = await wait(() => {
        const preview = document.querySelector(".boundary-visual-preview");
        const progress = Number(preview?.getAttribute("data-boundary-progress"));
        return preview && button("Jeda") && fromId === preview.getAttribute("data-boundary-from") &&
          toId === preview.getAttribute("data-boundary-to") &&
          Number.isFinite(progress) && progress > 0 && progress < 0.92 &&
          progress !== 0.5 &&
          preview.querySelectorAll(
            ".boundary-visual-preview__foundation .static-scene-preview__spectrum .static-scene-preview__bar",
          ).length === 32 && spectrumPeakPercent() > 2
          ? { progress, spectrumPeakPercent: spectrumPeakPercent() } : null;
      }, "real audio FFT and live boundary visual did not run together", 180);
      await wait(
        () => elapsedSeconds() >= 6 && !document.querySelector(".boundary-visual-preview"),
        "real audio passed transition window but selected static sample ghosted", 180,
      );
      click(button("Jeda"), "cannot pause real audio after boundary QA");
      await wait(() => button("Putar"), "boundary QA did not pause playback");
      click(historyControl("Undo"), "cannot undo live-boundary duration");
      click(historyControl("Undo"), "cannot undo live-boundary crossfade");
      await wait(
        () => boundaryInspector.querySelector('[aria-label="Jenis Transisi"]')?.value === "" &&
          !document.querySelector(".boundary-visual-preview") &&
          shell.getAttribute("data-project-dirty") === boundaryBaseDirty,
        "real audio boundary QA failed to restore original project after Undo",
      );
      // Real audio output and React CSS/FFT timing are automated evidence,
      // never proof of physical audible speaker or human visual acceptance.
      const boundaryLiveAudioFftVerified = true;
      const boundaryLiveAudioSample = liveFrame;

      // The existing W11-06 playback checks inspect Media rows. Restore that
      // original left tab after the boundary-only Inspector regression.
      click(document.querySelector("#work-tab-media"),
        "cannot restore the frozen Media tab after boundary QA");
      await wait(
        () => document.querySelectorAll(".media-row").length === expectedTracks,
        "Media panel did not reappear after boundary Inspector QA",
      );

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
      await wait(
        () => visibleBars().length === 32 && spectrumPeakPercent() > 2,
        "sine-WAV never reached frozen Preview spectrum bars",
        180,
      );
      const liveSpectrumPeakPercent = spectrumPeakPercent();
      const liveProgressStyle = document.querySelector(
        ".preview-frame--visual .static-scene-preview__progress-track",
      )?.style.background || "";
      assert(liveProgressStyle.includes("linear-gradient"),
        "real album clock never reached frozen Preview progress layer");

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
      await wait(
        () => visibleBars().length === 32 && visibleBars().every(
          (bar) => Number.parseFloat(bar.style.height) === 0,
        ),
        "paused real spectrum bars failed to return to silence",
      );

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

      // Verify the already-approved timeline card double-click Seek using
      // the real packaged Electron UI and main-issued WAV decoder. The fixture
      // uses 4-second WAVs and disables the second song above.
      const seekSeconds = (expectedTracks - 2) * 4 + 2;
      const doubleClickAtMiddle = (card) => {
        assert(card, "timeline seek target is missing");
        card.scrollIntoView({ block: "nearest", inline: "nearest" });
        const rect = card.getBoundingClientRect();
        assert(rect.width > 0 && Number.isFinite(rect.left),
          "timeline seek target has invalid geometry");
        card.dispatchEvent(new MouseEvent("dblclick", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width * 0.5,
          clientY: rect.top + rect.height * 0.5,
        }));
      };
      doubleClickAtMiddle(lastCard);
      await wait(
        () => Math.abs(elapsedSeconds() - seekSeconds) <= 1 &&
          button("Putar") && !button("Putar").disabled,
        "paused double-click seek did not reach last authorized song", 180,
      );
      const seekTime = timecode();
      await new Promise((done) => setTimeout(done, 200));
      assert(timecode() === seekTime,
        "paused timeline Seek unexpectedly resumed audio");
      assert(shell.getAttribute("data-selected-track-id") ===
          lastCard?.getAttribute("data-timeline-track-id"),
        "timeline seek changed selected Inspector track");
      assert(shell.getAttribute("data-project-revision") === playbackRevision,
        "timeline seek changed canonical revision");
      assert(shell.getAttribute("data-project-dirty") === playbackDirty,
        "timeline seek changed project dirty state");

      // The disabled second song has no playable canonical timeline span.
      const disabledCard = document.querySelectorAll(".timeline-track")[1];
      doubleClickAtMiddle(disabledCard);
      await new Promise((done) => setTimeout(done, 160));
      assert(timecode() === seekTime,
        "disabled card incorrectly became a seek destination");
      assert(shell.getAttribute("data-project-revision") === playbackRevision,
        "disabled-track seek mutated the project");

      // Resume genuine authorized audio from this paused midpoint, and check
      // FFT, clock, and screenshot without a synthetic component-only mock.
      lastCard.scrollIntoView({ block: "nearest", inline: "nearest" });
      click(button("Putar"), "cannot resume packaged playback after timeline seek");
      await wait(
        () => button("Jeda") && visibleBars().length === 32 &&
          spectrumPeakPercent() > 2,
        "real waveform not visible when capturing seeked Preview", 180,
      );
      await wait(
        () => elapsedSeconds() >= seekSeconds - 1,
        "resumed audio lost the timeline seek destination", 180,
      );
      await wait(
        () => button("Jeda") && visibleBars().length === 32 &&
          spectrumPeakPercent() > 2,
        "real waveform not visible when capturing frozen Preview",
        180,
      );
      const captureSpectrumPeakPercent = spectrumPeakPercent();
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
        appliedFrozenSpectrumTemplate: true,
        liveSpectrumPeakPercent,
        liveProgressVerified: true,
        pausedSpectrumZero: true,
        capturedWhilePlaying: true,
        captureSpectrumPeakPercent,
        firstPlayhead,
        thirdPlayhead,
        zoomedPlayhead,
        zoom: shell.getAttribute("data-timeline-zoom"),
        pausedTime,
        lastTrackSelected: true,
        boundaryInspectorPackagedVerified: true,
        boundaryPreviewPackagedVerified: true,
        boundaryAllEightPresetPackagedVerified: true,
        boundaryPresetSamples,
        boundaryUndoRedoPackagedVerified: true,
        boundaryProjectStateRestored: true,
        boundaryLiveAudioFftVerified,
        boundaryLiveAudioSample,
        timelineDoubleClickSeekVerified: true,
        timelineSeekSeconds: seekSeconds,
        disabledTimelineSeekRejected: true,
        seekPreservedProjectRevision: true,
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
  const invalidScreenshot =
    screenshot.isEmpty() || size.width !== 1600 || size.height !== 1000;
  if (invalidScreenshot) {
    throw new Error(
      "W11-06-05 screenshot did not match frozen 1600x1000 viewport",
    );
  }
  const destination = resolve(evidencePath);
  await mkdir(dirname(destination), { recursive: true });
  const payload = { ...report, capture: size };
  await writeFile(destination, JSON.stringify(payload, null, 2), "utf8");
  await writeFile(destination + ".png", screenshot.toPNG());
  // No playback remains active after the live screenshot evidence is saved.
  await browser.webContents.executeJavaScript(
    `(() => {
      const pause = Array.from(
        document.querySelectorAll(".transport-bar button"),
      ).find((element) => element.getAttribute("aria-label") === "Jeda");
      if (pause && !pause.disabled) pause.click();
    })()`,
    true,
  );
}
