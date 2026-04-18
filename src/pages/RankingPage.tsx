import { useMemo, useState } from "react";
import PageTitle from "../components/common/PageTitle";
import Card from "../components/common/Card";
import { extractPointsFromResults, getAllResultsFromStorage } from "../lib/scoring/extractPoints";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import type { RiderPoints, StoredResult } from "../lib/scoring/extractPoints";
import { loadManualTodos } from "../lib/storage/todoStorage";
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
};

function detectCourseCategory(title: string): RankingCategory {
  if (/u25/i.test(title)) return "u25";
  if (/u21/i.test(title)) return "u21";
  return "pro";
}

function persistResults(results: Record<string, StoredResult>) {
  try {
    localStorage.setItem("cymanager:results", JSON.stringify(results));
  } catch (error) {
    console.error("Erreur d'ecriture localStorage resultats", error);
  }
}

function aggregateTeams(arr: RiderPoints[]): TeamPoints[] {
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
  const courseTitles: Record<string, string> = {};

  todos.forEach((todo) => {
    courseTitles[todo.id] = todo.title;
  });

  let shouldPersist = false;
  Object.keys(results).forEach((courseId) => {
    if (!todos.some((todo) => todo.id === courseId)) {
      delete results[courseId];
      shouldPersist = true;
    }
  });

  Object.entries(results).forEach(([courseId, stored]) => {
    if (typeof stored === "string") {
      results[courseId] = {
        result: stored,
        category: detectCourseCategory(courseTitles[courseId] || ""),
      };
      shouldPersist = true;
    }
  });

  if (shouldPersist) {
    persistResults(results);
  }

  const proMap = new Map<string, RiderPoints>();
  const u25Map = new Map<string, RiderPoints>();
  const u21Map = new Map<string, RiderPoints>();

  Object.entries(results).forEach(([courseId, stored]) => {
    let category: RankingCategory = "pro";
    let result = stored as string;
    if (typeof stored === "object" && stored && "result" in stored && "category" in stored) {
      result = stored.result;
      category = stored.category as RankingCategory;
    }

    const points = extractPointsFromResults({ [courseId]: result });
    const targetMap = category === "u25" ? u25Map : category === "u21" ? u21Map : proMap;

    points.forEach(({ name, team, points: riderPoints }) => {
      if (!targetMap.has(name)) {
        targetMap.set(name, { name, team, points: riderPoints });
        return;
      }

      const previous = targetMap.get(name)!;
      targetMap.set(name, { ...previous, points: previous.points + riderPoints });
    });
  });

  const pro = Array.from(proMap.values()).sort((a, b) => b.points - a.points);
  const u25 = Array.from(u25Map.values()).sort((a, b) => b.points - a.points);
  const u21 = Array.from(u21Map.values()).sort((a, b) => b.points - a.points);

  return {
    divisions,
    pro,
    u25,
    u21,
    proTeams: aggregateTeams(pro),
    u25Teams: aggregateTeams(u25),
    u21Teams: aggregateTeams(u21),
  };
}

export default function RankingPage() {
  const [tab, setTab] = useState<"individuel" | "equipes">("individuel");
  const [individualCategory, setIndividualCategory] = useState<RankingCategory>("pro");
  const [teamCategory, setTeamCategory] = useState<RankingCategory>("pro");
  const { divisions, pro, u25, u21, proTeams, u25Teams, u21Teams } = useMemo(() => buildRankingData(), []);
  const categoryOptions = useMemo(() => buildCategoryOptions(divisions), [divisions]);
  const ridersByCategory: Record<RankingCategory, RiderPoints[]> = { pro, u25, u21 };
  const teamsByCategory: Record<RankingCategory, TeamPoints[]> = {
    pro: proTeams,
    u25: u25Teams,
    u21: u21Teams,
  };
  const selectedRiders = ridersByCategory[individualCategory];
  const selectedTeams = teamsByCategory[teamCategory];
  const individualTitle = `Equipe ${getCategoryLabel(individualCategory)} (Division ${getDivisionLabel(divisions, individualCategory) || "-"})`;
  const teamTitle = `Classement par equipe ${getCategoryLabel(teamCategory)} (Division ${getDivisionLabel(divisions, teamCategory) || "-"})`;

  return (
    <div className="page-content" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageTitle
        title="Classement"
        subtitle="Consultez les classements des equipes Pro, U25 et U21."
      />

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
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

          <Card title={individualTitle}>
            {selectedRiders.length === 0 ? (
              <div>Aucun classement disponible.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th style={{ color: "#181c24" }}>Cl.</th>
                      <th style={{ color: "#181c24" }}>Nom</th>
                      <th style={{ color: "#181c24" }}>Equipe</th>
                      <th style={{ color: "#181c24" }}>Points</th>
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
                      <th style={{ color: "#181c24" }}>Cl.</th>
                      <th style={{ color: "#181c24" }}>�quipe</th>
                      <th style={{ color: "#181c24" }}>Points</th>
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
