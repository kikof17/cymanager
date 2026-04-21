import { useMemo, useState } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import { buildRiderProfiles } from "../lib/scoring/riderProfile";
import { getAllResultsFromStorage, type StoredResult } from "../lib/scoring/extractPoints";
import { getFinanceSnapshot } from "../lib/storage/financeStorage";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import { loadManualTodos } from "../lib/storage/todoStorage";
import { getStoredResultCategory } from "../lib/utils/courseCategory";
import { getTodoScheduledAt } from "../lib/utils/courseDates";
import { formatCurrency, formatInteger } from "../lib/utils/numbers";
import { initialRiders } from "../store/initialState";
import type { Rider } from "../types/rider";

type StatsTab = "overview" | "sport" | "squad" | "finance";
type ResultCategory = "pro" | "u25" | "u21";

type TeamResultRow = {
  courseId: string;
  courseTitle: string;
  occurredAt: string;
  category: ResultCategory;
  riderName: string;
  position: number | null;
  points: number;
};

type RiderPerformanceRow = {
  riderName: string;
  category: string;
  points: number;
  races: number;
  wins: number;
  podiums: number;
  top10: number;
  bestPosition: number | null;
  prizes: number;
  weeklySalary: number;
  value: number;
};

const TEAM_NAME = "Kritoff Team";

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDateLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function formatDecimal(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

function parseNumericValue(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parsePosition(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function getStoredResultPayload(
  stored: StoredResult,
  course: ReturnType<typeof loadManualTodos>[number] | undefined
): { result: string; category: ResultCategory } {
  if (typeof stored === "string") {
    return {
      result: stored,
      category: getStoredResultCategory(stored, course),
    };
  }

  return {
    result: stored.result,
    category: getStoredResultCategory(stored, course),
  };
}

function extractTeamResultRows(): TeamResultRow[] {
  const results = getAllResultsFromStorage();
  const todos = loadManualTodos();
  const courseMap = new Map(todos.map((todo) => [todo.id, todo]));

  return Object.entries(results)
    .flatMap(([courseId, stored]) => {
      const todo = courseMap.get(courseId);
      const courseTitle = todo?.title ?? courseId;
      const occurredAt = getTodoScheduledAt(todo) ?? todo?.createdAt ?? new Date().toISOString();
      const payload = getStoredResultPayload(stored, todo);
      const lines = payload.result.trim().split(/\r?\n/);

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
      const nameIdx = headers.findIndex((header) => {
        const normalized = normalizeComparable(header);
        return normalized.includes("nom") || normalized.includes("coureur");
      });
      const teamIdx = headers.findIndex((header) => {
        const normalized = normalizeComparable(header);
        return normalized.includes("equipe") || normalized.includes("team");
      });
      const pointsIdx = headers.findIndex((header) =>
        normalizeComparable(header).includes("point")
      );

      if (positionIdx === -1 || nameIdx === -1 || teamIdx === -1) {
        return [];
      }

      return lines
        .slice(1)
        .map((line) => line.split("\t"))
        .filter((cells) => cells.length > Math.max(positionIdx, nameIdx, teamIdx))
        .filter(
          (cells) =>
            normalizeComparable(cells[teamIdx] ?? "") ===
            normalizeComparable(TEAM_NAME)
        )
        .map((cells) => ({
          courseId,
          courseTitle,
          occurredAt,
          category: payload.category,
          riderName: cells[nameIdx]?.trim() ?? "",
          position: parsePosition(cells[positionIdx]),
          points: pointsIdx >= 0 ? parseNumericValue(cells[pointsIdx]) : 0,
        }))
        .filter((row) => row.riderName.length > 0);
    })
    .sort((left, right) => {
      const dateDiff = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();

      if (dateDiff !== 0) {
        return dateDiff;
      }

      const leftPosition = left.position ?? Number.MAX_SAFE_INTEGER;
      const rightPosition = right.position ?? Number.MAX_SAFE_INTEGER;
      return leftPosition - rightPosition;
    });
}

function extractPrizeRiderName(label: string): string | null {
  const prefix = "Prime course - ";

  if (!label.startsWith(prefix)) {
    return null;
  }

  const payload = label.slice(prefix.length);
  const separatorIndex = payload.indexOf(" - ");

  if (separatorIndex === -1) {
    return null;
  }

  return payload.slice(0, separatorIndex).trim() || null;
}

function getCategoryLabel(category: ResultCategory): string {
  if (category === "u25") {
    return "U25";
  }

  if (category === "u21") {
    return "U21";
  }

  return "Pro";
}

function buildAthleticStatRows(riders: Rider[]) {
  const athleticRows = [
    { label: "Montagne", value: riders.reduce((sum, rider) => sum + rider.mountain, 0) / riders.length },
    { label: "Vallon", value: riders.reduce((sum, rider) => sum + rider.hill, 0) / riders.length },
    { label: "Plaine", value: riders.reduce((sum, rider) => sum + rider.flat, 0) / riders.length },
    { label: "Sprint", value: riders.reduce((sum, rider) => sum + rider.sprint, 0) / riders.length },
    { label: "Pavé", value: riders.reduce((sum, rider) => sum + rider.cobble, 0) / riders.length },
    { label: "CLM", value: riders.reduce((sum, rider) => sum + rider.timeTrial, 0) / riders.length },
    { label: "Course à étapes", value: riders.reduce((sum, rider) => sum + rider.stageRace, 0) / riders.length },
    { label: "Endurance", value: riders.reduce((sum, rider) => sum + rider.endurance, 0) / riders.length },
    { label: "Résistance", value: riders.reduce((sum, rider) => sum + rider.resistance, 0) / riders.length },
    { label: "Récupération", value: riders.reduce((sum, rider) => sum + rider.recovery, 0) / riders.length },
  ];

  return athleticRows.sort((left, right) => right.value - left.value);
}

export default function StatisticsPage() {
  const [tab, setTab] = useState<StatsTab>("overview");

  const riders = useMemo(() => {
    const stored = loadRidersFromStorage();
    return stored.length > 0 ? stored : initialRiders;
  }, []);

  const settings = useMemo(() => loadClubSettings(), []);
  const financeSnapshot = useMemo(() => getFinanceSnapshot(settings, riders), [settings, riders]);
  const teamResultRows = useMemo(() => extractTeamResultRows(), []);

  const profileSummaries = useMemo(() => buildRiderProfiles(riders), [riders]);

  const profileDistribution = useMemo(() => {
    const distribution = new Map<string, number>();

    profileSummaries.forEach((summary) => {
      distribution.set(
        summary.primaryProfile,
        (distribution.get(summary.primaryProfile) ?? 0) + 1
      );
    });

    return Array.from(distribution.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "fr"));
  }, [profileSummaries]);

  const prizeByRider = useMemo(() => {
    const prizeMap = new Map<string, number>();

    financeSnapshot.state.entries
      .filter((entry) => entry.category === "race-prize" && entry.amount > 0)
      .forEach((entry) => {
        const riderName = extractPrizeRiderName(entry.label);

        if (!riderName) {
          return;
        }

        prizeMap.set(riderName, (prizeMap.get(riderName) ?? 0) + entry.amount);
      });

    return prizeMap;
  }, [financeSnapshot.state.entries]);

  const riderPerformance = useMemo(() => {
    const performanceMap = new Map<string, RiderPerformanceRow>();

    riders.forEach((rider) => {
      performanceMap.set(rider.name, {
        riderName: rider.name,
        category: rider.category,
        points: 0,
        races: 0,
        wins: 0,
        podiums: 0,
        top10: 0,
        bestPosition: null,
        prizes: prizeByRider.get(rider.name) ?? 0,
        weeklySalary: rider.salaryWeekly,
        value: rider.value,
      });
    });

    teamResultRows.forEach((row) => {
      const existing = performanceMap.get(row.riderName);

      if (!existing) {
        return;
      }

      existing.points += row.points;
      existing.races += 1;
      existing.wins += row.position === 1 ? 1 : 0;
      existing.podiums += row.position !== null && row.position <= 3 ? 1 : 0;
      existing.top10 += row.position !== null && row.position <= 10 ? 1 : 0;

      if (row.position !== null) {
        existing.bestPosition =
          existing.bestPosition === null
            ? row.position
            : Math.min(existing.bestPosition, row.position);
      }
    });

    return Array.from(performanceMap.values()).sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      if (right.prizes !== left.prizes) {
        return right.prizes - left.prizes;
      }

      return left.riderName.localeCompare(right.riderName, "fr");
    });
  }, [prizeByRider, riders, teamResultRows]);

  const overview = useMemo(() => {
    const totalPoints = teamResultRows.reduce((sum, row) => sum + row.points, 0);
    const uniqueCourses = new Set(teamResultRows.map((row) => row.courseId)).size;
    const wins = teamResultRows.filter((row) => row.position === 1).length;
    const podiums = teamResultRows.filter((row) => row.position !== null && row.position <= 3).length;
    const top10 = teamResultRows.filter((row) => row.position !== null && row.position <= 10).length;
    const top25 = teamResultRows.filter((row) => row.position !== null && row.position <= 25).length;
    const totalValue = riders.reduce((sum, rider) => sum + rider.value, 0);
    const totalPrizeMoney = Array.from(prizeByRider.values()).reduce((sum, value) => sum + value, 0);
    const ageAverage = riders.reduce((sum, rider) => sum + rider.ageYears + rider.ageWeeks / 52, 0) / riders.length;
    const bestPerformer = riderPerformance[0] ?? null;
    const pointsByCategory = {
      pro: teamResultRows.filter((row) => row.category === "pro").reduce((sum, row) => sum + row.points, 0),
      u25: teamResultRows.filter((row) => row.category === "u25").reduce((sum, row) => sum + row.points, 0),
      u21: teamResultRows.filter((row) => row.category === "u21").reduce((sum, row) => sum + row.points, 0),
    };

    return {
      totalPoints,
      uniqueCourses,
      wins,
      podiums,
      top10,
      top25,
      totalValue,
      totalPrizeMoney,
      ageAverage,
      bestPerformer,
      pointsByCategory,
    };
  }, [prizeByRider, riderPerformance, riders, teamResultRows]);

  const categoryBreakdown = useMemo(() => {
    return ["Pro", "U25", "U21"].map((category) => {
      const matchingRiders = riders.filter((rider) => rider.category === category);

      return {
        category,
        count: matchingRiders.length,
        salary: matchingRiders.reduce((sum, rider) => sum + rider.salaryWeekly, 0),
        value: matchingRiders.reduce((sum, rider) => sum + rider.value, 0),
        averageAge:
          matchingRiders.length > 0
            ? matchingRiders.reduce(
                (sum, rider) => sum + rider.ageYears + rider.ageWeeks / 52,
                0
              ) / matchingRiders.length
            : 0,
      };
    });
  }, [riders]);

  const athleticRows = useMemo(() => buildAthleticStatRows(riders), [riders]);

  const topSalaries = useMemo(
    () => [...riders].sort((left, right) => right.salaryWeekly - left.salaryWeekly).slice(0, 5),
    [riders]
  );

  const topValues = useMemo(
    () => [...riders].sort((left, right) => right.value - left.value).slice(0, 5),
    [riders]
  );

  const financeBreakdown = useMemo(() => {
    const racePrizeIncome = financeSnapshot.state.entries
      .filter((entry) => entry.category === "race-prize" && entry.amount > 0)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const seasonPrizeIncome = financeSnapshot.state.entries
      .filter((entry) => entry.category === "season-prize" && entry.amount > 0)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const transferNet = financeSnapshot.state.entries
      .filter((entry) => entry.category === "transfer")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const otherNet = financeSnapshot.state.entries
      .filter((entry) => entry.category === "other")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const facilityInvestment = Math.abs(
      financeSnapshot.state.entries
        .filter((entry) => entry.category === "facility-upgrade" && entry.amount < 0)
        .reduce((sum, entry) => sum + entry.amount, 0)
    );
    const autonomyWeeks =
      financeSnapshot.weeklyFixedCosts > 0
        ? financeSnapshot.currentBalance / financeSnapshot.weeklyFixedCosts
        : 0;

    return {
      racePrizeIncome,
      seasonPrizeIncome,
      transferNet,
      otherNet,
      facilityInvestment,
      autonomyWeeks,
    };
  }, [financeSnapshot]);

  return (
    <div className="page-stack">
      <PageTitle
        title="Statistiques"
        subtitle="Pilotage sportif, effectif et finance du club à partir des données réellement enregistrées."
      />

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
          className={tab === "sport" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("sport")}
        >
          Sportif
        </button>
        <button
          type="button"
          className={tab === "squad" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("squad")}
        >
          Effectif
        </button>
        <button
          type="button"
          className={tab === "finance" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("finance")}
        >
          Finance
        </button>
      </div>

      {tab === "overview" && (
        <div className="page-stack">
          <div className="stats-kpi-grid">
            <Card>
              <div className="stats-kpi-card">
                <span className="stats-kpi-label">Solde actuel</span>
                <strong className="stats-kpi-value">{formatCurrency(financeSnapshot.currentBalance)}</strong>
              </div>
            </Card>
            <Card>
              <div className="stats-kpi-card">
                <span className="stats-kpi-label">Points équipe</span>
                <strong className="stats-kpi-value">{formatInteger(overview.totalPoints)}</strong>
              </div>
            </Card>
            <Card>
              <div className="stats-kpi-card">
                <span className="stats-kpi-label">Primes de course</span>
                <strong className="stats-kpi-value">{formatCurrency(overview.totalPrizeMoney)}</strong>
              </div>
            </Card>
            <Card>
              <div className="stats-kpi-card">
                <span className="stats-kpi-label">Charge fixe hebdo</span>
                <strong className="stats-kpi-value">{formatCurrency(financeSnapshot.weeklyFixedCosts)}</strong>
              </div>
            </Card>
            <Card>
              <div className="stats-kpi-card">
                <span className="stats-kpi-label">Effectif</span>
                <strong className="stats-kpi-value">{formatInteger(riders.length)}</strong>
              </div>
            </Card>
            <Card>
              <div className="stats-kpi-card">
                <span className="stats-kpi-label">Valeur totale</span>
                <strong className="stats-kpi-value">{formatCurrency(overview.totalValue)}</strong>
              </div>
            </Card>
          </div>

          <div className="stats-two-columns">
            <Card title="Repères manager">
              <div className="dashboard-lines">
                <p><strong>Division Pro :</strong> {settings.divisionPro}</p>
                <p><strong>Division U25 :</strong> {settings.divisionU25}</p>
                <p><strong>Division U21 :</strong> {settings.divisionU21}</p>
                <p><strong>Courses enregistrées :</strong> {formatInteger(overview.uniqueCourses)}</p>
                <p><strong>Age moyen :</strong> {formatDecimal(overview.ageAverage)} ans</p>
                <p><strong>Masse salariale :</strong> {formatCurrency(financeSnapshot.weeklySalaryExpense)}</p>
              </div>
            </Card>

            <Card title="Bilan performance">
              <div className="dashboard-lines">
                <p><strong>Victoires :</strong> {formatInteger(overview.wins)}</p>
                <p><strong>Podiums :</strong> {formatInteger(overview.podiums)}</p>
                <p><strong>Top 10 :</strong> {formatInteger(overview.top10)}</p>
                <p><strong>Top 25 :</strong> {formatInteger(overview.top25)}</p>
                <p><strong>Meilleur contributeur :</strong> {overview.bestPerformer?.riderName ?? "-"}</p>
                <p><strong>Points par course :</strong> {overview.uniqueCourses > 0 ? formatDecimal(overview.totalPoints / overview.uniqueCourses) : "0"}</p>
              </div>
            </Card>
          </div>

          <div className="stats-two-columns">
            <Card title="Répartition des points">
              <div className="stats-list">
                {(["pro", "u25", "u21"] as ResultCategory[]).map((category) => {
                  const value = overview.pointsByCategory[category];
                  const ratio = overview.totalPoints > 0 ? (value / overview.totalPoints) * 100 : 0;

                  return (
                    <div key={category} className="stats-list-row">
                      <div className="stats-list-head">
                        <span>{getCategoryLabel(category)}</span>
                        <strong>{formatInteger(value)} pts</strong>
                      </div>
                      <div className="stats-progress-track">
                        <div className="stats-progress-fill" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Profils dominants">
              <div className="stats-list">
                {profileDistribution.slice(0, 6).map((item) => {
                  const ratio = riders.length > 0 ? (item.count / riders.length) * 100 : 0;

                  return (
                    <div key={item.label} className="stats-list-row">
                      <div className="stats-list-head">
                        <span>{item.label}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className="stats-progress-track stats-progress-track-warm">
                        <div className="stats-progress-fill stats-progress-fill-warm" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card title="Top contributeurs">
            <div className="table-container">
              <table className="data-table styled-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Cat.</th>
                    <th>Points</th>
                    <th>Primes</th>
                    <th>Meilleure place</th>
                  </tr>
                </thead>
                <tbody>
                  {riderPerformance.slice(0, 8).map((row) => (
                    <tr key={row.riderName} className={row.riderName === overview.bestPerformer?.riderName ? "highlight-row" : undefined}>
                      <td>{row.riderName}</td>
                      <td>{row.category}</td>
                      <td>{formatInteger(row.points)}</td>
                      <td>{formatCurrency(row.prizes)}</td>
                      <td>{row.bestPosition ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "sport" && (
        <div className="page-stack">
          <div className="stats-kpi-grid stats-kpi-grid-sport">
            <Card><div className="stats-kpi-card"><span className="stats-kpi-label">Courses</span><strong className="stats-kpi-value">{formatInteger(overview.uniqueCourses)}</strong></div></Card>
            <Card><div className="stats-kpi-card"><span className="stats-kpi-label">Victoires</span><strong className="stats-kpi-value">{formatInteger(overview.wins)}</strong></div></Card>
            <Card><div className="stats-kpi-card"><span className="stats-kpi-label">Podiums</span><strong className="stats-kpi-value">{formatInteger(overview.podiums)}</strong></div></Card>
            <Card><div className="stats-kpi-card"><span className="stats-kpi-label">Top 10</span><strong className="stats-kpi-value">{formatInteger(overview.top10)}</strong></div></Card>
          </div>

          <Card title="Production sportive par coureur">
            <div className="table-container">
              <table className="data-table styled-table">
                <thead>
                  <tr>
                    <th>Coureur</th>
                    <th>Cat.</th>
                    <th>Courses</th>
                    <th>Points</th>
                    <th>Victoires</th>
                    <th>Podiums</th>
                    <th>Top 10</th>
                    <th>Meilleure place</th>
                  </tr>
                </thead>
                <tbody>
                  {riderPerformance.map((row) => (
                    <tr key={row.riderName}>
                      <td>{row.riderName}</td>
                      <td>{row.category}</td>
                      <td>{formatInteger(row.races)}</td>
                      <td>{formatInteger(row.points)}</td>
                      <td>{formatInteger(row.wins)}</td>
                      <td>{formatInteger(row.podiums)}</td>
                      <td>{formatInteger(row.top10)}</td>
                      <td>{row.bestPosition ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Derniers résultats enregistrés">
            {teamResultRows.length === 0 ? (
              <div className="empty-placeholder">Aucun résultat enregistré pour l'équipe.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Course</th>
                      <th>Coureur</th>
                      <th>Cat.</th>
                      <th>Place</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamResultRows.slice(0, 12).map((row) => (
                      <tr key={`${row.courseId}-${row.riderName}-${row.position ?? "na"}`}>
                        <td>{formatDateLabel(row.occurredAt)}</td>
                        <td>{row.courseTitle}</td>
                        <td>{row.riderName}</td>
                        <td>{getCategoryLabel(row.category)}</td>
                        <td>{row.position ?? "-"}</td>
                        <td>{formatInteger(row.points)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "squad" && (
        <div className="page-stack">
          <div className="stats-two-columns">
            <Card title="Répartition par catégorie">
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      <th>Effectif</th>
                      <th>Age moyen</th>
                      <th>Masse salariale</th>
                      <th>Valeur totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryBreakdown.map((row) => (
                      <tr key={row.category}>
                        <td>{row.category}</td>
                        <td>{formatInteger(row.count)}</td>
                        <td>{formatDecimal(row.averageAge)} ans</td>
                        <td>{formatCurrency(row.salary)}</td>
                        <td>{formatCurrency(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Profils principaux">
              <div className="stats-list">
                {profileDistribution.map((item) => {
                  const ratio = riders.length > 0 ? (item.count / riders.length) * 100 : 0;
                  return (
                    <div key={item.label} className="stats-list-row">
                      <div className="stats-list-head">
                        <span>{item.label}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className="stats-progress-track stats-progress-track-warm">
                        <div className="stats-progress-fill stats-progress-fill-warm" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="stats-two-columns">
            <Card title="Top salaires">
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Coureur</th>
                      <th>Cat.</th>
                      <th>Salaire</th>
                      <th>Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSalaries.map((rider) => (
                      <tr key={rider.id}>
                        <td>{rider.name}</td>
                        <td>{rider.category}</td>
                        <td>{formatCurrency(rider.salaryWeekly)}</td>
                        <td>{formatCurrency(rider.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Top valeurs marchandes">
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Coureur</th>
                      <th>Cat.</th>
                      <th>Valeur</th>
                      <th>Salaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topValues.map((rider) => (
                      <tr key={rider.id}>
                        <td>{rider.name}</td>
                        <td>{rider.category}</td>
                        <td>{formatCurrency(rider.value)}</td>
                        <td>{formatCurrency(rider.salaryWeekly)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title="Forces collectives moyennes">
            <div className="stats-list">
              {athleticRows.map((row) => (
                <div key={row.label} className="stats-list-row">
                  <div className="stats-list-head">
                    <span>{row.label}</span>
                    <strong>{formatDecimal(row.value)}</strong>
                  </div>
                  <div className="stats-progress-track">
                    <div className="stats-progress-fill" style={{ width: `${Math.min(row.value, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "finance" && (
        <div className="page-stack">
          <div className="stats-kpi-grid stats-kpi-grid-finance">
            <Card><div className="stats-kpi-card"><span className="stats-kpi-label">Revenus cumulés</span><strong className="stats-kpi-value">{formatCurrency(financeSnapshot.totalIncome)}</strong></div></Card>
            <Card><div className="stats-kpi-card"><span className="stats-kpi-label">Dépenses cumulées</span><strong className="stats-kpi-value">{formatCurrency(financeSnapshot.totalExpenses)}</strong></div></Card>
            <Card><div className="stats-kpi-card"><span className="stats-kpi-label">Maintenance hebdo</span><strong className="stats-kpi-value">{formatCurrency(financeSnapshot.weeklyFacilityMaintenance)}</strong></div></Card>
            <Card><div className="stats-kpi-card"><span className="stats-kpi-label">Autonomie</span><strong className="stats-kpi-value">{formatDecimal(financeBreakdown.autonomyWeeks)} sem.</strong></div></Card>
          </div>

          <div className="stats-two-columns">
            <Card title="Répartition financière">
              <div className="dashboard-lines">
                <p><strong>Primes de course :</strong> {formatCurrency(financeBreakdown.racePrizeIncome)}</p>
                <p><strong>Primes de saison :</strong> {formatCurrency(financeBreakdown.seasonPrizeIncome)}</p>
                <p><strong>Solde transferts :</strong> {formatCurrency(financeBreakdown.transferNet)}</p>
                <p><strong>Autres écritures :</strong> {formatCurrency(financeBreakdown.otherNet)}</p>
                <p><strong>Investissements installations :</strong> {formatCurrency(financeBreakdown.facilityInvestment)}</p>
                <p><strong>Salaire hebdo :</strong> {formatCurrency(financeSnapshot.weeklySalaryExpense)}</p>
              </div>
            </Card>

            <Card title="Rentabilité coureurs">
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Coureur</th>
                      <th>Primes</th>
                      <th>Salaire hebdo</th>
                      <th>Couverture</th>
                      <th>Pts / 10k€</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riderPerformance
                      .filter((row) => row.prizes > 0 || row.points > 0)
                      .sort((left, right) => right.prizes - left.prizes || right.points - left.points)
                      .slice(0, 10)
                      .map((row) => {
                        const coverage = row.weeklySalary > 0 ? (row.prizes / row.weeklySalary) * 100 : 0;
                        const pointsPerSalary = row.weeklySalary > 0 ? (row.points * 10000) / row.weeklySalary : 0;

                        return (
                          <tr key={row.riderName}>
                            <td>{row.riderName}</td>
                            <td>{formatCurrency(row.prizes)}</td>
                            <td>{formatCurrency(row.weeklySalary)}</td>
                            <td>{formatDecimal(coverage)}%</td>
                            <td>{formatDecimal(pointsPerSalary, 2)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}