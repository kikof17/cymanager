import { useMemo, useRef, useState } from "react";
import Card from "../components/common/Card";
import ConfirmDialog from "../components/common/ConfirmDialog";
import PageTitle from "../components/common/PageTitle";
import ClubSettingsForm from "../components/settings/ClubSettingsForm";
import FacilityPanel from "../components/settings/FacilityPanel";
import {
  RELEASE_CHANGELOG,
  RELEASE_HIGHLIGHTS,
  RELEASE_NAME,
  RELEASE_VERSION,
} from "../lib/app/releaseNotes";
import { buildBackupFilename, serializeCymanagerBackup } from "../lib/storage/exportData";
import {
  importCymanagerBackup,
  previewCymanagerBackupImport,
  type ImportBackupPreview,
} from "../lib/storage/importData";
import {
  cleanupStorageDiagnosticIssue,
  getStorageDiagnostics,
  type StorageDiagnosticIssue,
} from "../lib/storage/storageDiagnostics";
import {
  defaultClubSettings,
  loadClubSettings,
  saveClubSettings,
} from "../lib/storage/settingsStorage";
import type { ClubSettings, FacilityKey } from "../types/settings";

function toDateTimeLocalValue(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeForForm(settings: ClubSettings): ClubSettings {
  const next = structuredClone(settings);

  (Object.keys(next.facilities) as FacilityKey[]).forEach((facilityKey) => {
    next.facilities[facilityKey].upgradeStartedAt = toDateTimeLocalValue(
      next.facilities[facilityKey].upgradeStartedAt
    );
  });

  return next;
}

function getInitialSettings(): ClubSettings {
  return normalizeForForm(loadClubSettings());
}

function formatDateTimeLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPreviewActionLabel(action: ImportBackupPreview["sections"][number]["action"]): string {
  if (action === "clear") {
    return "Effacer la section locale";
  }

  if (action === "skip") {
    return "Conserver l'existant";
  }

  return "Restaurer depuis le backup";
}

export default function SettingsPage() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState<ClubSettings>(getInitialSettings);
  const [message, setMessage] = useState("Paramètres chargés.");
  const [diagnosticsRefreshKey, setDiagnosticsRefreshKey] = useState(0);
  const [pendingImportRaw, setPendingImportRaw] = useState<string | null>(null);
  const [pendingImportPreview, setPendingImportPreview] = useState<ImportBackupPreview | null>(null);
  const [pendingCleanupIssue, setPendingCleanupIssue] = useState<StorageDiagnosticIssue | null>(null);
  const diagnostics = useMemo(() => getStorageDiagnostics(), [diagnosticsRefreshKey]);

  function handleChange(next: ClubSettings) {
    setSettings(next);
  }

  function handleSave() {
    saveClubSettings(settings);
    setMessage("Paramètres sauvegardés.");
  }

  function handleReset() {
    const resetSettings = normalizeForForm(defaultClubSettings);
    setSettings(resetSettings);
    saveClubSettings(resetSettings);
    setMessage("Paramètres réinitialisés avec les valeurs par défaut.");
  }

  function handleExportBackup() {
    const content = serializeCymanagerBackup();
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = buildBackupFilename();
    anchor.click();

    URL.revokeObjectURL(url);
    setMessage("Sauvegarde du club exportée.");
  }

  function handleRequestImport() {
    importInputRef.current?.click();
  }

  function refreshDiagnostics() {
    setDiagnosticsRefreshKey((value) => value + 1);
  }

  function clearPendingImport() {
    setPendingImportRaw(null);
    setPendingImportPreview(null);
  }

  function handleImportBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const rawContent = typeof reader.result === "string" ? reader.result : "";
        const preview = previewCymanagerBackupImport(rawContent);
        setPendingImportRaw(rawContent);
        setPendingImportPreview(preview);
        setMessage("Backup analysé. Vérifie le rapport avant application.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Échec de l'import de la sauvegarde.");
      } finally {
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      setMessage("Impossible de lire le fichier sélectionné.");
      event.target.value = "";
    };

    reader.readAsText(file, "utf-8");
  }

  function handleApplyImport() {
    if (!pendingImportRaw) {
      return;
    }

    try {
      const result = importCymanagerBackup(pendingImportRaw);
      clearPendingImport();
      refreshDiagnostics();
      setMessage(
        result.sanitizedKeys.length > 0
          ? `Sauvegarde importée avec normalisation de ${result.sanitizedKeys.length} section(s). Rechargement de l'application...`
          : "Sauvegarde importée. Rechargement de l'application..."
      );
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Échec de l'import de la sauvegarde.");
    }
  }

  function handleRequestCleanup(issue: StorageDiagnosticIssue) {
    setPendingCleanupIssue(issue);
  }

  function handleConfirmCleanup() {
    if (!pendingCleanupIssue) {
      return;
    }

    const result = cleanupStorageDiagnosticIssue(pendingCleanupIssue);
    setPendingCleanupIssue(null);
    refreshDiagnostics();
    setMessage(
      result.removedEntries > 0
        ? `${result.removedEntries} élément(s) nettoyé(s) depuis le diagnostic.${result.refreshedFinance ? " La finance a été resynchronisée." : ""}`
        : "Aucun élément à nettoyer pour cette alerte."
    );
  }

  return (
    <div className="page-stack">
      <PageTitle
        title="Paramètres"
        subtitle="Réglages du club, installations et notes utiles pour la gestion."
      />


      <div className="two-columns">
        <Card title="Réglages du club">
          <div className="page-stack">
            <ClubSettingsForm settings={settings} onChange={handleChange} />

            <div className="inline-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={handleSave}
              >
                Sauvegarder
              </button>

              <button
                type="button"
                className="button button-secondary"
                onClick={handleReset}
              >
                Réinitialiser
              </button>

              <button
                type="button"
                className="button button-secondary"
                onClick={handleExportBackup}
              >
                Exporter le club
              </button>

              <button
                type="button"
                className="button button-secondary"
                onClick={handleRequestImport}
              >
                Importer un backup
              </button>
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportBackup}
              hidden
            />

            <div className="message-box">
              <p className="muted">{message}</p>
            </div>
          </div>
        </Card>

        <FacilityPanel settings={settings} />
      </div>

      <Card title="Version et changelog">
        <div className="page-stack">
          <div className="settings-release-header">
            <div>
              <p className="eyebrow">Release en cours</p>
              <h3 className="settings-release-title">{RELEASE_NAME}</h3>
              <p className="muted">Build applicatif {RELEASE_VERSION}</p>
            </div>
            <span className="status-badge">v{RELEASE_VERSION}</span>
          </div>

          <div className="settings-release-grid">
            <div className="message-box settings-release-box">
              <p className="settings-release-box-title">Points clés</p>
              <ul className="clean-list">
                {RELEASE_HIGHLIGHTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="settings-release-sections">
              {RELEASE_CHANGELOG.map((section) => (
                <div key={section.title} className="settings-release-section">
                  <p className="settings-release-box-title">{section.title}</p>
                  <ul className="clean-list">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {pendingImportPreview ? (
        <Card title="Aperçu avant import du backup">
          <div className="page-stack">
            <div className="settings-diagnostics-grid">
              <div className="finance-prize-preview">
                <span className="muted">Schéma détecté</span>
                <strong>v{pendingImportPreview.schemaVersion}</strong>
                <span className="muted">Format {pendingImportPreview.formatVersion}</span>
              </div>

              <div className="finance-prize-preview">
                <span className="muted">Exporté le</span>
                <strong>{formatDateTimeLabel(pendingImportPreview.exportedAt)}</strong>
                <span className="muted">Application {pendingImportPreview.app}</span>
              </div>

              <div className="finance-prize-preview">
                <span className="muted">Corrections prévues</span>
                <strong>{pendingImportPreview.sanitizedKeys.length}</strong>
                <span className="muted">Sections effacées : {pendingImportPreview.clearedKeys.length}</span>
              </div>
            </div>

            <p className="muted">
              Vérifie les sections ci-dessous avant d'appliquer le backup. Les sections marquées "Normalisé" seront ajustées à la structure attendue avant enregistrement.
            </p>

            <div className="settings-preview-list">
              {pendingImportPreview.sections.map((section) => (
                <div key={section.storageKey} className="settings-preview-item">
                  <div>
                    <strong>{section.label}</strong>
                    <p className="muted">
                      {getPreviewActionLabel(section.action)} • version de section {section.sectionVersion} • {section.originalCount} vers {section.sanitizedCount}
                    </p>
                  </div>
                  <span
                    className={
                      section.sanitized
                        ? "settings-preview-badge settings-preview-badge-warning"
                        : "settings-preview-badge"
                    }
                  >
                    {section.sanitized ? "Normalisé" : "Direct"}
                  </span>
                </div>
              ))}
            </div>

            <div className="inline-actions">
              <button type="button" className="button button-primary" onClick={handleApplyImport}>
                Confirmer et importer
              </button>
              <button type="button" className="button button-secondary" onClick={clearPendingImport}>
                Revenir
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="Santé des données locales">
        <div className="page-stack">
          <div className="settings-diagnostics-grid">
            <div className="finance-prize-preview">
              <span className="muted">Corrections automatiques</span>
              <strong>{diagnostics.invalidRecordCount}</strong>
              <span className="muted">Éléments repris automatiquement à l'ouverture</span>
            </div>

            <div className="finance-prize-preview">
              <span className="muted">Éléments isolés</span>
              <strong>{diagnostics.orphanRecordCount}</strong>
              <span className="muted">Données sans lien valide avec le calendrier courant</span>
            </div>

            <div className="finance-prize-preview">
              <span className="muted">Points à vérifier</span>
              <strong>{diagnostics.issueCount}</strong>
              <span className="muted">Vue rapide de la cohérence de tes sauvegardes locales</span>
            </div>
          </div>

          {diagnostics.issues.length === 0 ? (
            <p className="muted">Aucune anomalie structurelle détectée dans les données locales.</p>
          ) : (
            <div className="dashboard-lines">
              {diagnostics.issues.map((issue) => (
                <div
                  key={issue.code}
                  className={
                    issue.severity === "warning"
                      ? "settings-diagnostic-line settings-diagnostic-line-warning"
                      : "settings-diagnostic-line settings-diagnostic-line-info"
                  }
                >
                  <div className="settings-diagnostic-row">
                    <p>
                      <strong>{issue.label}</strong> {issue.count}
                      {issue.details ? <span> ({issue.details})</span> : null}
                    </p>
                    {issue.cleanupLabel ? (
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => handleRequestCleanup(issue)}
                      >
                        {issue.cleanupLabel}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingCleanupIssue)}
        title="Confirmer le nettoyage"
        message={
          pendingCleanupIssue
            ? `Voulez-vous appliquer cette action de nettoyage sur ${pendingCleanupIssue.count} élément(s) ?`
            : ""
        }
        onConfirm={handleConfirmCleanup}
        onCancel={() => setPendingCleanupIssue(null)}
        confirmLabel="Nettoyer"
        confirmButtonClassName="button button-danger"
      />
    </div>
  );
}