import Card from "../common/Card";
import type { ParsedRace } from "../../types/race";

type RaceSummaryProps = {
  race: ParsedRace | null;
};

export default function RaceSummary({ race }: RaceSummaryProps) {
  if (!race) {
    return (
      <Card title="Analyse de course">
        <p>Aucune course analysée pour le moment.</p>
      </Card>
    );
  }

  return (
    <Card title={race.name}>
      <div className="page-stack">
        <p>
          <strong>Type :</strong>{" "}
          {race.raceType === "etapes" ? "Course à étapes" : "Course simple"}
        </p>
        <p>
          <strong>Profil détecté :</strong> {race.detectedProfile}
        </p>
        <p>
          <strong>Distance :</strong>{" "}
          {race.distanceKm > 0 ? `${race.distanceKm} km` : "Non détectée"}
        </p>

        <div>
          <p className="field-label">Résumé</p>
          <ul className="clean-list">
            {race.summary.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}