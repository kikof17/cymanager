import { useMemo } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import IndividualTrainingTable from "../components/training/IndividualTrainingTable";
import TrainingPlanCard from "../components/training/TrainingPlanCard";
import { buildCrossRecommendations } from "../lib/app/crossRecommendations";
import { buildTrainingPlan } from "../lib/scoring/trainingScores";
import { buildResultReferenceSummary, getAllResultsFromStorage } from "../lib/scoring/extractPoints";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import { loadManualTodos } from "../lib/storage/todoStorage";
import { initialRiders } from "../store/initialState";
import type { Rider } from "../types/rider";

export default function TrainingPage() {
  const riders = useMemo<Rider[]>(() => {
    const storedRiders = loadRidersFromStorage();
    return storedRiders.length > 0 ? storedRiders : initialRiders;
  }, []);

  const settings = useMemo(() => loadClubSettings(), []);
  const resultReferenceSummary = useMemo(
    () =>
      buildResultReferenceSummary(
        getAllResultsFromStorage(),
        loadManualTodos().filter((todo) => todo.id.startsWith("calendar-"))
      ),
    []
  );

  const plan = useMemo(() => buildTrainingPlan(riders, settings), [riders, settings]);
  const crossRecommendations = useMemo(
    () =>
      buildCrossRecommendations({
        riders,
        resultReferenceSummary,
      }),
    [riders, resultReferenceSummary]
  );

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
              <strong>Division actuelle Pro / U25 / U21 :</strong> {settings.divisionPro} / {settings.divisionU25} / {settings.divisionU21}
            </p>
            <p>
              <strong>Division visée Pro / U25 / U21 :</strong> {settings.targetDivisionPro} / {settings.targetDivisionU25} / {settings.targetDivisionU21}
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

      <Card title="Recommandations croisées entraînement">
        <div className="dashboard-lines">
          {crossRecommendations.training.map((item, index) => (
            <p key={`${item.severity}-${index}`} className={item.severity === "critical" ? "settings-diagnostic-line settings-diagnostic-line-warning" : undefined}>
              <strong>{item.severity === "critical" ? "Critique" : item.severity === "warning" ? "Vigilance" : "Info"}:</strong> {item.text}
            </p>
          ))}
        </div>
      </Card>

      <Card title="Conseil individuel par coureur">
        <IndividualTrainingTable advices={plan.individualAdvices} />
      </Card>
    </div>
  );
}