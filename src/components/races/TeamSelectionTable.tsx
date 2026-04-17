import type { RaceRiderScore } from "../../types/race";

type TeamSelectionTableProps = {
  title: string;
  riders: RaceRiderScore[];
};

export default function TeamSelectionTable({
  title,
  riders,
}: TeamSelectionTableProps) {
  return (
    <div className="page-stack">
      <p className="field-label">{title}</p>

      {riders.length === 0 ? (
        <p className="muted">Aucun coureur.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Cat.</th>
                <th>Forme</th>
                <th>Score</th>
                <th>Rôle</th>
                <th>Raisons</th>
              </tr>
            </thead>

            <tbody>
              {riders.map((rider) => (
                <tr key={`${title}-${rider.riderId}`}>
                  <td>{rider.riderName}</td>
                  <td>{rider.riderCategory}</td>
                  <td>{rider.riderForm}</td>
                  <td>{rider.score}</td>
                  <td>{rider.role}</td>
                  <td>{rider.reasons.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}