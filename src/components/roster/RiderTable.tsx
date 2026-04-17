import type { Rider } from "../../types/rider";
import { formatCurrency, formatInteger } from "../../lib/utils/numbers";

type RiderTableProps = {
  riders: Rider[];
  onDelete: (riderId: string) => void;
};

export default function RiderTable({ riders, onDelete }: RiderTableProps) {
  if (riders.length === 0) {
    return <p>Aucun coureur enregistré pour le moment.</p>;
  }

  // Fonction utilitaire pour la classe couleur
  function getStatClass(note: number) {
    if (note < 30) return "stat-red";
    if (note < 50) return "stat-orange";
    if (note < 70) return "stat-green";
    return "stat-blue";
  }

  // Spécifique pour la colonne total
  function getTotalClass(total: number) {
    if (total < 600) return "stat-red";
    if (total < 700) return "stat-orange";
    if (total < 800) return "stat-green";
    return "stat-blue";
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Cat.</th>
            <th>Âge</th>
            <th>Forme</th>
            <th>Total</th>
            <th>Mont.</th>
            <th>Vallon</th>
            <th>Plaine</th>
            <th>Sprint</th>
            <th>CLM</th>
            <th>Pavé</th>
            <th>CAE</th>
            <th>Salaire</th>
            <th>Valeur</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {riders.map((rider) => (
            <tr key={rider.id}>
              <td>{rider.name}</td>
              <td>{rider.category}</td>
              <td>
                {rider.ageYears}a {rider.ageWeeks}s
              </td>
              <td>{rider.form}</td>
              <td className={getTotalClass(rider.total)}>{rider.total}</td>
              <td className={getStatClass(rider.mountain)}>{rider.mountain}</td>
              <td className={getStatClass(rider.hill)}>{rider.hill}</td>
              <td className={getStatClass(rider.flat)}>{rider.flat}</td>
              <td className={getStatClass(rider.sprint)}>{rider.sprint}</td>
              <td className={getStatClass(rider.timeTrial)}>{rider.timeTrial}</td>
              <td className={getStatClass(rider.cobble)}>{rider.cobble}</td>
              <td className={getStatClass(rider.stageRace)}>{rider.stageRace}</td>
              <td>{formatInteger(rider.salaryWeekly)} €</td>
              <td>{formatCurrency(rider.value)}</td>
              <td>
                <button
                  type="button"
                  className="button button-danger button-small"
                  onClick={() => onDelete(rider.id)}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}