import {
  getFacilityLabel,
  getFacilityUpgradeCost,
  getFacilityWeeklyMaintenance,
  PRIZE_REFERENCE_TABLES,
} from "../finance/faqFinance";
import { getProRacePrize } from "../finance/racePrizeTable";
import { getAllResultsFromStorage } from "../scoring/extractPoints";
import { loadRidersFromStorage } from "./localStorage";
import { loadManualTodos } from "./todoStorage";
import type {
  FinanceEntry,
  FinanceEntryCategory,
  FinanceState,
} from "../../types/finance";
import type { Rider } from "../../types/rider";
import type { ClubSettings, FacilityKey } from "../../types/settings";

const FINANCE_STORAGE_KEY = "cymanager:finance";
const DEFAULT_STARTING_BALANCE = 1000000;
const TEAM_NAME = "Kritoff Team";
export const BEGINNER_GUIDE_SAFETY_RESERVE_TARGET = 450000;

type ManualFinanceEntryInput = {
  label: string;
  amount: number;
  occurredAt: string;
  category: FinanceEntryCategory;
  note?: string;
};

type ResultCategory = "pro" | "u25" | "u21";

type StoredRaceResult = {
  result: string;
  category: ResultCategory;
};

type CoursePrizeBreakdown = {
  courseId: string;
  courseTitle: string;
  occurredAt: string;
  position: string;
  riderName: string;
  amount: number;
};

type FinanceSyncMetrics = {
  removedDuplicateSyncEntries: number;
  removedSourceLessSyncEntries: number;
  removedObsoleteFacilityEntries: number;
  addedFacilityEntries: number;
  removedObsoleteRacePrizeEntries: number;
  addedRacePrizeEntries: number;
  updatedRacePrizeEntries: number;
  addedWeeklySalaryEntries: number;
  addedWeeklyMaintenanceEntries: number;
};

export type FinanceReconciliationSeverity = "info" | "warning" | "critical";

export type FinanceReconciliationIssue = {
  code: string;
  severity: FinanceReconciliationSeverity;
  label: string;
  amount?: number;
};

export type FinanceReconciliationSummary = {
  syncEntryCount: number;
  manualEntryCount: number;
  racePrizeEntryCount: number;
  facilityEntryCount: number;
  activeSalarySource: "parametree" | "effectif";
  salaryReferenceGap: number;
  reserveGap: number;
  projectedReserveGap: number;
  correctionsApplied: number;
  issues: FinanceReconciliationIssue[];
};

function createEmptyFinanceSyncMetrics(): FinanceSyncMetrics {
  return {
    removedDuplicateSyncEntries: 0,
    removedSourceLessSyncEntries: 0,
    removedObsoleteFacilityEntries: 0,
    addedFacilityEntries: 0,
    removedObsoleteRacePrizeEntries: 0,
    addedRacePrizeEntries: 0,
    updatedRacePrizeEntries: 0,
    addedWeeklySalaryEntries: 0,
    addedWeeklyMaintenanceEntries: 0,
  };
}

function getStartOfWeek(value: Date): Date {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + diff);

  return date;
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function formatWeekSourceDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getWeeklySalaryExpense(settings: ClubSettings, riders: Rider[]): number {
  const automaticWeeklySalaryExpense = riders.reduce(
    (sum, rider) => sum + rider.salaryWeekly,
    0
  );

  return settings.manualWeeklySalaryExpense !== null && settings.manualWeeklySalaryExpense >= 0
    ? settings.manualWeeklySalaryExpense
    : automaticWeeklySalaryExpense;
}

function getWeeklyFacilityMaintenance(settings: ClubSettings): number {
  return (Object.keys(settings.facilities) as FacilityKey[]).reduce(
    (sum, facilityKey) =>
      sum +
      getFacilityWeeklyMaintenance(
        facilityKey,
        settings.facilities[facilityKey].level
      ),
    0
  );
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function inferCategoryFromCourseTitle(title: string): ResultCategory {
  const normalized = normalizeComparable(title);

  if (normalized.includes("u25")) {
    return "u25";
  }

  if (normalized.includes("u21")) {
    return "u21";
  }

  return "pro";
}

function createId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoDate(value: string): string {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function sortEntries(entries: FinanceEntry[]): FinanceEntry[] {
  return [...entries].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  );
}

function normalizeEntry(value: unknown): FinanceEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<FinanceEntry>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.label !== "string" ||
    typeof candidate.amount !== "number" ||
    !Number.isFinite(candidate.amount)
  ) {
    return null;
  }

  const category: FinanceEntryCategory =
    candidate.category === "facility-upgrade" ||
    candidate.category === "race-prize" ||
    candidate.category === "season-prize" ||
    candidate.category === "transfer"
      ? candidate.category
      : "other";
  const source = candidate.source === "sync" ? "sync" : "manual";

  return {
    id: candidate.id,
    label: candidate.label.trim(),
    amount: candidate.amount,
    occurredAt: toIsoDate(candidate.occurredAt ?? ""),
    category,
    source,
    note: typeof candidate.note === "string" ? candidate.note : undefined,
    sourceKey: typeof candidate.sourceKey === "string" ? candidate.sourceKey : undefined,
  };
}

function normalizeFinanceState(
  value: unknown,
  legacyStartingBalance = DEFAULT_STARTING_BALANCE
): FinanceState {
  if (!value || typeof value !== "object") {
    return {
      startingBalance: legacyStartingBalance,
      entries: [],
      updatedAt: new Date().toISOString(),
      weeklyEconomyProcessedThrough: null,
    };
  }

  const candidate = value as Partial<FinanceState>;
  const entries = Array.isArray(candidate.entries)
    ? candidate.entries
        .map((entry) => normalizeEntry(entry))
        .filter((entry): entry is FinanceEntry => entry !== null)
    : [];

  return {
    startingBalance: legacyStartingBalance,
    entries: sortEntries(entries),
    updatedAt: toIsoDate(candidate.updatedAt ?? ""),
    weeklyEconomyProcessedThrough:
      typeof candidate.weeklyEconomyProcessedThrough === "string" &&
      candidate.weeklyEconomyProcessedThrough.trim().length > 0
        ? toIsoDate(candidate.weeklyEconomyProcessedThrough)
        : null,
  };
}

function isStoredRaceResult(value: unknown): value is StoredRaceResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "result" in value &&
      "category" in value
  );
}

function toStoredRaceResult(
  value: unknown,
  fallbackTitle: string
): StoredRaceResult | null {
  if (isStoredRaceResult(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return {
      result: value,
      category: inferCategoryFromCourseTitle(fallbackTitle),
    };
  }

  return null;
}

function parseResultRows(result: string) {
  const lines = result.trim().split(/\r?\n/);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split("\t");
  const positionIdx = headers.findIndex((header) => {
    const normalized = normalizeComparable(header);
    return (
      normalized === "#" ||
      normalized.includes("place") ||
      normalized === "cl" ||
      normalized === "cl." ||
      normalized.includes("classement") ||
      normalized.includes("rank") ||
      normalized.includes("pos")
    );
  });
  const nameIdx = headers.findIndex((header) =>
    normalizeComparable(header).includes("nom")
  );
  const teamIdx = headers.findIndex((header) => {
    const normalized = normalizeComparable(header);
    return normalized.includes("equipe") || normalized.includes("team");
  });

  if (positionIdx === -1 || nameIdx === -1 || teamIdx === -1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => line.split("\t"))
    .map((cells) => ({
      position: cells[positionIdx]?.trim() ?? "",
      riderName: cells[nameIdx]?.trim() ?? "",
      teamName: cells[teamIdx]?.trim() ?? "",
    }))
    .filter(
      (row) => row.position.length > 0 && row.riderName.length > 0 && row.teamName.length > 0
    );
}

function buildRacePrizeSourceKey(entry: CoursePrizeBreakdown): string {
  return [
    "race-prize",
    entry.courseId,
    entry.position,
    normalizeComparable(entry.riderName),
  ].join(":");
}

function buildCoursePrizeEntries(settings: ClubSettings): CoursePrizeBreakdown[] {
  const results = getAllResultsFromStorage();
  const todos = loadManualTodos();
  const courseMap = new Map(todos.map((todo) => [todo.id, todo]));

  return Object.entries(results).flatMap(([courseId, stored]) => {
    const course = courseMap.get(courseId);
    const storedRaceResult = toStoredRaceResult(stored, course?.title ?? courseId);

    if (!storedRaceResult || storedRaceResult.category !== "pro") {
      return [];
    }

    return parseResultRows(storedRaceResult.result)
        .filter(
          (row) =>
            normalizeComparable(row.teamName) === normalizeComparable(TEAM_NAME)
        )
        .map((row) => {
          const amount = getProRacePrize(
            settings.divisionPro,
            row.position,
            course?.title ?? courseId
          );

          if (amount === null || amount <= 0) {
            return null;
          }

          return {
            courseId,
            courseTitle: course?.title ?? courseId,
            occurredAt: course?.createdAt ?? new Date().toISOString(),
            position: row.position,
            riderName: row.riderName,
            amount,
          };
        })
        .filter((row): row is CoursePrizeBreakdown => row !== null);
  });
}

function syncRacePrizeEntries(
  entries: FinanceEntry[],
  settings: ClubSettings
): { entries: FinanceEntry[]; changed: boolean; metrics: FinanceSyncMetrics } {
  const prizeEntries = buildCoursePrizeEntries(settings);
  const validSourceKeys = new Set(
    prizeEntries.map((entry) => buildRacePrizeSourceKey(entry))
  );
  let changed = false;
  const metrics = createEmptyFinanceSyncMetrics();

  const nextEntries = entries.filter((entry) => {
    const shouldKeep = !(
      entry.source === "sync" &&
      entry.category === "race-prize" &&
      entry.sourceKey?.startsWith("race-prize:") &&
      !validSourceKeys.has(entry.sourceKey)
    );

    if (!shouldKeep) {
      changed = true;
      metrics.removedObsoleteRacePrizeEntries += 1;
    }

    return shouldKeep;
  });

  prizeEntries.forEach((prizeEntry) => {
    const sourceKey = buildRacePrizeSourceKey(prizeEntry);
    const existingIndex = nextEntries.findIndex(
      (entry) => entry.sourceKey === sourceKey
    );
    const nextEntry: FinanceEntry = {
      id:
        existingIndex >= 0
          ? nextEntries[existingIndex].id
          : createId("race-prize"),
      label: `Prime course - ${prizeEntry.riderName} - ${prizeEntry.courseTitle}`,
      amount: prizeEntry.amount,
      occurredAt: toIsoDate(prizeEntry.occurredAt),
      category: "race-prize",
      source: "sync",
      note: `${prizeEntry.position} place`,
      sourceKey,
    };

    if (existingIndex >= 0) {
      const existing = nextEntries[existingIndex];

      if (
        existing.label !== nextEntry.label ||
        existing.amount !== nextEntry.amount ||
        existing.occurredAt !== nextEntry.occurredAt ||
        existing.note !== nextEntry.note
      ) {
        nextEntries[existingIndex] = nextEntry;
        changed = true;
        metrics.updatedRacePrizeEntries += 1;
      }

      return;
    }

    nextEntries.push(nextEntry);
    changed = true;
    metrics.addedRacePrizeEntries += 1;
  });

  return { entries: nextEntries, changed, metrics };
}

function dedupeSyncEntries(
  entries: FinanceEntry[]
): { entries: FinanceEntry[]; changed: boolean; metrics: FinanceSyncMetrics } {
  const metrics = createEmptyFinanceSyncMetrics();
  const seenSourceKeys = new Set<string>();
  let changed = false;

  const nextEntries = entries.filter((entry) => {
    if (entry.source !== "sync") {
      return true;
    }

    const sourceKey = entry.sourceKey?.trim();

    if (!sourceKey) {
      metrics.removedSourceLessSyncEntries += 1;
      changed = true;
      return false;
    }

    if (seenSourceKeys.has(sourceKey)) {
      metrics.removedDuplicateSyncEntries += 1;
      changed = true;
      return false;
    }

    seenSourceKeys.add(sourceKey);
    return true;
  });

  return { entries: nextEntries, changed, metrics };
}

function mergeSyncMetrics(
  base: FinanceSyncMetrics,
  addition: FinanceSyncMetrics
): FinanceSyncMetrics {
  return {
    removedDuplicateSyncEntries:
      base.removedDuplicateSyncEntries + addition.removedDuplicateSyncEntries,
    removedSourceLessSyncEntries:
      base.removedSourceLessSyncEntries + addition.removedSourceLessSyncEntries,
    removedObsoleteFacilityEntries:
      base.removedObsoleteFacilityEntries + addition.removedObsoleteFacilityEntries,
    addedFacilityEntries: base.addedFacilityEntries + addition.addedFacilityEntries,
    removedObsoleteRacePrizeEntries:
      base.removedObsoleteRacePrizeEntries + addition.removedObsoleteRacePrizeEntries,
    addedRacePrizeEntries: base.addedRacePrizeEntries + addition.addedRacePrizeEntries,
    updatedRacePrizeEntries: base.updatedRacePrizeEntries + addition.updatedRacePrizeEntries,
    addedWeeklySalaryEntries:
      base.addedWeeklySalaryEntries + addition.addedWeeklySalaryEntries,
    addedWeeklyMaintenanceEntries:
      base.addedWeeklyMaintenanceEntries + addition.addedWeeklyMaintenanceEntries,
  };
}

function countCorrections(metrics: FinanceSyncMetrics): number {
  return (
    metrics.removedDuplicateSyncEntries +
    metrics.removedSourceLessSyncEntries +
    metrics.removedObsoleteFacilityEntries +
    metrics.addedFacilityEntries +
    metrics.removedObsoleteRacePrizeEntries +
    metrics.addedRacePrizeEntries +
    metrics.updatedRacePrizeEntries +
    metrics.addedWeeklySalaryEntries +
    metrics.addedWeeklyMaintenanceEntries
  );
}

function syncWeeklyEconomyEntries(
  state: FinanceState,
  settings: ClubSettings,
  riders: Rider[]
): { state: FinanceState; changed: boolean; metrics: FinanceSyncMetrics } {
  const currentWeekStart = getStartOfWeek(new Date());
  const lastProcessedWeek = state.weeklyEconomyProcessedThrough
    ? getStartOfWeek(new Date(state.weeklyEconomyProcessedThrough))
    : null;
  const firstWeekToProcess = lastProcessedWeek
    ? addDays(lastProcessedWeek, 7)
    : currentWeekStart;

  if (
    firstWeekToProcess.getTime() > currentWeekStart.getTime() &&
    state.weeklyEconomyProcessedThrough
  ) {
    return { state, changed: false, metrics: createEmptyFinanceSyncMetrics() };
  }

  const weeklySalaryExpense = getWeeklySalaryExpense(settings, riders);
  const weeklyFacilityMaintenance = getWeeklyFacilityMaintenance(settings);
  const metrics = createEmptyFinanceSyncMetrics();
  const nextEntries = [...state.entries];
  let changed = false;

  for (
    let weekDate = new Date(firstWeekToProcess);
    weekDate.getTime() <= currentWeekStart.getTime();
    weekDate = addDays(weekDate, 7)
  ) {
    const sourceDate = formatWeekSourceDate(weekDate);

    if (weeklySalaryExpense > 0) {
      const salarySourceKey = `weekly-salary:${sourceDate}`;

      if (!nextEntries.some((entry) => entry.sourceKey === salarySourceKey)) {
        nextEntries.push({
          id: createId("weekly-salary"),
          label: `Salaires hebdomadaires - ${sourceDate}`,
          amount: -weeklySalaryExpense,
          occurredAt: weekDate.toISOString(),
          category: "other",
          source: "sync",
          note: "Débit automatique du lundi pour la masse salariale.",
          sourceKey: salarySourceKey,
        });
        changed = true;
        metrics.addedWeeklySalaryEntries += 1;
      }
    }

    if (weeklyFacilityMaintenance > 0) {
      const maintenanceSourceKey = `weekly-maintenance:${sourceDate}`;

      if (!nextEntries.some((entry) => entry.sourceKey === maintenanceSourceKey)) {
        nextEntries.push({
          id: createId("weekly-maintenance"),
          label: `Entretien installations - ${sourceDate}`,
          amount: -weeklyFacilityMaintenance,
          occurredAt: weekDate.toISOString(),
          category: "other",
          source: "sync",
          note: "Débit automatique du lundi pour l'entretien des installations.",
          sourceKey: maintenanceSourceKey,
        });
        changed = true;
        metrics.addedWeeklyMaintenanceEntries += 1;
      }
    }
  }

  const nextProcessedThrough = currentWeekStart.toISOString();

  if (!changed && state.weeklyEconomyProcessedThrough === nextProcessedThrough) {
    return { state, changed: false, metrics };
  }

  return {
    state: {
      ...state,
      entries: sortEntries(nextEntries),
      updatedAt: new Date().toISOString(),
      weeklyEconomyProcessedThrough: nextProcessedThrough,
    },
    changed: true,
    metrics,
  };
}

export function loadFinanceState(
  legacyStartingBalance = DEFAULT_STARTING_BALANCE
): FinanceState {
  try {
    const raw = localStorage.getItem(FINANCE_STORAGE_KEY);

    if (!raw) {
      return normalizeFinanceState(null, legacyStartingBalance);
    }

    return normalizeFinanceState(JSON.parse(raw), legacyStartingBalance);
  } catch (error) {
    console.error("Erreur de lecture localStorage finance", error);
    return normalizeFinanceState(null, legacyStartingBalance);
  }
}

export function saveFinanceState(state: FinanceState): void {
  try {
    localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event("cymanager:finance-updated"));
  } catch (error) {
    console.error("Erreur d'écriture localStorage finance", error);
  }
}

function reconcileFinanceState(
  state: FinanceState,
  settings: ClubSettings,
  riders: Rider[]
): { state: FinanceState; changed: boolean; metrics: FinanceSyncMetrics } {
  const weeklySynced = syncWeeklyEconomyEntries(state, settings, riders);
  const dedupedEntries = dedupeSyncEntries(weeklySynced.state.entries);
  let changed = dedupedEntries.changed;
  let metrics = mergeSyncMetrics(weeklySynced.metrics, dedupedEntries.metrics);
  const validFacilitySourceKeys = new Set<string>();

  (Object.keys(settings.facilities) as FacilityKey[]).forEach((facilityKey) => {
    const facility = settings.facilities[facilityKey];

    if (!facility.upgradeInProgress || facility.targetLevel === null) {
      return;
    }

    if (facility.targetLevel <= facility.level) {
      return;
    }

    validFacilitySourceKeys.add(
      [
        "facility-upgrade",
        facilityKey,
        `${facility.level}->${facility.targetLevel}`,
        facility.upgradeStartedAt || "unknown",
      ].join(":")
    );
  });

  const nextEntries = dedupedEntries.entries.filter((entry) => {
    const shouldKeep = !(
      entry.source === "sync" &&
      entry.category === "facility-upgrade" &&
      entry.sourceKey?.startsWith("facility-upgrade:") &&
      !validFacilitySourceKeys.has(entry.sourceKey)
    );

    if (!shouldKeep) {
      changed = true;
      metrics.removedObsoleteFacilityEntries += 1;
    }

    return shouldKeep;
  });

  (Object.keys(settings.facilities) as FacilityKey[]).forEach((facilityKey) => {
    const facility = settings.facilities[facilityKey];

    if (!facility.upgradeInProgress || facility.targetLevel === null) {
      return;
    }

    if (facility.targetLevel <= facility.level) {
      return;
    }

    const upgradeCost = getFacilityUpgradeCost(facilityKey, facility.targetLevel);

    if (upgradeCost === null) {
      return;
    }

    const sourceKey = [
      "facility-upgrade",
      facilityKey,
      `${facility.level}->${facility.targetLevel}`,
      facility.upgradeStartedAt || "unknown",
    ].join(":");

    if (nextEntries.some((entry) => entry.sourceKey === sourceKey)) {
      return;
    }

    nextEntries.push({
      id: createId("facility"),
      label: `Travaux ${getFacilityLabel(facilityKey)} niveau ${facility.targetLevel}`,
      amount: -upgradeCost,
      occurredAt: toIsoDate(facility.upgradeStartedAt),
      category: "facility-upgrade",
      source: "sync",
      note: `Détecté automatiquement depuis Paramètres (${getFacilityLabel(facilityKey)} ${facility.level} -> ${facility.targetLevel}).`,
      sourceKey,
    });
    changed = true;
    metrics.addedFacilityEntries += 1;
  });

  const racePrizeSync = syncRacePrizeEntries(nextEntries, settings);
  metrics = mergeSyncMetrics(metrics, racePrizeSync.metrics);

  if (!changed && !racePrizeSync.changed) {
    return {
      state: weeklySynced.state,
      changed: weeklySynced.changed,
      metrics,
    };
  }

  return {
    state: {
      ...weeklySynced.state,
      entries: sortEntries(racePrizeSync.entries),
      updatedAt: new Date().toISOString(),
    },
    changed: true,
    metrics,
  };
}

export function syncFinanceWithSettings(
  settings: ClubSettings,
  legacyStartingBalance = DEFAULT_STARTING_BALANCE
): FinanceState {
  const state = loadFinanceState(legacyStartingBalance);
  const riders = loadRidersFromStorage();
  const reconciliation = reconcileFinanceState(state, settings, riders);

  if (!reconciliation.changed) {
    return state;
  }

  saveFinanceState(reconciliation.state);
  return reconciliation.state;
}

export function addManualFinanceEntry(
  input: ManualFinanceEntryInput,
  legacyStartingBalance = DEFAULT_STARTING_BALANCE
): FinanceState {
  const state = loadFinanceState(legacyStartingBalance);
  const nextState: FinanceState = {
    ...state,
    entries: sortEntries([
      {
        id: createId("manual"),
        label: input.label,
        amount: input.amount,
        occurredAt: toIsoDate(input.occurredAt),
        category: input.category,
        source: "manual",
        note: input.note?.trim() || undefined,
      },
      ...state.entries,
    ]),
    updatedAt: new Date().toISOString(),
  };

  saveFinanceState(nextState);
  return nextState;
}

export function deleteManualFinanceEntry(
  entryId: string,
  legacyStartingBalance = DEFAULT_STARTING_BALANCE
): FinanceState {
  const state = loadFinanceState(legacyStartingBalance);
  const nextEntries = state.entries.filter(
    (entry) => entry.id !== entryId || entry.source !== "manual"
  );

  if (nextEntries.length === state.entries.length) {
    return state;
  }

  const nextState: FinanceState = {
    ...state,
    entries: nextEntries,
    updatedAt: new Date().toISOString(),
  };

  saveFinanceState(nextState);
  return nextState;
}

export function getFinanceSnapshot(settings: ClubSettings, riders: Rider[]) {
  const seededBalance =
    settings.financialBalance > 0
      ? settings.financialBalance
      : DEFAULT_STARTING_BALANCE;
  const loadedState = loadFinanceState(seededBalance);
  const reconciliationResult = reconcileFinanceState(loadedState, settings, riders);
  const state = reconciliationResult.state;

  if (reconciliationResult.changed) {
    saveFinanceState(state);
  }

  const currentBalance =
    state.startingBalance +
    state.entries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalIncome = state.entries
    .filter((entry) => entry.amount > 0)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = Math.abs(
    state.entries
      .filter((entry) => entry.amount < 0)
      .reduce((sum, entry) => sum + entry.amount, 0)
  );
  const automaticWeeklySalaryExpense = riders.reduce(
    (sum, rider) => sum + rider.salaryWeekly,
    0
  );
  const weeklySalaryExpense = getWeeklySalaryExpense(settings, riders);
  const weeklyFacilityMaintenance = getWeeklyFacilityMaintenance(settings);
  const plannedFacilityUpgradeCost = (
    Object.keys(settings.facilities) as FacilityKey[]
  ).reduce((sum, facilityKey) => {
    const facility = settings.facilities[facilityKey];

    if (
      !facility.plannedUpgrade ||
      facility.upgradeInProgress ||
      facility.targetLevel === null ||
      facility.targetLevel <= facility.level
    ) {
      return sum;
    }

    const upgradeCost = getFacilityUpgradeCost(facilityKey, facility.targetLevel);
    return sum + (upgradeCost ?? 0);
  }, 0);
  const weeklyFixedCosts = weeklySalaryExpense + weeklyFacilityMaintenance;
  const projectedBalanceAfterWeeklyCosts = currentBalance - weeklyFixedCosts;
  const projectedBalanceAfterThreeWeeks =
    currentBalance - weeklyFixedCosts * 3 - plannedFacilityUpgradeCost;
  const automaticEntries = state.entries.filter((entry) => entry.source === "sync");
  const weeklyEconomyEntries = automaticEntries.filter(
    (entry) =>
      entry.sourceKey?.startsWith("weekly-salary:") ||
      entry.sourceKey?.startsWith("weekly-maintenance:")
  );
  const facilityEntries = automaticEntries.filter(
    (entry) => entry.category === "facility-upgrade"
  );
  const racePrizeEntries = automaticEntries.filter(
    (entry) => entry.category === "race-prize"
  );
  const salaryReferenceGap = weeklySalaryExpense - automaticWeeklySalaryExpense;
  const reserveGap = currentBalance - BEGINNER_GUIDE_SAFETY_RESERVE_TARGET;
  const projectedReserveGap =
    projectedBalanceAfterThreeWeeks - BEGINNER_GUIDE_SAFETY_RESERVE_TARGET;
  const correctionsApplied = countCorrections(reconciliationResult.metrics);
  const reconciliationIssues: FinanceReconciliationIssue[] = [];

  if (settings.manualWeeklySalaryExpense !== null && salaryReferenceGap !== 0) {
    reconciliationIssues.push({
      code: "salary-reference-gap",
      severity: Math.abs(salaryReferenceGap) >= 5000 ? "warning" : "info",
      label: "La masse salariale paramétrée diffère de l'effectif détecté.",
      amount: salaryReferenceGap,
    });
  }

  if (reserveGap < 0) {
    reconciliationIssues.push({
      code: "reserve-current-gap",
      severity: "warning",
      label: "Le solde actuel est sous la réserve de sécurité visée.",
      amount: reserveGap,
    });
  }

  if (projectedReserveGap < 0) {
    reconciliationIssues.push({
      code: "reserve-projected-gap",
      severity: projectedReserveGap <= -100000 ? "critical" : "warning",
      label: "La projection à 3 semaines passe sous la réserve de sécurité.",
      amount: projectedReserveGap,
    });
  }

  if (correctionsApplied > 0) {
    reconciliationIssues.push({
      code: "sync-corrections",
      severity: "info",
      label: "Des écritures automatiques ont été réconciliées.",
      amount: correctionsApplied,
    });
  }

  const reconciliation: FinanceReconciliationSummary = {
    syncEntryCount: automaticEntries.length,
    manualEntryCount: state.entries.length - automaticEntries.length,
    racePrizeEntryCount: racePrizeEntries.length,
    facilityEntryCount: facilityEntries.length,
    activeSalarySource:
      settings.manualWeeklySalaryExpense !== null && settings.manualWeeklySalaryExpense >= 0
        ? "parametree"
        : "effectif",
    salaryReferenceGap,
    reserveGap,
    projectedReserveGap,
    correctionsApplied,
    issues: reconciliationIssues,
  };

  return {
    state,
    currentBalance,
    totalIncome,
    totalExpenses,
    automaticWeeklySalaryExpense,
    weeklySalaryExpense,
    weeklyFacilityMaintenance,
    plannedFacilityUpgradeCost,
    weeklyFixedCosts,
    projectedBalanceAfterWeeklyCosts,
    projectedBalanceAfterThreeWeeks,
    automaticEntries,
    facilityEntries,
    racePrizeEntries,
    weeklyEconomyEntries,
    weeklyEconomyProcessedThrough: state.weeklyEconomyProcessedThrough,
    reconciliation,
    prizeTables: PRIZE_REFERENCE_TABLES,
  };
}

function isEntryRecent(entry: FinanceEntry, withinDays: number): boolean {
  const entryTime = new Date(entry.occurredAt).getTime();

  if (Number.isNaN(entryTime)) {
    return false;
  }

  const windowStart = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  return entryTime >= windowStart;
}

function extractRiderNameFromRacePrizeLabel(label: string): string | null {
  if (!label.startsWith("Prime course - ")) {
    return null;
  }

  const withoutPrefix = label.slice("Prime course - ".length);
  const separatorIndex = withoutPrefix.lastIndexOf(" - ");

  if (separatorIndex <= 0) {
    return null;
  }

  return withoutPrefix.slice(0, separatorIndex).trim() || null;
}

export function getRecentPrizeIncomeByRider(
  state: FinanceState,
  withinDays = 7
): Record<string, number> {
  const totals: Record<string, number> = {};

  state.entries
    .filter(
      (entry) =>
        entry.category === "race-prize" &&
        entry.amount > 0 &&
        isEntryRecent(entry, withinDays)
    )
    .forEach((entry) => {
      const riderName = extractRiderNameFromRacePrizeLabel(entry.label);

      if (!riderName) {
        return;
      }

      const key = normalizeComparable(riderName);
      totals[key] = (totals[key] ?? 0) + entry.amount;
    });

  return totals;
}

export function getAvailableHistoryWeeks(state: FinanceState): number {
  const timestamps = state.entries
    .map((entry) => new Date(entry.occurredAt).getTime())
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) {
    return 1;
  }

  const oldestTimestamp = Math.min(...timestamps);
  const elapsedMs = Math.max(0, Date.now() - oldestTimestamp);
  const elapsedWeeks = Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000));

  return elapsedWeeks + 1;
}