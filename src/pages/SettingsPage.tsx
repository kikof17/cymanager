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
import { buildResultReferenceSummary, getAllResultsFromStorage } from "../lib/scoring/extractPoints";
import { appendManagementHistoryEntry } from "../lib/storage/managementHistoryStorage";
import {
  defaultClubSettings,
  loadClubSettings,
  saveClubSettings,
} from "../lib/storage/settingsStorage";
import { loadManualTodos } from "../lib/storage/todoStorage";
import type { ClubSettings, FacilityKey } from "../types/settings";

const FACILITY_LABELS: Record<FacilityKey, string> = {
  headOffice: "Siège social",
  trainingCenter: "Centre d'entraînement",
  formationCenter: "Centre de formation",
  shop: "Boutique",
};

type SettingsTab = "settings" | "version" | "diagnostic";

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

function buildSettingsChangeLog(previousSettings: ClubSettings, nextSettings: ClubSettings): string {
  const changes: string[] = [];

  if (previousSettings.divisionPro !== nextSettings.divisionPro) {
    changes.push(`division Pro ${previousSettings.divisionPro} -> ${nextSettings.divisionPro}`);
  }

  if (previousSettings.divisionU25 !== nextSettings.divisionU25) {
    changes.push(`division U25 ${previousSettings.divisionU25} -> ${nextSettings.divisionU25}`);
  }

  if (previousSettings.divisionU21 !== nextSettings.divisionU21) {
    changes.push(`division U21 ${previousSettings.divisionU21} -> ${nextSettings.divisionU21}`);
  }

  if (previousSettings.clubObjective !== nextSettings.clubObjective) {
    changes.push(`objectif ${previousSettings.clubObjective} -> ${nextSettings.clubObjective}`);
  }

  if (previousSettings.salaryTolerance !== nextSettings.salaryTolerance) {
    changes.push(`tolérance salariale ${previousSettings.salaryTolerance} -> ${nextSettings.salaryTolerance}`);
  }

  if (previousSettings.manualWeeklySalaryExpense !== nextSettings.manualWeeklySalaryExpense) {
    changes.push(
      nextSettings.manualWeeklySalaryExpense === null
        ? "masse salariale manuelle retirée"
        : `masse salariale manuelle fixée à ${nextSettings.manualWeeklySalaryExpense.toLocaleString("fr-FR")} €`
    );
  }

  if (previousSettings.globalNotes.trim() !== nextSettings.globalNotes.trim()) {
    changes.push("notes globales mises à jour");
  }

  (Object.keys(nextSettings.facilities) as FacilityKey[]).forEach((facilityKey) => {
    const previousFacility = previousSettings.facilities[facilityKey];
    const nextFacility = nextSettings.facilities[facilityKey];
    const facilityLabel = FACILITY_LABELS[facilityKey];

    if (previousFacility.level !== nextFacility.level) {
      changes.push(`${facilityLabel} niveau ${previousFacility.level} -> ${nextFacility.level}`);
    }

    if (!previousFacility.upgradeInProgress && nextFacility.upgradeInProgress) {
      changes.push(`${facilityLabel} travaux lancés vers niveau ${nextFacility.targetLevel ?? "?"}`);
    } else if (previousFacility.upgradeInProgress && !nextFacility.upgradeInProgress) {
      changes.push(`${facilityLabel} travaux clôturés`);
    }

    if (!previousFacility.plannedUpgrade && nextFacility.plannedUpgrade) {
      changes.push(`${facilityLabel} planifié vers niveau ${nextFacility.targetLevel ?? "?"}`);
    } else if (previousFacility.plannedUpgrade && !nextFacility.plannedUpgrade) {
      changes.push(`planification retirée pour ${facilityLabel.toLowerCase()}`);
    }
  });

  if (changes.length === 0) {
    return "";
  }

  const visibleChanges = changes.slice(0, 4);

  if (changes.length > visibleChanges.length) {
    visibleChanges.push(`+${changes.length - visibleChanges.length} autre(s) ajustement(s)`);
  }

  return visibleChanges.join(" • ");
}

export default function SettingsPage() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<SettingsTab>("settings");
  const [settings, setSettings] = useState<ClubSettings>(getInitialSettings);
  const [message, setMessage] = useState("Paramètres chargés.");
  const [diagnosticsRefreshKey, setDiagnosticsRefreshKey] = useState(0);
  const [pendingImportRaw, setPendingImportRaw] = useState<string | null>(null);
  const [pendingImportPreview, setPendingImportPreview] = useState<ImportBackupPreview | null>(null);
  const [pendingCleanupIssue, setPendingCleanupIssue] = useState<StorageDiagnosticIssue | null>(null);
  const diagnostics = useMemo(() => getStorageDiagnostics(), [diagnosticsRefreshKey]);
  const resultReferenceSummary = useMemo(
    () => buildResultReferenceSummary(getAllResultsFromStorage(), loadManualTodos().filter((todo) => todo.id.startsWith("calendar-"))),
    [diagnosticsRefreshKey]
  );

  function handleChange(next: ClubSettings) {
    setSettings(next);
  }

  function handleSave() {
    const previousSettings = loadClubSettings();
    const decisionNote = buildSettingsChangeLog(previousSettings, settings);

    saveClubSettings(settings);

    if (decisionNote) {
      appendManagementHistoryEntry({
        area: "settings",
        kind: "settings-update",
        title: "Réglages club mis à jour",
        note: decisionNote,
      });
    }

    setMessage("Paramètres sauvegardés.");
  }

  function handleReset() {
    const resetSettings = normalizeForForm(defaultClubSettings);
    setSettings(resetSettings);
    saveClubSettings(resetSettings);
    appendManagementHistoryEntry({
      area: "settings",
      kind: "settings-reset",
      title: "Paramètres réinitialisés",
      note: "Retour aux réglages par défaut du club et des installations.",
    });
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
    appendManagementHistoryEntry({
      area: "system",
      kind: "backup-export",
      title: "Backup exporté",
      note: "Export complet du club au format Cymanager.",
    });
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
      appendManagementHistoryEntry({
        area: "system",
        kind: "backup-import",
        title: "Backup importé",
        note: `${result.restoredKeys.length} section(s) restaurée(s), ${result.sanitizedKeys.length} normalisée(s), ${result.clearedKeys.length} effacée(s).`,
      });
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

    if (result.removedEntries > 0) {
      appendManagementHistoryEntry({
        area: "system",
        kind: "data-cleanup",
        title: "Nettoyage de données appliqué",
        note: `${pendingCleanupIssue.label} : ${result.removedEntries} élément(s) nettoyé(s).${result.refreshedFinance ? " Finance resynchronisée." : ""}`,
      });
    }

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

      <section className="finance-board" aria-label="Tableau de bord paramètres">
        <div className="finance-board-header">
          <span className="finance-board-title">Club</span>
        </div>
        <div className="finance-board-grid">
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Division</span>
            <span className="finance-board-value">Pro {settings.divisionPro}</span>
            <span className="finance-board-sub">U25 {settings.divisionU25} · U21 {settings.divisionU21}</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Objectif</span>
            <span className="finance-board-value">Pro {settings.targetDivisionPro}</span>
            <span className="finance-board-sub">U25 {settings.targetDivisionU25} · U21 {settings.targetDivisionU21}</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Stratégie</span>
            <span className="finance-board-value">{settings.clubObjective ?? "–"}</span>
          </div>
          <div className={`finance-board-item ${diagnostics.issueCount > 0 ? "finance-board-item--warning" : "finance-board-item--success"}`}>
            <span className="finance-board-label">Problèmes stockage</span>
            <span className="finance-board-value">{diagnostics.issueCount}</span>
            {diagnostics.invalidRecordCount > 0 && <span className="finance-board-sub">{diagnostics.invalidRecordCount} invalide{diagnostics.invalidRecordCount > 1 ? "s" : ""}</span>}
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Référ. cassées</span>
            <span className="finance-board-value">{resultReferenceSummary.missingRaceReferenceCount + resultReferenceSummary.mismatchedRaceReferenceCount}</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Version</span>
            <span className="finance-board-value">{RELEASE_VERSION}</span>
          </div>
        </div>
      </section>

      <div className="stats-tabs">
        <button
          type="button"
          className={tab === "settings" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("settings")}
        >
          Réglages
        </button>
        <button
          type="button"
          className={tab === "version" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("version")}
        >
          Version
        </button>
        <button
          type="button"
          className={tab === "diagnostic" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("diagnostic")}
        >
          Diagnostic
        </button>
      </div>

      {tab === "settings" && (
        <div className="page-stack">
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
        </div>
      )}

      {tab === "version" && (
        <div className="page-stack">
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
        </div>
      )}

      {tab === "diagnostic" && (
        <div className="page-stack">
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

            <div className="finance-prize-preview">
              <span className="muted">Références résultats valides</span>
              <strong>{resultReferenceSummary.validCount}</strong>
              <span className="muted">{resultReferenceSummary.missingRaceReferenceCount + resultReferenceSummary.mismatchedRaceReferenceCount + resultReferenceSummary.orphanCount} anomalie(s) métier</span>
            </div>
          </div>

          {resultReferenceSummary.totalResults > 0 ? (
            <div className="message-box">
              <p>
                <strong>Lecture 1.6.0 des résultats :</strong> {resultReferenceSummary.validCount} référence(s) validée(s), {resultReferenceSummary.missingRaceReferenceCount} manquante(s), {resultReferenceSummary.mismatchedRaceReferenceCount} incohérente(s), {resultReferenceSummary.orphanCount} orpheline(s).
              </p>
            </div>
          ) : null}

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
        </div>
      )}

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