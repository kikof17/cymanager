import { useMemo } from "react";
import { Link } from "react-router-dom";
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

  const trainingBoard = useMemo(() => {
    const availableCount = plan.individualAdvices.length;
    const unavailableCount = riders.length - availableCount;
    const lowFormCount = plan.rationale
      .find((r) => r.includes("forme fragile"))
      ?.match(/^(\d+)/)?.[1];
    const lowForm = lowFormCount ? parseInt(lowFormCount, 10) : 0;
    const criticalCount = crossRecommendations.training.filter(
      (r) => r.severity === "critical"
    ).length;
    const warningCount = crossRecommendations.training.filter(
      (r) => r.severity === "warning"
    ).length;
    const groups = plan.selectedTypes.slice(0, 3).map((type) => {
      const coverage = plan.coverageCounts.find((c) => c.training === type)?.count ?? 0;
      return { type, coverage };
    });
    return { availableCount, unavailableCount, lowForm, criticalCount, warningCount, groups };
  }, [plan, riders, crossRecommendations]);

  return (
    <div className="page-stack">
      <PageTitle
        title="Entraînement"
        subtitle="Diagnostic individuel par coureur d'abord, synthèse hebdo ensuite."
      />

      <section className="training-board" aria-label="Pilotage hebdomadaire entraînement">
        <div className="training-board-header">
          <span className="training-board-title">Plan semaine</span>
        </div>
        <div className="training-board-grid">
          {trainingBoard.groups.length === 0 ? (
            <div className="training-board-item training-board-item--empty">
              <span className="training-board-label">Groupes</span>
              <span className="training-board-value">–</span>
            </div>
          ) : (
            trainingBoard.groups.map((g, i) => (
              <div key={i} className="training-board-item training-board-item--group">
                <span className="training-board-label">Groupe {i + 1}</span>
                <span className="training-board-value">{g.type}</span>
                <span className="training-board-sub">{g.coverage} coureur{g.coverage > 1 ? "s" : ""}</span>
              </div>
            ))
          )}
          <div className={`training-board-item ${trainingBoard.unavailableCount > 0 ? "training-board-value--warning" : "training-board-value--success"}`}>
            <span className="training-board-label">Disponibles</span>
            <span className="training-board-value">{trainingBoard.availableCount}/{riders.length}</span>
            {trainingBoard.unavailableCount > 0 && (
              <span className="training-board-sub">{trainingBoard.unavailableCount} indispo</span>
            )}
          </div>
          <div className={`training-board-item ${trainingBoard.lowForm > 0 ? "training-board-value--warning" : "training-board-value--success"}`}>
            <span className="training-board-label">Forme fragile</span>
            <span className="training-board-value">{trainingBoard.lowForm}</span>
          </div>
          <div className={`training-board-item ${trainingBoard.criticalCount > 0 ? "training-board-value--danger" : trainingBoard.warningCount > 0 ? "training-board-value--warning" : "training-board-value--success"}`}>
            <span className="training-board-label">Alertes</span>
            <span className="training-board-value">
              {trainingBoard.criticalCount > 0 ? `${trainingBoard.criticalCount} critique${trainingBoard.criticalCount > 1 ? "s" : ""}` : trainingBoard.warningCount > 0 ? `${trainingBoard.warningCount} vigilance` : "RAS"}
            </span>
          </div>
          <div className="training-board-item training-board-item--action">
            <span className="training-board-label">Actions</span>
            <span className="training-board-value">
              <Link to="/roster" className="training-board-link">Effectif</Link>
              {" · "}
              <Link to="/transfers" className="training-board-link">Transferts</Link>
            </span>
          </div>
        </div>
      </section>

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