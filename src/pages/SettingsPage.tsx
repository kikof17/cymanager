import { useEffect, useState } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import ClubSettingsForm from "../components/settings/ClubSettingsForm";
import FacilityPanel from "../components/settings/FacilityPanel";
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClubSettings>(defaultClubSettings);
  const [message, setMessage] = useState("Paramètres chargés.");

  useEffect(() => {
    const loaded = loadClubSettings();
    setSettings(normalizeForForm(loaded));
  }, []);

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
            </div>

            <div className="message-box">
              <p className="muted">{message}</p>
            </div>
          </div>
        </Card>

        <FacilityPanel settings={settings} />
      </div>
    </div>
  );
}