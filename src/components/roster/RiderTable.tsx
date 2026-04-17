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
              <td>{rider.total}</td>
              <td>{rider.mountain}</td>
              <td>{rider.hill}</td>
              <td>{rider.flat}</td>
              <td>{rider.sprint}</td>
              <td>{rider.timeTrial}</td>
              <td>{rider.cobble}</td>
              <td>{rider.stageRace}</td>
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