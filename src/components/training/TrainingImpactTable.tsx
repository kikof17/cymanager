import type { RiderTrainingAssignment } from "../../types/training";

type TrainingImpactTableProps = {
  assignments: RiderTrainingAssignment[];
};

export default function TrainingImpactTable({
  assignments,
}: TrainingImpactTableProps) {
  if (assignments.length === 0) {
    return <p>Aucune répartition calculée.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Coureur</th>
            <th>Entraînement attribué</th>
            <th>Score</th>
            <th>Primaire</th>
            <th>Secondaires</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          {assignments.map((item) => (
            <tr key={item.riderId}>
              <td>{item.riderName}</td>
              <td>{item.assignedTraining}</td>
              <td>{item.assignmentScore}</td>
              <td>{item.primaryStatLabel}</td>
              <td>
                {item.secondaryStatLabels[0]}, {item.secondaryStatLabels[1]}
              </td>
              <td>{item.notes.join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}