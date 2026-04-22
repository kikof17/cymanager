import { useMemo, useState } from "react";
import { defaultTeamProfile, normalizeTeamProfile, saveTeamProfile } from "../lib/storage/teamProfileStorage";
import type { TeamProfile } from "../types/teamProfile";

type FirstRunSetupPageProps = {
  onComplete: () => void;
};

function toDateInputValue(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default function FirstRunSetupPage({ onComplete }: FirstRunSetupPageProps) {
  const [profile, setProfile] = useState<TeamProfile>(() =>
    normalizeTeamProfile({
      ...defaultTeamProfile,
      managerName: "",
      activeSeasonLabel: "Saison 1",
    })
  );
  const [error, setError] = useState("");

  const startedAtDate = useMemo(() => toDateInputValue(profile.startedAt), [profile.startedAt]);

  function update<K extends keyof TeamProfile>(key: K, value: TeamProfile[K]) {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile.teamName.trim()) {
      setError("Le nom d'équipe est obligatoire.");
      return;
    }

    if (!profile.managerName.trim()) {
      setError("Le nom du manager est obligatoire.");
      return;
    }

    const nextProfile = normalizeTeamProfile({
      ...profile,
      onboardingCompleted: true,
    });

    saveTeamProfile(nextProfile);
    onComplete();
  }

  return (
    <main className="first-run-shell">
      <section className="first-run-card">
        <p className="eyebrow">Configuration initiale</p>
        <h1>Bienvenue dans CyManager Desktop</h1>
        <p className="muted">
          Premier lancement detecte. Renseigne ton profil manager pour initialiser le club.
          Cette etape suit les reperes de la FAQ et du guide debutant: identification de l'equipe,
          divisions et priorites de pilotage.
        </p>

        <div className="message-box">
          <p className="muted">
            Rappel pratique (FAQ + guide): le nom d'equipe et l'ID servent de reference dans les resultats,
            les points et les primes. Tu pourras ensuite ajuster les divisions et les installations dans Parametres.
          </p>
        </div>

        <form className="page-stack" onSubmit={handleSubmit}>
          <div className="settings-grid settings-grid-balanced">
            <div>
              <label className="field-label" htmlFor="setup-team-name">Nom d'equipe *</label>
              <input
                id="setup-team-name"
                className="input"
                value={profile.teamName}
                onChange={(event) => update("teamName", event.target.value)}
                placeholder="Ex: Kritoff Team"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="setup-team-id">ID equipe</label>
              <input
                id="setup-team-id"
                className="input"
                value={profile.teamId}
                onChange={(event) => update("teamId", event.target.value)}
                placeholder="Ex: 55893"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="setup-manager-name">Nom du manager *</label>
              <input
                id="setup-manager-name"
                className="input"
                value={profile.managerName}
                onChange={(event) => update("managerName", event.target.value)}
                placeholder="Ex: Christophe"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="setup-country">Pays</label>
              <input
                id="setup-country"
                className="input"
                value={profile.country}
                onChange={(event) => update("country", event.target.value)}
                placeholder="Ex: France"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="setup-season">Saison active</label>
              <input
                id="setup-season"
                className="input"
                value={profile.activeSeasonLabel}
                onChange={(event) => update("activeSeasonLabel", event.target.value)}
                placeholder="Ex: Saison 97"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="setup-started-at">Debut de suivi</label>
              <input
                id="setup-started-at"
                className="input"
                type="date"
                value={startedAtDate}
                onChange={(event) => update("startedAt", new Date(event.target.value || Date.now()).toISOString())}
              />
            </div>
          </div>

          {error ? (
            <div className="message-box">
              <p className="settings-diagnostic-line settings-diagnostic-line-warning">{error}</p>
            </div>
          ) : null}

          <div className="inline-actions">
            <button type="submit" className="button button-primary">
              Initialiser mon club
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
