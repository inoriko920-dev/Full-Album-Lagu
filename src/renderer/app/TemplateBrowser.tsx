import { useEffect, useMemo, useRef, useState } from "react";
import type { TemplateCatalogEntry } from "../../core/application/ports/template-store";
import { buildStaticScenePreview } from "../../core/domain/static-scene-preview";
import {
  templateCategorySchema,
  type TemplateCategory,
  type TemplateDocument,
} from "../../core/domain/template-document";
import type { ProjectDocument } from "../../core/domain/project-document";
import type { VisualLayer } from "../../core/domain/visual-scene-schema";
import type { ProjectSessionView } from "../state/project-session/use-project-session";
import { StaticScenePreview } from "../visual/StaticScenePreview";
import { ActionButton } from "../ui/controls";
import "./template-browser.css";

type Filter = TemplateCategory | "Semua";

export interface TemplateBrowserProps {
  session: ProjectSessionView;
  selectedTrackId: string | null;
  onClose: () => void;
  onTrialStart: () => void;
}

function makeTemplateId(name: string): string {
  const prefix =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "template";
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${suffix}`;
}

export function TemplateBrowser({
  session,
  selectedTrackId,
  onClose,
  onTrialStart,
}: TemplateBrowserProps) {
  const [entries, setEntries] = useState<TemplateCatalogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateDocument | null>(null);
  const [filter, setFilter] = useState<Filter>("Semua");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState<TemplateCategory>("Minimal");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const [saveScope, setSaveScope] = useState<VisualLayer["kind"][]>([
    "background", "artwork", "text", "spectrum", "progress",
  ]);
  const scopeGroups: { label: string; kinds: VisualLayer["kind"][]; detail: string }[] = [
    { label: "Layer visual", kinds: ["background", "artwork"], detail: "Latar dan artwork" },
    { label: "Teks dan judul", kinds: ["text"], detail: "Gaya teks dan posisi" },
    { label: "Spectrum", kinds: ["spectrum"], detail: "Konfigurasi visual statis" },
    { label: "Progress Bar", kinds: ["progress"], detail: "Konfigurasi bar statis" },
  ];
  function toggleScope(kinds: VisualLayer["kind"][], enabled: boolean) {
    setSaveScope((prior) =>
      enabled
        ? Array.from(new Set([...prior, ...kinds]))
        : prior.filter((kind) => !kinds.includes(kind)),
    );
  }

  const reloadCatalog = async () => {
    if (!window.lfa.listTemplates) {
      setCatalogError("Layanan template lokal tidak tersedia.");
      return;
    }
    const result = await window.lfa.listTemplates();
    if (result.status === "error") {
      setCatalogError(result.message);
      return;
    }
    setCatalogError(null);
    setEntries(result.entries);
    setSelectedId((prior) =>
      prior !== null &&
      result.entries.some((entry) => entry.templateId === prior)
        ? prior
        : ((
            result.entries.find(
              (entry) => entry.templateId === "minimal-biru",
            ) ?? result.entries[0]
          )?.templateId ?? null),
    );
  };

  useEffect(() => {
    let mounted = true;
    const listing = window.lfa.listTemplates
      ? window.lfa.listTemplates()
      : Promise.resolve({
          status: "error" as const,
          code: "TEMPLATE_READ_FAILED",
          message: "Layanan template lokal tidak tersedia.",
        });
    void listing
      .then((result) => {
        if (!mounted) return;
        if (result.status === "error") {
          setCatalogError(result.message);
          return;
        }
        setEntries(result.entries);
        setSelectedId(
          (
            result.entries.find(
              (entry) => entry.templateId === "minimal-biru",
            ) ?? result.entries[0]
          )?.templateId ?? null,
        );
        setCatalogError(null);
      })
      .catch(() => {
        if (mounted) setCatalogError("Gagal membaca katalog template lokal.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const version = ++requestVersion.current;
    if (selectedId === null || !window.lfa.loadTemplate) return;
    void window.lfa
      .loadTemplate(selectedId)
      .then((result) => {
        if (requestVersion.current !== version) return;
        if (result.status === "error") {
          setCatalogError(result.message);
        } else {
          setCatalogError(null);
          setSelectedTemplate(result.template);
        }
      })
      .catch(() => {
        if (requestVersion.current === version)
          setCatalogError("Template tidak dapat dimuat.");
      });
    return () => {
      requestVersion.current += 1;
    };
  }, [selectedId]);

  const filtered = useMemo(
    () =>
      entries.filter(
        (entry) =>
          (filter === "Semua" || entry.category === filter) &&
          entry.name
            .toLocaleLowerCase("id")
            .includes(search.trim().toLocaleLowerCase("id")),
      ),
    [entries, filter, search],
  );
  const inTrial = session.templateTrialProject !== null;
  const previewSource: ProjectDocument =
    session.templateTrialProject ??
    (selectedTemplate
      ? { ...session.project, visualScene: selectedTemplate.scene }
      : session.project);
  const preview = buildStaticScenePreview(
    previewSource,
    selectedTrackId === null ? {} : { selectedTrackId },
  );
  const categories: Filter[] = ["Semua", ...templateCategorySchema.options];

  function closeBrowser() {
    if (busy) return;
    session.revertTemplateTrial();
    onClose();
  }

  function tryTemplate() {
    if (selectedTemplate === null || busy) return;
    if (session.beginTemplateTrial(selectedTemplate)) onTrialStart();
  }

  function revert() {
    session.revertTemplateTrial();
  }

  function apply() {
    if (busy || !inTrial) return;
    if (session.applyTemplateTrial()) {
      setSavedMessage("Template diterapkan. Undo tersedia di editor.");
      onClose();
    }
  }

  async function saveUserTemplate() {
    const name = saveName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const ok = await session.saveVisualTemplate({
        templateId: makeTemplateId(name),
        name,
        category: saveCategory,
      }, saveScope);
      if (ok) {
        setShowSaveDialog(false);
        setSaveName("");
        setSavedMessage("Template tersimpan secara lokal.");
        await reloadCatalog();
      }
    } catch {
      setCatalogError("Gagal menyimpan template lokal.");
    } finally {
      setBusy(false);
    }
  }

  if (inTrial && !showSaveDialog) {
    return (
      <section className="template-trial-overlay" aria-label="Mode Coba Template">
        <div className="template-trial-overlay__banner" role="status">
          <div>
            <strong>Mode Coba — perubahan belum disimpan ke proyek.</strong>
            <small>Hanya visual berubah. Track, durasi album, dan audio tetap.</small>
          </div>
          <div className="template-trial-overlay__controls">
            <ActionButton variant="secondary" label="Kembali ke Sebelumnya" onClick={revert} disabled={busy} />
            <ActionButton variant="primary" label="Terapkan Template" onClick={apply} disabled={busy} />
          </div>
        </div>
        <aside className="template-trial-overlay__gallery" aria-label="Pilihan Template Mode Coba">
          <strong>Template Album</strong>
          <small>{selectedTemplate?.name ?? session.templateTrialName}</small>
          <div className="template-trial-overlay__gallery-grid">
            {entries.slice(0, 6).map((entry) => (
              <div key={entry.templateId} className="template-trial-overlay__gallery-card"
                data-category={entry.category} aria-current={selectedId === entry.templateId ? "true" : undefined}>
                <div className="template-trial-overlay__gallery-thumb" aria-hidden="true">♫</div>
                <small>{entry.name}</small>
              </div>
            ))}
          </div>
          <p>Pratinjau sementara. Gunakan Terapkan Template untuk menyimpan perubahan visual.</p>
          {session.templateError ? <p role="alert">{session.templateError}</p> : null}
        </aside>
      </section>
    );
  }

  return (
    <section className={`template-browser${showSaveDialog ? " template-browser--save-dialog" : ""}`} aria-label="Browser Template">
      <div className="template-browser__window">
        <header className="template-browser__header">
          <div>
            <p className="eyebrow">KOLEKSI VISUAL LOKAL</p>
            <h2>Template</h2>
          </div>
          <ActionButton
            variant="secondary"
            label="Kembali ke Editor"
            onClick={closeBrowser}
            disabled={busy}
          />
        </header>
        <div className="template-browser__body">
          <nav className="template-browser__category-rail" aria-label="Navigasi Kategori Template">
            <strong>Kategori</strong>
            {categories.map((category) => (
              <button key={category} type="button" className={filter === category ? "is-active" : ""}
                aria-pressed={filter === category} onClick={() => setFilter(category)}>
                {category}
              </button>
            ))}
          </nav>
          <aside
            className="template-browser__catalog"
            aria-label="Katalog Template"
          >
            <div className="template-browser__filters">
              <label>
                <span>Cari Template</span>
                <input
                  type="search"
                  aria-label="Cari Template"
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="Cari template lokal..."
                />
              </label>
              <label>
                <span>Kategori</span>
                <select
                  aria-label="Kategori Template"
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.currentTarget.value as Filter)
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div
              className="template-browser__grid"
              aria-label="Daftar Template"
            >
              {filtered.map((entry) => (
                <button
                  className={`template-browser__item${selectedId === entry.templateId ? " is-selected" : ""}`}
                  key={entry.templateId}
                  data-category={entry.category}
                  type="button"
                  aria-pressed={selectedId === entry.templateId}
                  onClick={() => {
                    if (!busy) {
                      session.revertTemplateTrial();
                      setSavedMessage(null);
                      setSelectedTemplate(null);
                      setSelectedId(entry.templateId);
                    }
                  }}
                >
                  <span
                    className="template-browser__thumbnail"
                    aria-hidden="true"
                  >
                    <span className="template-browser__thumbnail-art">♫</span>
                    <span className="template-browser__thumbnail-line" />
                  </span>
                  <strong>{entry.name}</strong>
                  <small>
                    {entry.category} ·{" "}
                    {entry.origin === "built-in" ? "Bawaan" : "Milik Saya"}
                  </small>
                </button>
              ))}
              {filtered.length === 0 ? <p>Template tidak ditemukan.</p> : null}
            </div>
          </aside>
          <div
            className="template-browser__detail"
            aria-label="Detail Template"
          >
            <div className="template-browser__preview">
              <StaticScenePreview model={preview} />
            </div>
            <div className="template-browser__details">
              <div>
                <h3>{selectedTemplate?.name ?? "Pilih template"}</h3>
                <p>{selectedTemplate?.category ?? "Kategori template"}</p>
              </div>
              <p>Urutan track dan durasi tidak berubah.</p>
              <p>
                Template hanya mengubah lapisan visual. Audio, metadata, dan
                artwork sumber tetap aman.
              </p>
              {inTrial ? (
                <p role="status" className="template-browser__trial-banner">
                  Mode Coba — perubahan belum disimpan ke proyek.
                </p>
              ) : null}
              {savedMessage ? <p role="status">{savedMessage}</p> : null}
              {session.templateError || catalogError ? (
                <p role="alert" className="template-browser__error">
                  {session.templateError ?? catalogError}
                </p>
              ) : null}
              <div className="template-browser__actions">
                {inTrial ? (
                  <>
                    <ActionButton
                      variant="secondary"
                      label="Kembali ke Sebelumnya"
                      onClick={revert}
                      disabled={busy}
                    />
                    <ActionButton
                      variant="primary"
                      label="Terapkan Template"
                      onClick={apply}
                      disabled={busy}
                    />
                  </>
                ) : (
                  <ActionButton
                    variant="primary"
                    label="Coba Template"
                    onClick={tryTemplate}
                    disabled={selectedTemplate === null || busy}
                  />
                )}
                <ActionButton
                  variant="secondary"
                  label="Simpan Template"
                  disabled={busy || inTrial}
                  onClick={() => {
                    setSaveName("");
                    setSaveScope(["background", "artwork", "text", "spectrum", "progress"]);
                    setSavedMessage(null);
                    setShowSaveDialog(true);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {showSaveDialog ? (
        <div className="template-browser__dialog-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Simpan sebagai Template"
            className="template-browser__save-dialog"
          >
            <header>
              <h3>Simpan sebagai Template</h3>
            </header>
            <p>
              Simpan hanya pengaturan visual: layer, teks, warna, dan tata
              letak. Urutan track, durasi album, file audio, artwork sumber, dan
              kredensial AI tidak ikut disimpan.
            </p>
            <div
              className="template-browser__save-thumbnail"
              aria-label="Pratinjau Template Disimpan"
            >
              <StaticScenePreview
                model={buildStaticScenePreview(
                  session.project,
                  selectedTrackId === null ? {} : { selectedTrackId },
                )}
              />
            </div>
            <fieldset className="template-browser__save-scope">
              <legend>Komponen visual yang disimpan</legend>
              {scopeGroups.map(({ label, kinds, detail }) => (
                <label key={label} className="template-browser__save-scope-item">
                  <input type="checkbox" aria-label={label}
                    checked={kinds.every((kind) => saveScope.includes(kind))}
                    onChange={(event) => toggleScope(kinds, event.currentTarget.checked)} />
                  <span><strong>{label}</strong><small>{detail}</small></span>
                </label>
              ))}
              <small>Audio, urutan, durasi, dan kredensial tidak pernah ikut disimpan.</small>
            </fieldset>
            <label>
              Nama Template
              <input
                aria-label="Nama Template"
                value={saveName}
                maxLength={120}
                autoFocus
                onChange={(event) => setSaveName(event.currentTarget.value)}
              />
            </label>
            <label>
              Kategori
              <select
                aria-label="Kategori Simpan"
                value={saveCategory}
                onChange={(event) =>
                  setSaveCategory(event.currentTarget.value as TemplateCategory)
                }
              >
                {templateCategorySchema.options.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            {session.templateError ? (
              <p role="alert" className="template-browser__error">
                {session.templateError}
              </p>
            ) : null}
            <div className="template-browser__actions">
              <ActionButton
                variant="secondary"
                label="Batal"
                disabled={busy}
                onClick={() => setShowSaveDialog(false)}
              />
              <ActionButton
                variant="primary"
                label="Simpan Template"
                disabled={busy || !saveName.trim() || saveScope.length === 0}
                onClick={() => void saveUserTemplate()}
              />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
