import { useEffect, useMemo, useState } from "react";
import { getFinanceSnapshot } from "../../lib/storage/financeStorage";
import { loadRidersFromStorage } from "../../lib/storage/localStorage";
import { loadRiderHistorySnapshots } from "../../lib/storage/riderHistoryStorage";
import { loadClubSettings } from "../../lib/storage/settingsStorage";
import { loadManualTodos, loadTodoStatuses } from "../../lib/storage/todoStorage";
import { initialRiders } from "../../store/initialState";

type SeasonCycle = {
  season: number;
  week: number;
};

type SeasonHeaderSnapshot = {
  season: number;
  week: number;
  division: string;
  balance: number;
  lowFormCount: number;
  injuredCount: number;
  overLimitCount: number;
  pendingTodoCount: number;
  financeCriticalCount: number;
  financeWarningCount: number;
  formDelta: number | null;
};

const BASE_SEASON = 97;
const BASE_SEASON_START_ISO = "2026-04-15T00:00:00.000Z";
const WEEKS_PER_SEASON = 10;

function getSeasonCycle(now: Date): SeasonCycle {
  const baseStartMs = new Date(BASE_SEASON_START_ISO).getTime();
  const weekDelta = Math.floor((now.getTime() - baseStartMs) / (7 * 24 * 60 * 60 * 1000));
  const seasonOffset = Math.floor(weekDelta / WEEKS_PER_SEASON);
  const weekIndex = ((weekDelta % WEEKS_PER_SEASON) + WEEKS_PER_SEASON) % WEEKS_PER_SEASON;

  return {
    season: BASE_SEASON + seasonOffset,
    week: weekIndex + 1,
  };
}

function buildSnapshot(now: Date): SeasonHeaderSnapshot {
  const cycle = getSeasonCycle(now);
  const settings = loadClubSettings();
  const riders = loadRidersFromStorage();
  const activeRiders = riders.length > 0 ? riders : initialRiders;
  const financeSnapshot = getFinanceSnapshot(settings, activeRiders);
  const manualTodos = loadManualTodos();
  const todoStatuses = loadTodoStatuses();

  const lowFormCount = activeRiders.filter((rider) => rider.form < 50).length;
  const injuredCount = activeRiders.filter(
    (rider) => rider.injury.trim().length > 0 && rider.injury.toLowerCase() !== "aucune"
  ).length;
  const overLimitCount = activeRiders.length > 25 ? activeRiders.length - 25 : 0;
  const pendingTodoCount = manualTodos.filter((todo) => {
    const status = todoStatuses[todo.id] ?? todo.status;
    return status !== "done";
  }).length;
  const financeCriticalCount = financeSnapshot.reconciliation.issues.filter(
    (issue) => issue.severity === "critical"
  ).length;
  const financeWarningCount = financeSnapshot.reconciliation.issues.filter(
    (issue) => issue.severity === "warning"
  ).length;

  // Delta forme vs snapshot précédent
  const currentAvgForm = activeRiders.length > 0
    ? activeRiders.reduce((sum, r) => sum + r.form, 0) / activeRiders.length
    : 0;
  const historySnapshots = loadRiderHistorySnapshots();
  let formDelta: number | null = null;
  if (historySnapshots.length > 0) {
    const prevRiders = historySnapshots[0].riders;
    if (prevRiders.length > 0) {
      const prevAvgForm = prevRiders.reduce((sum, r) => sum + r.form, 0) / prevRiders.length;
      formDelta = Math.round((currentAvgForm - prevAvgForm) * 10) / 10;
    }
  }

  return {
    season: cycle.season,
    week: cycle.week,
    division: settings.divisionPro,
    balance: financeSnapshot.currentBalance,
    lowFormCount,
    injuredCount,
    overLimitCount,
    pendingTodoCount,
    financeCriticalCount,
    financeWarningCount,
    formDelta,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SeasonHeaderV2() {
  const [snapshot, setSnapshot] = useState<SeasonHeaderSnapshot>(() =>
    buildSnapshot(new Date())
  );

  useEffect(() => {
    const refresh = () => {
      setSnapshot(buildSnapshot(new Date()));
    };

    const intervalId = window.setInterval(refresh, 30000);
    window.addEventListener("storage", refresh);
    window.addEventListener("cymanager:finance-updated", refresh as EventListener);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("cymanager:finance-updated", refresh as EventListener);
    };
  }, []);

  const timelineWeeks = useMemo(() => {
    return Array.from({ length: WEEKS_PER_SEASON }, (_, index) => index + 1);
  }, []);

  const criticalAlerts =
    snapshot.overLimitCount + snapshot.financeCriticalCount + snapshot.injuredCount;
  const warningAlerts = snapshot.lowFormCount + snapshot.financeWarningCount;

  return (
    <section className="season-strip" aria-label="Contexte saisonnier">
      <div className="season-strip-row">
        <p className="season-strip-title">
          Saison {snapshot.season} · Semaine {snapshot.week}/10
        </p>
        <div className="season-strip-kpis">
          <span className="season-kpi">Division Pro {snapshot.division}</span>
          <span className="season-kpi">Solde {formatCurrency(snapshot.balance)}</span>
          {snapshot.formDelta !== null && (
            <span className={`season-kpi ${snapshot.formDelta > 0 ? "season-kpi-up" : snapshot.formDelta < 0 ? "season-kpi-down" : ""}`}>
              Forme {snapshot.formDelta > 0 ? "+" : ""}{snapshot.formDelta}
            </span>
          )}
          <span className={`season-kpi ${criticalAlerts > 0 ? "season-kpi-danger" : ""}`}>
            Alertes critiques {criticalAlerts}
          </span>
          <span className={`season-kpi ${warningAlerts > 0 ? "season-kpi-warning" : ""}`}>
            Alertes vigilance {warningAlerts}
          </span>
          <span className="season-kpi">Todo ouverts {snapshot.pendingTodoCount}</span>
        </div>
      </div>

      <div className="season-timeline" role="list" aria-label="Timeline des semaines de saison">
        {timelineWeeks.map((week) => (
          <span
            key={week}
            role="listitem"
            className={week === snapshot.week ? "season-week active" : "season-week"}
          >
            S{week}
          </span>
        ))}
      </div>
    </section>
  );
}
