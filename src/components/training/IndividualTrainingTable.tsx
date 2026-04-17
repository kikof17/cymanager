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
            <th style={{color: '#181c24'}}>Nom</th>
            <th style={{color: '#181c24'}}>Cat.</th>
            <th style={{color: '#181c24'}}>Âge</th>
            <th style={{color: '#181c24'}}>Primaire</th>
            <th style={{color: '#181c24'}}>Foncier</th>
            <th style={{color: '#181c24'}}>Cible</th>
            <th style={{color: '#181c24'}}>Écart</th>
            <th style={{color: '#181c24'}}>Priorité</th>
            <th style={{color: '#181c24'}}>Entraînement retenu</th>
            <th style={{color: '#181c24'}}>Risque salaire</th>
            <th style={{color: '#181c24'}}>Motif</th>
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