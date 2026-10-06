import { useState } from "react";
import "./app-shell.css";

type WorkRailTab = "media" | "layer" | "inspector";

const WORK_RAIL_TABS: Array<{ id: WorkRailTab; label: string }> = [
  { id: "media", label: "Media" },
  { id: "layer", label: "Layer" },
  { id: "inspector", label: "Inspector" },
];

const FIXTURE_VERSION = "S09-T01-SCR-002A-v1";

function AppIcon({
  name,
  size = 18,
}: {
  name:
    | "album"
    | "upload"
    | "magic"
    | "template"
    | "save"
    | "render"
    | "music"
    | "image"
    | "layers"
    | "sliders"
    | "play"
    | "previous"
    | "next"
    | "volume"
    | "gemini"
    | "key"
    | "settings"
    | "send"
    | "timeline";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "album":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="3" />
          <path d="M8 8h8M8 12h6" />
          <circle cx="15.5" cy="16.5" r="1.5" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M12 16V5" />
          <path d="m8 9 4-4 4 4" />
          <path d="M5 15v4h14v-4" />
        </svg>
      );
    case "magic":
      return (
        <svg {...common}>
          <path d="m4 20 11-11" />
          <path d="m13 5 2-2 6 6-2 2" />
          <path d="M5 4v3M3.5 5.5h3M17 16v4M15 18h4" />
        </svg>
      );
    case "template":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M9 9v11" />
        </svg>
      );
    case "save":
      return (
        <svg {...common}>
          <path d="M5 3h12l2 2v16H5z" />
          <path d="M8 3v6h8V3M8 21v-7h8v7" />
        </svg>
      );
    case "render":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m8 11 4 4 4-4" />
          <path d="M5 19h14" />
        </svg>
      );
    case "music":
      return (
        <svg {...common}>
          <path d="M9 18V6l10-2v12" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m5 18 5-5 3 3 2-2 4 4" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5z" />
          <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
        </svg>
      );
    case "sliders":
      return (
        <svg {...common}>
          <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="14" cy="18" r="2" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <path d="m9 7 8 5-8 5z" />
        </svg>
      );
    case "previous":
      return (
        <svg {...common}>
          <path d="M7 6v12M18 7l-8 5 8 5z" />
        </svg>
      );
    case "next":
      return (
        <svg {...common}>
          <path d="M17 6v12M6 7l8 5-8 5z" />
        </svg>
      );
    case "volume":
      return (
        <svg {...common}>
          <path d="M5 10v4h4l5 4V6L9 10z" />
          <path d="M17 9c1.2 1.5 1.2 4.5 0 6" />
        </svg>
      );
    case "gemini":
      return (
        <svg {...common}>
          <path d="M12 2c.8 5.3 4.1 8.6 9 10-4.9 1.4-8.2 4.7-9 10-.8-5.3-4.1-8.6-9-10 4.9-1.4 8.2-4.7 9-10Z" />
        </svg>
      );
    case "key":
      return (
        <svg {...common}>
          <circle cx="8" cy="12" r="4" />
          <path d="M12 12h9M18 12v3M15 12v2" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3h5l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" />
        </svg>
      );
    case "send":
      return (
        <svg {...common}>
          <path d="m4 4 17 8-17 8 3-8z" />
          <path d="M7 12h14" />
        </svg>
      );
    case "timeline":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
          <path d="M8 5v4M15 10v4M11 15v4" />
        </svg>
      );
  }
}

function ToolbarButton({
  label,
  icon,
  primary = false,
  disabled = false,
}: {
  label: string;
  icon: Parameters<typeof AppIcon>[0]["name"];
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`toolbar-button${primary ? " toolbar-button--primary" : ""}`}
      type="button"
      disabled={disabled}
    >
      <AppIcon name={icon} size={16} />
      <span>{label}</span>
    </button>
  );
}

function MediaPanel() {
  return (
    <div className="work-panel work-panel--empty" id="work-panel-media">
      <div className="work-panel__header">
        <div>
          <p className="eyebrow">SUMBER PROYEK</p>
          <h2>Media</h2>
        </div>
      </div>
      <button className="primary-action primary-action--wide" type="button">
        <AppIcon name="upload" size={17} />
        Impor Audio
      </button>
      <div className="empty-card">
        <span className="empty-card__icon">
          <AppIcon name="music" size={28} />
        </span>
        <strong>Belum ada media</strong>
        <p>Impor lagu untuk mulai menyusun album.</p>
      </div>
      <div className="media-types" aria-label="Jenis media yang tersedia">
        <span>
          <AppIcon name="music" size={15} />
          Audio
        </span>
        <span>
          <AppIcon name="image" size={15} />
          Gambar
        </span>
        <span>
          <AppIcon name="template" size={15} />
          Template
        </span>
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
      <div className="section-heading">
        <div>
          <p className="eyebrow">PREVIEW</p>
          <h2>Komposisi</h2>
        </div>
        <span className="aspect-chip">16:9</span>
      </div>
      <div className="preview-stage">
        <div className="preview-frame">
          <div className="preview-placeholder">
            <span className="preview-placeholder__icon">
              <AppIcon name="image" size={34} />
            </span>
            <strong>Belum ada visual</strong>
            <span>Impor audio atau pilih template untuk memulai.</span>
          </div>
        </div>
      </div>
      <div className="transport-bar" aria-label="Kontrol playback">
        <div className="transport-controls">
          <button
            type="button"
            className="icon-button"
            disabled
            aria-label="Track sebelumnya"
          >
            <AppIcon name="previous" size={17} />
          </button>
          <button
            type="button"
            className="icon-button icon-button--play"
            disabled
            aria-label="Putar"
          >
            <AppIcon name="play" size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled
            aria-label="Track berikutnya"
          >
            <AppIcon name="next" size={17} />
          </button>
        </div>
        <span className="timecode">00:00:00 / 00:00:00</span>
        <div className="transport-tail">
          <button
            type="button"
            className="icon-button"
            disabled
            aria-label="Volume"
          >
            <AppIcon name="volume" size={17} />
          </button>
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
        <button
          className="icon-button icon-button--plain"
          type="button"
          aria-label="Pengaturan Gemini"
        >
          <AppIcon name="settings" size={17} />
        </button>
      </div>
      <div className="gemini-status-row">
        <div className="gemini-status">
          <span className="status-dot status-dot--muted" />
          <span>Gemini • Belum dikonfigurasi • 0/100 key</span>
        </div>
        <button
          className="secondary-action secondary-action--compact"
          type="button"
        >
          Kelola API
        </button>
      </div>
      <div className="gemini-context">
        <span>Konteks</span>
        <strong>Proyek Baru</strong>
      </div>
      <div className="gemini-empty">
        <span className="gemini-empty__icon">
          <AppIcon name="key" size={26} />
        </span>
        <h3>Hubungkan Gemini saat diperlukan</h3>
        <p>
          Editor manual tetap dapat digunakan tanpa Gemini. Tambahkan API key
          untuk mengaktifkan bantuan berbasis perintah.
        </p>
        <button className="primary-action primary-action--wide" type="button">
          <AppIcon name="key" size={17} />
          Tambahkan API Key
        </button>
        <div className="gemini-note">
          <strong>Privasi</strong>
          <span>
            API key disimpan aman di perangkat dan tidak masuk ke file proyek.
          </span>
        </div>
      </div>
      <div className="gemini-composer" aria-label="Composer Gemini tidak aktif">
        <div className="gemini-input" aria-disabled="true">
          <span>Minta Gemini mengedit proyek…</span>
          <button
            type="button"
            className="send-button"
            disabled
            aria-label="Kirim perintah"
          >
            <AppIcon name="send" size={16} />
          </button>
        </div>
        <span className="composer-hint">
          Tambahkan API key untuk mengaktifkan Gemini Agent.
        </span>
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
      </div>
      <div className="timeline-body">
        <div className="timeline-lane-label">
          <span className="lane-index">01</span>
          <div>
            <strong>Track 01</strong>
            <span>Belum ada audio</span>
          </div>
        </div>
        <div className="timeline-empty">
          <div className="playhead playhead--zero" />
          <span className="timeline-empty__line" />
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
          <ToolbarButton label="Impor Audio" icon="upload" />
          <ToolbarButton label="Auto Susun Album" icon="magic" disabled />
          <ToolbarButton label="Template" icon="template" />
          <span className="toolbar-divider" />
          <ToolbarButton label="Simpan" icon="save" />
          <ToolbarButton label="Render" icon="render" primary />
        </div>
      </header>

      <div className="workspace-grid">
        <WorkRail activeTab={activeTab} onTabChange={setActiveTab} />
        <PreviewPanel />
        <GeminiRail />
        <TimelinePanel />
        <footer className="status-bar">
          <div className="status-bar__left">
            <span className="status-pill">
              <span className="status-dot status-dot--neutral" />
              Proyek Baru
            </span>
            <span>Belum disimpan</span>
          </div>
          <div className="status-bar__right">
            <span>0 track</span>
            <span>00:00</span>
            <span>Preview 16:9</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
