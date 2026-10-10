import { useState } from "react";
import type {
  VisualLayer,
  VisualLayerAnimation,
  VisualAnimationEasing,
} from "../../core/domain/visual-scene-schema";
import type { ProjectSessionView } from "../state/project-session/use-project-session";
import "./visual-animation-controls.css";

type EntrancePreset = NonNullable<VisualLayerAnimation["entrance"]>["preset"];
type ExitPreset = NonNullable<VisualLayerAnimation["exit"]>["preset"];
type LoopPreset = NonNullable<VisualLayerAnimation["loop"]>["preset"];
type KeyProperty = NonNullable<
  VisualLayerAnimation["keyframes"]
>[number]["property"];

const easingOptions: Array<{ value: VisualAnimationEasing; label: string }> = [
  { value: "linear", label: "Linear" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In Out" },
];

const propertyOptions: Array<{ value: KeyProperty; label: string }> = [
  { value: "opacity", label: "Opasitas" },
  { value: "x", label: "Posisi X" },
  { value: "y", label: "Posisi Y" },
  { value: "scale", label: "Skala" },
];

const entranceOptions: Array<{ value: EntrancePreset; label: string }> = [
  { value: "zoom-in", label: "Zoom In" },
  { value: "fade-in", label: "Fade In" },
  { value: "slide-up", label: "Slide Up" },
];

const exitOptions: Array<{ value: ExitPreset; label: string }> = [
  { value: "fade-out", label: "Fade Out" },
  { value: "slide", label: "Slide" },
  { value: "shrink", label: "Shrink" },
];

const loopOptions: Array<{ value: LoopPreset; label: string }> = [
  { value: "slow-zoom", label: "Slow Zoom" },
  { value: "float", label: "Float" },
  { value: "pulse", label: "Pulse" },
];

function seconds(ms: number): string {
  return String(Math.round(ms) / 1000).replace(".", ",");
}

function parseSeconds(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text.replace(",", "."));
  const ms = Math.round(value * 1000);
  return Number.isFinite(value) && ms >= 0 && ms <= 3_600_000 ? ms : null;
}

function durationMs(text: string): number | null {
  const ms = parseSeconds(text);
  return ms !== null && ms >= 1 && ms <= 120_000 ? ms : null;
}

function keyframeValue(property: KeyProperty, draft: string): number | null {
  if (draft.trim() === "") return null;
  const value = Number(draft.replace(",", "."));
  if (!Number.isFinite(value)) return null;
  if (property === "opacity")
    return value >= 0 && value <= 100 ? value / 100 : null;
  if (property === "scale") return value >= 0.01 && value <= 2 ? value : null;
  return value >= -1 && value <= 2 ? value : null;
}

/**
 * Additive W11-07 UI-IMG-002G left Inspector state. It edits only existing
 * FTR-009 source properties using the official history-backed CommandEngine.
 * No secondary editor, clock, scene state, Gemini panel or renderer ownership.
 */
export function VisualAnimationControls({
  layer,
  session,
}: {
  layer: VisualLayer;
  session: ProjectSessionView;
}) {
  const animation = layer.animation ?? {};
  const editable = !layer.locked && session.templateTrialProject === null;
  const [property, setProperty] = useState<KeyProperty>("opacity");
  const [keyTime, setKeyTime] = useState("2,5");
  const [keyValue, setKeyValue] = useState("85");
  const [inputError, setInputError] = useState<string | null>(null);
  const propertyTrack = animation.keyframes?.find(
    (track) => track.property === property,
  );
  const allPoints = propertyTrack?.points ?? [];

  function save(next: VisualLayerAnimation): void {
    // No undefined JSON properties and no empty animation object after clearing
    // the last preset/keyframe. Preserve legacy absent-field semantics.
    const normalized = Object.fromEntries(
      Object.entries(next).filter(([, value]) => value !== undefined),
    ) as VisualLayerAnimation;
    session.setVisualLayerAnimation(
      layer.id,
      Object.keys(normalized).length === 0 ? undefined : normalized,
    );
  }

  function updateEntrance(preset: EntrancePreset | "") {
    save({
      ...animation,
      ...(preset === ""
        ? { entrance: undefined }
        : {
            entrance: {
              preset,
              durationMs: animation.entrance?.durationMs ?? 800,
              easing: animation.entrance?.easing ?? "ease-out",
            },
          }),
    });
  }

  function updateExit(preset: ExitPreset | "") {
    save({
      ...animation,
      ...(preset === ""
        ? { exit: undefined }
        : {
            exit: {
              preset,
              durationMs: animation.exit?.durationMs ?? 600,
              easing: animation.exit?.easing ?? "ease-out",
            },
          }),
    });
  }

  function updateLoop(preset: LoopPreset | "") {
    save({
      ...animation,
      ...(preset === ""
        ? { loop: undefined }
        : {
            loop: {
              preset,
              durationMs: animation.loop?.durationMs ?? 8000,
              enabled: animation.loop?.enabled ?? true,
              intensity: animation.loop?.intensity ?? "subtle",
            },
          }),
    });
  }

  function editKeyframe(add: boolean) {
    const atMs = parseSeconds(keyTime);
    const value = keyframeValue(property, keyValue);
    if (atMs === null || (add && value === null)) {
      setInputError("Waktu atau nilai keyframe tidak valid.");
      return;
    }
    const existing = animation.keyframes ?? [];
    const current = existing.find((track) => track.property === property);
    if (add && current === undefined && existing.length >= 4) {
      setInputError("Maksimal empat properti keyframe.");
      return;
    }
    if (
      add &&
      current !== undefined &&
      current.points.length >= 64 &&
      !current.points.some((p) => p.timeMs === atMs)
    ) {
      setInputError("Maksimal 64 keyframe per properti.");
      return;
    }
    const points = (current?.points ?? []).filter(
      (point) => point.timeMs !== atMs,
    );
    if (add && value !== null) points.push({ timeMs: atMs, value });
    points.sort((a, b) => a.timeMs - b.timeMs);
    if (!add && points.length === (current?.points.length ?? 0)) {
      setInputError("Tidak ada keyframe pada waktu tersebut.");
      return;
    }
    const otherTracks = existing.filter((track) => track.property !== property);
    const nextTracks =
      points.length > 0 ? [...otherTracks, { property, points }] : otherTracks;
    save({
      ...(animation.entrance === undefined
        ? {}
        : { entrance: animation.entrance }),
      ...(animation.exit === undefined ? {} : { exit: animation.exit }),
      ...(animation.loop === undefined ? {} : { loop: animation.loop }),
      ...(nextTracks.length > 0 ? { keyframes: nextTracks } : {}),
    });
    setInputError(null);
  }

  const entrance = animation.entrance;
  const exit = animation.exit;
  const loop = animation.loop;

  return (
    <div
      className="visual-animation-controls"
      aria-label="Pengaturan animasi layer"
    >
      <section className="inspector-section visual-animation-group">
        <div className="inspector-section__header">
          <strong>Animasi Masuk</strong>
        </div>
        <label className="inspector-field">
          <span>Preset Masuk</span>
          <select
            aria-label="Preset Animasi Masuk"
            disabled={!editable}
            value={entrance?.preset ?? ""}
            onChange={(event) =>
              updateEntrance(event.currentTarget.value as EntrancePreset | "")
            }
          >
            <option value="">Tidak ada</option>
            {entranceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {entrance !== undefined ? (
          <div className="visual-animation-pair">
            <label className="inspector-field">
              <span>Durasi Masuk (dtk)</span>
              <input
                type="number"
                aria-label="Durasi Masuk (dtk)"
                min="0.001"
                max="120"
                step="0.1"
                disabled={!editable}
                value={entrance.durationMs / 1000}
                onChange={(event) => {
                  const ms = durationMs(event.currentTarget.value);
                  if (ms !== null)
                    save({
                      ...animation,
                      entrance: { ...entrance, durationMs: ms },
                    });
                }}
              />
            </label>
            <label className="inspector-field">
              <span>Easing Masuk</span>
              <select
                aria-label="Easing Masuk"
                disabled={!editable}
                value={entrance.easing}
                onChange={(event) =>
                  save({
                    ...animation,
                    entrance: {
                      ...entrance,
                      easing: event.currentTarget
                        .value as VisualAnimationEasing,
                    },
                  })
                }
              >
                {easingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section className="inspector-section visual-animation-group">
        <div className="inspector-section__header">
          <strong>Animasi Keluar</strong>
        </div>
        <label className="inspector-field">
          <span>Preset Keluar</span>
          <select
            aria-label="Preset Animasi Keluar"
            disabled={!editable}
            value={exit?.preset ?? ""}
            onChange={(event) =>
              updateExit(event.currentTarget.value as ExitPreset | "")
            }
          >
            <option value="">Tidak ada</option>
            {exitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {exit !== undefined ? (
          <label className="inspector-field">
            <span>Durasi Keluar (dtk)</span>
            <input
              type="number"
              aria-label="Durasi Keluar (dtk)"
              min="0.001"
              max="120"
              step="0.1"
              disabled={!editable}
              value={exit.durationMs / 1000}
              onChange={(event) => {
                const ms = durationMs(event.currentTarget.value);
                if (ms !== null)
                  save({ ...animation, exit: { ...exit, durationMs: ms } });
              }}
            />
          </label>
        ) : null}
      </section>

      <section className="inspector-section visual-animation-group">
        <div className="inspector-section__header">
          <strong>Animasi Loop</strong>
        </div>
        <label className="inspector-field">
          <span>Preset Loop</span>
          <select
            aria-label="Preset Animasi Loop"
            disabled={!editable}
            value={loop?.preset ?? ""}
            onChange={(event) =>
              updateLoop(event.currentTarget.value as LoopPreset | "")
            }
          >
            <option value="">Tidak ada</option>
            {loopOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {loop !== undefined ? (
          <div className="visual-animation-pair">
            <label className="visual-layer-check">
              <input
                type="checkbox"
                aria-label="Aktifkan Loop"
                disabled={!editable}
                checked={loop.enabled}
                onChange={(event) =>
                  save({
                    ...animation,
                    loop: { ...loop, enabled: event.currentTarget.checked },
                  })
                }
              />
              Aktif
            </label>
            <label className="inspector-field">
              <span>Intensitas Loop</span>
              <select
                aria-label="Intensitas Loop"
                disabled={!editable}
                value={loop.intensity}
                onChange={(event) =>
                  save({
                    ...animation,
                    loop: {
                      ...loop,
                      intensity: event.currentTarget.value as
                        "subtle" | "moderate",
                    },
                  })
                }
              >
                <option value="subtle">Halus</option>
                <option value="moderate">Sedang</option>
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section className="inspector-section visual-animation-group">
        <div className="inspector-section__header">
          <strong>Keyframe Manual</strong>
        </div>
        <label className="inspector-field">
          <span>Properti Keyframe</span>
          <select
            aria-label="Properti Keyframe"
            value={property}
            onChange={(event) => {
              const next = event.currentTarget.value as KeyProperty;
              setProperty(next);
              setKeyValue(
                next === "opacity" ? "85" : next === "scale" ? "1" : "0,5",
              );
              setInputError(null);
            }}
          >
            {propertyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div
          className="visual-animation-ruler"
          aria-label="Garis waktu keyframe"
          role="group"
        >
          <span className="visual-animation-ruler__line" aria-hidden="true" />
          {allPoints.map((point) => (
            <button
              key={point.timeMs}
              type="button"
              className="visual-animation-ruler__point"
              style={{
                left: `${Math.min(94, Math.max(6, (point.timeMs / Math.max(2500, ...allPoints.map((p) => p.timeMs))) * 88 + 6))}%`,
              }}
              aria-label={`Keyframe ${seconds(point.timeMs)} detik`}
              title={`${seconds(point.timeMs)} dtk`}
              onClick={() => {
                setKeyTime(String(point.timeMs / 1000));
                setKeyValue(
                  String(
                    property === "opacity"
                      ? point.value * 100
                      : point.value,
                  ),
                );
              }}
            />
          ))}
          {allPoints.length === 0 ? (
            <span className="visual-animation-ruler__empty">
              Belum ada keyframe
            </span>
          ) : null}
        </div>
        <div className="visual-animation-pair">
          <label className="inspector-field">
            <span>Waktu (dtk)</span>
            <input
              type="number"
              min="0"
              max="3600"
              step="0.1"
              aria-label="Waktu Keyframe (dtk)"
              disabled={!editable}
              value={keyTime.replace(",", ".")}
              onChange={(event) => setKeyTime(event.currentTarget.value)}
            />
          </label>
          <label className="inspector-field">
            <span>{property === "opacity" ? "Nilai (%)" : "Nilai"}</span>
            <input
              type="number"
              aria-label="Nilai Keyframe"
              step="0.01"
              disabled={!editable}
              value={keyValue.replace(",", ".")}
              onChange={(event) => setKeyValue(event.currentTarget.value)}
            />
          </label>
        </div>
        <div className="visual-animation-actions">
          <button
            type="button"
            disabled={!editable}
            onClick={() => editKeyframe(true)}
          >
            Tambah Keyframe
          </button>
          <button
            type="button"
            disabled={!editable || allPoints.length === 0}
            onClick={() => editKeyframe(false)}
          >
            Hapus Keyframe
          </button>
        </div>
        <p className="visual-layer-hint">Posisi, skala, dan opasitas</p>
        {inputError !== null ? (
          <p
            className="inspector-feedback inspector-feedback--error"
            role="alert"
          >
            {inputError}
          </p>
        ) : null}
      </section>
    </div>
  );
}
