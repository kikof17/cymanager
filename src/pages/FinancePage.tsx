import { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import { buildCrossRecommendations } from "../lib/app/crossRecommendations";
import CollapsibleBox from "../components/common/CollapsibleBox";
import {
  getPrizeAmount,
  getPrizeColumnLabelForDivision,
} from "../lib/finance/faqFinance";
import {
  addManualFinanceEntry,
  BEGINNER_GUIDE_SAFETY_RESERVE_TARGET,
  deleteManualFinanceEntry,
  getFinanceSnapshot,
} from "../lib/storage/financeStorage";
import { buildResultReferenceSummary, getAllResultsFromStorage, type ResultReferenceIssue } from "../lib/scoring/extractPoints";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import { loadManualTodos } from "../lib/storage/todoStorage";
import { formatCurrency } from "../lib/utils/numbers";
import { initialRiders } from "../store/initialState";
import type { FinanceEntryCategory } from "../types/finance";
import type { DivisionLevel } from "../types/settings";

type FinanceSortKey = "occurredAt" | "label" | "source" | "category" | "amount";

type FinanceSortConfig = {
  key: FinanceSortKey;
  direction: "asc" | "desc";
};

type HistoryWeekFilter = "current" | "previous";
type HistoryReferenceFilter = "all" | "invalid-race-prize";
type FinanceTab = "overview" | "operations" | "configuration" | "history";

const ENTRY_CATEGORY_OPTIONS: Array<{
  value: FinanceEntryCategory;
  label: string;
}> = [
  { value: "race-prize", label: "Prime de course" },
  { value: "season-prize", label: "Prime de fin de saison" },
  { value: "transfer", label: "Transfert" },
  { value: "other", label: "Autre" },
];

const DIVISION_OPTIONS: DivisionLevel[] = [
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "D7",
  "D8",
  "D9",
];

function formatDateLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTimeLabel(value: string | null): string {
  if (!value) {
    return "Pas encore traitée";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDefaultEntryDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultCategoryFromTableId(tableId: string): FinanceEntryCategory {
  return tableId.startsWith("season-") ? "season-prize" : "race-prize";
}

function getStartOfWeek(value: Date): Date {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + diff);

  return date;
}

function isEntryInSelectedWeek(
  occurredAt: string,
  filter: HistoryWeekFilter,
  referenceDate: Date
): boolean {
  const entryDate = new Date(occurredAt);

  if (Number.isNaN(entryDate.getTime())) {
    return false;
  }

  const currentWeekStart = getStartOfWeek(referenceDate);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  if (filter === "current") {
    return entryDate >= currentWeekStart && entryDate < nextWeekStart;
  }

  return entryDate >= previousWeekStart && entryDate < currentWeekStart;
}

function getReconciliationLineClass(
  severity: "info" | "warning" | "critical"
): string {
  if (severity === "critical") {
    return "finance-reconciliation-line finance-reconciliation-line-critical";
  }

  if (severity === "warning") {
    return "finance-reconciliation-line finance-reconciliation-line-warning";
  }

  return "finance-reconciliation-line finance-reconciliation-line-info";
}

function getRacePrizeCourseId(sourceKey?: string): string | null {
  if (!sourceKey || !sourceKey.startsWith("race-prize:")) {
    return null;
  }

  const [prefix, courseId] = sourceKey.split(":");

  if (prefix !== "race-prize" || !courseId) {
    return null;
  }

  return courseId;
}

function getReferenceBadgeClass(issue: ResultReferenceIssue | null): string {
  if (!issue || issue.status === "valid") {
    return "finance-badge finance-badge-sync";
  }

  return issue.status === "orphan"
    ? "finance-badge finance-reference-badge-critical"
    : "finance-badge finance-reference-badge-warning";
}

function getReferenceBadgeLabel(issue: ResultReferenceIssue | null): string {
  if (!issue || issue.status === "valid") {
    return "Référence OK";
  }

  if (issue.status === "missing-race-reference") {
    return "Référence manquante";
  }

  if (issue.status === "mismatched-race-reference") {
    return "Référence incohérente";
  }

  return "Résultat orphelin";
}

export default function FinancePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<FinanceTab>("overview");
  const [message, setMessage] = useState(
    "Le solde combine les écritures manuelles, les travaux détectés et les débits automatiques du lundi pour salaires et entretien."
  );
  const [entryType, setEntryType] = useState<"income" | "expense">("expense");
  const [entryLabel, setEntryLabel] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDate, setEntryDate] = useState(getDefaultEntryDate);
  const [entryCategory, setEntryCategory] =
    useState<FinanceEntryCategory>("other");
  const [entryNote, setEntryNote] = useState("");
  const [sortConfig, setSortConfig] = useState<FinanceSortConfig>({
    key: "occurredAt",
    direction: "desc",
  });
  const [historyWeekFilter, setHistoryWeekFilter] =
    useState<HistoryWeekFilter>("current");
  const [historyReferenceFilter, setHistoryReferenceFilter] =
    useState<HistoryReferenceFilter>("all");

  const settings = useMemo(() => loadClubSettings(), [refreshKey]);
  const riders = useMemo(() => {
    const stored = loadRidersFromStorage();
    return stored.length > 0 ? stored : initialRiders;
  }, [refreshKey]);
  const snapshot = useMemo(
    () => getFinanceSnapshot(settings, riders),
    [settings, riders]
  );
  const resultReferenceSummary = useMemo(
    () => buildResultReferenceSummary(getAllResultsFromStorage(), loadManualTodos().filter((todo) => todo.id.startsWith("calendar-"))),
    [refreshKey]
  );
  const resultReferenceIssueMap = useMemo(
    () => new Map(resultReferenceSummary.issues.map((issue) => [issue.courseId, issue])),
    [resultReferenceSummary.issues]
  );
  const sortedEntries = useMemo(() => {
    const entries = [...snapshot.state.entries];

    entries.sort((left, right) => {
      switch (sortConfig.key) {
        case "occurredAt": {
          const leftValue = new Date(left.occurredAt).getTime();
          const rightValue = new Date(right.occurredAt).getTime();
          return sortConfig.direction === "asc"
            ? leftValue - rightValue
            : rightValue - leftValue;
        }
        case "amount":
          return sortConfig.direction === "asc"
            ? left.amount - right.amount
            : right.amount - left.amount;
        case "label":
          return sortConfig.direction === "asc"
            ? left.label.localeCompare(right.label, "fr")
            : right.label.localeCompare(left.label, "fr");
        case "source": {
          const leftValue = left.source === "sync" ? "Auto" : "Manuel";
          const rightValue = right.source === "sync" ? "Auto" : "Manuel";
          return sortConfig.direction === "asc"
            ? leftValue.localeCompare(rightValue, "fr")
            : rightValue.localeCompare(leftValue, "fr");
        }
        case "category":
          return sortConfig.direction === "asc"
            ? left.category.localeCompare(right.category, "fr")
            : right.category.localeCompare(left.category, "fr");
        default:
          return 0;
      }
    });

    return entries;
  }, [snapshot.state.entries, sortConfig]);
  const entriesBySelectedWeek = useMemo(
    () =>
      sortedEntries.filter((entry) =>
        isEntryInSelectedWeek(entry.occurredAt, historyWeekFilter, new Date())
      ),
    [historyWeekFilter, sortedEntries]
  );
  const invalidReferencePrizeCount = useMemo(
    () =>
      entriesBySelectedWeek.filter((entry) => {
        if (entry.category !== "race-prize") {
          return false;
        }

        const issue = resultReferenceIssueMap.get(getRacePrizeCourseId(entry.sourceKey) ?? "") ?? null;
        return Boolean(issue && issue.status !== "valid");
      }).length,
    [entriesBySelectedWeek, resultReferenceIssueMap]
  );
  const filteredEntries = useMemo(() => {
    if (historyReferenceFilter === "all") {
      return entriesBySelectedWeek;
    }

    return entriesBySelectedWeek.filter((entry) => {
      if (entry.category !== "race-prize") {
        return false;
      }

      const issue = resultReferenceIssueMap.get(getRacePrizeCourseId(entry.sourceKey) ?? "") ?? null;
      return Boolean(issue && issue.status !== "valid");
    });
  }, [entriesBySelectedWeek, historyReferenceFilter, resultReferenceIssueMap]);
  const crossRecommendations = useMemo(
    () =>
      buildCrossRecommendations({
        riders,
        resultReferenceSummary,
        invalidRacePrizeCount: invalidReferencePrizeCount,
        currentBalance: snapshot.currentBalance,
        weeklyFixedCosts: snapshot.weeklyFixedCosts,
      }),
    [
      invalidReferencePrizeCount,
      resultReferenceSummary,
      riders,
      snapshot.currentBalance,
      snapshot.weeklyFixedCosts,
    ]
  );
  const weeklyResultStats = useMemo(() => {
    const income = filteredEntries
      .filter((entry) => entry.amount > 0)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = Math.abs(
      filteredEntries
        .filter((entry) => entry.amount < 0)
        .reduce((sum, entry) => sum + entry.amount, 0)
    );
    const netResult = income - expenses;
    const racePrizes = filteredEntries
      .filter((entry) => entry.category === "race-prize" && entry.amount > 0)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const transferBalance = filteredEntries
      .filter((entry) => entry.category === "transfer")
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      income,
      expenses,
      netResult,
      racePrizes,
      transferBalance,
      entriesCount: filteredEntries.length,
    };
  }, [filteredEntries]);

  const defaultPrizeTable = snapshot.prizeTables[0];
  const [selectedPrizeTableId, setSelectedPrizeTableId] = useState(
    defaultPrizeTable?.id ?? ""
  );
  const [selectedPrizeDivision, setSelectedPrizeDivision] =
    useState<DivisionLevel>("D9");
  const [selectedPrizePosition, setSelectedPrizePosition] = useState(
    defaultPrizeTable?.rows[0]?.position ?? ""
  );

  const selectedPrizeTable =
    snapshot.prizeTables.find((table) => table.id === selectedPrizeTableId) ??
    defaultPrizeTable;
  const defaultColumnLabel = selectedPrizeTable?.columnLabels[0] ?? "";
  const selectedPrizeColumn = selectedPrizeTable?.columnLabels.includes(
    getPrizeColumnLabelForDivision(selectedPrizeDivision)
  )
    ? getPrizeColumnLabelForDivision(selectedPrizeDivision)
    : defaultColumnLabel;
  const selectedPrizeAmount = selectedPrizeTable
    ? getPrizeAmount(
        selectedPrizeTable.id,
        selectedPrizePosition,
        selectedPrizeColumn
      )
    : null;

  useEffect(() => {
    function handleFinanceUpdated() {
      setRefreshKey((value) => value + 1);
    }

    window.addEventListener("cymanager:finance-updated", handleFinanceUpdated);

    return () => {
      window.removeEventListener("cymanager:finance-updated", handleFinanceUpdated);
    };
  }, []);

  function refreshPage(nextMessage: string) {
    setMessage(nextMessage);
    setRefreshKey((value) => value + 1);
  }

  function handleManualEntrySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAmount = Number.parseInt(entryAmount.replace(/[^\d-]/g, ""), 10);

    if (!entryLabel.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setMessage("Renseigne un libellé et un montant strictement positif.");
      return;
    }

    addManualFinanceEntry(
      {
        label: entryLabel.trim(),
        amount: entryType === "expense" ? -parsedAmount : parsedAmount,
        occurredAt: entryDate,
        category: entryCategory,
        note: entryNote.trim(),
      },
      settings.financialBalance
    );

    setEntryLabel("");
    setEntryAmount("");
    setEntryDate(getDefaultEntryDate());
    setEntryCategory("other");
    setEntryNote("");
    refreshPage("Écriture manuelle ajoutée.");
  }

  function handleDeleteEntry(entryId: string) {
    deleteManualFinanceEntry(entryId, settings.financialBalance);
    refreshPage("Écriture manuelle supprimée.");
  }

  function handlePrizeTableChange(tableId: string) {
    const nextTable = snapshot.prizeTables.find((table) => table.id === tableId);

    setSelectedPrizeTableId(tableId);
    setSelectedPrizePosition(nextTable?.rows[0]?.position ?? "");
  }

  function handlePrizeIncomeAdd() {
    if (!selectedPrizeTable || selectedPrizeAmount === null) {
      setMessage("Impossible d'ajouter ce revenu FAQ : montant introuvable.");
      return;
    }

    addManualFinanceEntry(
      {
        label: `${selectedPrizeTable.title} - ${selectedPrizePosition}`,
        amount: selectedPrizeAmount,
        occurredAt: entryDate,
        category: getDefaultCategoryFromTableId(selectedPrizeTable.id),
        note: `Ajout depuis le barème FAQ (${selectedPrizeColumn}).`,
      },
      settings.financialBalance
    );

    refreshPage("Prime FAQ ajoutée comme revenu.");
  }

  function handleSort(key: FinanceSortKey) {
    setSortConfig((previous) => {
      if (previous.key === key) {
        return {
          key,
          direction: previous.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: "asc" };
    });
  }

  function getSortIndicator(key: FinanceSortKey): string {
    if (sortConfig.key !== key) {
      return "";
    }

    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  }

  function getAriaSort(key: FinanceSortKey): "ascending" | "descending" | "none" {
    if (sortConfig.key !== key) {
      return "none";
    }

    return sortConfig.direction === "asc" ? "ascending" : "descending";
  }

  return (
    <div className="page-stack">
      <PageTitle
        title="Finance"
        subtitle="Suivi de la trésorerie du club, avec débits automatiques du lundi et revenus sponsors/boutique saisis manuellement."
      />

      <section className="finance-board" aria-label="Tableau de bord financier">
        <div className="finance-board-header">
          <span className="finance-board-title">Trésorerie</span>
        </div>
        <div className="finance-board-grid">
          <div className={`finance-board-item ${snapshot.currentBalance < 0 ? "finance-board-item--danger" : snapshot.currentBalance < BEGINNER_GUIDE_SAFETY_RESERVE_TARGET ? "finance-board-item--warning" : "finance-board-item--success"}`}>
            <span className="finance-board-label">Solde actuel</span>
            <span className="finance-board-value">{formatCurrency(snapshot.currentBalance)}</span>
          </div>
          <div className={`finance-board-item ${snapshot.projectedBalanceAfterWeeklyCosts < 0 ? "finance-board-item--danger" : "finance-board-item--neutral"}`}>
            <span className="finance-board-label">Solde projeté</span>
            <span className="finance-board-value">{formatCurrency(snapshot.projectedBalanceAfterWeeklyCosts)}</span>
            <span className="finance-board-sub">après charges semaine</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Revenus cumulés</span>
            <span className="finance-board-value">{formatCurrency(snapshot.totalIncome)}</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Dépenses cumulées</span>
            <span className="finance-board-value">{formatCurrency(snapshot.totalExpenses)}</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Charges hebdo</span>
            <span className="finance-board-value">{formatCurrency(snapshot.weeklyFixedCosts)}</span>
            <span className="finance-board-sub">salaires + infra</span>
          </div>
          <div className={`finance-board-item ${crossRecommendations.finance.some(r => r.severity === "critical") ? "finance-board-item--danger" : crossRecommendations.finance.some(r => r.severity === "warning") ? "finance-board-item--warning" : "finance-board-item--success"}`}>
            <span className="finance-board-label">Alertes</span>
            <span className="finance-board-value">
              {(() => {
                const crit = crossRecommendations.finance.filter(r => r.severity === "critical").length;
                const warn = crossRecommendations.finance.filter(r => r.severity === "warning").length;
                if (crit > 0) return `${crit} critique${crit > 1 ? "s" : ""}`;
                if (warn > 0) return `${warn} vigilance`;
                return "RAS";
              })()}
            </span>
          </div>
        </div>
      </section>

      <div className="stats-tabs">
        <button
          type="button"
          className={tab === "overview" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("overview")}
        >
          Vue d'ensemble
        </button>
        <button
          type="button"
          className={tab === "operations" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("operations")}
        >
          Opérations
        </button>
        <button
          type="button"
          className={tab === "configuration" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("configuration")}
        >
          Configuration
        </button>
        <button
          type="button"
          className={tab === "history" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("history")}
        >
          Historique
        </button>
      </div>

      {tab === "overview" && (
        <div className="page-stack">
          <div className="message-box">
            <p className="muted">{message}</p>
          </div>

          <Card title="Recommandations croisées finance">
            <CollapsibleBox title="Afficher / masquer les recommandations" defaultExpanded={crossRecommendations.finance.some((item) => item.severity !== "info")}>
              <div className="dashboard-lines">
                {crossRecommendations.finance.map((item, index) => (
                  <p key={`${item.severity}-${index}`} className={item.severity === "critical" ? "settings-diagnostic-line settings-diagnostic-line-warning" : undefined}>
                    <strong>{item.severity === "critical" ? "Critique" : item.severity === "warning" ? "Vigilance" : "Info"}:</strong> {item.text}
                  </p>
                ))}
              </div>
            </CollapsibleBox>
          </Card>

          <div className="finance-summary-grid">
        <Card title="Solde actuel">
          <p className="finance-summary-value">
            {formatCurrency(snapshot.currentBalance)}
          </p>
          <p className="muted">
            Capital de départ : {formatCurrency(snapshot.state.startingBalance)}
          </p>
        </Card>

        <Card title="Revenus cumulés">
          <p className="finance-summary-value finance-positive">
            {formatCurrency(snapshot.totalIncome)}
          </p>
          <p className="muted">Saisis manuellement ou via les barèmes FAQ.</p>
        </Card>

        <Card title="Dépenses cumulées">
          <p className="finance-summary-value finance-negative">
            {formatCurrency(snapshot.totalExpenses)}
          </p>
          <p className="muted">Inclut les travaux détectés automatiquement.</p>
        </Card>

        <Card title="Charges hebdomadaires">
          <p className="finance-summary-value">
            {formatCurrency(snapshot.weeklyFixedCosts)}
          </p>
          <p className="muted">
            Salaires {formatCurrency(snapshot.weeklySalaryExpense)} + entretien {formatCurrency(snapshot.weeklyFacilityMaintenance)}
          </p>
        </Card>
      </div>
        </div>
      )}

      {tab === "operations" && (
        <div className="page-stack">
          <div className="two-columns finance-layout">
        <Card title="Ajouter une opération">
          <form className="page-stack" onSubmit={handleManualEntrySubmit}>
            <div className="settings-grid">
              <div>
                <label className="field-label" htmlFor="finance-entry-type">
                  Type
                </label>
                <select
                  id="finance-entry-type"
                  className="input"
                  value={entryType}
                  onChange={(event) =>
                    setEntryType(event.target.value as "income" | "expense")
                  }
                >
                  <option value="income">Revenu</option>
                  <option value="expense">Dépense</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="finance-entry-category">
                  Catégorie
                </label>
                <select
                  id="finance-entry-category"
                  className="input"
                  value={entryCategory}
                  onChange={(event) =>
                    setEntryCategory(event.target.value as FinanceEntryCategory)
                  }
                >
                  {ENTRY_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="finance-entry-label">
                Libellé
              </label>
              <input
                id="finance-entry-label"
                className="input"
                type="text"
                value={entryLabel}
                onChange={(event) => setEntryLabel(event.target.value)}
                placeholder="Ex. prime de course, achat matériel, sponsor..."
              />
            </div>

            <div className="settings-grid">
              <div>
                <label className="field-label" htmlFor="finance-entry-amount">
                  Montant (€)
                </label>
                <input
                  id="finance-entry-amount"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  value={entryAmount}
                  onChange={(event) => setEntryAmount(event.target.value)}
                  placeholder="Ex. 90979"
                />
              </div>

              <div>
                <label className="field-label" htmlFor="finance-entry-date">
                  Date
                </label>
                <input
                  id="finance-entry-date"
                  className="input"
                  type="date"
                  value={entryDate}
                  onChange={(event) => setEntryDate(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="finance-entry-note">
                Note
              </label>
              <textarea
                id="finance-entry-note"
                className="textarea"
                rows={4}
                value={entryNote}
                onChange={(event) => setEntryNote(event.target.value)}
                placeholder="Optionnel"
              />
            </div>

            <div className="inline-actions">
              <button type="submit" className="button button-primary">
                Ajouter l'opération
              </button>
            </div>
          </form>
        </Card>

        <Card title="Assistant primes FAQ">
          <div className="page-stack">
            <p className="muted">
              Utilise les barèmes de la FAQ pour transformer rapidement une prime en revenu comptabilisé.
            </p>

            <div>
              <label className="field-label" htmlFor="finance-prize-table">
                Barème
              </label>
              <select
                id="finance-prize-table"
                className="input"
                value={selectedPrizeTable?.id ?? ""}
                onChange={(event) => handlePrizeTableChange(event.target.value)}
              >
                {snapshot.prizeTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedPrizeTable?.columnLabels.some((label) =>
              label.startsWith("Division ")
            ) ? (
              <div>
                <label className="field-label" htmlFor="finance-prize-division">
                  Division
                </label>
                <select
                  id="finance-prize-division"
                  className="input"
                  value={selectedPrizeDivision}
                  onChange={(event) =>
                    setSelectedPrizeDivision(event.target.value as DivisionLevel)
                  }
                >
                  {DIVISION_OPTIONS.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="field-label" htmlFor="finance-prize-position">
                Position
              </label>
              <select
                id="finance-prize-position"
                className="input"
                value={selectedPrizePosition}
                onChange={(event) => setSelectedPrizePosition(event.target.value)}
              >
                {selectedPrizeTable?.rows.map((row) => (
                  <option key={row.position} value={row.position}>
                    {row.position}
                  </option>
                ))}
              </select>
            </div>

            <div className="finance-prize-preview">
              <span className="muted">Montant détecté</span>
              <strong className="finance-summary-value finance-positive">
                {selectedPrizeAmount === null
                  ? "Non disponible"
                  : formatCurrency(selectedPrizeAmount)}
              </strong>
              <span className="muted">Colonne FAQ : {selectedPrizeColumn}</span>
            </div>

            <div className="inline-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={handlePrizeIncomeAdd}
                disabled={selectedPrizeAmount === null}
              >
                Ajouter ce revenu
              </button>
            </div>
          </div>
        </Card>
      </div>
        </div>
      )}

      {tab === "configuration" && (
        <div className="page-stack">
          <div className="two-columns finance-layout">
            <Card title="Charges automatiques et projection">
              <div className="dashboard-lines">
                <p>
                  <strong>Dernier lundi traité automatiquement :</strong>{" "}
                  {formatDateTimeLabel(snapshot.weeklyEconomyProcessedThrough)}
                </p>
                <p>
                  <strong>Masse salariale hebdomadaire :</strong>{" "}
                  {formatCurrency(snapshot.weeklySalaryExpense)}
                </p>
                <p>
                  <strong>Entretien hebdomadaire des installations :</strong>{" "}
                  {formatCurrency(snapshot.weeklyFacilityMaintenance)}
                </p>
                <p>
                  <strong>Solde après une semaine de charges fixes :</strong>{" "}
                  {formatCurrency(snapshot.projectedBalanceAfterWeeklyCosts)}
                </p>
                <p>
                  <strong>Travaux planifiés à provisionner :</strong>{" "}
                  {formatCurrency(snapshot.plannedFacilityUpgradeCost)}
                </p>
                <p>
                  <strong>Projection trésorerie à 3 semaines :</strong>{" "}
                  {formatCurrency(snapshot.projectedBalanceAfterThreeWeeks)}
                </p>
                <p>
                  <strong>Réserve de sécurité visée :</strong>{" "}
                  {formatCurrency(BEGINNER_GUIDE_SAFETY_RESERVE_TARGET)}
                </p>
                <p>
                  <strong>Revenus sponsors / boutique :</strong>{" "}
                  à saisir manuellement chaque lundi.
                </p>
              </div>
            </Card>

            <Card title="Audit de réconciliation">
          <div className="page-stack">
            <div className="finance-reconciliation-stats">
              <div className="finance-prize-preview">
                <span className="muted">Source salariale active</span>
                <strong>
                  {snapshot.reconciliation.activeSalarySource === "parametree"
                    ? "Valeur paramétrée"
                    : "Effectif détecté"}
                </strong>
                <span className="muted">
                  Écart paramètre / effectif : {formatCurrency(snapshot.reconciliation.salaryReferenceGap)}
                </span>
              </div>

              <div className="finance-prize-preview">
                <span className="muted">Écritures synchronisées</span>
                <strong>{snapshot.reconciliation.syncEntryCount}</strong>
                <span className="muted">
                  {snapshot.reconciliation.racePrizeEntryCount} prime(s) course, {snapshot.reconciliation.facilityEntryCount} travaux
                </span>
              </div>

              <div className="finance-prize-preview">
                <span className="muted">Corrections auto appliquées</span>
                <strong>{snapshot.reconciliation.correctionsApplied}</strong>
                <span className="muted">
                  Nettoyage et réalignement des écritures automatiques
                </span>
              </div>
            </div>

            <div className="message-box">
              <p>
                <strong>Références résultats :</strong> {resultReferenceSummary.validCount} valide(s), {resultReferenceSummary.missingRaceReferenceCount} sans référence, {resultReferenceSummary.mismatchedRaceReferenceCount} incohérente(s), {resultReferenceSummary.orphanCount} orpheline(s).
              </p>
            </div>

            {snapshot.reconciliation.issues.length === 0 ? (
              <p className="muted">Aucune incohérence notable détectée.</p>
            ) : (
              <div className="dashboard-lines">
                {snapshot.reconciliation.issues.map((issue) => (
                  <p key={issue.code} className={getReconciliationLineClass(issue.severity)}>
                    <strong>{issue.label}</strong>
                    {typeof issue.amount === "number" ? (
                      <span> {formatCurrency(issue.amount)}</span>
                    ) : null}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="two-columns finance-layout">
        <Card title="Mise à jour économique du lundi">
          <div className="page-stack">
            <div className="finance-reconciliation-stats">
              <div className="finance-prize-preview">
                <span className="muted">Débits auto du lundi</span>
                <strong>{snapshot.weeklyEconomyEntries.length}</strong>
                <span className="muted">Salaires + entretien générés automatiquement</span>
              </div>

              <div className="finance-prize-preview">
                <span className="muted">Salaire pris en compte</span>
                <strong>{formatCurrency(snapshot.weeklySalaryExpense)}</strong>
                <span className="muted">Prélevé chaque lundi</span>
              </div>

              <div className="finance-prize-preview">
                <span className="muted">Entretien pris en compte</span>
                <strong>{formatCurrency(snapshot.weeklyFacilityMaintenance)}</strong>
                <span className="muted">Prélevé chaque lundi</span>
              </div>
            </div>

            <p className="muted">
              Les salaires des coureurs et l'entretien des installations sont ajoutés automatiquement chaque lundi. Les revenus sponsors et boutique restent à saisir manuellement via les opérations ci-dessus.
            </p>

            {snapshot.weeklyEconomyEntries.length === 0 ? (
              <p className="muted">Aucune écriture hebdomadaire automatique enregistrée pour le moment.</p>
            ) : (
              <div className="finance-entry-list">
                {snapshot.weeklyEconomyEntries.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="finance-entry-item">
                    <div>
                      <strong>{entry.label}</strong>
                      <p className="muted">{formatDateLabel(entry.occurredAt)}</p>
                      {entry.note ? <p className="muted">{entry.note}</p> : null}
                    </div>
                    <strong className="finance-negative">
                      {formatCurrency(entry.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Travaux détectés depuis Paramètres">
          {snapshot.facilityEntries.length === 0 ? (
            <p className="muted">Aucun coût automatique détecté pour le moment.</p>
          ) : (
            <div className="finance-entry-list">
              {snapshot.facilityEntries.map((entry) => (
                <div key={entry.id} className="finance-entry-item">
                  <div>
                    <strong>{entry.label}</strong>
                    <p className="muted">{formatDateLabel(entry.occurredAt)}</p>
                    {entry.note ? <p className="muted">{entry.note}</p> : null}
                  </div>
                  <strong className="finance-negative">
                    {formatCurrency(entry.amount)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
        </div>
      )}

      {tab === "history" && (
        <div className="page-stack">
          <Card title="Primes de course synchronisées">
            <CollapsibleBox title="Afficher / masquer les primes synchronisées" defaultExpanded={false}>
              <div className="page-stack">
                <p className="muted">
                  Les primes ci-dessous sont générées depuis les résultats. Une référence non validée signale qu'un revenu dépend encore d'un résultat à réaligner ou devenu orphelin.
                </p>

                {snapshot.racePrizeEntries.length === 0 ? (
                  <p className="muted">Aucune prime de course synchronisée pour le moment.</p>
                ) : (
                  <div className="finance-entry-list">
                    {snapshot.racePrizeEntries.map((entry) => {
                      const issue = resultReferenceIssueMap.get(getRacePrizeCourseId(entry.sourceKey) ?? "") ?? null;

                      return (
                        <div
                          key={entry.id}
                          className={issue && issue.status !== "valid" ? "finance-entry-item finance-entry-item-warning" : "finance-entry-item"}
                        >
                          <div className="finance-entry-copy">
                            <strong>{entry.label}</strong>
                            <p className="muted">{formatDateLabel(entry.occurredAt)}</p>
                            {entry.note ? <p className="muted">{entry.note}</p> : null}
                            <span className={getReferenceBadgeClass(issue)}>
                              {getReferenceBadgeLabel(issue)}
                            </span>
                          </div>
                          <strong className="finance-positive">
                            {formatCurrency(entry.amount)}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CollapsibleBox>
          </Card>

      <Card title="Historique des écritures">
        {snapshot.state.entries.length === 0 ? (
          <p className="muted">Aucune écriture enregistrée pour le moment.</p>
        ) : (
          <div className="page-stack">
            <div className="finance-history-filters">
              <button
                type="button"
                className={
                  historyWeekFilter === "current"
                    ? "button button-primary finance-filter-button"
                    : "button button-secondary finance-filter-button"
                }
                onClick={() => setHistoryWeekFilter("current")}
              >
                Semaine en cours
              </button>
              <button
                type="button"
                className={
                  historyWeekFilter === "previous"
                    ? "button button-primary finance-filter-button"
                    : "button button-secondary finance-filter-button"
                }
                onClick={() => setHistoryWeekFilter("previous")}
              >
                Semaine passée
              </button>
              <button
                type="button"
                className={
                  historyReferenceFilter === "all"
                    ? "button button-primary finance-filter-button"
                    : "button button-secondary finance-filter-button"
                }
                onClick={() => setHistoryReferenceFilter("all")}
              >
                Toutes les écritures
              </button>
              <button
                type="button"
                className={
                  historyReferenceFilter === "invalid-race-prize"
                    ? "button button-primary finance-filter-button"
                    : "button button-secondary finance-filter-button"
                }
                onClick={() => setHistoryReferenceFilter("invalid-race-prize")}
              >
                Primes à référence non validée ({invalidReferencePrizeCount})
              </button>
            </div>

            {filteredEntries.length === 0 ? (
              <p className="muted">
                {historyReferenceFilter === "invalid-race-prize"
                  ? "Aucune prime à référence non validée sur la période sélectionnée."
                  : "Aucune écriture sur la période sélectionnée."}
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
              <thead>
                <tr>
                  <th aria-sort={getAriaSort("occurredAt")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("occurredAt")}
                    >
                      Date{getSortIndicator("occurredAt")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("label")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("label")}
                    >
                      Libellé{getSortIndicator("label")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("source")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("source")}
                    >
                      Source{getSortIndicator("source")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("category")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("category")}
                    >
                      Catégorie{getSortIndicator("category")}
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("amount")}>
                    <button
                      type="button"
                      className="table-sort-button"
                      onClick={() => handleSort("amount")}
                    >
                      Montant{getSortIndicator("amount")}
                    </button>
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={
                      entry.category === "race-prize" &&
                      (resultReferenceIssueMap.get(getRacePrizeCourseId(entry.sourceKey) ?? "")?.status ?? "valid") !== "valid"
                        ? "finance-history-row-warning"
                        : undefined
                    }
                  >
                    <td>{formatDateLabel(entry.occurredAt)}</td>
                    <td>
                      <strong>{entry.label}</strong>
                      {entry.note ? <div className="muted">{entry.note}</div> : null}
                      {entry.category === "race-prize" ? (
                        <div className="muted">
                          {getReferenceBadgeLabel(
                            resultReferenceIssueMap.get(getRacePrizeCourseId(entry.sourceKey) ?? "") ?? null
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={
                          entry.source === "sync"
                            ? "finance-badge finance-badge-sync"
                            : "finance-badge finance-badge-manual"
                        }
                      >
                        {entry.source === "sync" ? "Auto" : "Manuel"}
                      </span>
                    </td>
                    <td>{entry.category}</td>
                    <td
                      className={
                        entry.amount >= 0
                          ? "finance-positive"
                          : "finance-negative"
                      }
                    >
                      {formatCurrency(entry.amount)}
                    </td>
                    <td>
                      {entry.source === "manual" ? (
                        <button
                          type="button"
                          className="button button-secondary finance-inline-button"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          Supprimer
                        </button>
                      ) : (
                        <span className="muted">
                          {entry.sourceKey?.startsWith("weekly-")
                            ? "Depuis la mise à jour du lundi"
                            : entry.category === "race-prize"
                              ? "Depuis les résultats"
                              : "Depuis Paramètres"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card
        title={`Résultat de la semaine - ${
          historyWeekFilter === "current" ? "Semaine en cours" : "Semaine passée"
        }`}
      >
        <div className="page-stack">
          <div className="finance-week-stats-grid">
            <div className="card finance-week-stat-card">
              <span className="stats-kpi-label">Résultat net</span>
              <strong
                className={
                  weeklyResultStats.netResult >= 0
                    ? "finance-summary-value finance-positive"
                    : "finance-summary-value finance-negative"
                }
              >
                {formatCurrency(weeklyResultStats.netResult)}
              </strong>
            </div>
            <div className="card finance-week-stat-card">
              <span className="stats-kpi-label">Revenus</span>
              <strong className="finance-summary-value finance-positive">
                {formatCurrency(weeklyResultStats.income)}
              </strong>
            </div>
            <div className="card finance-week-stat-card">
              <span className="stats-kpi-label">Dépenses</span>
              <strong className="finance-summary-value finance-negative">
                {formatCurrency(weeklyResultStats.expenses)}
              </strong>
            </div>
            <div className="card finance-week-stat-card">
              <span className="stats-kpi-label">Primes de course</span>
              <strong className="finance-summary-value">
                {formatCurrency(weeklyResultStats.racePrizes)}
              </strong>
              <span className="muted">
                Transferts : {formatCurrency(weeklyResultStats.transferBalance)}
              </span>
            </div>
          </div>

          <p className="muted finance-week-stats-note">
            {weeklyResultStats.entriesCount} écriture(s) prises en compte sur la période sélectionnée.
          </p>
        </div>
      </Card>
        </div>
      )}
    </div>
  );
}