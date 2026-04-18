import Card from "../common/Card";
import { analyzeSquad, getStrategyAxisLabel } from "../../lib/roster/rosterAnalysis";
import {
  TEAM_HORIZON_OPTIONS,
  TEAM_STRATEGY_OPTIONS,
} from "../../lib/storage/teamStrategyStorage";
import { formatCurrency } from "../../lib/utils/numbers";
import type { Rider } from "../../types/rider";
import type { ClubSettings } from "../../types/settings";
import type { TeamBuildingStrategy, TeamPlanningHorizon, TeamStrategyAxis } from "../../types/teamStrategy";

type RosterAnalysisPanelProps = {
  riders: Rider[];
  settings: ClubSettings;
  currentBalance: number;
  weeklyFixedCosts: number;
  recentPrizeIncomeByRider: Record<string, number>;
  availableHistoryWeeks: number;
  strategy: TeamBuildingStrategy;
  onStrategyChange: (strategy: TeamBuildingStrategy) => void;
};

export default function RosterAnalysisPanel({
  riders,
  settings,
  currentBalance,
  weeklyFixedCosts,
  recentPrizeIncomeByRider,
  availableHistoryWeeks,
  strategy,
  onStrategyChange,
}: RosterAnalysisPanelProps) {
  const analysis = analyzeSquad(
    riders,
    settings,
    strategy,
    currentBalance,
    weeklyFixedCosts,
    recentPrizeIncomeByRider,
    availableHistoryWeeks
  );

  function updateAxis(
    key: "primaryAxis" | "secondaryAxis" | "tertiaryAxis",
    value: TeamStrategyAxis
  ) {
    onStrategyChange({
      ...strategy,
      [key]: value,
    });
  }

  function updateHorizon(value: TeamPlanningHorizon) {
    onStrategyChange({
      ...strategy,
      planningHorizon: value,
    });
  }

  return (
    <Card title="Analyse de l'effectif">
      <div className="page-stack">
        <div className="field-grid roster-analysis-grid">
          <div>
            <label className="field-label" htmlFor="strategy-primary-axis">
              Axe 1 prioritaire
            </label>
            <select
              id="strategy-primary-axis"
              className="input select-input"
              value={strategy.primaryAxis}
              onChange={(event) => updateAxis("primaryAxis", event.target.value as TeamStrategyAxis)}
            >
              {TEAM_STRATEGY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="strategy-secondary-axis">
              Axe 2 prioritaire
            </label>
            <select
              id="strategy-secondary-axis"
              className="input select-input"
              value={strategy.secondaryAxis}
              onChange={(event) => updateAxis("secondaryAxis", event.target.value as TeamStrategyAxis)}
            >
              {TEAM_STRATEGY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="strategy-tertiary-axis">
              Axe 3 prioritaire
            </label>
            <select
              id="strategy-tertiary-axis"
              className="input select-input"
              value={strategy.tertiaryAxis}
              onChange={(event) => updateAxis("tertiaryAxis", event.target.value as TeamStrategyAxis)}
            >
              {TEAM_STRATEGY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="strategy-horizon">
              Horizon de construction
            </label>
            <select
              id="strategy-horizon"
              className="input select-input"
              value={strategy.planningHorizon}
              onChange={(event) => updateHorizon(event.target.value as TeamPlanningHorizon)}
            >
              {TEAM_HORIZON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="message-box">
          <p>
            L'analyse croise ces 3 axes avec l'objectif du club, la tolérance salariale,
            la division actuelle et la trésorerie. Cela pilote aussi l'avis donné sur la page transferts.
          </p>
        </div>

        <div className="two-columns roster-analysis-layout">
          <Card title="Lecture stratégique">
            <div className="dashboard-lines">
              <p><strong>Cap visé :</strong> {getStrategyAxisLabel(strategy.primaryAxis)} puis {getStrategyAxisLabel(strategy.secondaryAxis)} puis {getStrategyAxisLabel(strategy.tertiaryAxis)}</p>
              <p><strong>Lecture effectif :</strong> {analysis.strategySummary}</p>
              <p><strong>Lecture budget :</strong> {analysis.budgetSummary}</p>
              <p><strong>Lecture division :</strong> {analysis.squadSummary}</p>
              <p><strong>Solde :</strong> {formatCurrency(currentBalance)}</p>
              <p><strong>Charges fixes hebdo :</strong> {formatCurrency(weeklyFixedCosts)}</p>
            </div>
          </Card>

          <Card title="Forces et manques">
            <div className="two-columns roster-analysis-mini-columns">
              <div>
                <p className="field-label">Axes les plus forts</p>
                <ul className="clean-list">
                  {analysis.strongestAxes.map((axis) => (
                    <li key={axis.label}>{axis.label} {axis.value}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="field-label">Axes les plus faibles</p>
                <ul className="clean-list">
                  {analysis.weakestAxes.map((axis) => (
                    <li key={axis.label}>{axis.label} {axis.value}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <div className="two-columns roster-analysis-layout">
          <Card title="Compatibilité avec la stratégie">
            <div className="stats-list">
              {analysis.strategyCoverage.map((row) => {
                const ratio = Math.max(0, Math.min(100, (row.average / Math.max(row.target, 1)) * 100));

                return (
                  <div key={row.axis} className="stats-list-row">
                    <div className="stats-list-head">
                      <span>{row.label}</span>
                      <strong>{row.average} / cible {row.target}</strong>
                    </div>
                    <div className="stats-progress-track">
                      <div className="stats-progress-fill" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Lecture par catégorie">
            <div className="table-container">
              <table className="data-table styled-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th>Total moyen</th>
                    <th>Cible division</th>
                    <th>Ecart</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.divisionReadiness.map((row) => (
                    <tr key={row.category}>
                      <td>{row.label}</td>
                      <td>{row.averageTotal}</td>
                      <td>{row.targetTotal}</td>
                      <td>{row.gap >= 0 ? `+${row.gap}` : row.gap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card title="Synthèse ventes potentielles">
          {analysis.sellCandidatesNotice ? (
            <p className="muted">{analysis.sellCandidatesNotice}</p>
          ) : analysis.sellCandidates.length > 0 ? (
            <div className="table-container">
              <table className="data-table styled-table">
                <thead>
                  <tr>
                    <th>Coureur</th>
                    <th>Cat.</th>
                    <th>Âge</th>
                    <th>Salaire</th>
                    <th>Primes 7j</th>
                    <th>Foncier</th>
                    <th>Total</th>
                    <th>Fit stratégie</th>
                    <th>Pourquoi envisager une vente</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.sellCandidates.map((candidate) => (
                    <tr key={candidate.riderId}>
                      <td>{candidate.riderName}</td>
                      <td>{candidate.category}</td>
                      <td>{candidate.ageYears} ans</td>
                      <td>{formatCurrency(candidate.weeklySalary)}</td>
                      <td>{formatCurrency(candidate.recentWeeklyPrizeIncome)}</td>
                      <td>{candidate.baseFitness}</td>
                      <td>{candidate.total}</td>
                      <td>{candidate.strategyFitScore}</td>
                      <td>{candidate.rationale.join(" ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Aucun coureur ne ressort comme vente prioritaire avec les paramètres actuels.</p>
          )}
        </Card>

        <Card title="Profil recherché">
          <div className="page-stack">
            <div className="message-box">
              <p><strong>Cible :</strong> {analysis.recruitmentProfile.title}</p>
              <p>{analysis.recruitmentProfile.summary}</p>
            </div>

            <div className="two-columns roster-analysis-layout">
              <Card title="Cadre de recrutement">
                <div className="dashboard-lines">
                  <p><strong>Catégorie visée :</strong> {analysis.recruitmentProfile.recommendedCategory}</p>
                  <p><strong>Fenêtre d'âge :</strong> {analysis.recruitmentProfile.ageRange}</p>
                  <p><strong>Plafond salaire :</strong> {analysis.recruitmentProfile.salaryRange}</p>
                  <p><strong>Budget transfert :</strong> {analysis.recruitmentProfile.transferBudget}</p>
                  <p><strong>Type de profil :</strong> {analysis.recruitmentProfile.targetProfile}</p>
                </div>
              </Card>

              <Card title="Pourquoi ce profil">
                <ul className="clean-list">
                  {analysis.recruitmentProfile.strategicReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="two-columns roster-analysis-layout">
              <Card title="Caractéristiques sportives à viser">
                <ul className="clean-list">
                  {analysis.recruitmentProfile.priorityStats.map((stat) => (
                    <li key={stat}>{stat}</li>
                  ))}
                </ul>
              </Card>

              <Card title="Profils à éviter">
                <ul className="clean-list">
                  {analysis.recruitmentProfile.avoidProfiles.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </Card>
  );
}