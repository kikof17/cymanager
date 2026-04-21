import Card from "../common/Card";
import type { TrainingPlan } from "../../types/training";

type TrainingPlanCardProps = {
  plan: TrainingPlan;
};

export default function TrainingPlanCard({ plan }: TrainingPlanCardProps) {
  return (
    <Card title="Synthèse hebdo">
      {plan.selectedTypes.length > 0 ? (
        <>
          <div className="training-chip-list">
            {plan.selectedTypes.map((training) => (
              <span key={training} className="training-chip">
                {training} ({plan.selectedIntensities.find((item) => item.training === training)?.intensity ?? "Normal"})
              </span>
            ))}
          </div>

          <div className="training-rationale">
            <p className="field-label">Pourquoi ces 3 entraînements</p>
            <ul className="clean-list">
              {plan.rationale.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="training-rationale">
            <p className="field-label">Couverture individuelle</p>
            <ul className="clean-list">
              {plan.coverageCounts.slice(0, 6).map((item) => (
                <li key={item.training}>
                  {item.training} : {item.count} coureur(s)
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p>Aucun plan calculé.</p>
      )}
    </Card>
  );
}