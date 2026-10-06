import { useState } from "react";
import { AppIcon } from "../ui/AppIcon";
import { ActionButton, IconButton } from "../ui/controls";
import "./app-shell.css";

type WorkRailTab = "media" | "layer" | "inspector";

const WORK_RAIL_TABS: Array<{ id: WorkRailTab; label: string }> = [
  { id: "media", label: "Media" },
  { id: "layer", label: "Layer" },
  { id: "inspector", label: "Inspector" },
];

const FIXTURE_VERSION = "S09-T03-SCR-002A-v1";

function MediaPanel() {
  return (
    <div className="work-panel work-panel--media" id="work-panel-media">
      <div className="media-empty">
        <span className="media-empty__icon">
          <AppIcon name="music" size={28} />
        </span>
        <strong>Belum ada media audio</strong>
        <p>Impor lagu untuk mulai membuat album.</p>
        <ActionButton
          variant="primary"
          label="Impor Audio"
          icon="upload"
          wide
        />
      </div>
    </div>
  );
}

function LayerPanel() {
  return (
    <div className="work-panel work-panel--empty" id="work-panel-layer">
      <div className="work-panel__header">
        <div>
          <p className="eyebrow">STRUKTUR VISUAL</p>
          <h2>Layer</h2>
        </div>
      </div>
      <div className="empty-card">
        <span className="empty-card__icon">
          <AppIcon name="layers" size={28} />
        </span>
        <strong>Belum ada layer</strong>
        <p>Layer akan muncul setelah media atau template ditambahkan.</p>
      </div>
    </div>
  );
}

function InspectorPanel() {
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
        <p>Pilih track, layer, atau boundary untuk melihat properti.</p>
      </div>
    </div>
  );
}

function WorkRail({
  activeTab,
  onTabChange,
}: {
  activeTab: WorkRailTab;
  onTabChange: (tab: WorkRailTab) => void;
}) {
  return (
    <aside className="work-rail" aria-label="Panel kerja manual">
      <div className="work-tabs" role="tablist" aria-label="Panel kerja">
        {WORK_RAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`work-tab${activeTab === tab.id ? " is-active" : ""}`}
            id={`work-tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`work-panel-${tab.id}`}
            type="button"
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className="work-rail__content"
        role="tabpanel"
        aria-labelledby={`work-tab-${activeTab}`}
      >
        {activeTab === "media" ? <MediaPanel /> : null}
        {activeTab === "layer" ? <LayerPanel /> : null}
        {activeTab === "inspector" ? <InspectorPanel /> : null}
      </div>
    </aside>
  );
}

function PreviewPanel() {
  return (
    <section className="preview-panel" aria-label="Preview video">
      <div className="preview-stage">
        <div className="preview-frame">
          <div className="preview-scenery" aria-hidden="true">
            <span className="preview-scenery__sun" />
            <span className="preview-scenery__mountain preview-scenery__mountain--far" />
            <span className="preview-scenery__mountain preview-scenery__mountain--near" />
            <span className="preview-scenery__lake" />
          </div>
          <div className="preview-placeholder">
            <span className="preview-placeholder__icon">
              <AppIcon name="image" size={27} />
            </span>
            <strong>Belum ada visual</strong>
            <span>Impor audio atau pilih template untuk memulai.</span>
          </div>
        </div>
      </div>
      <div className="transport-bar" aria-label="Kontrol playback">
        <span className="timecode">00:00:00 / 00:00:00</span>
        <div className="transport-controls">
          <IconButton
            icon="previous"
            iconSize={17}
            disabled
            aria-label="Track sebelumnya"
          />
          <IconButton
            icon="play"
            iconSize={18}
            play
            disabled
            aria-label="Putar"
          />
          <IconButton
            icon="next"
            iconSize={17}
            disabled
            aria-label="Track berikutnya"
          />
        </div>
        <div className="transport-tail">
          <IconButton
            icon="volume"
            iconSize={17}
            disabled
            aria-label="Volume"
          />
          <span className="transport-separator" />
          <span className="transport-format">16:9</span>
        </div>
      </div>
    </section>
  );
}

function GeminiRail() {
  return (
    <aside className="gemini-rail" aria-label="Gemini Agent">
      <div className="gemini-header">
        <div className="gemini-title">
          <span className="gemini-mark">
            <AppIcon name="gemini" size={18} />
          </span>
          <h2>Gemini Agent</h2>
        </div>
        <ActionButton variant="secondary" label="Kelola API" compact />
      </div>
      <div className="gemini-status-row">
        <div className="gemini-status">
          <span className="status-dot status-dot--muted" />
          <span>Gemini • Belum dikonfigurasi • 0/100 key</span>
        </div>
      </div>
      <div className="gemini-empty">
        <span className="gemini-empty__icon">
          <AppIcon name="gemini" size={28} />
        </span>
        <h3>Aktifkan Gemini untuk asisten AI Anda</h3>
        <p>
          Editor manual tetap dapat digunakan tanpa Gemini. Tambahkan API key
          untuk mengaktifkan bantuan berbasis perintah.
        </p>
        <ActionButton
          variant="primary"
          label="Tambahkan API Key"
          icon="key"
          wide
        />
        <div className="gemini-note">
          <AppIcon name="key" size={16} />
          <span>
            API key disimpan aman di perangkat dan tidak masuk ke file proyek.
          </span>
        </div>
      </div>
    </aside>
  );
}

function TimelinePanel() {
  return (
    <section className="timeline-panel" aria-label="Album Timeline">
      <div className="timeline-header">
        <div className="timeline-title">
          <AppIcon name="timeline" size={17} />
          <strong>Album Timeline</strong>
        </div>
        <div className="timeline-tools" aria-label="Alat timeline">
          <button className="text-tool" type="button" disabled>
            −
          </button>
          <span>100%</span>
          <button className="text-tool" type="button" disabled>
            +
          </button>
        </div>
      </div>
      <div className="timeline-ruler" aria-hidden="true">
        <span>00:00</span>
        <span>00:10</span>
        <span>00:20</span>
        <span>00:30</span>
        <span>00:40</span>
        <span>00:50</span>
        <span>01:00</span>
        <span>01:10</span>
      </div>
      <div className="timeline-body">
        <div className="playhead playhead--zero" />
        <div className="timeline-empty">
          <span className="timeline-empty__icon">
            <AppIcon name="timeline" size={25} />
          </span>
          <strong>Belum ada track</strong>
          <span>Impor audio untuk mulai menyusun album.</span>
        </div>
      </div>
    </section>
  );
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<WorkRailTab>("media");

  return (
    <main className="app-shell" data-fixture-version={FIXTURE_VERSION}>
      <header className="top-toolbar">
        <div className="project-identity">
          <span className="app-mark">
            <AppIcon name="album" size={20} />
          </span>
          <div>
            <span className="app-name">Lagu Full Album</span>
            <strong>Proyek Baru</strong>
          </div>
        </div>
        <div className="toolbar-actions" aria-label="Aksi proyek">
          <ActionButton variant="toolbar" label="Impor Audio" icon="upload" />
          <ActionButton
            variant="toolbar"
            label="Auto Susun Album"
            icon="magic"
            disabled
          />
          <ActionButton variant="toolbar" label="Template" icon="template" />
          <span className="toolbar-divider" />
          <ActionButton variant="toolbar" label="Simpan" icon="save" />
          <ActionButton variant="toolbarPrimary" label="Render" icon="render" />
        </div>
      </header>

      <div className="workspace-grid">
        <WorkRail activeTab={activeTab} onTabChange={setActiveTab} />
        <PreviewPanel />
        <GeminiRail />
        <TimelinePanel />

      </div>
    </main>
  );
}
