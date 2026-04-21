import { useEffect, useMemo, useState } from "react";
import Card from "../common/Card";
import { formatCurrency } from "../../lib/utils/numbers";
import {
  loadRosterHistoryViewPreferences,
  saveRosterHistoryViewPreferences,
  type RosterHistoryAlertKindFilter,
  type RosterHistoryCategoryFilter,
} from "../../lib/storage/rosterHistoryViewStorage";
import type { Rider } from "../../types/rider";
import type { ClubSettings } from "../../types/settings";
import type { RiderHistorySnapshot, RiderHistorySnapshotEntry } from "../../types/riderHistory";

type RiderHistoryCardProps = {
  riders: Rider[];
  snapshots: RiderHistorySnapshot[];
  recentPrizeIncomeByRider: Record<string, number>;
  settings: ClubSettings;
};

type RiderHistoryRow = {
  riderId: string;
  riderName: string;
  category: RiderHistorySnapshotEntry["category"];
  currentForm: number;
  previousForm: number | null;
  formDelta: number | null;
  currentAgeYears: number;
  currentAgeWeeks: number;
  previousAgeYears: number | null;
  previousAgeWeeks: number | null;
  currentValue: number;
  previousValue: number | null;
  valueDelta: number | null;
  currentSalaryWeekly: number;
  previousSalaryWeekly: number | null;
  salaryDelta: number | null;
  total: number;
  previousTotal: number | null;
  totalDelta: number | null;
  lastSeenAt: string;
};

type SnapshotTrend = {
  currentCapital: number;
  previousCapital: number | null;
  capitalDelta: number | null;
  currentSalary: number;
  previousSalary: number | null;
  salaryDelta: number | null;
  currentAverageTotal: number;
  previousAverageTotal: number | null;
  averageTotalDelta: number | null;
  periodLabel: string;
  currentWeekLabel: string;
  previousWeekLabel: string | null;
};

type RiderBusinessAlert = {
  riderId: string;
  riderSourceId: string;
  riderName: string;
  riderCategory: RiderHistorySnapshotEntry["category"];
  severity: "high" | "medium";
  kind: "salary-drift" | "value-drop" | "veteran-yield";
  title: string;
  note: string;
};

type CriticalAlertCounter = {
  kind: RiderBusinessAlert["kind"];
  title: string;
  total: number;
  Pro: number;
  U25: number;
  U21: number;
};

const OBJECTIVE_AGE_TARGET: Record<ClubSettings["clubObjective"], number> = {
  formation: 24,
  performance: 30,
  mixte: 27,
};

const TOLERANCE_MULTIPLIER: Record<ClubSettings["salaryTolerance"], number> = {
  prudente: 0.9,
  normale: 1.1,
  agressive: 1.3,
};

function formatSnapshotDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRiderAge(years: number, weeks: number): string {
  return `${years}a ${weeks}s`;
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function getWeekKey(value: string): string {
  return getStartOfWeek(new Date(value)).toISOString().slice(0, 10);
}

function formatWeekLabelFromKey(value: string): string {
  const start = new Date(value);

  if (Number.isNaN(start.getTime())) {
    return value;
  }

  const end = addDays(start, 6);

  return `${start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} -> ${end.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}`;
}

function getLatestSnapshotPerWeek(snapshots: RiderHistorySnapshot[]): RiderHistorySnapshot[] {
  const byWeek = new Map<string, RiderHistorySnapshot>();

  snapshots.forEach((snapshot) => {
    const weekKey = getWeekKey(snapshot.capturedAt);
    const current = byWeek.get(weekKey);

    if (!current || new Date(snapshot.capturedAt).getTime() > new Date(current.capturedAt).getTime()) {
      byWeek.set(weekKey, snapshot);
    }
  });

  return [...byWeek.values()].sort(
    (left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime()
  );
}

function formatDelta(value: number | null, formatter: (value: number) => string): string {
  if (value === null) {
    return "-";
  }

  if (value > 0) {
    return `+${formatter(value)}`;
  }

  return formatter(value);
}

function getTrendTone(value: number | null): "neutral" | "positive" | "negative" {
  if (value === null || value === 0) {
    return "neutral";
  }

  return value > 0 ? "positive" : "negative";
}

function getAlertSeverityClass(years: number, weeks: number): string {
  const ageInWeeks = years * 52 + weeks;

  if (ageInWeeks >= 32 * 52) {
    return "roster-aging-alert roster-aging-alert-high";
  }

  if (ageInWeeks >= 29 * 52) {
    return "roster-aging-alert roster-aging-alert-medium";
  }

  return "roster-aging-alert";
}

function buildSnapshotTrend(snapshots: RiderHistorySnapshot[]): SnapshotTrend {
  const weeklySnapshots = getLatestSnapshotPerWeek(snapshots);
  const current = weeklySnapshots[0] ?? null;
  const weeklyPrevious = weeklySnapshots[1] ?? null;

  const currentCapital = current ? current.riders.reduce((sum, rider) => sum + rider.value, 0) : 0;
  const currentSalary = current ? current.riders.reduce((sum, rider) => sum + rider.salaryWeekly, 0) : 0;
  const currentAverageTotal = current && current.riders.length > 0
    ? current.riders.reduce((sum, rider) => sum + rider.total, 0) / current.riders.length
    : 0;

  const previousCapital = weeklyPrevious ? weeklyPrevious.riders.reduce((sum, rider) => sum + rider.value, 0) : null;
  const previousSalary = weeklyPrevious ? weeklyPrevious.riders.reduce((sum, rider) => sum + rider.salaryWeekly, 0) : null;
  const previousAverageTotal = weeklyPrevious && weeklyPrevious.riders.length > 0
    ? weeklyPrevious.riders.reduce((sum, rider) => sum + rider.total, 0) / weeklyPrevious.riders.length
    : null;

  return {
    currentCapital,
    previousCapital,
    capitalDelta: previousCapital === null ? null : currentCapital - previousCapital,
    currentSalary,
    previousSalary,
    salaryDelta: previousSalary === null ? null : currentSalary - previousSalary,
    currentAverageTotal,
    previousAverageTotal,
    averageTotalDelta: previousAverageTotal === null ? null : currentAverageTotal - previousAverageTotal,
    periodLabel: weeklyPrevious ? "vs semaine passée" : "pas encore de semaine passée",
    currentWeekLabel: current ? formatWeekLabelFromKey(getWeekKey(current.capturedAt)) : "-",
    previousWeekLabel: weeklyPrevious ? formatWeekLabelFromKey(getWeekKey(weeklyPrevious.capturedAt)) : null,
  };
}

function buildRiderHistoryRows(
  riders: Rider[],
  snapshots: RiderHistorySnapshot[]
): RiderHistoryRow[] {
  const weeklySnapshots = getLatestSnapshotPerWeek(snapshots);
  const currentWeekSnapshot = weeklySnapshots[0] ?? null;
  const previousWeekSnapshot = weeklySnapshots[1] ?? null;

  if (!currentWeekSnapshot) {
    return [];
  }

  return riders.reduce<RiderHistoryRow[]>((rows, rider) => {
      const current = currentWeekSnapshot.riders.find((item) => item.riderId === rider.id);

      if (!current) {
        return rows;
      }

      const previous = previousWeekSnapshot?.riders.find((item) => item.riderId === rider.id);

      rows.push({
        riderId: rider.id,
        riderName: rider.name,
        category: current.category,
        currentForm: current.form,
        previousForm: previous?.form ?? null,
        formDelta: previous ? current.form - previous.form : null,
        currentAgeYears: current.ageYears,
        currentAgeWeeks: current.ageWeeks,
        previousAgeYears: previous?.ageYears ?? null,
        previousAgeWeeks: previous?.ageWeeks ?? null,
        currentValue: current.value,
        previousValue: previous?.value ?? null,
        valueDelta: previous ? current.value - previous.value : null,
        currentSalaryWeekly: current.salaryWeekly,
        previousSalaryWeekly: previous?.salaryWeekly ?? null,
        salaryDelta: previous ? current.salaryWeekly - previous.salaryWeekly : null,
        total: current.total,
        previousTotal: previous?.total ?? null,
        totalDelta: previous ? current.total - previous.total : null,
        lastSeenAt: currentWeekSnapshot.capturedAt,
      });

      return rows;
    }, []).sort((left, right) => left.riderName.localeCompare(right.riderName, "fr-FR"));
}

function buildBusinessAlerts(
  rows: RiderHistoryRow[],
  recentPrizeIncomeByRider: Record<string, number>,
  settings: ClubSettings
): RiderBusinessAlert[] {
  if (rows.length === 0) {
    return [];
  }

  const averageSalary = rows.reduce((sum, row) => sum + row.currentSalaryWeekly, 0) / rows.length;
  const averageTotal = rows.reduce((sum, row) => sum + row.total, 0) / rows.length;
  const salaryThreshold = averageSalary * TOLERANCE_MULTIPLIER[settings.salaryTolerance];
  const veteranAgeThreshold = OBJECTIVE_AGE_TARGET[settings.clubObjective] + 3;
  const highVeteranAgeThreshold = veteranAgeThreshold + 2;
  const valueDropBaseRatio = settings.clubObjective === "formation" ? 0.06 : settings.clubObjective === "performance" ? 0.1 : 0.08;
  const weakYieldRatio = settings.salaryTolerance === "prudente" ? 0.55 : settings.salaryTolerance === "normale" ? 0.4 : 0.28;

  return rows
    .flatMap<RiderBusinessAlert>((row) => {
      const alerts: RiderBusinessAlert[] = [];
      const recentPrizeIncome = recentPrizeIncomeByRider[normalizeComparable(row.riderName)] ?? 0;

      if (
        row.salaryDelta !== null &&
        row.salaryDelta > 0 &&
        (row.totalDelta ?? 0) <= 0 &&
        (row.formDelta ?? 0) <= 0
      ) {
        alerts.push({
          riderId: `${row.riderId}-salary-drift`,
          riderSourceId: row.riderId,
          riderName: row.riderName,
          riderCategory: row.category,
          severity: row.currentSalaryWeekly >= salaryThreshold && row.salaryDelta > row.currentSalaryWeekly * 0.08 ? "high" : "medium",
          kind: "salary-drift",
          title: "Salaire en hausse sans progrès sportif",
          note: `Salaire ${formatDelta(row.salaryDelta, (value) => formatCurrency(value))}, total ${row.totalDelta === null ? "stable" : row.totalDelta > 0 ? `+${row.totalDelta}` : row.totalDelta}, forme ${row.formDelta === null ? "stable" : row.formDelta > 0 ? `+${row.formDelta}` : row.formDelta}.`,
        });
      }

      if (
        row.valueDelta !== null &&
        row.valueDelta < -Math.max(25000, row.currentValue * valueDropBaseRatio)
      ) {
        alerts.push({
          riderId: `${row.riderId}-value-drop`,
          riderSourceId: row.riderId,
          riderName: row.riderName,
          riderCategory: row.category,
          severity: row.valueDelta < -Math.max(50000, row.currentValue * (valueDropBaseRatio + 0.04)) ? "high" : "medium",
          kind: "value-drop",
          title: "Valeur en décrochage",
          note: `Valeur ${formatDelta(row.valueDelta, (value) => formatCurrency(value))} sur la semaine, avec total ${row.totalDelta === null ? "stable" : row.totalDelta > 0 ? `+${row.totalDelta}` : row.totalDelta}.`,
        });
      }

      if (
        row.currentAgeYears >= veteranAgeThreshold &&
        row.currentSalaryWeekly >= salaryThreshold &&
        row.total <= averageTotal &&
        recentPrizeIncome <= row.currentSalaryWeekly * weakYieldRatio
      ) {
        alerts.push({
          riderId: `${row.riderId}-veteran-yield`,
          riderSourceId: row.riderId,
          riderName: row.riderName,
          riderCategory: row.category,
          severity: row.currentAgeYears >= highVeteranAgeThreshold ? "high" : "medium",
          kind: "veteran-yield",
          title: "Vétéran coûteux à faible rendement",
          note: `Salaire ${formatCurrency(row.currentSalaryWeekly)}, primes récentes ${formatCurrency(recentPrizeIncome)}, total ${row.total} pour une moyenne d'effectif à ${averageTotal.toFixed(1)}.`,
        });
      }

      return alerts;
    })
    .sort((left, right) => {
      if (left.severity !== right.severity) {
        return left.severity === "high" ? -1 : 1;
      }

      return left.riderName.localeCompare(right.riderName, "fr-FR");
    });
}

function buildCriticalAlertCounters(alerts: RiderBusinessAlert[]): CriticalAlertCounter[] {
  const criticalAlerts = alerts.filter((alert) => alert.severity === "high");
  const counterDefinitions: Array<Pick<CriticalAlertCounter, "kind" | "title">> = [
    { kind: "salary-drift", title: "Salaire sans progrès" },
    { kind: "value-drop", title: "Décrochage de valeur" },
    { kind: "veteran-yield", title: "Vétérans peu rentables" },
  ];

  return counterDefinitions.map(({ kind, title }) => {
    const entries = criticalAlerts.filter((alert) => alert.kind === kind);

    return {
      kind,
      title,
      total: entries.length,
      Pro: entries.filter((alert) => alert.riderCategory === "Pro").length,
      U25: entries.filter((alert) => alert.riderCategory === "U25").length,
      U21: entries.filter((alert) => alert.riderCategory === "U21").length,
    };
  });
}

function buildFilteredTrend(rows: RiderHistoryRow[], baseTrend: SnapshotTrend): SnapshotTrend {
  if (rows.length === 0) {
    return {
      ...baseTrend,
      currentCapital: 0,
      previousCapital: 0,
      capitalDelta: 0,
      currentSalary: 0,
      previousSalary: 0,
      salaryDelta: 0,
      currentAverageTotal: 0,
      previousAverageTotal: 0,
      averageTotalDelta: 0,
    };
  }

  const currentCapital = rows.reduce((sum, row) => sum + row.currentValue, 0);
  const previousCapital = rows.some((row) => row.previousValue !== null)
    ? rows.reduce((sum, row) => sum + (row.previousValue ?? 0), 0)
    : null;
  const currentSalary = rows.reduce((sum, row) => sum + row.currentSalaryWeekly, 0);
  const previousSalary = rows.some((row) => row.previousSalaryWeekly !== null)
    ? rows.reduce((sum, row) => sum + (row.previousSalaryWeekly ?? 0), 0)
    : null;
  const currentAverageTotal = rows.reduce((sum, row) => sum + row.total, 0) / rows.length;
  const previousAverageTotal = rows.some((row) => row.previousTotal !== null)
    ? rows.reduce((sum, row) => sum + (row.previousTotal ?? 0), 0) / rows.length
    : null;

  return {
    ...baseTrend,
    currentCapital,
    previousCapital,
    capitalDelta: previousCapital === null ? null : currentCapital - previousCapital,
    currentSalary,
    previousSalary,
    salaryDelta: previousSalary === null ? null : currentSalary - previousSalary,
    currentAverageTotal,
    previousAverageTotal,
    averageTotalDelta: previousAverageTotal === null ? null : currentAverageTotal - previousAverageTotal,
  };
}

function getAlertKindLabel(kind: RosterHistoryAlertKindFilter): string {
  switch (kind) {
    case "salary-drift":
      return "salaire sans progrès";
    case "value-drop":
      return "décrochage de valeur";
    case "veteran-yield":
      return "vétérans peu rentables";
    default:
      return "toutes les alertes";
  }
}

function getActiveAlertFilterLabel(
  categoryFilter: RosterHistoryCategoryFilter,
  alertKindFilter: RosterHistoryAlertKindFilter,
  highAlertsOnly: boolean
): string {
  const parts: string[] = [];

  parts.push(
    alertKindFilter === "all" ? "Toutes les alertes métier" : `Alerte ${getAlertKindLabel(alertKindFilter)}`
  );
  parts.push(categoryFilter === "all" ? "tout l'effectif" : `catégorie ${categoryFilter}`);
  parts.push(highAlertsOnly ? "niveau fort uniquement" : "tous niveaux");

  return parts.join(" • ");
}

export default function RiderHistoryCard({ riders, snapshots, recentPrizeIncomeByRider, settings }: RiderHistoryCardProps) {
  const initialViewPreferences = useMemo(() => loadRosterHistoryViewPreferences(), []);
  const rows = useMemo(() => buildRiderHistoryRows(riders, snapshots), [riders, snapshots]);
  const baseTrend = useMemo(() => buildSnapshotTrend(snapshots), [snapshots]);
  const weeklySnapshots = useMemo(() => getLatestSnapshotPerWeek(snapshots), [snapshots]);
  const businessAlerts = useMemo(
    () => buildBusinessAlerts(rows, recentPrizeIncomeByRider, settings),
    [recentPrizeIncomeByRider, rows, settings]
  );
  const criticalAlertCounters = useMemo(() => buildCriticalAlertCounters(businessAlerts), [businessAlerts]);
  const [categoryFilter, setCategoryFilter] = useState<RosterHistoryCategoryFilter>(
    initialViewPreferences.categoryFilter
  );
  const [alertKindFilter, setAlertKindFilter] = useState<RosterHistoryAlertKindFilter>(
    initialViewPreferences.alertKindFilter
  );
  const [highAlertsOnly, setHighAlertsOnly] = useState(
    initialViewPreferences.highAlertsOnly
  );
  const [selectedRiderId, setSelectedRiderId] = useState<string>(initialViewPreferences.selectedRiderId);

  const alertsByRider = useMemo(() => {
    return businessAlerts.reduce<Record<string, RiderBusinessAlert[]>>((groups, alert) => {
      groups[alert.riderSourceId] = [...(groups[alert.riderSourceId] ?? []), alert];
      return groups;
    }, {});
  }, [businessAlerts]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;

      if (!matchesCategory) {
        return false;
      }

      const rowAlerts = alertsByRider[row.riderId] ?? [];
      const matchesAlertKind =
        alertKindFilter === "all"
          ? true
          : rowAlerts.some((alert) => alert.kind === alertKindFilter && (!highAlertsOnly || alert.severity === "high"));

      if (!matchesAlertKind) {
        return false;
      }

      if (!highAlertsOnly) {
        return true;
      }

      return rowAlerts.some((alert) => alert.severity === "high");
    });
  }, [alertKindFilter, alertsByRider, categoryFilter, highAlertsOnly, rows]);
  const trend = useMemo(() => buildFilteredTrend(filteredRows, baseTrend), [baseTrend, filteredRows]);

  useEffect(() => {
    if (!filteredRows.some((row) => row.riderId === selectedRiderId)) {
      setSelectedRiderId(filteredRows[0]?.riderId ?? "");
    }
  }, [filteredRows, selectedRiderId]);

  useEffect(() => {
    saveRosterHistoryViewPreferences({ categoryFilter, alertKindFilter, highAlertsOnly, selectedRiderId });
  }, [alertKindFilter, categoryFilter, highAlertsOnly, selectedRiderId]);

  function handleCounterCardClick(kind: RiderBusinessAlert["kind"]) {
    setAlertKindFilter((current) => {
      const next = current === kind ? "all" : kind;

      setCategoryFilter("all");

      if (next !== "all") {
        setHighAlertsOnly(true);
      }

      return next;
    });
  }

  function handleCounterCategoryClick(kind: RiderBusinessAlert["kind"], category: Exclude<RosterHistoryCategoryFilter, "all">) {
    if (alertKindFilter === kind && categoryFilter === category) {
      setAlertKindFilter("all");
      setCategoryFilter("all");
      setHighAlertsOnly(false);
      return;
    }

    setAlertKindFilter(kind);
    setCategoryFilter(category);
    setHighAlertsOnly(true);
  }

  function handleResetAllFilters() {
    setCategoryFilter("all");
    setAlertKindFilter("all");
    setHighAlertsOnly(false);
  }

  const selectedTimeline = useMemo(() => {
    if (!selectedRiderId) {
      return [];
    }

    return snapshots
      .filter((snapshot) => weeklySnapshots.some((weeklySnapshot) => weeklySnapshot.id === snapshot.id))
      .map((snapshot) => ({
        capturedAt: snapshot.capturedAt,
        entry: snapshot.riders.find((item) => item.riderId === selectedRiderId),
      }))
      .filter(
        (snapshot): snapshot is { capturedAt: string; entry: RiderHistorySnapshotEntry } =>
          snapshot.entry !== undefined
      )
      .slice(0, 8);
  }, [selectedRiderId, snapshots, weeklySnapshots]);

  const trackedRows = filteredRows.filter((row) => row.formDelta !== null || row.previousAgeYears !== null);
  const topFormMovers = [...trackedRows]
    .filter((row) => row.formDelta !== null && row.formDelta !== 0)
    .sort((left, right) => Math.abs(right.formDelta ?? 0) - Math.abs(left.formDelta ?? 0))
    .slice(0, 5);
  const topValueMovers = [...filteredRows]
    .filter((row) => row.valueDelta !== null && row.valueDelta !== 0)
    .sort((left, right) => Math.abs(right.valueDelta ?? 0) - Math.abs(left.valueDelta ?? 0))
    .slice(0, 5);
  const agingAlerts = [...filteredRows]
    .filter((row) => row.currentAgeYears >= 29 || row.currentAgeYears <= 21)
    .sort((left, right) => {
      const leftWeeks = left.currentAgeYears * 52 + left.currentAgeWeeks;
      const rightWeeks = right.currentAgeYears * 52 + right.currentAgeWeeks;
      return rightWeeks - leftWeeks;
    })
    .slice(0, 6);

  const filteredBusinessAlerts = useMemo(() => {
    const allowedRiderIds = new Set(filteredRows.map((row) => row.riderId));

    return businessAlerts.filter((alert) => {
      if (!allowedRiderIds.has(alert.riderSourceId)) {
        return false;
      }

      if (alertKindFilter !== "all" && alert.kind !== alertKindFilter) {
        return false;
      }

      return highAlertsOnly ? alert.severity === "high" : true;
    }).slice(0, 8);
  }, [alertKindFilter, businessAlerts, filteredRows, highAlertsOnly]);
  const activeAlertFilterLabel = useMemo(
    () => getActiveAlertFilterLabel(categoryFilter, alertKindFilter, highAlertsOnly),
    [alertKindFilter, categoryFilter, highAlertsOnly]
  );

  return (
    <Card title="Historique coureurs">
      {snapshots.length === 0 ? (
        <p className="muted">Aucun snapshot roster enregistré pour le moment.</p>
      ) : (
        <div className="page-stack">
          <div className="roster-history-toolbar">
            <div className="roster-history-filter-group">
              <button
                type="button"
                className={categoryFilter === "all" ? "button button-secondary roster-history-filter-button roster-history-filter-button-active" : "button button-secondary roster-history-filter-button"}
                onClick={() => setCategoryFilter("all")}
              >
                Tout l'effectif
              </button>
              <button
                type="button"
                className={categoryFilter === "Pro" ? "button button-secondary roster-history-filter-button roster-history-filter-button-active" : "button button-secondary roster-history-filter-button"}
                onClick={() => setCategoryFilter("Pro")}
              >
                Pros
              </button>
              <button
                type="button"
                className={categoryFilter === "U25" ? "button button-secondary roster-history-filter-button roster-history-filter-button-active" : "button button-secondary roster-history-filter-button"}
                onClick={() => setCategoryFilter("U25")}
              >
                U25
              </button>
              <button
                type="button"
                className={categoryFilter === "U21" ? "button button-secondary roster-history-filter-button roster-history-filter-button-active" : "button button-secondary roster-history-filter-button"}
                onClick={() => setCategoryFilter("U21")}
              >
                U21
              </button>
            </div>

            <label className="roster-history-toggle">
              <input
                type="checkbox"
                checked={highAlertsOnly}
                onChange={(event) => setHighAlertsOnly(event.target.checked)}
              />
              <span>Alertes fortes uniquement</span>
            </label>

            {alertKindFilter !== "all" ? (
              <button
                type="button"
                className="button button-secondary roster-history-filter-button"
                onClick={() => setAlertKindFilter("all")}
              >
                Retirer le filtre d'alerte
              </button>
            ) : null}

            {(categoryFilter !== "all" || alertKindFilter !== "all" || highAlertsOnly) ? (
              <button
                type="button"
                className="button button-secondary roster-history-filter-button"
                onClick={handleResetAllFilters}
              >
                Réinitialiser les filtres
              </button>
            ) : null}
          </div>

          <div className="roster-history-summary-grid">
            <div className="roster-history-stat">
              <span className="muted">Snapshots stockés</span>
              <strong>{snapshots.length}</strong>
            </div>
            <div className="roster-history-stat">
              <span className="muted">Coureurs suivis</span>
              <strong>{filteredRows.length}</strong>
              <span className="roster-history-delta roster-history-delta-neutral">
                Filtre {categoryFilter === "all" ? "global" : categoryFilter}
              </span>
            </div>
            <div className="roster-history-stat">
              <span className="muted">Dernière capture</span>
              <strong>{formatSnapshotDate(snapshots[0].capturedAt)}</strong>
              <span className="roster-history-delta roster-history-delta-neutral">Semaine {trend.currentWeekLabel}</span>
            </div>
            <div className="roster-history-stat">
              <span className="muted">Capital sportif actuel</span>
              <strong>{formatCurrency(trend.currentCapital)}</strong>
              <span className={`roster-history-delta roster-history-delta-${getTrendTone(trend.capitalDelta)}`}>
                {trend.periodLabel} {formatDelta(trend.capitalDelta, (value) => formatCurrency(value))}
              </span>
            </div>
            <div className="roster-history-stat">
              <span className="muted">Masse salariale actuelle</span>
              <strong>{formatCurrency(trend.currentSalary)}</strong>
              <span className={`roster-history-delta roster-history-delta-${getTrendTone(trend.salaryDelta)}`}>
                {trend.periodLabel} {formatDelta(trend.salaryDelta, (value) => formatCurrency(value))}
              </span>
            </div>
            <div className="roster-history-stat">
              <span className="muted">Total moyen</span>
              <strong>{trend.currentAverageTotal.toFixed(1)}</strong>
              <span className={`roster-history-delta roster-history-delta-${getTrendTone(trend.averageTotalDelta)}`}>
                {trend.periodLabel} {formatDelta(trend.averageTotalDelta, (value) => value.toFixed(1))}
              </span>
              <span className="roster-history-delta roster-history-delta-neutral">
                Objectif {settings.clubObjective} • tolérance {settings.salaryTolerance}
              </span>
            </div>
          </div>

          <div className="message-box">
            <p>
              Lecture hebdomadaire : comparaison de la dernière capture de la semaine {trend.currentWeekLabel}
              {trend.previousWeekLabel ? ` avec la semaine ${trend.previousWeekLabel}.` : ". Une seule semaine de référence est disponible pour l'instant."}
            </p>
          </div>

          <div className="roster-history-insight-grid">
            <div className="roster-history-panel">
              <p className="field-label">Variations de forme</p>
              {topFormMovers.length > 0 ? (
                <div className="roster-history-badges">
                  {topFormMovers.map((row) => (
                    <span key={row.riderId} className="roster-history-badge">
                      {row.riderName} {row.formDelta && row.formDelta > 0 ? `+${row.formDelta}` : row.formDelta}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">Aucune variation de forme notable entre les dernières captures.</p>
              )}
            </div>

            <div className="roster-history-panel">
              <p className="field-label">Variations de valeur</p>
              {topValueMovers.length > 0 ? (
                <div className="roster-history-badges">
                  {topValueMovers.map((row) => (
                    <span key={row.riderId} className="roster-history-badge roster-history-badge-value">
                      {row.riderName} {formatDelta(row.valueDelta, (value) => formatCurrency(value))}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">Aucune variation de valeur notable entre les dernières captures.</p>
              )}
            </div>

            <div className="roster-history-panel">
              <p className="field-label">Compteurs d'alertes critiques</p>
              <div className="roster-alert-counter-list">
                {criticalAlertCounters.map((counter) => (
                  <div
                    key={counter.kind}
                    className={
                      alertKindFilter === counter.kind
                        ? "roster-alert-counter-card roster-alert-counter-card-active"
                        : "roster-alert-counter-card"
                    }
                  >
                    <button
                      type="button"
                      className="roster-alert-counter-button"
                      onClick={() => handleCounterCardClick(counter.kind)}
                    >
                      <span className="roster-alert-counter-header">
                      <strong>{counter.title}</strong>
                        <span>{counter.total} cas critiques</span>
                      </span>
                    </button>
                    <div className="roster-alert-counter-values">
                      <button
                        type="button"
                        className={categoryFilter === "Pro" && alertKindFilter === counter.kind ? "roster-alert-counter-chip roster-alert-counter-chip-active" : "roster-alert-counter-chip"}
                        onClick={() => handleCounterCategoryClick(counter.kind, "Pro")}
                      >
                        Pros {counter.Pro}
                      </button>
                      <button
                        type="button"
                        className={categoryFilter === "U25" && alertKindFilter === counter.kind ? "roster-alert-counter-chip roster-alert-counter-chip-active" : "roster-alert-counter-chip"}
                        onClick={() => handleCounterCategoryClick(counter.kind, "U25")}
                      >
                        U25 {counter.U25}
                      </button>
                      <button
                        type="button"
                        className={categoryFilter === "U21" && alertKindFilter === counter.kind ? "roster-alert-counter-chip roster-alert-counter-chip-active" : "roster-alert-counter-chip"}
                        onClick={() => handleCounterCategoryClick(counter.kind, "U21")}
                      >
                        U21 {counter.U21}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="roster-history-panel">
              <p className="field-label">Alertes métier</p>
              <p className="roster-active-filter-label">Filtre actif : {activeAlertFilterLabel}</p>
              {filteredBusinessAlerts.length > 0 ? (
                <div className="roster-business-alert-list">
                  {filteredBusinessAlerts.map((alert) => (
                    <div
                      key={alert.riderId}
                      className={
                        alert.severity === "high"
                          ? "roster-business-alert roster-business-alert-high"
                          : "roster-business-alert roster-business-alert-medium"
                      }
                    >
                      <strong>{alert.riderName} • {alert.title}</strong>
                      <span>{alert.note}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Aucune alerte métier forte détectée sur la comparaison hebdomadaire.</p>
              )}
            </div>

            <div className="roster-history-panel">
              <p className="field-label">Alertes de vieillissement</p>
              {agingAlerts.length > 0 ? (
                <div className="roster-aging-alert-list">
                  {agingAlerts.map((row) => (
                    <div key={row.riderId} className={getAlertSeverityClass(row.currentAgeYears, row.currentAgeWeeks)}>
                      <strong>{row.riderName}</strong>
                      <span>{formatRiderAge(row.currentAgeYears, row.currentAgeWeeks)} • {row.category}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Aucune alerte d'âge particulière sur l'effectif actuel.</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="roster-history-rider" className="field-label">
              Lire le parcours d'un coureur
            </label>
            <select
              id="roster-history-rider"
              className="input select-input"
              value={selectedRiderId}
              onChange={(event) => setSelectedRiderId(event.target.value)}
            >
              {filteredRows.map((row) => (
                <option key={row.riderId} value={row.riderId}>
                  {row.riderName} • {row.category}
                </option>
              ))}
            </select>
          </div>

          {selectedTimeline.length > 0 ? (
            <div className="roster-history-timeline">
              {selectedTimeline.map((snapshot, index) => {
                const previous = selectedTimeline[index + 1]?.entry;
                const formDelta = previous ? snapshot.entry.form - previous.form : null;
                const valueDelta = previous ? snapshot.entry.value - previous.value : null;
                const salaryDelta = previous ? snapshot.entry.salaryWeekly - previous.salaryWeekly : null;
                const totalDelta = previous ? snapshot.entry.total - previous.total : null;

                return (
                  <div key={`${snapshot.capturedAt}-${snapshot.entry.riderId}`} className="roster-history-timeline-item">
                    <div className="roster-history-timeline-meta">
                      <strong>{formatSnapshotDate(snapshot.capturedAt)}</strong>
                      <span>{formatRiderAge(snapshot.entry.ageYears, snapshot.entry.ageWeeks)}</span>
                    </div>
                    <div className="roster-history-timeline-values">
                      <span>Forme {snapshot.entry.form}</span>
                      <span>Valeur {formatCurrency(snapshot.entry.value)}</span>
                      <span>Salaire {formatCurrency(snapshot.entry.salaryWeekly)}</span>
                      <span>Total {snapshot.entry.total}</span>
                    </div>
                    <div className="roster-history-timeline-values roster-history-timeline-values-secondary">
                      <span>
                        {formDelta === null ? "Référence initiale" : formDelta > 0 ? `Forme +${formDelta}` : formDelta < 0 ? `Forme ${formDelta}` : "Forme stable"}
                      </span>
                      <span>
                        {valueDelta === null ? "Valeur de référence" : `Valeur ${formatDelta(valueDelta, (value) => formatCurrency(value))}`}
                      </span>
                      <span>
                        {salaryDelta === null ? "Salaire de référence" : `Salaire ${formatDelta(salaryDelta, (value) => formatCurrency(value))}`}
                      </span>
                      <span>
                        {totalDelta === null ? "Total de référence" : totalDelta > 0 ? `Total +${totalDelta}` : totalDelta < 0 ? `Total ${totalDelta}` : "Total stable"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="table-wrap">
            <p className="roster-active-filter-label">Lecture du tableau : {activeAlertFilterLabel}</p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Coureur</th>
                  <th>Cat.</th>
                  <th>Forme</th>
                  <th>Delta hebdo forme</th>
                  <th>Âge</th>
                  <th>Valeur</th>
                  <th>Delta hebdo valeur</th>
                  <th>Salaire</th>
                  <th>Delta hebdo salaire</th>
                  <th>Total</th>
                  <th>Delta hebdo total</th>
                  <th>Dernière capture</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.riderId}>
                    <td>{row.riderName}</td>
                    <td>{row.category}</td>
                    <td>{row.currentForm}</td>
                    <td>
                      {row.formDelta === null ? "-" : row.formDelta > 0 ? `+${row.formDelta}` : row.formDelta}
                    </td>
                    <td>{formatRiderAge(row.currentAgeYears, row.currentAgeWeeks)}</td>
                    <td>{formatCurrency(row.currentValue)}</td>
                    <td>{formatDelta(row.valueDelta, (value) => formatCurrency(value))}</td>
                    <td>{formatCurrency(row.currentSalaryWeekly)}</td>
                    <td>{formatDelta(row.salaryDelta, (value) => formatCurrency(value))}</td>
                    <td>{row.total}</td>
                    <td>{row.totalDelta === null ? "-" : row.totalDelta > 0 ? `+${row.totalDelta}` : row.totalDelta}</td>
                    <td>{formatSnapshotDate(row.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}