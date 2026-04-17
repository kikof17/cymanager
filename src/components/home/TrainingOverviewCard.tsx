import Card from "../common/Card";
import type { TrainingPlan } from "../../types/training";

type TrainingOverviewCardProps = {
  plan: TrainingPlan;
};

export default function TrainingOverviewCard({
  plan,
}: TrainingOverviewCardProps) {
  return (
    <Card title="Entraînement conseillé">
      {plan.selectedTypes.length > 0 ? (
        <div className="dashboard-lines">
          <div className="training-chip-list">
            {plan.selectedTypes.map((training) => (
              <span key={training} className="training-chip">
                {training}
              </span>
            ))}
          </div>

          <p>
            <strong>Score global :</strong> {plan.individualAdvices?.reduce((acc, curr) => acc + (curr.urgencyScore || 0), 0)}
          </p>

          <ul className="clean-list">
            {plan.rationale.slice(0, 3).map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>Aucun plan calculé.</p>
      )}
    </Card>
  );
}