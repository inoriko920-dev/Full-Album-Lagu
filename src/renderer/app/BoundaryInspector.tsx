import type { VisualBoundaryTransition, VisualAnimationEasing } from "../../core/domain/visual-scene-schema";
import { resolveTrackPresentation } from "../../core/domain/track-presentation";
import { projectAlbumTimeline } from "../../core/domain/album-timeline";
import { isEditableBoundaryPair } from "../../core/application/services/project-boundary-commands";
import type { ProjectSessionView } from "../state/project-session/use-project-session";
import "./boundary-inspector.css";

export interface SelectedBoundary {
  fromTrackId: string;
  toTrackId: string;
}

const presets: Array<{ value: VisualBoundaryTransition["preset"]; label: string }> = [
  { value: "crossfade", label: "Crossfade" },
  { value: "fade-through-black-blur", label: "Fade Through Black + Blur" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "dissolve", label: "Dissolve" },
  { value: "light-glitch", label: "Light Glitch" },
  { value: "soft-flash", label: "Soft Flash" },
  { value: "premium-album-change", label: "Premium Album Change" },
];
const easing: Array<{ value: VisualAnimationEasing; label: string }> = [
  { value: "linear", label: "Linear" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In Out" },
];

export function BoundaryInspector({
  session,
  selection,
  onPreview,
  previewAvailable,
}: {
  session: ProjectSessionView;
  selection: SelectedBoundary;
  onPreview: () => void;
  previewAvailable: boolean;
}) {
  const project = session.project;
  const { fromTrackId, toTrackId } = selection;
  const editable = session.templateTrialProject === null &&
    isEditableBoundaryPair(project, fromTrackId, toTrackId);
  const incoming = projectAlbumTimeline(project).items.find(
    (item) => item.trackId === toTrackId,
  );
  const saved = project.boundaryTransitions?.find(
    (item) => item.fromTrackId === fromTrackId && item.toTrackId === toTrackId,
  );
  const from = resolveTrackPresentation(project, fromTrackId);
  const to = resolveTrackPresentation(project, toTrackId);

  function change(next: VisualBoundaryTransition | undefined): void {
    if (!editable) return;
    session.setBoundaryTransition(fromTrackId, toTrackId, next);
  }

  function defaultSetting(preset: VisualBoundaryTransition["preset"]): VisualBoundaryTransition {
    return {
      fromTrackId,
      toTrackId,
      preset,
      durationMs: 800,
      easing: "ease-out",
      artworkHandoff: "during-transition",
      titleHandoff: "at-boundary",
    };
  }

  return (
    <div className="work-panel inspector-panel boundary-inspector" id="work-panel-inspector"
      aria-label="Inspector Boundary" data-boundary-from={fromTrackId} data-boundary-to={toTrackId}>
      <div className="work-panel__header">
        <div><p className="eyebrow">PROPERTI MANUAL</p><h2>Transisi Antar Lagu</h2></div>
        <span className="inspector-track-badge">Boundary</span>
      </div>
      <section className="inspector-section" aria-label="Pasangan track">
        <div className="inspector-section__header"><strong>Track Boundary Terpilih</strong></div>
        <p className="boundary-inspector__pair">{from.title.value} → {to.title.value}</p>
        <p className="visual-layer-hint">Artis: {from.artist.value || "—"} → {to.artist.value || "—"}</p>
        <p className="visual-layer-hint">Waktu: {incoming?.startMs === undefined
          ? "Belum tersedia" : `${(incoming.startMs / 1000).toFixed(2)} detik`}</p>
      </section>
      <section className="inspector-section" aria-label="Pengaturan transisi">
        <div className="inspector-section__header"><strong>Transisi</strong></div>
        <label className="inspector-field"><span>Jenis Transisi</span>
          <select aria-label="Jenis Transisi" disabled={!editable}
            value={saved?.preset ?? ""}
            onChange={(event) => {
              const preset = event.currentTarget.value as VisualBoundaryTransition["preset"] | "";
              change(preset === "" ? undefined : { ...(saved ?? defaultSetting(preset)), preset });
            }}>
            <option value="">Tidak ada</option>
            {presets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
        </label>
        <label className="inspector-field"><span>Durasi (detik)</span>
          <input aria-label="Durasi Transisi" type="number" min="0.001" max="120" step="0.1"
            disabled={!editable || saved === undefined}
            value={saved === undefined ? "" : saved.durationMs / 1000}
            onChange={(event) => {
              if (saved === undefined) return;
              const value = Number(event.currentTarget.value);
              const ms = Math.round(value * 1000);
              if (event.currentTarget.value.trim() !== "" && Number.isFinite(value) &&
                ms >= 1 && ms <= 120000) change({ ...saved, durationMs: ms });
            }} />
        </label>
        <label className="inspector-field"><span>Easing</span>
          <select aria-label="Easing Transisi" value={saved?.easing ?? "ease-out"}
            disabled={!editable || saved === undefined}
            onChange={(event) => {
              if (saved !== undefined) change({ ...saved, easing: event.currentTarget.value as VisualAnimationEasing });
            }}>
            {easing.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
          </select>
        </label>
        <label className="inspector-field"><span>Artwork</span>
          <select aria-label="Pergantian Artwork" value={saved?.artworkHandoff ?? "during-transition"}
            disabled={!editable || saved === undefined}
            onChange={(event) => {
              if (saved !== undefined) change({ ...saved, artworkHandoff: event.currentTarget.value as VisualBoundaryTransition["artworkHandoff"] });
            }}>
            <option value="during-transition">Selama Transisi</option>
            <option value="at-boundary">Tepat di Boundary</option>
          </select>
        </label>
        <label className="inspector-field"><span>Judul dan Artis</span>
          <select aria-label="Pergantian Judul dan Artis" value={saved?.titleHandoff ?? "at-boundary"}
            disabled={!editable || saved === undefined}
            onChange={(event) => {
              if (saved !== undefined) change({ ...saved, titleHandoff: event.currentTarget.value as VisualBoundaryTransition["titleHandoff"] });
            }}>
            <option value="at-boundary">Tepat di Boundary</option>
            <option value="during-transition">Selama Transisi</option>
          </select>
        </label>
        <button className="boundary-inspector__preview" type="button" aria-label="Preview Boundary"
          disabled={!editable || saved === undefined || !previewAvailable}
          onClick={onPreview}>Preview Boundary</button>
        {!editable ? <p className="inspector-feedback">Boundary ini tidak valid atau Mode Coba masih aktif; edit ditolak.</p> : null}
      </section>
    </div>
  );
}
