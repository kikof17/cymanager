import { useMemo } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import IndividualTrainingTable from "../components/training/IndividualTrainingTable";
import TrainingPlanCard from "../components/training/TrainingPlanCard";
import { buildTrainingPlan } from "../lib/scoring/trainingScores";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import { initialRiders } from "../store/initialState";
import type { Rider } from "../types/rider";

export default function TrainingPage() {
  const riders = useMemo<Rider[]>(() => {
    const storedRiders = loadRidersFromStorage();
    return storedRiders.length > 0 ? storedRiders : initialRiders;
  }, []);

  const settings = useMemo(() => loadClubSettings(), []);

  const plan = useMemo(() => buildTrainingPlan(riders, settings), [riders, settings]);

  return (
    <div className="page-stack">
      <PageTitle
        title="Entraînement"
        subtitle="Diagnostic individuel par coureur d'abord, synthèse hebdo ensuite."
      />

      <div className="two-columns">
        <TrainingPlanCard plan={plan} />

        <Card title="Contexte de calcul">
          <div className="training-summary-box">
            <p>
              <strong>Division actuelle :</strong> {settings.currentDivision}
            </p>
            <p>
              <strong>Division visée :</strong> {settings.targetDivision}
            </p>
            <p>
              <strong>Objectif club :</strong> {settings.clubObjective}
            </p>
            <p>
              <strong>Tolérance salariale :</strong> {settings.salaryTolerance}
            </p>
            <p className="muted">
              La logique privilégie d'abord le besoin individuel de chaque coureur,
              notamment le foncier, avant de déduire les 3 entraînements communs.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Conseil individuel par coureur">
        <IndividualTrainingTable advices={plan.individualAdvices} />
      </Card>
    </div>
  );
}