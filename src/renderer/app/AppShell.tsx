import { useState } from "react";
import { useProjectSession } from "../state/project-session/use-project-session";
import { AppIcon } from "../ui/AppIcon";
import { ActionButton, IconButton } from "../ui/controls";
import "./app-shell.css";

type WorkRailTab = "media" | "layer" | "inspector";

const WORK_RAIL_TABS: Array<{ id: WorkRailTab; label: string }> = [
  { id: "media", label: "Media" },
  { id: "layer", label: "Layer" },
  { id: "inspector", label: "Inspector" },
];

const FIXTURE_VERSION = "S10-SLC-010-001-SCR-002A-v1";

function MediaPanel({
  projectSession,
}: {
  projectSession: ReturnType<typeof useProjectSession>;
}) {
  const tracks = projectSession.project.tracks;
  const busy = ["selecting", "discovering", "probing", "committing"].includes(
    projectSession.mediaOperationState,
  );
  const progress = projectSession.mediaProgress;
  const rejected = projectSession.mediaSummary?.rejected ?? 0;

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (busy) return;
    const files = Array.from(event.dataTransfer.files);
    void projectSession.importDroppedAudio(files);
  };

  if (busy) {
    const phaseLabel =
      projectSession.mediaOperationState === "selecting"
        ? "Memilih media…"
        : projectSession.mediaOperationState === "discovering"
          ? "Membaca media…"
          : projectSession.mediaOperationState === "probing"
            ? "Memeriksa audio…"
            : "Menambahkan ke proyek…";

    const processed = progress?.processed ?? 0;
    const discovered = progress?.discovered ?? 0;

    return (
      <div className="work-panel work-panel--media" id="work-panel-media">
        <div
          className="media-progress"
          role="status"
          aria-label="Proses impor media"
          aria-live="polite"
        >
          <span className="media-progress__icon">
            <AppIcon name="music" size={27} />
          </span>
          <strong>{phaseLabel}</strong>
          <p>
            {discovered > 0
              ? `${processed} dari ${discovered} item diproses.`
              : "Menyiapkan daftar media untuk diimpor."}
          </p>
          <div className="media-progress__bar" aria-hidden="true">
            <span
              style={{
                width:
                  discovered > 0
                    ? `${Math.min(100, Math.round((processed / discovered) * 100))}%`
                    : "18%",
              }}
            />
          </div>
          <ActionButton
            variant="secondary"
            label="Batalkan"
            compact
            disabled={projectSession.mediaOperationState === "selecting"}
            onClick={() => void projectSession.cancelMediaImport()}
          />
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div
        className="work-panel work-panel--media"
        id="work-panel-media"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
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
            onClick={() => void projectSession.importAudio()}
          />
          {projectSession.mediaOperationState === "cancelled" ? (
            <span className="media-inline-note">Impor dibatalkan.</span>
          ) : null}
          {projectSession.mediaError ? (
            <span className="media-inline-error" role="alert">
              {projectSession.mediaError.message}
            </span>
          ) : null}
          {rejected > 0 ? (
            <span className="media-inline-error" role="alert">
              {rejected} file tidak dapat digunakan.
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="work-panel work-panel--media media-library"
      id="work-panel-media"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="media-library__header">
        <div>
          <p className="eyebrow">MEDIA AUDIO</p>
          <h2>{tracks.length} track</h2>
        </div>
        <ActionButton
          variant="secondary"
          label="Impor Audio"
          compact
          onClick={() => void projectSession.importAudio()}
        />
      </div>

      {projectSession.mediaError ? (
        <div className="media-library__message media-library__message--error" role="alert">
          {projectSession.mediaError.message}
        </div>
      ) : null}

      {rejected > 0 ? (
        <div className="media-library__message media-library__message--warning" role="status">
          {rejected} file ditolak atau tidak valid.
        </div>
      ) : null}

      <div className="media-list" aria-label="Daftar media audio">
        {tracks.map((track, index) => {
          const asset = projectSession.project.mediaAssets?.find(
            (item) => item.id === track.audioAssetId,
          );
          const needsRelink =
            asset?.availability === "missing" ||
            asset?.availability === "invalid" ||
            asset?.availability === "unsupported";

          return (
            <article
              className={`media-row${needsRelink ? " media-row--attention" : ""}`}
              key={track.id}
            >
              <span className="media-row__index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="media-row__icon">
                <AppIcon name="music" size={16} />
              </span>
              <span className="media-row__copy">
                <strong>{track.title}</strong>
                <small>
                  {asset?.availability === "missing"
                    ? "File tidak ditemukan"
                    : asset?.availability === "invalid"
                      ? "File perlu diperiksa"
                      : asset?.availability === "unsupported"
                        ? "Format tidak didukung"
                        : asset?.metadata?.artist ?? "Audio siap"}
                </small>
              </span>
              {needsRelink && track.audioAssetId ? (
                <ActionButton
                  variant="secondary"
                  label="Relink"
                  compact
                  disabled={projectSession.relinkActionState === "working"}
                  onClick={() =>
                    void projectSession.relinkMediaAsset(track.audioAssetId!)
                  }
                />
              ) : null}
            </article>
          );
        })}
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
  projectSession,
}: {
  activeTab: WorkRailTab;
  onTabChange: (tab: WorkRailTab) => void;
  projectSession: ReturnType<typeof useProjectSession>;
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
        {activeTab === "media" ? (
          <MediaPanel projectSession={projectSession} />
        ) : null}
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

function TimelinePanel({
  projectSession,
}: {
  projectSession: ReturnType<typeof useProjectSession>;
}) {
  const tracks = projectSession.project.tracks;

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
        {tracks.length === 0 ? (
          <div className="timeline-empty">
            <span className="timeline-empty__icon">
              <AppIcon name="timeline" size={25} />
            </span>
            <strong>Belum ada track</strong>
            <span>Impor audio untuk mulai menyusun album.</span>
          </div>
        ) : (
          <div className="timeline-track-strip" aria-label="Track album">
            {tracks.map((track, index) => {
              const asset = projectSession.project.mediaAssets?.find(
                (item) => item.id === track.audioAssetId,
              );
              return (
                <div
                  className={`timeline-track${asset?.availability === "missing" ? " timeline-track--missing" : ""}`}
                  key={track.id}
                >
                  <span>{index + 1}</span>
                  <strong>{track.title}</strong>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectNotice({
  projectSession,
  onOpenMissingMedia,
}: {
  projectSession: ReturnType<typeof useProjectSession>;
  onOpenMissingMedia: () => void;
}) {
  const recovery = projectSession.recoveryState;
  const recoveryBusy = projectSession.recoveryActionState === "working";

  if (recovery.status === "available") {
    return (
      <section
        className="project-notice project-notice--recovery"
        role="status"
        aria-label="Pemulihan proyek tersedia"
      >
        <div className="project-notice__copy">
          <strong>Autosave yang lebih baru ditemukan.</strong>
          <span>
            Revisi {recovery.project.revision} dapat dipulihkan tanpa menimpa
            file proyek utama.
          </span>
        </div>
        <div className="project-notice__actions">
          <ActionButton
            variant="primary"
            label="Pulihkan"
            compact
            disabled={recoveryBusy}
            onClick={() => void projectSession.acceptRecovery()}
          />
          <ActionButton
            variant="secondary"
            label="Abaikan"
            compact
            disabled={recoveryBusy}
            onClick={() => void projectSession.discardRecovery()}
          />
        </div>
      </section>
    );
  }

  if (recovery.status === "stale") {
    return (
      <section
        className="project-notice project-notice--warning"
        role="status"
        aria-label="Autosave lama"
      >
        <div className="project-notice__copy">
          <strong>Autosave lama tidak digunakan.</strong>
          <span>
            Proyek utama lebih baru dan tetap menjadi sumber yang aman.
          </span>
        </div>
        <ActionButton
          variant="secondary"
          label="Hapus Autosave"
          compact
          disabled={recoveryBusy}
          onClick={() => void projectSession.discardRecovery()}
        />
      </section>
    );
  }

  if (recovery.status === "invalid") {
    return (
      <section
        className="project-notice project-notice--error"
        role="alert"
        aria-label="Autosave tidak valid"
      >
        <div className="project-notice__copy">
          <strong>Autosave pemulihan tidak dapat digunakan.</strong>
          <span>File proyek utama tidak diubah dan tetap dipertahankan.</span>
        </div>
        <ActionButton
          variant="secondary"
          label="Hapus Autosave"
          compact
          disabled={recoveryBusy}
          onClick={() => void projectSession.discardRecovery()}
        />
      </section>
    );
  }

  if (projectSession.sourceState === "load-error") {
    return (
      <section
        className="project-notice project-notice--error"
        role="alert"
        aria-label="Gagal membuka proyek"
      >
        <div className="project-notice__copy">
          <strong>Proyek gagal dibuka.</strong>
          <span>
            File yang ada tidak diubah. Anda dapat membuka proyek lain.
          </span>
        </div>
      </section>
    );
  }

  if (projectSession.missingMediaItems.length > 0) {
    const requiredCount = projectSession.missingMediaItems.filter(
      (item) => item.required,
    ).length;
    const optionalCount =
      projectSession.missingMediaItems.length - requiredCount;

    return (
      <section
        className="project-notice project-notice--warning"
        role="status"
        aria-label="Media proyek tidak ditemukan"
      >
        <div className="project-notice__copy">
          <strong>
            {requiredCount > 0
              ? `${requiredCount} media wajib tidak ditemukan.`
              : `${optionalCount} media visual opsional tidak ditemukan.`}
          </strong>
          <span>
            {requiredCount > 0
              ? "Hubungkan kembali audio agar proyek siap dirender."
              : "Proyek tetap dapat digunakan; visual dapat dihubungkan kembali."}
          </span>
        </div>
        <ActionButton
          variant="secondary"
          label="Perbaiki Media"
          compact
          onClick={onOpenMissingMedia}
        />
      </section>
    );
  }

  if (projectSession.persistenceState === "error") {
    return (
      <section
        className="project-notice project-notice--error"
        role="alert"
        aria-label="Gagal menyimpan proyek"
      >
        <div className="project-notice__copy">
          <strong>Proyek gagal disimpan.</strong>
          <span>Periksa lokasi penyimpanan lalu coba simpan kembali.</span>
        </div>
        <ActionButton
          variant="secondary"
          label="Simpan Lagi"
          compact
          onClick={() => void projectSession.save()}
        />
      </section>
    );
  }

  if (projectSession.persistenceState === "cancelled") {
    return (
      <section
        className="project-notice project-notice--neutral"
        role="status"
        aria-label="Penyimpanan dibatalkan"
      >
        <div className="project-notice__copy">
          <strong>Penyimpanan dibatalkan.</strong>
          <span>Perubahan proyek belum disimpan ke file utama.</span>
        </div>
        <ActionButton
          variant="secondary"
          label="Simpan Lagi"
          compact
          onClick={() => void projectSession.save()}
        />
      </section>
    );
  }

  if (projectSession.recoveryErrorCode === "AUTOSAVE_WRITE_FAILED") {
    return (
      <section
        className="project-notice project-notice--error"
        role="alert"
        aria-label="Autosave gagal"
      >
        <div className="project-notice__copy">
          <strong>Autosave pemulihan gagal.</strong>
          <span>Simpan proyek secara manual untuk melindungi perubahan.</span>
        </div>
        <ActionButton
          variant="secondary"
          label="Simpan Sekarang"
          compact
          onClick={() => void projectSession.save()}
        />
      </section>
    );
  }

  return null;
}

function MissingMediaDialog({
  projectSession,
  onClose,
}: {
  projectSession: ReturnType<typeof useProjectSession>;
  onClose: () => void;
}) {
  const busy = projectSession.relinkActionState === "working";
  const ambiguousCount = projectSession.lastRelinkResults.filter(
    (result) => result.status === "ambiguous",
  ).length;
  const noMatchCount = projectSession.lastRelinkResults.filter(
    (result) => result.status === "no-match",
  ).length;
  const relinkedCount = projectSession.lastRelinkResults.filter(
    (result) => result.status === "relinked",
  ).length;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="missing-media-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="missing-media-dialog-title"
      >
        <div className="missing-media-dialog__header">
          <div>
            <p className="eyebrow">DLG-005 • MEDIA PROYEK</p>
            <h2 id="missing-media-dialog-title">Media Tidak Ditemukan</h2>
          </div>
          <button
            className="dialog-close"
            type="button"
            aria-label="Tutup dialog media"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className="missing-media-dialog__intro">
          Hubungkan kembali file yang dipindah. Pilih file satu per satu atau
          cari kandidat yang aman di dalam satu folder.
        </p>

        {projectSession.missingMediaItems.length === 0 ? (
          <div className="relink-complete" role="status">
            <strong>Semua media sudah terhubung.</strong>
            <span>Referensi proyek sudah siap digunakan kembali.</span>
          </div>
        ) : (
          <div className="missing-media-list" aria-label="Daftar media hilang">
            {projectSession.missingMediaItems.map((item) => (
              <article className="missing-media-item" key={item.assetId}>
                <span className="missing-media-item__icon">
                  <AppIcon
                    name={item.kind === "audio" ? "music" : "image"}
                    size={18}
                  />
                </span>
                <span className="missing-media-item__copy">
                  <strong>{item.fileName}</strong>
                  <small>
                    {item.required ? "Wajib • menghambat render" : "Opsional"}
                    {" • "}
                    {item.availability === "missing"
                      ? "tidak ditemukan"
                      : "tidak valid"}
                  </small>
                </span>
                <ActionButton
                  variant="secondary"
                  label="Cari File"
                  compact
                  disabled={busy}
                  onClick={() =>
                    void projectSession.relinkMediaAsset(item.assetId)
                  }
                />
              </article>
            ))}
          </div>
        )}

        {projectSession.lastRelinkResults.length > 0 ? (
          <div
            className={`relink-result${ambiguousCount + noMatchCount > 0 ? " relink-result--warning" : ""}`}
            role="status"
            aria-live="polite"
          >
            {relinkedCount > 0 ? (
              <span>{relinkedCount} media berhasil dihubungkan.</span>
            ) : null}
            {ambiguousCount > 0 ? (
              <span>
                {ambiguousCount} media memiliki beberapa kandidat. Pilih file
                satu per satu.
              </span>
            ) : null}
            {noMatchCount > 0 ? (
              <span>
                {noMatchCount} media belum ditemukan di folder tersebut.
              </span>
            ) : null}
          </div>
        ) : null}

        {projectSession.mediaError ? (
          <div className="relink-result relink-result--error" role="alert">
            {projectSession.mediaError.message}
          </div>
        ) : null}

        <div className="missing-media-dialog__actions">
          <ActionButton
            variant="secondary"
            label="Cari dalam Folder"
            compact
            disabled={busy || projectSession.missingMediaItems.length === 0}
            onClick={() => void projectSession.relinkMissingMediaFolder()}
          />
          <ActionButton
            variant="primary"
            label={projectSession.missingMediaItems.length === 0 ? "Selesai" : "Tutup"}
            disabled={busy}
            onClick={onClose}
          />
        </div>
      </section>
    </div>
  );
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<WorkRailTab>("media");
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const projectSession = useProjectSession();
  const hasNotice =
    projectSession.recoveryState.status !== "none" ||
    projectSession.sourceState === "load-error" ||
    projectSession.persistenceState === "error" ||
    projectSession.persistenceState === "cancelled" ||
    projectSession.recoveryErrorCode === "AUTOSAVE_WRITE_FAILED" ||
    projectSession.missingMediaItems.length > 0;

  return (
    <main
      className={`app-shell${hasNotice ? " app-shell--has-notice" : ""}`}
      data-fixture-version={FIXTURE_VERSION}
      data-project-id={projectSession.project.projectId}
      data-project-name={projectSession.project.name}
      data-project-revision={projectSession.project.revision}
      data-project-source={projectSession.sourceState}
      data-project-location={projectSession.location.kind}
      data-persistence-state={projectSession.persistenceState}
      data-project-dirty={projectSession.dirty ? "true" : "false"}
      data-recovery-state={projectSession.recoveryState.status}
      data-media-state={projectSession.mediaOperationState}
      data-missing-media-count={projectSession.missingMediaItems.length}
      data-media-ready={projectSession.mediaReadiness.ready ? "true" : "false"}
    >
      <header className="top-toolbar">
        <div className="project-identity">
          <span className="app-mark">
            <AppIcon name="album" size={20} />
          </span>
          <div>
            <span className="app-name">Lagu Full Album</span>
            <strong>{projectSession.project.name}</strong>
          </div>
        </div>
        <div className="toolbar-actions" aria-label="Aksi proyek">
          <ActionButton
            variant="toolbar"
            label="Impor Audio"
            icon="upload"
            disabled={["selecting", "discovering", "probing", "committing"].includes(
              projectSession.mediaOperationState,
            )}
            onClick={() => void projectSession.importAudio()}
          />
          <ActionButton
            variant="toolbar"
            label="Auto Susun Album"
            icon="magic"
            disabled
          />
          <ActionButton variant="toolbar" label="Template" icon="template" />
          <span className="toolbar-divider" />
          <ActionButton
            variant="toolbar"
            label="Simpan"
            icon="save"
            data-action="save-project"
            disabled={projectSession.persistenceState === "saving"}
            onClick={() => void projectSession.save()}
          />
          <ActionButton
            variant="toolbarPrimary"
            label="Render"
            icon="render"
            disabled={!projectSession.mediaReadiness.ready}
          />
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {projectSession.persistenceState === "saved"
            ? "Proyek tersimpan."
            : projectSession.persistenceState === "cancelled"
              ? "Penyimpanan dibatalkan."
              : projectSession.persistenceState === "error"
                ? "Proyek gagal disimpan."
                : projectSession.sourceState === "load-error"
                  ? "Proyek gagal dibuka."
                  : ""}
        </span>
      </header>

      <ProjectNotice
        projectSession={projectSession}
        onOpenMissingMedia={() => setMissingDialogOpen(true)}
      />

      <div className="workspace-grid">
        <WorkRail
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectSession={projectSession}
        />
        <PreviewPanel />
        <GeminiRail />
        <TimelinePanel projectSession={projectSession} />
      </div>

      {missingDialogOpen ? (
        <MissingMediaDialog
          projectSession={projectSession}
          onClose={() => setMissingDialogOpen(false)}
        />
      ) : null}
    </main>
  );
}
