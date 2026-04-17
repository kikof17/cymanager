import type { IndividualTrainingAdvice } from "../../types/training";

type IndividualTrainingTableProps = {
  advices: IndividualTrainingAdvice[];
};

export default function IndividualTrainingTable({
  advices,
}: IndividualTrainingTableProps) {
  if (advices.length === 0) {
    return <p>Aucun conseil individuel disponible.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Cat.</th>
            <th>Âge</th>
            <th>Primaire</th>
            <th>Foncier</th>
            <th>Cible</th>
            <th>Écart</th>
            <th>Priorité</th>
            <th>Entraînement retenu</th>
            <th>Risque salaire</th>
            <th>Motif</th>
          </tr>
        </thead>

        <tbody>
          {advices.map((advice) => (
            <tr key={advice.riderId}>
              <td>{advice.riderName}</td>
              <td>{advice.riderCategory}</td>
              <td>{advice.riderAge}</td>
              <td>
                {advice.dominantPrimary} {advice.dominantPrimaryValue}
              </td>
              <td>{advice.currentFoncier}</td>
              <td>{advice.targetFoncier}</td>
              <td>{advice.foncierGap}</td>
              <td>{advice.priority}</td>
              <td>
                {advice.suggestedTraining}
                {advice.reassigned ? (
                  <div className="muted">
                    idéal : {advice.idealTraining}
                  </div>
                ) : null}
              </td>
              <td>{advice.salaryRisk}</td>
              <td>{advice.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}