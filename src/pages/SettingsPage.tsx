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

      {/* Bloc graphique infos équipe/manager */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        marginBottom: 32,
        justifyContent: 'center',
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #f7f7fa 60%, #e3e6f3 100%)',
          borderRadius: 16,
          boxShadow: '0 2px 12px #0001',
          padding: '28px 36px',
          minWidth: 340,
          maxWidth: 480,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          color: '#222',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#2d2d4d', marginBottom: 6 }}>Manager <span style={{ color: '#4b5fc0' }}>Kritoff</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 15 }}>
            <div><b>Pays</b> : France</div>
            <div><b>Id équipe</b> : 55893</div>
          </div>
          <div style={{ fontSize: 15 }}>
            <b>Gère son équipe depuis</b> : 15/04/2026 (Saison 97)
          </div>
          <div style={{ fontSize: 15 }}>
            <b>Dernière apparition</b> : 17/04/2026 à 14h47
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 15 }}>
            <div><b>Championnat Pro</b> : D9D / 14<sup>ème</sup></div>
            <div><b>U25</b> : D5 / 16<sup>ème</sup></div>
            <div><b>U21</b> : D6 / 18<sup>ème</sup></div>
          </div>
          <div style={{ fontSize: 15 }}>
            <b>Nombre de victoire</b> : 0 victoire cette saison
          </div>
          <div style={{ fontSize: 15 }}>
            <b>Installations</b> : SS 1 - Bt 1 - CdE 0 - CdF 0
          </div>
        </div>
      </div>

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