import { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import { mergeRidersByName, parseRosterText } from "../lib/parser/rosterParser";
import { getStrategyAxisLabel } from "../lib/roster/rosterAnalysis";
import {
  analyzeTransferCandidates,
  type TransferAnalysis,
} from "../lib/transfers/transferAnalysis";
import { addManualFinanceEntry, getFinanceSnapshot } from "../lib/storage/financeStorage";
import { loadRidersFromStorage, saveRidersToStorage } from "../lib/storage/localStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import { loadTeamStrategy } from "../lib/storage/teamStrategyStorage";
import { formatCurrency, formatInteger, parseFrenchInteger } from "../lib/utils/numbers";
import { initialRiders } from "../store/initialState";
import type { Rider } from "../types/rider";
import type { ClubSettings } from "../types/settings";

type TransferSortKey =
  | "name"
  | "category"
  | "score"
  | "recommendation"
  | "total"
  | "salaryWeekly"
  | "value"
  | "profileLabel";

type TransferSortConfig = {
  key: TransferSortKey;
  direction: "asc" | "desc";
} | null;

const RECOMMENDATION_RANK: Record<TransferAnalysis["recommendation"], number> = {
  "Priorité haute": 4,
  "Option solide": 3,
  "Opportunité conditionnelle": 2,
  "À éviter": 1,
};

const FINANCIAL_PLANNING_BY_TOLERANCE: Record<
  ClubSettings["salaryTolerance"],
  {
    reserveWeeks: number;
    transferRatioCap: number;
    salaryTrendWeight: number;
    salaryBufferDivisor: number;
    horizonWeeks: number;
  }
> = {
  prudente: {
    reserveWeeks: 8,
    transferRatioCap: 0.22,
    salaryTrendWeight: 0.25,
    salaryBufferDivisor: 16,
    horizonWeeks: 2,
  },
  normale: {
    reserveWeeks: 6,
    transferRatioCap: 0.32,
    salaryTrendWeight: 0.4,
    salaryBufferDivisor: 12,
    horizonWeeks: 3,
  },
  agressive: {
    reserveWeeks: 4,
    transferRatioCap: 0.42,
    salaryTrendWeight: 0.55,
    salaryBufferDivisor: 8,
    horizonWeeks: 4,
  },
};

const OBJECTIVE_TRANSFER_MULTIPLIER: Record<ClubSettings["clubObjective"], number> = {
  formation: 0.85,
  mixte: 1,
  performance: 1.15,
};

type DecisionBudgetGuidance = {
  salaryCap: number;
  salaryHeadroom: number;
  transferBudget: number;
  projectedBalanceHorizon: number;
  recentWeeklyNet: number;
  reserveTarget: number;
  horizonWeeks: number;
};

function roundPlanningAmount(value: number): number {
  if (value <= 0) {
    return 0;
  }

  return Math.round(value / 5000) * 5000;
}

function getRecentWeeklyNet(
  entries: ReturnType<typeof getFinanceSnapshot>["state"]["entries"],
  withinDays = 21
): number {
  const now = Date.now();
  const windowStart = now - withinDays * 24 * 60 * 60 * 1000;
  const recentTotal = entries.reduce((sum, entry) => {
    const entryTime = new Date(entry.occurredAt).getTime();

    if (Number.isNaN(entryTime) || entryTime < windowStart) {
      return sum;
    }

    return sum + entry.amount;
  }, 0);

  return recentTotal / Math.max(1, withinDays / 7);
}

function getDecisionBudgetGuidance(
  financeSnapshot: ReturnType<typeof getFinanceSnapshot>,
  settings: ClubSettings
): DecisionBudgetGuidance {
  const planning = FINANCIAL_PLANNING_BY_TOLERANCE[settings.salaryTolerance];
  const reserveTarget = financeSnapshot.weeklyFixedCosts * planning.reserveWeeks;
  const recentWeeklyNet = getRecentWeeklyNet(financeSnapshot.state.entries);
  const projectedBaseBalance = financeSnapshot.projectedBalanceAfterWeeklyCosts;
  const projectedBalanceHorizon =
    projectedBaseBalance + recentWeeklyNet * planning.horizonWeeks;
  const salaryTrendAdjustment = recentWeeklyNet * planning.salaryTrendWeight;
  const salaryTreasuryAdjustment =
    (projectedBaseBalance - reserveTarget) / planning.salaryBufferDivisor;
  const rawSalaryCap =
    financeSnapshot.weeklySalaryExpense +
    salaryTrendAdjustment +
    salaryTreasuryAdjustment;
  const minimumSalaryCap = financeSnapshot.weeklySalaryExpense * 0.75;
  const salaryCap = roundPlanningAmount(
    Math.max(minimumSalaryCap, rawSalaryCap)
  );
  const salaryHeadroom = salaryCap - financeSnapshot.weeklySalaryExpense;
  const rawTransferBudget =
    (projectedBalanceHorizon - reserveTarget) *
    OBJECTIVE_TRANSFER_MULTIPLIER[settings.clubObjective];
  const transferBudget = roundPlanningAmount(
    Math.min(
      Math.max(0, rawTransferBudget),
      financeSnapshot.currentBalance * planning.transferRatioCap
    )
  );

  return {
    salaryCap,
    salaryHeadroom,
    transferBudget,
    projectedBalanceHorizon,
    recentWeeklyNet,
    reserveTarget,
    horizonWeeks: planning.horizonWeeks,
  };
}

function getInitialRiders(): Rider[] {
  const storedRiders = loadRidersFromStorage();
  return storedRiders.length > 0 ? storedRiders : initialRiders;
}

function getDefaultTransferDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TransfersPage() {
  const [currentRiders, setCurrentRiders] = useState<Rider[]>(getInitialRiders);
  const [rawText, setRawText] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [candidateRiders, setCandidateRiders] = useState<Rider[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [shortlistedCandidateIds, setShortlistedCandidateIds] = useState<string[]>([]);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(getDefaultTransferDate);
  const [sortConfig, setSortConfig] = useState<TransferSortConfig>(null);

  const settings = useMemo(() => loadClubSettings(), []);
  const teamStrategy = useMemo(() => loadTeamStrategy(), []);
  const financeSnapshot = useMemo(
    () => getFinanceSnapshot(settings, currentRiders),
    [settings, currentRiders]
  );
  const decisionBudgetGuidance = useMemo(
    () => getDecisionBudgetGuidance(financeSnapshot, settings),
    [financeSnapshot, settings]
  );

  useEffect(() => {
    if (currentRiders.length > 0) {
      saveRidersToStorage(currentRiders);
    }
  }, [currentRiders]);

  const parsedTransferAmount = useMemo(
    () => parseFrenchInteger(transferAmount),
    [transferAmount]
  );

  const analyses = useMemo(
    () =>
      analyzeTransferCandidates(
        candidateRiders,
        currentRiders,
        settings,
        teamStrategy,
        financeSnapshot.currentBalance,
        parsedTransferAmount
      ),
    [candidateRiders, currentRiders, financeSnapshot.currentBalance, parsedTransferAmount, settings, teamStrategy]
  );

  const sortedAnalyses = useMemo(() => {
    if (!sortConfig) {
      return analyses;
    }

    const directionMultiplier = sortConfig.direction === "asc" ? 1 : -1;

    return [...analyses].sort((left, right) => {
      let comparison = 0;

      switch (sortConfig.key) {
        case "name":
          comparison = left.rider.name.localeCompare(right.rider.name, "fr", { sensitivity: "base" });
          break;
        case "category":
          comparison = left.rider.category.localeCompare(right.rider.category, "fr", { sensitivity: "base" });
          break;
        case "score":
          comparison = left.score - right.score;
          break;
        case "recommendation":
          comparison =
            RECOMMENDATION_RANK[left.recommendation] - RECOMMENDATION_RANK[right.recommendation];
          break;
        case "total":
          comparison = left.rider.total - right.rider.total;
          break;
        case "salaryWeekly":
          comparison = left.rider.salaryWeekly - right.rider.salaryWeekly;
          break;
        case "value":
          comparison = left.rider.value - right.rider.value;
          break;
        case "profileLabel":
          comparison = left.profileLabel.localeCompare(right.profileLabel, "fr", { sensitivity: "base" });
          break;
      }

      if (comparison === 0) {
        return left.rider.name.localeCompare(right.rider.name, "fr", { sensitivity: "base" }) * directionMultiplier;
      }

      return comparison * directionMultiplier;
    });
  }, [analyses, sortConfig]);

  const selectedAnalysis = useMemo(() => {
    if (!selectedCandidateId) {
      return analyses[0] ?? null;
    }

    return analyses.find((analysis) => analysis.rider.id === selectedCandidateId) ?? analyses[0] ?? null;
  }, [analyses, selectedCandidateId]);

  const shortlistedAnalyses = useMemo(
    () => analyses.filter((analysis) => shortlistedCandidateIds.includes(analysis.rider.id)),
    [analyses, shortlistedCandidateIds]
  );

  function handleAnalyze() {
    const result = parseRosterText(rawText);

    if (result.riders.length === 0) {
      setCandidateRiders([]);
      setSelectedCandidateId("");
      setShortlistedCandidateIds([]);
      setMessages(result.errors.length > 0 ? result.errors : ["Aucun coureur exploitable trouvé dans le collage."]);
      return;
    }

    setCandidateRiders(result.riders);
    setSelectedCandidateId(result.riders[0].id);
    setShortlistedCandidateIds([]);
    setMessages([
      `${result.riders.length} coureur(s) analysable(s) détecté(s).`,
      ...result.errors,
    ]);
  }

  function handleClearAnalysis() {
    setRawText("");
    setTransferAmount("");
    setTransferDate(getDefaultTransferDate());
    setCandidateRiders([]);
    setSelectedCandidateId("");
    setShortlistedCandidateIds([]);
    setSortConfig(null);
    setMessages(["Analyse vidée."]);
  }

  function handleToggleShortlist(candidateId: string) {
    setShortlistedCandidateIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId]
    );
  }

  function handleClearShortlist() {
    setShortlistedCandidateIds([]);
  }

  function handleSort(key: TransferSortKey) {
    setSortConfig((previous) => {
      if (previous?.key === key) {
        return {
          key,
          direction: previous.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: "asc" };
    });
  }

  function getSortIndicator(key: TransferSortKey): string {
    if (sortConfig?.key !== key) {
      return "";
    }

    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  }

  function getAriaSort(key: TransferSortKey): "ascending" | "descending" | "none" {
    if (sortConfig?.key !== key) {
      return "none";
    }

    return sortConfig.direction === "asc" ? "ascending" : "descending";
  }

  function handleRecruit(analysis: TransferAnalysis) {
    if (!analysis.canRecruit) {
      setMessages(
        analysis.blockingReasons.length > 0
          ? analysis.blockingReasons
          : ["Ce transfert est interdit par les règles actuelles."]
      );
      return;
    }

    if (parsedTransferAmount <= 0) {
      setMessages(["Saisis un montant de transfert strictement positif avant validation."]);
      return;
    }

    if (parsedTransferAmount > financeSnapshot.currentBalance) {
      setMessages(["Le montant du transfert dépasse le solde disponible."]);
      return;
    }

    setCurrentRiders((current) => mergeRidersByName(current, [analysis.rider]));

    addManualFinanceEntry(
      {
        label: `Transfert entrant - ${analysis.rider.name}`,
        amount: -parsedTransferAmount,
        occurredAt: transferDate,
        category: "transfer",
        note: `Recruté depuis ${analysis.rider.currentTeam || "marché des transferts"} - ${analysis.rider.category} - ${analysis.rider.total} total.`,
      },
      settings.financialBalance
    );

    window.dispatchEvent(new Event("cymanager:finance-updated"));

    setMessages([
      `${analysis.rider.name} a été intégré à l'effectif local et l'achat a été inscrit en finance.`,
    ]);
  }

  const bestOption = analyses[0] ?? null;

  return (
    <div className="page-stack">
      <PageTitle
        title="Transferts"
        subtitle="Analyse de recrues potentielles selon ton effectif, ta division, ton objectif et ton budget."
      />

      <div className="two-columns transfer-layout">
        <Card title="Collage brut du marché">
          <div className="page-stack roster-import-form transfer-import-form">
            <div>
              <label htmlFor="transfer-raw" className="field-label">
                Fiche coureur ou plusieurs fiches à la suite
              </label>
              <textarea
                id="transfer-raw"
                className="textarea"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="Colle une ou plusieurs fiches de transfert ici..."
              />
            </div>

            <div className="field-grid transfer-form-grid">
              <div>
                <label htmlFor="transfer-amount" className="field-label">
                  Montant de transfert
                </label>
                <input
                  id="transfer-amount"
                  className="input"
                  type="text"
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                  placeholder="Ex. 450000"
                />
              </div>

              <div>
                <label htmlFor="transfer-date" className="field-label">
                  Date du transfert
                </label>
                <input
                  id="transfer-date"
                  className="input"
                  type="date"
                  value={transferDate}
                  onChange={(event) => setTransferDate(event.target.value)}
                />
              </div>
            </div>

            <div className="inline-actions">
              <button type="button" className="button button-primary" onClick={handleAnalyze}>
                Analyser
              </button>
              <button type="button" className="button button-secondary" onClick={handleClearAnalysis}>
                Vider
              </button>
            </div>
          </div>
        </Card>

        <Card title="Cadre de décision">
          <div className="dashboard-lines">
            <p><strong>Solde actuel :</strong> {formatCurrency(financeSnapshot.currentBalance)}</p>
            <p><strong>Masse salariale hebdo :</strong> {formatCurrency(financeSnapshot.weeklySalaryExpense)}</p>
            <p><strong>Plafond masse salariale conseillé :</strong> {formatCurrency(decisionBudgetGuidance.salaryCap)}</p>
            <p><strong>{decisionBudgetGuidance.salaryHeadroom >= 0 ? "Marge salariale estimée" : "Dépassement salarial estimé"} :</strong> {formatCurrency(Math.abs(decisionBudgetGuidance.salaryHeadroom))}</p>
            <p><strong>Charge fixe hebdo :</strong> {formatCurrency(financeSnapshot.weeklyFixedCosts)}</p>
            <p><strong>Budget transferts conseillé :</strong> {formatCurrency(decisionBudgetGuidance.transferBudget)}</p>
            <p><strong>Projection trésorerie {decisionBudgetGuidance.horizonWeeks} sem. :</strong> {formatCurrency(decisionBudgetGuidance.projectedBalanceHorizon)}</p>
            <p><strong>Tendance nette récente :</strong> {formatCurrency(decisionBudgetGuidance.recentWeeklyNet)} / semaine</p>
            <p><strong>Réserve de sécurité visée :</strong> {formatCurrency(decisionBudgetGuidance.reserveTarget)}</p>
            <p><strong>Objectif club :</strong> {settings.clubObjective}</p>
            <p><strong>Tolérance salariale :</strong> {settings.salaryTolerance}</p>
            <p><strong>Axes équipe :</strong> {getStrategyAxisLabel(teamStrategy.primaryAxis)} / {getStrategyAxisLabel(teamStrategy.secondaryAxis)} / {getStrategyAxisLabel(teamStrategy.tertiaryAxis)}</p>
            <p><strong>Division Pro / U25 / U21 :</strong> {settings.divisionPro} / {settings.divisionU25} / {settings.divisionU21}</p>
            <p><strong>Effectif actuel :</strong> {formatInteger(currentRiders.length)} coureur(s)</p>
          </div>

          <div className="message-box">
            {messages.length > 0 ? (
              <ul className="clean-list">
                {messages.map((message, index) => (
                  <li key={`${message}-${index}`}>{message}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Analyse en attente.</p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Comparatif des candidats">
        {analyses.length === 0 ? (
          <p className="muted">Aucun candidat analysé pour le moment.</p>
        ) : (
          <div className="table-container">
            <table className="data-table styled-table transfer-table">
              <thead>
                <tr>
                  <th>Choix</th>
                  <th aria-sort={getAriaSort("name")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("name")}
                    >
                      Coureur{getSortIndicator("name")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("category")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("category")}
                    >
                      Cat.{getSortIndicator("category")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("score")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("score")}
                    >
                      Score{getSortIndicator("score")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("recommendation")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("recommendation")}
                    >
                      Avis{getSortIndicator("recommendation")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("total")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("total")}
                    >
                      Total{getSortIndicator("total")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("salaryWeekly")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("salaryWeekly")}
                    >
                      Salaire{getSortIndicator("salaryWeekly")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("value")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("value")}
                    >
                      Valeur{getSortIndicator("value")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("profileLabel")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("profileLabel")}
                    >
                      Profil{getSortIndicator("profileLabel")}
                    </button>
                  </th>
                  <th>Sélection</th>
                </tr>
              </thead>
              <tbody>
                {sortedAnalyses.map((analysis, index) => {
                  const isSelected = selectedAnalysis?.rider.id === analysis.rider.id;
                  const isBest = bestOption?.rider.id === analysis.rider.id;
                  const isShortlisted = shortlistedCandidateIds.includes(analysis.rider.id);
                  const rowClassName = [
                    isSelected ? "highlight-row" : "",
                    !analysis.canRecruit ? "transfer-row-blocked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={analysis.rider.id} className={rowClassName || undefined}>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => setSelectedCandidateId(analysis.rider.id)}
                        >
                          {isSelected ? "Sélectionné" : "Voir"}
                        </button>
                      </td>
                      <td>
                        {analysis.rider.name}
                        {isBest ? <div className="transfer-best-badge">Meilleur choix #{index + 1}</div> : null}
                        {!analysis.canRecruit ? <div className="transfer-blocked-badge">Interdit division</div> : null}
                      </td>
                      <td>{analysis.rider.category}</td>
                      <td>{analysis.score}/100</td>
                      <td>{analysis.recommendation}</td>
                      <td>{formatInteger(analysis.rider.total)}</td>
                      <td>{formatCurrency(analysis.rider.salaryWeekly)}</td>
                      <td>{formatCurrency(analysis.rider.value)}</td>
                      <td>{analysis.profileLabel}</td>
                      <td>
                        <label className="checkbox-line transfer-checkbox-line">
                          <input
                            type="checkbox"
                            checked={isShortlisted}
                            onChange={() => handleToggleShortlist(analysis.rider.id)}
                            aria-label={`Ajouter ${analysis.rider.name} à la sélection`}
                          />
                          <span>{isShortlisted ? "Retenu" : "Retenir"}</span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Sélection">
        {shortlistedAnalyses.length === 0 ? (
          <p className="muted">Aucun coureur retenu pour le moment.</p>
        ) : (
          <div className="page-stack">
            <div className="inline-actions transfer-actions">
              <button type="button" className="button button-secondary" onClick={handleClearShortlist}>
                Vider la sélection
              </button>
            </div>

            <div className="stats-kpi-grid transfer-selection-grid">
              {shortlistedAnalyses.map((analysis) => {
                const isCurrent = selectedAnalysis?.rider.id === analysis.rider.id;

                return (
                  <div
                    key={analysis.rider.id}
                    className={`card transfer-selection-card${!analysis.canRecruit ? " transfer-selection-card-blocked" : ""}`}
                  >
                    <div className="page-stack">
                      <div>
                        <strong>{analysis.rider.name}</strong>
                        <div className="muted">
                          {analysis.rider.category} · {analysis.score}/100 · {analysis.recommendation}
                        </div>
                      </div>

                      <div className="dashboard-lines transfer-selection-lines">
                        <p><strong>Total :</strong> {formatInteger(analysis.rider.total)}</p>
                        <p><strong>Salaire :</strong> {formatCurrency(analysis.rider.salaryWeekly)}</p>
                        <p><strong>Valeur :</strong> {formatCurrency(analysis.rider.value)}</p>
                        <p><strong>Enchère max :</strong> {formatCurrency(analysis.maxBid)}</p>
                      </div>

                      {!analysis.canRecruit ? (
                        <p className="transfer-selection-warning">Coureur interdit pour ta division ou ta structure actuelle.</p>
                      ) : null}

                      <div className="inline-actions transfer-selection-actions">
                        <button
                          type="button"
                          className={isCurrent ? "button button-primary button-small" : "button button-secondary button-small"}
                          onClick={() => setSelectedCandidateId(analysis.rider.id)}
                        >
                          {isCurrent ? "En cours" : "Analyser"}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => handleToggleShortlist(analysis.rider.id)}
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {selectedAnalysis ? (
        <>
          <div className="two-columns transfer-layout">
            <Card title={`Analyse détaillée - ${selectedAnalysis.rider.name}`}>
              <div className="page-stack">
                <div className="transfer-score-box">
                  <div>
                    <span className="stats-kpi-label">Score transfert</span>
                    <strong className="stats-kpi-value">{selectedAnalysis.score}/100</strong>
                  </div>
                  <div>
                    <span className="stats-kpi-label">Avis</span>
                    <strong className="transfer-score-recommendation">{selectedAnalysis.recommendation}</strong>
                  </div>
                </div>

                <div className="message-box">
                  <p>{selectedAnalysis.summary}</p>
                  {selectedAnalysis.blockingReasons.length > 0 ? (
                    <ul className="clean-list">
                      {selectedAnalysis.blockingReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="dashboard-lines">
                  <p><strong>Profil :</strong> {selectedAnalysis.profileLabel}</p>
                  <p><strong>Division :</strong> {selectedAnalysis.divisionFit}</p>
                  <p><strong>Effectif :</strong> {selectedAnalysis.squadFit}</p>
                  <p><strong>Budget :</strong> {selectedAnalysis.budgetFit}</p>
                  <p><strong>Enchère max :</strong> {selectedAnalysis.maxBidFit}</p>
                  <p><strong>Salaire :</strong> {selectedAnalysis.wageFit}</p>
                  <p><strong>Objectif :</strong> {selectedAnalysis.objectiveFit}</p>
                  <p><strong>Stratégie :</strong> {selectedAnalysis.strategyFit}</p>
                </div>
              </div>
            </Card>

            <Card title="Fiche synthèse">
              <div className="dashboard-lines">
                <p><strong>Equipe actuelle :</strong> {selectedAnalysis.rider.currentTeam || "-"}</p>
                <p><strong>Nationalité :</strong> {selectedAnalysis.rider.nationality || "-"}</p>
                <p><strong>Catégorie :</strong> {selectedAnalysis.rider.category}</p>
                <p><strong>Age :</strong> {selectedAnalysis.rider.ageYears} ans {selectedAnalysis.rider.ageWeeks} sem.</p>
                <p><strong>Forme :</strong> {selectedAnalysis.rider.form}</p>
                <p><strong>Total :</strong> {formatInteger(selectedAnalysis.rider.total)}</p>
                <p><strong>Valeur :</strong> {formatCurrency(selectedAnalysis.rider.value)}</p>
                <p><strong>Enchère max conseillée :</strong> {formatCurrency(selectedAnalysis.maxBid)}</p>
                <p><strong>Salaire hebdo :</strong> {formatCurrency(selectedAnalysis.rider.salaryWeekly)}</p>
                <p><strong>Blessure :</strong> {selectedAnalysis.rider.injury}</p>
              </div>
            </Card>
          </div>

          <div className="two-columns transfer-layout">
            <Card title="Points forts et besoins couverts">
              <div className="page-stack">
                <div>
                  <p className="field-label">Points forts</p>
                  <ul className="clean-list">
                    {selectedAnalysis.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="field-label">Besoins d'effectif couverts</p>
                  {selectedAnalysis.needMatches.length > 0 ? (
                    <ul className="clean-list">
                      {selectedAnalysis.needMatches.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Pas de besoin majeur couvert de façon évidente.</p>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Points de vigilance">
              {selectedAnalysis.concerns.length > 0 ? (
                <ul className="clean-list">
                  {selectedAnalysis.concerns.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Aucun signal d'alerte majeur détecté.</p>
              )}
            </Card>
          </div>

          <Card title="Comparaisons rapides">
            <div className="stats-kpi-grid transfer-comparison-grid">
              {selectedAnalysis.comparisons.map((comparison) => (
                <div key={comparison.label} className="card transfer-mini-card">
                  <span className="stats-kpi-label">{comparison.label}</span>
                  <strong className="stats-kpi-value transfer-mini-value">{comparison.value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Validation de l'achat">
            <div className="inline-actions transfer-actions">
              <button
                type="button"
                className="button button-primary"
                disabled={!selectedAnalysis.canRecruit}
                onClick={() => handleRecruit(selectedAnalysis)}
              >
                {selectedAnalysis.canRecruit
                  ? "Valider l'achat et intégrer à l'équipe"
                  : "Transfert refusé"}
              </button>
            </div>
            <p className="muted">
              {selectedAnalysis.canRecruit
                ? "Le coureur sera ajouté à l'effectif local et une écriture de transfert sera créée dans la finance."
                : "Le bouton reste désactivé tant qu'une règle bloquante de division ou de structure interdit l'embauche."}
            </p>
          </Card>
        </>
      ) : null}
    </div>
  );
}