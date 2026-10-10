import { useState } from "react";
import type { StaticScenePreviewModel } from "../../core/domain/static-scene-preview";
import type {
  VisualLayerTransform,
  VisualLayerAnchor,
} from "../../core/domain/visual-scene-schema";
import type { ProjectSessionView } from "../state/project-session/use-project-session";
import { ActionButton } from "../ui/controls";
import { AppIcon } from "../ui/AppIcon";
import {
  createStarterLayer,
  starterLayerTypes,
  type StarterLayerType,
} from "./visual-layer-defaults";
import { VisualAnimationControls } from "./VisualAnimationControls";
import "./visual-layer-controls.css";

export interface VisualLayerPanelProps {
  model: StaticScenePreviewModel;
  session: ProjectSessionView;
  onSelectLayer: (layerId: string | null) => void;
}

function newLayerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback only for older/test renderers; layer ID uniqueness is enforced by CommandEngine.
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function VisualLayerPanel({
  model,
  session,
  onSelectLayer,
}: VisualLayerPanelProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  function addLayer(type: StarterLayerType) {
    const layer = createStarterLayer(type, newLayerId());
    if (session.addVisualLayer(layer)) onSelectLayer(layer.id);
    setAddMenuOpen(false);
  }

  function move(id: string, direction: number) {
    const index = model.layers.findIndex((layer) => layer.id === id);
    if (index >= 0) session.reorderVisualLayer(id, index + direction);
  }

  return (
    <div className="work-panel visual-layer-panel" id="work-panel-layer">
      <div className="work-panel__header">
        <div>
          <p className="eyebrow">STRUKTUR VISUAL</p>
          <h2>Layer</h2>
        </div>
        <ActionButton
          variant="secondary"
          label="Tambah"
          compact
          aria-expanded={addMenuOpen}
          aria-controls="layer-add-types"
          onClick={() => setAddMenuOpen((value) => !value)}
        />
      </div>
      {addMenuOpen ? (
        <div
          id="layer-add-types"
          className="visual-layer-add-menu"
          aria-label="Tambah jenis layer"
        >
          {starterLayerTypes.map((type) => (
            <button
              type="button"
              key={type.id}
              onClick={() => addLayer(type.id)}
            >
              {type.name}
            </button>
          ))}
        </div>
      ) : null}
      {model.layerList.length === 0 ? (
        <div className="empty-card">
          <span className="empty-card__icon">
            <AppIcon name="layers" size={28} />
          </span>
          <strong>Belum ada layer</strong>
          <p>Tambahkan layer visual untuk memulai editor.</p>
        </div>
      ) : (
        <div className="visual-layer-list" aria-label="Daftar layer">
          {model.layerList.map((layer) => {
            const index = model.layers.findIndex(
              (item) => item.id === layer.id,
            );
            return (
              <div
                className={`visual-layer-row${layer.selected ? " is-selected" : ""}`}
                data-layer-id={layer.id}
                key={layer.id}
              >
                <button
                  className="visual-layer-row__select"
                  type="button"
                  aria-label={`Pilih ${layer.name}`}
                  aria-pressed={layer.selected}
                  onClick={() => onSelectLayer(layer.id)}
                >
                  <span className="visual-layer-row__kind">
                    {layer.kind === "text" ? "T" : "▣"}
                  </span>
                  <span className="visual-layer-row__name">{layer.name}</span>
                </button>
                <div className="visual-layer-row__actions">
                  <button
                    type="button"
                    aria-label={`Tampilkan ${layer.name}`}
                    title={layer.visible ? "Sembunyikan" : "Tampilkan"}
                    disabled={layer.locked}
                    onClick={() =>
                      session.setVisualLayerCommon(layer.id, {
                        visible: !layer.visible,
                      })
                    }
                  >
                    {layer.visible ? "◉" : "○"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Kunci ${layer.name}`}
                    title={layer.locked ? "Buka kunci" : "Kunci"}
                    onClick={() =>
                      session.setVisualLayerCommon(layer.id, {
                        locked: !layer.locked,
                      })
                    }
                  >
                    {layer.locked ? "🔒" : "◇"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Naikkan ${layer.name}`}
                    disabled={layer.locked || index === model.layers.length - 1}
                    onClick={() => move(layer.id, 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Turunkan ${layer.name}`}
                    disabled={layer.locked || index === 0}
                    onClick={() => move(layer.id, -1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {model.selectedLayerId ? (
        <div className="visual-layer-toolbar">
          <ActionButton
            variant="secondary"
            compact
            label="Duplikat"
            disabled={model.inspector?.locked}
            onClick={() => {
              const newId = newLayerId();
              if (session.duplicateVisualLayer(model.selectedLayerId!, newId))
                onSelectLayer(newId);
            }}
          />
          <ActionButton
            variant="secondary"
            compact
            label="Hapus"
            disabled={model.inspector?.locked}
            onClick={() => {
              if (session.removeVisualLayer(model.selectedLayerId!))
                onSelectLayer(null);
            }}
          />
        </div>
      ) : null}
      {session.layerError ? (
        <p
          role="alert"
          className="inspector-feedback inspector-feedback--error"
        >
          {session.layerError}
        </p>
      ) : null}
    </div>
  );
}

export interface VisualLayerInspectorProps {
  model: StaticScenePreviewModel;
  session: ProjectSessionView;
  onPreviewTransform: (transform: VisualLayerTransform) => void;
  onCommitTransform: () => void;
  onCancelTransform: () => void;
}

const transformFields = [
  { key: "x", label: "Posisi X", min: -1, max: 2, step: 0.01 },
  { key: "y", label: "Posisi Y", min: -1, max: 2, step: 0.01 },
  { key: "width", label: "Lebar", min: 0.01, max: 2, step: 0.01 },
  { key: "height", label: "Tinggi", min: 0.01, max: 2, step: 0.01 },
  { key: "rotationDeg", label: "Rotasi", min: -360, max: 360, step: 1 },
  { key: "opacity", label: "Opasitas", min: 0, max: 1, step: 0.01 },
] as const;

const anchors: VisualLayerAnchor[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export function VisualLayerInspector({
  model,
  session,
  onPreviewTransform,
  onCommitTransform,
  onCancelTransform,
}: VisualLayerInspectorProps) {
  const selected = model.inspector;
  const [nameDraft, setNameDraft] = useState(selected?.name ?? "");
  const [textDraft, setTextDraft] = useState(
    model.layers.find(
      (layer) =>
        layer.id === selected?.id &&
        layer.kind === "text" &&
        layer.role === "static",
    )?.kind === "text"
      ? ((
          model.layers.find(
            (layer) => layer.id === selected?.id && layer.kind === "text",
          ) as { text?: string } | undefined
        )?.text ?? "")
      : "",
  );

  if (selected === null) {
    return (
      <div className="work-panel work-panel--empty" id="work-panel-inspector">
        <div className="work-panel__header">
          <div>
            <p className="eyebrow">PROPERTI MANUAL</p>
            <h2>Inspector</h2>
          </div>
        </div>
        <div className="empty-card">
          <span className="empty-card__icon">
            <AppIcon name="sliders" size={28} />
          </span>
          <strong>Belum ada pilihan</strong>
          <p>Pilih layer di daftar atau Preview untuk melihat properti.</p>
        </div>
      </div>
    );
  }

  const id = selected.id;
  const editable = !selected.locked;
  const details = selected.details;

  return (
    <div
      className="work-panel inspector-panel visual-layer-inspector"
      id="work-panel-inspector"
      data-inspector-layer-id={id}
    >
      <div className="work-panel__header">
        <div>
          <p className="eyebrow">PROPERTI MANUAL</p>
          <h2>Inspector</h2>
        </div>
        <span className="inspector-track-badge">{selected.kind}</span>
      </div>
      <section className="inspector-section">
        <label className="inspector-field">
          <span>Nama Layer</span>
          <input
            aria-label="Nama Layer"
            value={nameDraft}
            maxLength={200}
            disabled={!editable}
            onChange={(event) => setNameDraft(event.currentTarget.value)}
            onBlur={() => {
              if (nameDraft.trim())
                session.setVisualLayerCommon(id, { name: nameDraft.trim() });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </label>
        <label className="visual-layer-check">
          <input
            type="checkbox"
            checked={selected.visible}
            disabled={!editable}
            aria-label="Layer terlihat"
            onChange={(event) =>
              session.setVisualLayerCommon(id, {
                visible: event.currentTarget.checked,
              })
            }
          />
          Tampilkan Layer
        </label>
        <label className="visual-layer-check">
          <input
            type="checkbox"
            checked={selected.locked}
            aria-label="Layer terkunci"
            onChange={(event) =>
              session.setVisualLayerCommon(id, {
                locked: event.currentTarget.checked,
              })
            }
          />
          Kunci Layer
        </label>
      </section>
      <section className="inspector-section">
        <div className="inspector-section__header">
          <strong>Transform</strong>
          <span>Canvas 16:9</span>
        </div>
        <div className="visual-layer-transform">
          {transformFields.map((field) => (
            <label key={field.key} className="visual-layer-range">
              <span>{field.label}</span>
              <input
                aria-label={field.label}
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                disabled={!editable}
                value={selected.transform[field.key]}
                onChange={(event) =>
                  onPreviewTransform({
                    ...selected.transform,
                    [field.key]: Number(event.currentTarget.value),
                  })
                }
                onPointerUp={onCommitTransform}
                onPointerCancel={onCancelTransform}
                onKeyUp={onCommitTransform}
                onBlur={onCommitTransform}
              />
              <output>{selected.transform[field.key].toFixed(2)}</output>
            </label>
          ))}
        </div>
        <label className="inspector-field">
          <span>Anchor</span>
          <select
            aria-label="Anchor"
            value={selected.transform.anchor}
            disabled={!editable}
            onChange={(event) =>
              session.setVisualLayerTransform(id, {
                ...selected.transform,
                anchor: event.currentTarget.value as VisualLayerAnchor,
              })
            }
          >
            {anchors.map((anchor) => (
              <option value={anchor} key={anchor}>
                {anchor}
              </option>
            ))}
          </select>
        </label>
      </section>
      {model.layers.find((layer) => layer.id === id) ? (
        <VisualAnimationControls
          layer={model.layers.find((layer) => layer.id === id)!}
          session={session}
        />
      ) : null}
      {details.kind === "text" ? (
        <section className="inspector-section">
          <div className="inspector-section__header">
            <strong>Style Teks</strong>
          </div>
          <label className="inspector-field">
            <span>Font</span>
            <input
              aria-label="Font"
              value={details.style.fontFamily}
              disabled={!editable}
              onChange={(event) =>
                session.setVisualLayerTextStyle(id, {
                  ...details.style,
                  fontFamily: event.currentTarget.value || "Inter",
                })
              }
            />
          </label>
          <label className="inspector-field">
            <span>Ukuran Font</span>
            <input
              aria-label="Ukuran Font"
              type="number"
              min={0.005}
              max={0.5}
              step={0.005}
              value={details.style.fontSizeRatio}
              disabled={!editable}
              onChange={(event) =>
                session.setVisualLayerTextStyle(id, {
                  ...details.style,
                  fontSizeRatio: Number(event.currentTarget.value),
                })
              }
            />
          </label>
          <label className="inspector-field">
            <span>Perataan</span>
            <select
              aria-label="Perataan"
              value={details.style.align}
              disabled={!editable}
              onChange={(event) =>
                session.setVisualLayerTextStyle(id, {
                  ...details.style,
                  align: event.currentTarget.value as
                    "left" | "center" | "right",
                })
              }
            >
              <option value="left">Kiri</option>
              <option value="center">Tengah</option>
              <option value="right">Kanan</option>
            </select>
          </label>
          <label className="inspector-field">
            <span>Ketebalan</span>
            <select
              aria-label="Ketebalan"
              value={details.style.fontWeight}
              disabled={!editable}
              onChange={(event) =>
                session.setVisualLayerTextStyle(id, {
                  ...details.style,
                  fontWeight: event.currentTarget.value as
                    "normal" | "medium" | "semibold" | "bold",
                })
              }
            >
              <option value="normal">Normal</option>
              <option value="medium">Medium</option>
              <option value="semibold">Semi-bold</option>
              <option value="bold">Bold</option>
            </select>
          </label>
          <label className="inspector-field">
            <span>Warna</span>
            <input
              aria-label="Warna Teks"
              type="color"
              value={details.style.color.slice(0, 7)}
              disabled={!editable}
              onChange={(event) =>
                session.setVisualLayerTextStyle(id, {
                  ...details.style,
                  color: `${event.currentTarget.value}FF`,
                })
              }
            />
          </label>
          <label className="visual-layer-check">
            <input
              type="checkbox"
              checked={details.style.italic}
              disabled={!editable}
              aria-label="Miring"
              onChange={(event) =>
                session.setVisualLayerTextStyle(id, {
                  ...details.style,
                  italic: event.currentTarget.checked,
                })
              }
            />
            Teks Miring
          </label>
          {details.role === "static" ? (
            <label className="inspector-field">
              <span>Konten Teks</span>
              <textarea
                aria-label="Konten Teks"
                rows={2}
                maxLength={2000}
                value={textDraft}
                disabled={!editable}
                onChange={(event) => setTextDraft(event.currentTarget.value)}
                onBlur={() => {
                  if (textDraft.trim())
                    session.setVisualLayerStaticText(id, textDraft);
                }}
              />
            </label>
          ) : (
            <p className="visual-layer-hint">
              Teks mengikuti metadata track, tanpa menyimpan salinan judul atau
              artis.
            </p>
          )}
        </section>
      ) : null}
      {details.kind === "spectrum" || details.kind === "progress" ? (
        <p className="visual-layer-hint">
          Preview statis. Animasi dan playback tersedia pada tahap berikutnya.
        </p>
      ) : null}
      {details.kind === "artwork" && !details.available ? (
        <p className="visual-layer-hint">
          Artwork belum tersedia; Preview menampilkan placeholder.
        </p>
      ) : null}
      {session.layerError ? (
        <p
          role="alert"
          className="inspector-feedback inspector-feedback--error"
        >
          {session.layerError}
        </p>
      ) : null}
    </div>
  );
}
