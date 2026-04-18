import { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import RiderCard from "../components/roster/RiderCard";
import RiderTable from "../components/roster/RiderTable";
import RosterImportBox from "../components/roster/RosterImportBox";
import RosterStats from "../components/roster/RosterStats";
import type { Rider } from "../types/rider";
import { loadRidersFromStorage, saveRidersToStorage } from "../lib/storage/localStorage";
import { mergeRidersByName, parseRosterText } from "../lib/parser/rosterParser";
import { initialRiders } from "../store/initialState";
import { buildRiderProfiles } from "../lib/scoring/riderProfile";

function getInitialRiders(): Rider[] {
  const storedRiders = loadRidersFromStorage();

  return storedRiders.length > 0 ? storedRiders : initialRiders;
}

export default function RosterPage() {
  const [riders, setRiders] = useState<Rider[]>(getInitialRiders);
  const [messages, setMessages] = useState<string[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (riders.length > 0) {
      saveRidersToStorage(riders);
    }
  }, [riders]);

  function handleImport(rawText: string) {
    const result = parseRosterText(rawText);

    if (result.riders.length === 0) {
      setMessages(result.errors.length > 0 ? result.errors : ["Aucun coureur importé."]);
      return;
    }

    setRiders((current) => mergeRidersByName(current, result.riders));

    setMessages([
      `${result.riders.length} coureur(s) importé(s) ou mis à jour.`,
      ...result.errors,
    ]);
  }

  function handleDelete(riderId: string) {
    setRiders((current) => current.filter((rider) => rider.id !== riderId));
    setMessages(["Coureur supprimé de l'effectif local."]);
  }

  function handleResetToDefault() {
    setRiders(initialRiders);
    setMessages(["Effectif réinitialisé avec les données de départ."]);
  }

  const filteredRiders = useMemo(() => {
    const search = filter.trim().toLowerCase();

    if (!search) {
      return riders;
    }

    return riders.filter((rider) => {
      return (
        rider.name.toLowerCase().includes(search) ||
        rider.category.toLowerCase().includes(search)
      );
    });
  }, [riders, filter]);

  const profiles = useMemo(() => buildRiderProfiles(filteredRiders), [filteredRiders]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.riderId, profile]));
  }, [profiles]);

  const featuredRiders = filteredRiders.slice(0, 4);

  return (
    <div className="page-stack">
      <PageTitle
        title="Effectif"
        subtitle="Import brut, profils automatiques et affichage détaillé des coureurs."
      />

      <RosterStats riders={riders} />

      <div className="two-columns">
        <Card title="Import brut">
          <RosterImportBox onImport={handleImport} />
        </Card>

        <Card title="Actions">
          <div className="page-stack">
            <div>
              <label htmlFor="roster-filter" className="field-label">
                Filtrer l'effectif
              </label>
              <input
                id="roster-filter"
                className="input"
                type="text"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Nom ou catégorie..."
              />
            </div>

            <div className="inline-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={handleResetToDefault}
              >
                Réinitialiser les données de départ
              </button>
            </div>

            <div>
              <p className="field-label">Messages</p>
              <div className="message-box">
                {messages.length > 0 ? (
                  <ul className="clean-list">
                    {messages.map((message, index) => (
                      <li key={`${message}-${index}`}>{message}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Aucun message pour le moment.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Profils automatiques">
        <div className="profile-card-grid">
          {featuredRiders.length > 0 ? (
            featuredRiders.map((rider) => (
              <RiderCard
                key={rider.id}
                rider={rider}
                profile={profileMap.get(rider.id)}
              />
            ))
          ) : (
            <p>Aucun coureur à afficher.</p>
          )}
        </div>
      </Card>

      <Card title={`Liste des coureurs (${filteredRiders.length})`}>
        <RiderTable riders={filteredRiders} onDelete={handleDelete} />
      </Card>
    </div>
  );
}