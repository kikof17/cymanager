import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/common/Card";
import ConfirmDialog from "../components/common/ConfirmDialog";
import PageTitle from "../components/common/PageTitle";
import { mergeRidersByName } from "../lib/parser/rosterParser";
import {
  parseTransferMarketData,
} from "../lib/parser/transferMarketParser";
import { getStrategyAxisLabel } from "../lib/roster/rosterAnalysis";
import {
  analyzeTransferCandidates,
  type TransferAnalysis,
} from "../lib/transfers/transferAnalysis";
import {
  addManualFinanceEntry,
  BEGINNER_GUIDE_SAFETY_RESERVE_TARGET,
  getFinanceSnapshot,
} from "../lib/storage/financeStorage";
import { loadRidersFromStorage, saveRidersToStorage } from "../lib/storage/localStorage";
import { appendManagementHistoryEntry } from "../lib/storage/managementHistoryStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import { loadTeamStrategy } from "../lib/storage/teamStrategyStorage";
import { appendTransferHistoryEntry, loadTransferHistory } from "../lib/storage/transferHistoryStorage";
import { simulateRecruitment } from "../lib/finance/recruitmentSimulator";
import { formatCurrency, formatInteger, parseFrenchInteger } from "../lib/utils/numbers";
import { initialRiders } from "../store/initialState";
import type { Rider } from "../types/rider";
import type { ClubSettings } from "../types/settings";
import type { TransferHistoryEntry, TransferMarketCandidate } from "../types/transfer";

type TransferSortKey =
  | "name"
  | "category"
  | "age"
  | "form"
  | "score"
  | "recommendation"
  | "total"
  | "salaryWeekly"
  | "value"
  | "currentBid"
  | "deadlineAt"
  | "profileLabel";

type TransferSortConfig = {
  key: TransferSortKey;
  direction: "asc" | "desc";
} | null;

type DecisionBudgetGuidance = {
  salaryCap: number;
  salaryHeadroom: number;
  transferBudget: number;
  projectedBalanceHorizon: number;
  recentWeeklyNet: number;
  reserveTarget: number;
  horizonWeeks: number;
};

type DecisionSalarySummary = {
  currentWeeklySalaryExpense: number;
  projectedWeeklySalaryExpense: number;
  projectedSalaryDelta: number;
  projectedSalaryHeadroom: number;
};

type PersistedTransfersPageState = {
  marketRidersCsv: string;
  marketAuctionsCsv: string;
  messages: string[];
  candidates: TransferMarketCandidate[];
  selectedCandidateId: string;
  shortlistedCandidateIds: string[];
  transferAmount: string;
  transferDate: string;
  sortConfig: TransferSortConfig;
};

function isPersistedTransferMarketCandidate(value: unknown): value is TransferMarketCandidate {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TransferMarketCandidate>;
  const rider = candidate.rider as Partial<Rider> | undefined;
  const auction = candidate.auction as Partial<TransferMarketCandidate["auction"]> | undefined;

  return Boolean(
    typeof candidate.id === "string" &&
      rider &&
      typeof rider.id === "string" &&
      typeof rider.name === "string" &&
      typeof rider.total === "number" &&
      typeof rider.salaryWeekly === "number" &&
      auction &&
      typeof auction.deadlineAt === "string" &&
      typeof auction.currentBid === "number"
  );
}

function getPriorityGrade(score: number, canRecruit: boolean): string {
  if (!canRecruit) {
    return "F";
  }

  if (score >= 95) {
    return "A+";
  }

  if (score >= 90) {
    return "A";
  }

  if (score >= 85) {
    return "A-";
  }

  if (score >= 80) {
    return "B+";
  }

  if (score >= 75) {
    return "B";
  }

  if (score >= 70) {
    return "B-";
  }

  if (score >= 65) {
    return "C+";
  }

  if (score >= 60) {
    return "C";
  }

  if (score >= 55) {
    return "C-";
  }

  if (score >= 50) {
    return "D+";
  }

  if (score >= 45) {
    return "D";
  }

  if (score >= 40) {
    return "D-";
  }

  return "F";
}

function getPriorityGradeRank(score: number, canRecruit: boolean): number {
  const grade = getPriorityGrade(score, canRecruit);
  const rankByGrade: Record<string, number> = {
    "A+": 13,
    A: 12,
    "A-": 11,
    "B+": 10,
    B: 9,
    "B-": 8,
    "C+": 7,
    C: 6,
    "C-": 5,
    "D+": 4,
    D: 3,
    "D-": 2,
    F: 1,
  };

  return rankByGrade[grade] ?? 0;
}

function getSalaryOverrunSeverityClass(overrun: number, salaryCap: number): string {
  if (overrun <= 0 || salaryCap <= 0) {
    return "";
  }

  const overrunRatio = overrun / salaryCap;

  if (overrunRatio <= 0.03) {
    return "transfer-salary-overrun-low";
  }

  if (overrunRatio <= 0.08) {
    return "transfer-salary-overrun-medium";
  }

  return "transfer-salary-overrun-high";
}

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

const TRANSFERS_PAGE_STATE_KEY = "cymanager:transfers-page-state";

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
  const reserveTarget = BEGINNER_GUIDE_SAFETY_RESERVE_TARGET;
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

function getDefaultTransfersPageState(): PersistedTransfersPageState {
  return {
    marketRidersCsv: "",
    marketAuctionsCsv: "",
    messages: [],
    candidates: [],
    selectedCandidateId: "",
    shortlistedCandidateIds: [],
    transferAmount: "",
    transferDate: getDefaultTransferDate(),
    sortConfig: null,
  };
}

function loadTransfersPageState(): PersistedTransfersPageState {
  const fallback = getDefaultTransfersPageState();

  try {
    const raw = localStorage.getItem(TRANSFERS_PAGE_STATE_KEY);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedTransfersPageState> & {
      rawText?: string;
      candidateRiders?: TransferMarketCandidate[];
    };

    return {
      marketRidersCsv:
        typeof parsed.marketRidersCsv === "string"
          ? parsed.marketRidersCsv
          : typeof parsed.rawText === "string"
            ? parsed.rawText
            : fallback.marketRidersCsv,
      marketAuctionsCsv:
        typeof parsed.marketAuctionsCsv === "string"
          ? parsed.marketAuctionsCsv
          : fallback.marketAuctionsCsv,
      messages: Array.isArray(parsed.messages)
        ? parsed.messages.filter((message): message is string => typeof message === "string")
        : fallback.messages,
      candidates: Array.isArray(parsed.candidates)
        ? parsed.candidates.filter(isPersistedTransferMarketCandidate)
        : fallback.candidates,
      selectedCandidateId:
        typeof parsed.selectedCandidateId === "string"
          ? parsed.selectedCandidateId
          : fallback.selectedCandidateId,
      shortlistedCandidateIds: Array.isArray(parsed.shortlistedCandidateIds)
        ? parsed.shortlistedCandidateIds.filter((candidateId): candidateId is string => typeof candidateId === "string")
        : fallback.shortlistedCandidateIds,
      transferAmount:
        typeof parsed.transferAmount === "string"
          ? parsed.transferAmount
          : fallback.transferAmount,
      transferDate:
        typeof parsed.transferDate === "string" && parsed.transferDate.length > 0
          ? parsed.transferDate
          : fallback.transferDate,
      sortConfig:
        parsed.sortConfig && typeof parsed.sortConfig === "object"
          ? (parsed.sortConfig as TransferSortConfig)
          : fallback.sortConfig,
    };
  } catch (error) {
    console.error("Erreur de lecture localStorage transferts", error);
    return fallback;
  }
}

function saveTransfersPageState(state: PersistedTransfersPageState): void {
  try {
    localStorage.setItem(TRANSFERS_PAGE_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Erreur d'écriture localStorage transferts", error);
  }
}

function formatAuctionDeadline(deadlineAt: string): string {
  const date = new Date(deadlineAt);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEffectiveTransferAmount(
  analysis: TransferAnalysis,
  parsedTransferAmount: number
): number {
  return parsedTransferAmount > 0
    ? parsedTransferAmount
    : analysis.candidate.auction.currentBid;
}

function normalizeTransferIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildTransferCandidateIdentities(candidate: TransferMarketCandidate): string[] {
  const identities = new Set<string>();

  if (candidate.id) {
    identities.add(candidate.id);
  }

  const riderName = normalizeTransferIdentity(candidate.rider.name);
  const displayName = normalizeTransferIdentity(candidate.auction.displayName);

  if (riderName) {
    identities.add(`rider:${riderName}`);
  }

  if (displayName) {
    identities.add(`auction:${displayName}`);
  }

  return [...identities];
}

function mergeTransferCandidates(
  currentCandidates: TransferMarketCandidate[],
  incomingCandidates: TransferMarketCandidate[]
): {
  mergedCandidates: TransferMarketCandidate[];
  addedCount: number;
  updatedCount: number;
} {
  const mergedCandidates = [...currentCandidates];
  const candidateIndexByIdentity = new Map<string, number>();

  mergedCandidates.forEach((candidate, index) => {
    buildTransferCandidateIdentities(candidate).forEach((identity) => {
      candidateIndexByIdentity.set(identity, index);
    });
  });

  let addedCount = 0;
  let updatedCount = 0;

  incomingCandidates.forEach((candidate) => {
    const matchingIndex = buildTransferCandidateIdentities(candidate)
      .map((identity) => candidateIndexByIdentity.get(identity))
      .find((index): index is number => index !== undefined);

    if (matchingIndex !== undefined) {
      updatedCount += 1;
      mergedCandidates[matchingIndex] = candidate;

      buildTransferCandidateIdentities(candidate).forEach((identity) => {
        candidateIndexByIdentity.set(identity, matchingIndex);
      });
    } else {
      addedCount += 1;
      const nextIndex = mergedCandidates.length;

      mergedCandidates.push(candidate);
      buildTransferCandidateIdentities(candidate).forEach((identity) => {
        candidateIndexByIdentity.set(identity, nextIndex);
      });
    }
  });

  return {
    mergedCandidates,
    addedCount,
    updatedCount,
  };
}

export default function TransfersPage() {
  const persistedState = useMemo(() => loadTransfersPageState(), []);
  const comparisonTableContainerRef = useRef<HTMLDivElement | null>(null);
  const [currentRiders, setCurrentRiders] = useState<Rider[]>(getInitialRiders);
  const [marketRidersCsv, setMarketRidersCsv] = useState(persistedState.marketRidersCsv);
  const [marketAuctionsCsv, setMarketAuctionsCsv] = useState(persistedState.marketAuctionsCsv);
  const [messages, setMessages] = useState<string[]>(persistedState.messages);
  const [candidates, setCandidates] = useState<TransferMarketCandidate[]>(persistedState.candidates);
  const [selectedCandidateId, setSelectedCandidateId] = useState(persistedState.selectedCandidateId);
  const [shortlistedCandidateIds, setShortlistedCandidateIds] = useState<string[]>(persistedState.shortlistedCandidateIds);
  const [transferAmount, setTransferAmount] = useState(persistedState.transferAmount);
  const [transferDate, setTransferDate] = useState(persistedState.transferDate);
  const [sortConfig, setSortConfig] = useState<TransferSortConfig>(persistedState.sortConfig);
  const [pendingRemovalCandidateId, setPendingRemovalCandidateId] = useState<string>("");
  const [transferHistory, setTransferHistory] = useState<TransferHistoryEntry[]>(() => loadTransferHistory());

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

  useEffect(() => {
    saveTransfersPageState({
      marketRidersCsv,
      marketAuctionsCsv,
      messages,
      candidates,
      selectedCandidateId,
      shortlistedCandidateIds,
      transferAmount,
      transferDate,
      sortConfig,
    });
  }, [
    candidates,
    marketAuctionsCsv,
    marketRidersCsv,
    messages,
    selectedCandidateId,
    shortlistedCandidateIds,
    sortConfig,
    transferAmount,
    transferDate,
  ]);

  const parsedTransferAmount = useMemo(
    () => parseFrenchInteger(transferAmount),
    [transferAmount]
  );

  const analyses = useMemo(
    () =>
      analyzeTransferCandidates(
        candidates,
        currentRiders,
        settings,
        teamStrategy,
        financeSnapshot.currentBalance,
        parsedTransferAmount
      ),
    [candidates, currentRiders, financeSnapshot.currentBalance, parsedTransferAmount, settings, teamStrategy]
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
        case "age":
          comparison =
            left.rider.ageYears * 100 + left.rider.ageWeeks - (right.rider.ageYears * 100 + right.rider.ageWeeks);
          break;
        case "form":
          comparison = left.rider.form - right.rider.form;
          break;
        case "score":
          comparison = left.score - right.score;
          break;
        case "recommendation":
          comparison =
            getPriorityGradeRank(left.score, left.canRecruit) -
            getPriorityGradeRank(right.score, right.canRecruit);
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
        case "currentBid":
          comparison = left.candidate.auction.currentBid - right.candidate.auction.currentBid;
          break;
        case "deadlineAt":
          comparison = left.candidate.auction.deadlineAt.localeCompare(right.candidate.auction.deadlineAt);
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

  const decisionSalarySummary = useMemo<DecisionSalarySummary>(() => {
    const projectedSalaryDelta = shortlistedAnalyses.reduce(
      (sum, analysis) => sum + analysis.rider.salaryWeekly,
      0
    );
    const currentWeeklySalaryExpense = financeSnapshot.weeklySalaryExpense;
    const projectedWeeklySalaryExpense =
      currentWeeklySalaryExpense + projectedSalaryDelta;

    return {
      currentWeeklySalaryExpense,
      projectedWeeklySalaryExpense,
      projectedSalaryDelta,
      projectedSalaryHeadroom:
        decisionBudgetGuidance.salaryCap - projectedWeeklySalaryExpense,
    };
  }, [
    decisionBudgetGuidance.salaryCap,
    financeSnapshot.weeklySalaryExpense,
    shortlistedAnalyses,
  ]);

  function handleAnalyze() {
    const result = parseTransferMarketData(marketRidersCsv, marketAuctionsCsv);

    if (result.candidates.length === 0) {
      setMessages(
        result.errors.length > 0
          ? [
              "Aucun nouveau coureur exploitable n'a été ajouté. L'analyse existante est conservée.",
              ...result.errors,
            ]
          : ["Aucun nouveau coureur exploitable trouvé dans les CSV collés. L'analyse existante est conservée."]
      );
      return;
    }

    const mergeResult = mergeTransferCandidates(candidates, result.candidates);

    const currentShortlist = new Set(shortlistedCandidateIds);
    const nextShortlist = mergeResult.mergedCandidates
      .filter((candidate) => currentShortlist.has(candidate.id))
      .map((candidate) => candidate.id);
    const nextSelectedId = mergeResult.mergedCandidates.some(
      (candidate) => candidate.id === selectedCandidateId
    )
      ? selectedCandidateId
      : selectedCandidateId || result.candidates[0]?.id || mergeResult.mergedCandidates[0]?.id || "";

    setCandidates(mergeResult.mergedCandidates);
    setSelectedCandidateId(nextSelectedId);
    setShortlistedCandidateIds(nextShortlist);
    setTransferHistory(() =>
      appendTransferHistoryEntry({
        kind: "market-import",
        note: `${result.candidates.length} coureur(s) importé(s), ${mergeResult.addedCount} ajouté(s), ${mergeResult.updatedCount} mis à jour.`,
        shortlistSize: nextShortlist.length,
      })
    );
    setMessages([
      `${result.candidates.length} coureur(s) importé(s) : ${mergeResult.addedCount} ajouté(s), ${mergeResult.updatedCount} mis à jour. Analyse conservée jusqu'à suppression manuelle.`,
      ...result.errors,
    ]);
    appendManagementHistoryEntry({
      area: "transfers",
      kind: "market-review",
      title: "Marché des transferts réactualisé",
      note: `${result.candidates.length} coureur(s) analysé(s), ${mergeResult.addedCount} ajouté(s), ${mergeResult.updatedCount} mis à jour.`,
    });
  }

  function handleClearAnalysis() {
    setMarketRidersCsv("");
    setMarketAuctionsCsv("");
    setMessages(["Les zones de collage CSV ont été vidées. L'analyse en cours est conservée."]);
  }

  function handleAddToShortlist(candidateId: string) {
    const analysis = analyses.find((entry) => entry.rider.id === candidateId);

    setShortlistedCandidateIds((current) => {
      if (current.includes(candidateId)) {
        return current;
      }

      const next = [...current, candidateId];
      setTransferHistory(() =>
        appendTransferHistoryEntry({
          kind: "shortlist-add",
          candidateId,
          riderName: analysis?.rider.name,
          note: `${analysis?.rider.name ?? "Coureur"} ajouté à la shortlist.`,
          shortlistSize: next.length,
        })
      );
      return next;
    });
  }

  function handleRequestCandidateRemoval(candidateId: string) {
    setPendingRemovalCandidateId(candidateId);
  }

  function handleConfirmCandidateRemoval() {
    if (!pendingRemovalCandidateId) {
      return;
    }

    const removedCandidate = candidates.find(
      (candidate) =>
        candidate.id === pendingRemovalCandidateId ||
        candidate.rider.id === pendingRemovalCandidateId
    );

    setCandidates((current) =>
      current.filter(
        (candidate) =>
          candidate.id !== pendingRemovalCandidateId &&
          candidate.rider.id !== pendingRemovalCandidateId
      )
    );
    setShortlistedCandidateIds((current) =>
      current.filter((candidateId) => candidateId !== pendingRemovalCandidateId)
    );
    setSelectedCandidateId((current) =>
      current === pendingRemovalCandidateId ? "" : current
    );
    setMessages((current) => [
      `${removedCandidate?.rider.name ?? "Le coureur"} a été retiré manuellement du comparatif.`,
      ...current,
    ]);
    setTransferHistory(() =>
      appendTransferHistoryEntry({
        kind: "candidate-remove",
        candidateId: pendingRemovalCandidateId,
        riderName: removedCandidate?.rider.name,
        note: `${removedCandidate?.rider.name ?? "Un coureur"} retiré manuellement du comparatif.`,
        shortlistSize: shortlistedCandidateIds.filter((candidateId) => candidateId !== pendingRemovalCandidateId).length,
      })
    );
    setPendingRemovalCandidateId("");
  }

  function handleCancelCandidateRemoval() {
    setPendingRemovalCandidateId("");
  }

  function handleRemoveFromShortlist(candidateId: string) {
    const analysis = analyses.find((entry) => entry.rider.id === candidateId);

    setShortlistedCandidateIds((current) => {
      const next = current.filter((id) => id !== candidateId);

      if (next.length !== current.length) {
        setTransferHistory(() =>
          appendTransferHistoryEntry({
            kind: "shortlist-remove",
            candidateId,
            riderName: analysis?.rider.name,
            note: `${analysis?.rider.name ?? "Coureur"} retiré de la shortlist.`,
            shortlistSize: next.length,
          })
        );
      }

      return next;
    });
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

  function jumpComparisonTableToEdge(direction: "start" | "end") {
    const container = comparisonTableContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollLeft = direction === "start" ? 0 : container.scrollWidth - container.clientWidth;
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

    const effectiveTransferAmount = getEffectiveTransferAmount(analysis, parsedTransferAmount);

    if (effectiveTransferAmount <= 0) {
      setMessages(["Aucune enchère exploitable détectée pour ce coureur."]);
      return;
    }

    if (effectiveTransferAmount > financeSnapshot.currentBalance) {
      setMessages(["Le montant du transfert dépasse le solde disponible."]);
      return;
    }

    setCurrentRiders((current) => mergeRidersByName(current, [analysis.rider]));

    addManualFinanceEntry(
      {
        label: `Transfert entrant - ${analysis.rider.name}`,
        amount: -effectiveTransferAmount,
        occurredAt: transferDate,
        category: "transfer",
        note: `Recruté depuis ${analysis.candidate.auction.seller || analysis.rider.currentTeam || "marché des transferts"} - ${analysis.rider.category} - ${analysis.rider.total} total.`,
      },
      settings.financialBalance
    );

    window.dispatchEvent(new Event("cymanager:finance-updated"));
    setTransferHistory(() =>
      appendTransferHistoryEntry({
        kind: "recruit",
        candidateId: analysis.rider.id,
        riderName: analysis.rider.name,
        note: `${analysis.rider.name} recruté depuis ${analysis.candidate.auction.seller || analysis.rider.currentTeam || "le marché"}.`,
        amount: effectiveTransferAmount,
        shortlistSize: shortlistedCandidateIds.length,
        occurredAt: transferDate,
      })
    );
    appendManagementHistoryEntry({
      area: "transfers",
      kind: "recruitment",
      title: `Recrutement validé : ${analysis.rider.name}`,
      note: `${analysis.rider.name} rejoint l'effectif depuis ${analysis.candidate.auction.seller || analysis.rider.currentTeam || "le marché"}.`,
      amount: effectiveTransferAmount,
      occurredAt: transferDate,
    });

    setMessages([
      `${analysis.rider.name} a été intégré à l'effectif local et l'achat a été inscrit en finance pour ${formatCurrency(effectiveTransferAmount)}.`,
    ]);
  }

  const bestOption = analyses[0] ?? null;
  const pendingRemovalAnalysis = analyses.find(
    (analysis) => analysis.rider.id === pendingRemovalCandidateId || analysis.candidate.id === pendingRemovalCandidateId
  );

  return (
    <>
      <div className="page-stack">
        <PageTitle
          title="Transferts"
          subtitle="Import CSV du marché, analyse enrichie des candidats et sélection persistante jusqu'à suppression manuelle."
        />

      <div className="two-columns transfer-layout">
        <Card title="Import marché CSV">
          <div className="page-stack transfer-import-form">
            <div className="transfer-import-grid">
              <div>
                <label htmlFor="transfer-market-riders" className="field-label">
                  Liste complète des coureurs du marché
                </label>
                <textarea
                  id="transfer-market-riders"
                  className="textarea transfer-import-textarea"
                  value={marketRidersCsv}
                  onChange={(event) => setMarketRidersCsv(event.target.value)}
                  placeholder="Colle ici le CSV complet des coureurs du marché..."
                />
              </div>

              <div>
                <label htmlFor="transfer-market-auctions" className="field-label">
                  Liste des enchères en cours
                </label>
                <textarea
                  id="transfer-market-auctions"
                  className="textarea transfer-import-textarea"
                  value={marketAuctionsCsv}
                  onChange={(event) => setMarketAuctionsCsv(event.target.value)}
                  placeholder="Colle ici le CSV des enchères..."
                />
              </div>
            </div>

            <div className="field-grid transfer-form-grid">
              <div>
                <label htmlFor="transfer-amount" className="field-label">
                  Montant simulé optionnel
                </label>
                <input
                  id="transfer-amount"
                  className="input"
                  type="text"
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                  placeholder="Laisse vide pour utiliser l'enchère actuelle"
                />
              </div>

              <div>
                <label htmlFor="transfer-date" className="field-label">
                  Date d'écriture du transfert
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
                Analyser le marché
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
            <p><strong>Masse salariale hebdo actuelle :</strong> {formatCurrency(decisionSalarySummary.currentWeeklySalaryExpense)}</p>
            <p><strong>Après recrutement sélectionné :</strong> {formatCurrency(decisionSalarySummary.projectedWeeklySalaryExpense)}</p>
            <p><strong>Impact salaire candidat :</strong> {formatCurrency(decisionSalarySummary.projectedSalaryDelta)}</p>
            <p className={decisionSalarySummary.projectedWeeklySalaryExpense > decisionBudgetGuidance.salaryCap ? "transfer-decision-warning-line" : undefined}>
              <strong>Plafond masse salariale conseillé :</strong> {formatCurrency(decisionBudgetGuidance.salaryCap)}
            </p>
            <p className={decisionSalarySummary.projectedSalaryHeadroom < 0 ? getSalaryOverrunSeverityClass(Math.abs(decisionSalarySummary.projectedSalaryHeadroom), decisionBudgetGuidance.salaryCap) : undefined}>
              <strong>{decisionSalarySummary.projectedSalaryHeadroom >= 0 ? "Marge salariale après recrutement" : "Dépassement salarial après recrutement"} :</strong> {formatCurrency(Math.abs(decisionSalarySummary.projectedSalaryHeadroom))}
            </p>
            <p><strong>Charge fixe hebdo :</strong> {formatCurrency(financeSnapshot.weeklyFixedCosts)}</p>
            <p><strong>Travaux planifiés à provisionner :</strong> {formatCurrency(financeSnapshot.plannedFacilityUpgradeCost)}</p>
            <p><strong>Projection trésorerie à 3 sem. :</strong> {formatCurrency(financeSnapshot.projectedBalanceAfterThreeWeeks)}</p>
            <p><strong>Budget transferts conseillé :</strong> {formatCurrency(decisionBudgetGuidance.transferBudget)}</p>
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
            <div className="transfer-table-section">
              <div className="transfer-table-jump-controls" aria-label="Navigation horizontale du comparatif des candidats">
                <button type="button" className="button button-secondary button-small" onClick={() => jumpComparisonTableToEdge("start")}>{"<<"}</button>
                <button type="button" className="button button-secondary button-small" onClick={() => jumpComparisonTableToEdge("end")}>{">>"}</button>
              </div>

              <div ref={comparisonTableContainerRef} className="table-container transfer-table-container">
                <table className="data-table styled-table transfer-table">
                  <thead>
                    <tr>
                      <th className="transfer-col-actions">Actions</th>
                      <th className="transfer-col-choice">Choix</th>
                      <th className="transfer-col-rider" aria-sort={getAriaSort("name")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("name")}>Coureur{getSortIndicator("name")}</button>
                      </th>
                      <th className="transfer-col-category" aria-sort={getAriaSort("category")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("category")}>Cat.{getSortIndicator("category")}</button>
                      </th>
                      <th className="transfer-col-age" aria-sort={getAriaSort("age")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("age")}>Âge{getSortIndicator("age")}</button>
                      </th>
                      <th className="transfer-col-form" aria-sort={getAriaSort("form")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("form")}>Forme{getSortIndicator("form")}</button>
                      </th>
                      <th className="transfer-col-score" aria-sort={getAriaSort("score")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("score")}>Score{getSortIndicator("score")}</button>
                      </th>
                      <th className="transfer-col-priority" aria-sort={getAriaSort("recommendation")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("recommendation")}>Priorité{getSortIndicator("recommendation")}</button>
                      </th>
                      <th className="transfer-col-total" aria-sort={getAriaSort("total")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("total")}>Total{getSortIndicator("total")}</button>
                      </th>
                      <th className="transfer-col-salary" aria-sort={getAriaSort("salaryWeekly")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("salaryWeekly")}>Salaire{getSortIndicator("salaryWeekly")}</button>
                      </th>
                      <th className="transfer-col-value" aria-sort={getAriaSort("value")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("value")}>Valeur{getSortIndicator("value")}</button>
                      </th>
                      <th className="transfer-col-bid" aria-sort={getAriaSort("currentBid")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("currentBid")}>Enchère{getSortIndicator("currentBid")}</button>
                      </th>
                      <th className="transfer-col-deadline" aria-sort={getAriaSort("deadlineAt")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("deadlineAt")}>Échéance{getSortIndicator("deadlineAt")}</button>
                      </th>
                      <th className="transfer-col-buyer">Acheteur</th>
                      <th className="transfer-col-profile" aria-sort={getAriaSort("profileLabel")}>
                        <button type="button" className="table-sort-button" onClick={() => handleSort("profileLabel")}>Profil{getSortIndicator("profileLabel")}</button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAnalyses.map((analysis, index) => {
                      const isSelected = selectedAnalysis?.rider.id === analysis.rider.id;
                      const isBest = bestOption?.rider.id === analysis.rider.id;
                      const isShortlisted = shortlistedCandidateIds.includes(analysis.rider.id);
                      const rowClassName = [
                        isSelected ? "highlight-row" : "",
                        isShortlisted ? "transfer-row-shortlisted" : "",
                        !analysis.canRecruit ? "transfer-row-blocked" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <tr key={analysis.rider.id} className={rowClassName || undefined}>
                          <td className="transfer-col-actions">
                            <div className="transfer-action-buttons">
                              {!isShortlisted ? (
                                <button
                                  type="button"
                                  className="button button-small transfer-add-button"
                                  onClick={() => handleAddToShortlist(analysis.rider.id)}
                                  aria-label={`Ajouter ${analysis.rider.name} à la sélection`}
                                >
                                  +
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="button button-danger button-small transfer-remove-button"
                                onClick={() => handleRequestCandidateRemoval(analysis.rider.id)}
                                aria-label={`Supprimer ${analysis.rider.name} du comparatif`}
                              >
                                ×
                              </button>
                            </div>
                          </td>
                          <td className="transfer-col-choice">
                            <button
                              type="button"
                              className="button button-secondary button-small"
                              onClick={() => setSelectedCandidateId(analysis.rider.id)}
                            >
                              {isSelected ? "Sélectionné" : "Voir"}
                            </button>
                          </td>
                          <td className="transfer-col-rider transfer-candidate-cell">
                            <div className="transfer-candidate-name-line">
                              {isBest ? <span className="transfer-best-thumb" title={`Meilleur choix #${index + 1}`} aria-label={`Meilleur choix #${index + 1}`}>👍</span> : null}
                              <span>{analysis.rider.name}</span>
                            </div>
                          </td>
                          <td className="transfer-col-category">{analysis.rider.category}</td>
                          <td className="transfer-col-age">{analysis.rider.ageYears}a {analysis.rider.ageWeeks}s</td>
                          <td className="transfer-col-form">{analysis.rider.form}</td>
                          <td className="transfer-col-score">{analysis.score}/100</td>
                          <td className="transfer-col-priority"><span className="transfer-priority-grade">{getPriorityGrade(analysis.score, analysis.canRecruit)}</span></td>
                          <td className="transfer-col-total">{formatInteger(analysis.rider.total)}</td>
                          <td className="transfer-col-salary">{formatCurrency(analysis.rider.salaryWeekly)}</td>
                          <td className="transfer-col-value">{formatCurrency(analysis.rider.value)}</td>
                          <td className="transfer-col-bid">{formatCurrency(analysis.candidate.auction.currentBid)}</td>
                          <td className="transfer-col-deadline">{formatAuctionDeadline(analysis.candidate.auction.deadlineAt)}</td>
                          <td className="transfer-col-buyer">{analysis.candidate.auction.highestBidder || "-"}</td>
                          <td className="transfer-col-profile">{analysis.profileLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="transfer-table-jump-controls transfer-table-jump-controls-bottom" aria-hidden="true">
                <button type="button" className="button button-secondary button-small" onClick={() => jumpComparisonTableToEdge("start")}>{"<<"}</button>
                <button type="button" className="button button-secondary button-small" onClick={() => jumpComparisonTableToEdge("end")}>{">>"}</button>
              </div>
            </div>
          )}
        </Card>

      <Card title="Sélection">
        {shortlistedAnalyses.length === 0 ? (
          <p className="muted">Aucun coureur retenu pour le moment.</p>
        ) : (
          <div className="table-container">
            <table className="data-table styled-table transfer-table">
              <thead>
                <tr>
                  <th>Coureur</th>
                  <th>Cat.</th>
                  <th>Score</th>
                  <th>Enchère</th>
                  <th>Échéance</th>
                  <th>Acheteur</th>
                  <th>Action</th>
                  <th>Suppression</th>
                </tr>
              </thead>
              <tbody>
                {shortlistedAnalyses.map((analysis) => {
                  const isCurrent = selectedAnalysis?.rider.id === analysis.rider.id;

                  return (
                    <tr key={analysis.rider.id}>
                      <td>{analysis.rider.name}</td>
                      <td>{analysis.rider.category}</td>
                      <td>{analysis.score}/100</td>
                      <td>{formatCurrency(analysis.candidate.auction.currentBid)}</td>
                      <td>{formatAuctionDeadline(analysis.candidate.auction.deadlineAt)}</td>
                      <td>{analysis.candidate.auction.highestBidder || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className={isCurrent ? "button button-primary button-small" : "button button-secondary button-small"}
                          onClick={() => setSelectedCandidateId(analysis.rider.id)}
                        >
                          {isCurrent ? "En cours" : "Analyser"}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => handleRemoveFromShortlist(analysis.rider.id)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Historique shortlist et transferts">
        {transferHistory.length === 0 ? (
          <p className="muted">Aucun historique enregistré pour le moment.</p>
        ) : (
          <div className="transfer-history-list">
            {transferHistory.map((entry) => (
              <div key={entry.id} className="transfer-history-item">
                <div className="transfer-history-meta">
                  <span className="transfer-history-badge">{getTransferHistoryBadgeLabel(entry.kind)}</span>
                  <span className="transfer-history-date">{formatTransferHistoryDate(entry.occurredAt)}</span>
                </div>
                <p className="transfer-history-note">{entry.note}</p>
                <div className="transfer-history-details">
                  {entry.amount !== undefined ? <span>Montant : {formatCurrency(entry.amount)}</span> : null}
                  {entry.shortlistSize !== undefined ? <span>Shortlist : {entry.shortlistSize}</span> : null}
                </div>
              </div>
            ))}
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
                  <p><strong>Marché :</strong> {selectedAnalysis.auctionFit}</p>
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
                <p><strong>Vendeur :</strong> {selectedAnalysis.candidate.auction.seller || "-"}</p>
                <p><strong>Acheteur actuel :</strong> {selectedAnalysis.candidate.auction.highestBidder || "-"}</p>
                <p><strong>Échéance :</strong> {formatAuctionDeadline(selectedAnalysis.candidate.auction.deadlineAt)}</p>
                <p><strong>Nationalité :</strong> {selectedAnalysis.rider.nationality || "-"}</p>
                <p><strong>Catégorie :</strong> {selectedAnalysis.rider.category}</p>
                <p><strong>Age :</strong> {selectedAnalysis.rider.ageYears} ans {selectedAnalysis.rider.ageWeeks} sem.</p>
                <p><strong>Forme :</strong> {selectedAnalysis.rider.form}</p>
                <p><strong>Total :</strong> {formatInteger(selectedAnalysis.rider.total)}</p>
                <p><strong>Valeur :</strong> {formatCurrency(selectedAnalysis.rider.value)}</p>
                <p><strong>Enchère actuelle :</strong> {formatCurrency(selectedAnalysis.candidate.auction.currentBid)}</p>
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
            <div className="field-grid transfer-form-grid">
              <div>
                <label htmlFor="transfer-validation-amount" className="field-label">
                  Ajuster l'enchère retenue
                </label>
                <input
                  id="transfer-validation-amount"
                  className="input"
                  type="text"
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                  placeholder="Laisse vide pour reprendre l'enchère actuelle"
                />
              </div>

              <div>
                <label className="field-label">Enchère de référence</label>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setTransferAmount("")}
                  >
                    Reprendre l'enchère actuelle
                  </button>
                </div>
                <p className="muted">
                  Marché actuel : {formatCurrency(selectedAnalysis.candidate.auction.currentBid)}
                </p>
              </div>
            </div>

            <div className="dashboard-lines transfer-validation-lines">
              <p><strong>Montant retenu :</strong> {formatCurrency(getEffectiveTransferAmount(selectedAnalysis, parsedTransferAmount))}</p>
              <p><strong>Source du montant :</strong> {parsedTransferAmount > 0 ? "Saisie manuelle" : "Enchère actuelle"}</p>
            </div>

            {(() => {
              const sim = simulateRecruitment(
                financeSnapshot.currentBalance,
                financeSnapshot.weeklyFixedCosts,
                selectedAnalysis.rider.salaryWeekly,
                getEffectiveTransferAmount(selectedAnalysis, parsedTransferAmount)
              );
              const verdictClass =
                sim.verdict === "danger"
                  ? "message-box message-box-warning"
                  : sim.verdict === "caution"
                  ? "message-box"
                  : "message-box message-box-success";
              return (
                <div className="page-stack">
                  <p className="field-label">Simulation d'impact recrutement</p>
                  <div className="settings-diagnostics-grid">
                    <div className="finance-prize-preview">
                      <span className="muted">Solde avant</span>
                      <strong>{formatCurrency(sim.balanceBefore)}</strong>
                      <span className="muted">Solde après</span>
                      <strong>{formatCurrency(sim.balanceAfter)}</strong>
                    </div>
                    <div className="finance-prize-preview">
                      <span className="muted">Charge fixe hebdo avant</span>
                      <strong>{formatCurrency(sim.weeklyFixedCostsBefore)}</strong>
                      <span className="muted">Charge fixe hebdo après</span>
                      <strong>{formatCurrency(sim.weeklyFixedCostsAfter)}</strong>
                    </div>
                    <div className="finance-prize-preview">
                      <span className="muted">Autonomie avant</span>
                      <strong>{sim.autonomyWeeksBefore.toFixed(1)} sem.</strong>
                      <span className="muted">Autonomie après</span>
                      <strong>
                        {sim.autonomyWeeksAfter.toFixed(1)} sem.{" "}
                        ({sim.autonomyDelta >= 0 ? "+" : ""}{sim.autonomyDelta.toFixed(1)})
                      </strong>
                    </div>
                  </div>
                  <div className={verdictClass}>
                    <p>{sim.verdictLabel}</p>
                  </div>
                </div>
              );
            })()}

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

      <ConfirmDialog
        open={Boolean(pendingRemovalCandidateId && pendingRemovalAnalysis)}
        title="Confirmer la suppression"
        message={pendingRemovalAnalysis
          ? `Supprimer ${pendingRemovalAnalysis.rider.name} du comparatif et de la sélection éventuelle ?`
          : "Supprimer ce coureur du comparatif et de la sélection éventuelle ?"}
        onConfirm={handleConfirmCandidateRemoval}
        onCancel={handleCancelCandidateRemoval}
      />
    </>
  );
}

function formatTransferHistoryDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTransferHistoryBadgeLabel(kind: TransferHistoryEntry["kind"]): string {
  if (kind === "recruit") {
    return "Achat";
  }

  if (kind === "market-import") {
    return "Import";
  }

  if (kind === "shortlist-add" || kind === "shortlist-remove") {
    return "Shortlist";
  }

  return "Comparatif";
}