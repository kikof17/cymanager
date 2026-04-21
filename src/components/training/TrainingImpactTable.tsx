// Correction : le type RiderTrainingAssignment n'existe pas, on utilise IndividualTrainingAdvice
import type { IndividualTrainingAdvice } from "../../types/training";

type TrainingImpactTableProps = {
  assignments: IndividualTrainingAdvice[];
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
            <th>Catégorie</th>
            <th>Âge</th>
            <th>Priorité</th>
            <th>Entraînement idéal</th>
            <th>Entraînement suggéré</th>
            <th>Intensité</th>
            <th>Score d'urgence</th>
            <th>Risque salaire</th>
            <th>Raison</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((item) => (
            <tr key={item.riderId}>
              <td>{item.riderName}</td>
              <td>{item.riderCategory}</td>
              <td>{item.riderAge}</td>
              <td>{item.priority}</td>
              <td>{item.idealTraining}</td>
              <td>{item.suggestedTraining}</td>
              <td>{item.suggestedIntensity}</td>
              <td>{item.urgencyScore}</td>
              <td>{item.salaryRisk}</td>
              <td>{item.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}