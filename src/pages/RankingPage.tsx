import { useEffect, useMemo, useState } from "react";
import PageTitle from "../components/common/PageTitle";
import Card from "../components/common/Card";
import { extractPointsFromResults, getAllResultsFromStorage, reconcileStoredResultsWithCourses, saveAllResultsToStorage } from "../lib/scoring/extractPoints";
import { getAllTourGCResultsFromStorage } from "../lib/scoring/tourGCResults";
import { getStoredResultCategory, getTodoResultCategory } from "../lib/utils/courseCategory";
import {
  BASELINE_EFFECTIVE_DATE,
  BASELINE_INDIVIDUAL_RANKINGS,
} from "../lib/ranking/seasonBaseline";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import type { RiderPoints, StoredResult } from "../lib/scoring/extractPoints";
import type { BaselineRankingRow } from "../lib/ranking/seasonBaseline";
import { loadManualTodos } from "../lib/storage/todoStorage";
import { getTodoScheduledAt } from "../lib/utils/courseDates";
import type { TodoItem } from "../types/todo";

type TeamPoints = { team: string; points: number };
type Divisions = { pro: string; u25: string; u21: string };
type RankingCategory = "pro" | "u25" | "u21";
type RankingData = {
  divisions: Divisions;
  pro: RiderPoints[];
  u25: RiderPoints[];
  u21: RiderPoints[];
  proTeams: TeamPoints[];
  u25Teams: TeamPoints[];
  u21Teams: TeamPoints[];
  mergedIndividuals: Record<RankingCategory, BaselineRankingRow[]>;
};

function isCourseAfterBaseline(todo: TodoItem | undefined): boolean {
  if (!todo) {
    return false;
  }

  const courseDateValue = getTodoScheduledAt(todo);

  if (!courseDateValue) {
    return false;
  }

  const courseDate = new Date(courseDateValue);

  if (Number.isNaN(courseDate.getTime())) {
    return false;
  }

  const baselineDate = new Date(`${BASELINE_EFFECTIVE_DATE}T23:59:59`);
  return courseDate.getTime() > baselineDate.getTime();
}

function mergeBaselineWithDeltas(
  baselineRows: BaselineRankingRow[],
  deltas: RiderPoints[]
): BaselineRankingRow[] {
  const rows = new Map<string, BaselineRankingRow>();

  baselineRows.forEach((row) => {
    rows.set(row.name, { ...row });
  });

  deltas.forEach((delta) => {
    const existing = rows.get(delta.name);

    if (existing) {
      rows.set(delta.name, {
        ...existing,
        team: delta.team || existing.team,
        points: existing.points + delta.points,
      });
      return;
    }

    rows.set(delta.name, {
      rank: Number.MAX_SAFE_INTEGER,
      name: delta.name,
      team: delta.team,
      points: delta.points,
    });
  });

  return Array.from(rows.values())
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return left.name.localeCompare(right.name, "fr");
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

function persistResults(results: Record<string, StoredResult>) {
  saveAllResultsToStorage(results);
}

function aggregateTeams(arr: Array<{ team: string; points: number }>): TeamPoints[] {
  const map = new Map<string, number>();
  arr.forEach(({ team, points }) => {
    if (!team) return;
    map.set(team, (map.get(team) || 0) + points);
  });

  return Array.from(map.entries())
    .map(([team, points]) => ({ team, points }))
    .sort((a, b) => b.points - a.points);
}

function formatRank(rank: number): string {
  if (rank === 1) return "1er";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3eme";
  return `${rank}eme`;
}

function getCategoryLabel(category: RankingCategory): string {
  return category === "u25" ? "U25" : category === "u21" ? "U21" : "Pro";
}

function getDivisionLabel(divisions: Divisions, category: RankingCategory): string {
  return category === "u25"
    ? divisions.u25
    : category === "u21"
      ? divisions.u21
      : divisions.pro;
}

function buildCategoryOptions(divisions: Divisions) {
  return [
    { value: "pro" as const, label: `Pro (Division ${divisions.pro || "-"})` },
    { value: "u25" as const, label: `U25 (Division ${divisions.u25 || "-"})` },
    { value: "u21" as const, label: `U21 (Division ${divisions.u21 || "-"})` },
  ];
}

function buildRankingData(): RankingData {
  const results = getAllResultsFromStorage();
  const settings = loadClubSettings();
  const divisions: Divisions = {
    pro: settings.divisionPro,
    u25: settings.divisionU25,
    u21: settings.divisionU21,
  };
  const todos: TodoItem[] = loadManualTodos().filter((todo) => todo.id.startsWith("calendar-"));

  let shouldPersist = false;
  Object.keys(results).forEach((courseId) => {
    if (!todos.some((todo) => todo.id === courseId)) {
      delete results[courseId];
      shouldPersist = true;
    }
  });

  Object.entries(results).forEach(([courseId, stored]) => {
    if (typeof stored === "string") {
      const todo = todos.find((entry) => entry.id === courseId);
      results[courseId] = {
        result: stored,
        category: getStoredResultCategory(stored, todo),
      };
      shouldPersist = true;
    }
  });

  if (shouldPersist) {
    persistResults(reconcileStoredResultsWithCourses(results, todos).results);
  }

  const proMap = new Map<string, RiderPoints>();
  const u25Map = new Map<string, RiderPoints>();
  const u21Map = new Map<string, RiderPoints>();
  const proDeltaMap = new Map<string, RiderPoints>();
  const u25DeltaMap = new Map<string, RiderPoints>();
  const u21DeltaMap = new Map<string, RiderPoints>();

  Object.entries(results).forEach(([courseId, stored]) => {
    const todo = todos.find((entry) => entry.id === courseId);
    let category: RankingCategory = getStoredResultCategory(stored, todo);
    let result = stored as string;
    if (typeof stored === "object" && stored && "result" in stored && "category" in stored) {
      result = stored.result;
    }

    const points = extractPointsFromResults({ [courseId]: result });
    const targetMap = category === "u25" ? u25Map : category === "u21" ? u21Map : proMap;
    const deltaTargetMap = category === "u25" ? u25DeltaMap : category === "u21" ? u21DeltaMap : proDeltaMap;
    const includeInBaselineIncrement = isCourseAfterBaseline(todos.find((todo) => todo.id === courseId));

    points.forEach(({ name, team, points: riderPoints }) => {
      if (!targetMap.has(name)) {
        targetMap.set(name, { name, team, points: riderPoints });
      } else {
        const previous = targetMap.get(name)!;
        targetMap.set(name, { ...previous, points: previous.points + riderPoints });
      }

      if (!includeInBaselineIncrement) {
        return;
      }

      if (!deltaTargetMap.has(name)) {
        deltaTargetMap.set(name, { name, team, points: riderPoints });
        return;
      }

      const previousDelta = deltaTargetMap.get(name)!;
      deltaTargetMap.set(name, {
        ...previousDelta,
        points: previousDelta.points + riderPoints,
      });
    });
  });

  // Intégration des points du classement général des tours (MT/GT)
  const tourGCResults = getAllTourGCResultsFromStorage();

  Object.entries(tourGCResults).forEach(([tourKey, gcText]) => {
    const stageTodos = todos.filter((todo) => todo.tourKey === tourKey);

    if (stageTodos.length === 0) {
      return;
    }

    const category = getTodoResultCategory(stageTodos[0]);
    const sortedStages = [...stageTodos].sort(
      (a, b) => (a.stageNumber ?? 0) - (b.stageNumber ?? 0)
    );
    const lastStage = sortedStages[sortedStages.length - 1];
    const gcPoints = extractPointsFromResults({ [`gc-${tourKey}`]: gcText });
    const targetMap = category === "u25" ? u25Map : category === "u21" ? u21Map : proMap;
    const deltaTargetMap = category === "u25" ? u25DeltaMap : category === "u21" ? u21DeltaMap : proDeltaMap;
    const includeInBaselineIncrement = isCourseAfterBaseline(lastStage);

    gcPoints.forEach(({ name, team, points: riderPoints }) => {
      if (!targetMap.has(name)) {
        targetMap.set(name, { name, team, points: riderPoints });
      } else {
        const previous = targetMap.get(name)!;
        targetMap.set(name, { ...previous, points: previous.points + riderPoints });
      }

      if (!includeInBaselineIncrement) {
        return;
      }

      if (!deltaTargetMap.has(name)) {
        deltaTargetMap.set(name, { name, team, points: riderPoints });
        return;
      }

      const previousDelta = deltaTargetMap.get(name)!;
      deltaTargetMap.set(name, {
        ...previousDelta,
        points: previousDelta.points + riderPoints,
      });
    });
  });

  const proFinal = Array.from(proMap.values()).sort((a, b) => b.points - a.points);
  const u25Final = Array.from(u25Map.values()).sort((a, b) => b.points - a.points);
  const u21Final = Array.from(u21Map.values()).sort((a, b) => b.points - a.points);

  return {
    divisions,
    pro: proFinal,
    u25: u25Final,
    u21: u21Final,
    proTeams: [],
    u25Teams: [],
    u21Teams: [],
    mergedIndividuals: {
      pro: mergeBaselineWithDeltas(
        BASELINE_INDIVIDUAL_RANKINGS.pro,
        Array.from(proDeltaMap.values())
      ),
      u25: mergeBaselineWithDeltas(
        BASELINE_INDIVIDUAL_RANKINGS.u25,
        Array.from(u25DeltaMap.values())
      ),
      u21: mergeBaselineWithDeltas(
        BASELINE_INDIVIDUAL_RANKINGS.u21,
        Array.from(u21DeltaMap.values())
      ),
    },
  };
}

export default function RankingPage() {
  const [tab, setTab] = useState<"individuel" | "equipes">("individuel");
  const [individualCategory, setIndividualCategory] = useState<RankingCategory>("pro");
  const [teamCategory, setTeamCategory] = useState<RankingCategory>("pro");
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    function triggerRefresh() {
      setRefreshCounter((current) => current + 1);
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key) {
        return;
      }

      const watchedKeys = new Set([
        "cymanager:results",
        "cymanager:tour-gc-results",
        "cymanager:manual-todos",
        "cymanager:club-settings",
      ]);

      if (watchedKeys.has(event.key)) {
        triggerRefresh();
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("cymanager:finance-updated", triggerRefresh);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cymanager:finance-updated", triggerRefresh);
    };
  }, []);
  const {
    divisions,
    pro,
    u25,
    u21,
    mergedIndividuals,
  } = useMemo(() => buildRankingData(), [refreshCounter]);
  const categoryOptions = useMemo(() => buildCategoryOptions(divisions), [divisions]);
  const ridersByCategory: Record<RankingCategory, RiderPoints[]> = { pro, u25, u21 };
  const mergedRows = mergedIndividuals[individualCategory];
  const teamsByCategory: Record<RankingCategory, TeamPoints[]> = {
    pro: aggregateTeams(mergedIndividuals.pro),
    u25: aggregateTeams(mergedIndividuals.u25),
    u21: aggregateTeams(mergedIndividuals.u21),
  };
  const selectedRiders = ridersByCategory[individualCategory];
  const selectedTeams = teamsByCategory[teamCategory];
  const individualTitle = `Equipe ${getCategoryLabel(individualCategory)} (Division ${getDivisionLabel(divisions, individualCategory) || "-"})`;
  const teamTitle = `Classement par equipe ${getCategoryLabel(teamCategory)} (Division ${getDivisionLabel(divisions, teamCategory) || "-"})`;

  return (
    <div className="page-stack page-stack-narrow">
      <PageTitle
        title="Classement"
        subtitle="Consultez les classements des equipes Pro, U25 et U21."
      />

      <div className="ranking-tabs-row">
        <button
          className={tab === "individuel" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("individuel")}
          type="button"
        >
          Classement individuel
        </button>
        <button
          className={tab === "equipes" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => setTab("equipes")}
          type="button"
        >
          Classement par equipe
        </button>
      </div>

      {tab === "individuel" && (
        <div className="page-stack">
          <div className="select-row ranking-filter-row">
            <label htmlFor="individual-ranking-category" className="select-label">Type d'equipe :</label>
            <select
              id="individual-ranking-category"
              className="input select-input"
              value={individualCategory}
              onChange={(event) => setIndividualCategory(event.target.value as RankingCategory)}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <Card title={`Base ${getCategoryLabel(individualCategory)} intégrée`}>
            <div className="message-box">
              <p className="muted">
                Classement de départ intégré au {BASELINE_EFFECTIVE_DATE}. A partir de la prochaine course enregistrée après cette date, les points seront ajoutés automatiquement à cette base.
              </p>
            </div>
          </Card>

          <Card title={individualTitle}>
            {mergedRows.length > 0 ? (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Cl.</th>
                      <th>Nom</th>
                      <th>Equipe</th>
                      <th>Victoires</th>
                      <th>Age</th>
                      <th>Cat.</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedRows.map((rider) => {
                      const isTeamRider = rider.team === "Kritoff Team";
                      return (
                        <tr key={`${rider.rank}-${rider.name}`} className={isTeamRider ? "highlight-row" : undefined}>
                          <td>{formatRank(rider.rank)}</td>
                          <td>{rider.name}</td>
                          <td>{rider.team}</td>
                          <td>{rider.wins ?? "-"}</td>
                          <td>{rider.age ?? "-"}</td>
                          <td>{rider.categoryLabel || "-"}</td>
                          <td>{rider.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : selectedRiders.length === 0 ? (
              <div>Aucun classement disponible.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Cl.</th>
                      <th>Nom</th>
                      <th>Equipe</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRiders.map((rider, index) => {
                      const isTeamRider = rider.team === "Kritoff Team";
                      return (
                        <tr key={`${rider.name}-${index}`} className={isTeamRider ? "highlight-row" : undefined}>
                          <td>{formatRank(index + 1)}</td>
                          <td>{rider.name}</td>
                          <td>{rider.team}</td>
                          <td>{rider.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "equipes" && (
        <div className="page-stack">
          <div className="message-box">
            <p className="muted">
              Le classement par equipe reste pour l'instant base sur les resultats locaux sauvegardes. L'import global des equipes sera raccorde ensuite.
            </p>
          </div>

          <div className="select-row ranking-filter-row">
            <label htmlFor="team-ranking-category" className="select-label">Type d'equipe :</label>
            <select
              id="team-ranking-category"
              className="input select-input"
              value={teamCategory}
              onChange={(event) => setTeamCategory(event.target.value as RankingCategory)}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <Card title={teamTitle}>
            {selectedTeams.length === 0 ? (
              <div>Aucun classement disponible.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Cl.</th>
                      <th>Equipe</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTeams.map((team, index) => (
                      <tr key={`${team.team}-${index}`} className={team.team === "Kritoff Team" ? "highlight-row" : undefined}>
                        <td>{formatRank(index + 1)}</td>
                        <td>{team.team}</td>
                        <td>{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
