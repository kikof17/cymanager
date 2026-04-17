import Card from "../common/Card";
import type { ParsedRace, RaceRiderScore } from "../../types/race";

type RaceOverviewCardProps = {
  race: ParsedRace | null;
  selected: RaceRiderScore[];
};

export default function RaceOverviewCard({
  race,
  selected,
}: RaceOverviewCardProps) {
  return (
    <Card title="Dernière course analysée">
      {race ? (
        <div className="dashboard-lines">
          <p>
            <strong>Nom :</strong> {race.name}
          </p>
          <p>
            <strong>Type :</strong>{" "}
            {race.raceType === "etapes" ? "Course à étapes" : "Course simple"}
          </p>
          <p>
            <strong>Profil :</strong> {race.detectedProfile}
          </p>
          <p>
            <strong>Distance :</strong>{" "}
            {race.distanceKm > 0 ? `${race.distanceKm} km` : "Non détectée"}
          </p>

          <div>
            <p className="field-label">Top 3 proposés</p>
            {selected.length > 0 ? (
              <ol className="compact-list">
                {selected.slice(0, 3).map((rider) => (
                  <li key={rider.riderId}>
                    {rider.riderName} — {rider.role}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">Aucune sélection disponible.</p>
            )}
          </div>
        </div>
      ) : (
        <p>Aucune course analysée pour le moment.</p>
      )}
    </Card>
  );
}