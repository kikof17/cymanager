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
type RankingData = {
  divisions: Divisions;
  pro: RiderPoints[];
  u25: RiderPoints[];
  u21: RiderPoints[];
  proTeams: TeamPoints[];
  u25Teams: TeamPoints[];
  u21Teams: TeamPoints[];
};

function detectCourseCategory(title: string): "u25" | "u21" | "pro" {
  if (/u25/i.test(title)) return "u25";
  if (/u21/i.test(title)) return "u21";
  return "pro";
}

function persistResults(results: Record<string, StoredResult>) {
  try {
    localStorage.setItem("cymanager:results", JSON.stringify(results));
  } catch (error) {
    console.error("Erreur d'écriture localStorage résultats", error);
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
    let category: "pro" | "u25" | "u21" = "pro";
    let result = stored as string;
    if (typeof stored === "object" && stored && "result" in stored && "category" in stored) {
      result = stored.result;
      category = stored.category;
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

function RankingPage() {
  const [tab, setTab] = useState<'individuel' | 'equipes'>('individuel');
  const { divisions, pro, u25, u21, proTeams, u25Teams, u21Teams } = useMemo(() => buildRankingData(), []);

  return (
    <div className="page-content" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageTitle
        title="Classement"
        subtitle="Consultez les classements des équipes Pro, U25 et U21."
      />
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          className={tab === 'individuel' ? 'tab-btn tab-btn-active' : 'tab-btn'}
          onClick={() => setTab('individuel')}
          type="button"
        >Classement individuel</button>
        <button
          className={tab === 'equipes' ? 'tab-btn tab-btn-active' : 'tab-btn'}
          onClick={() => setTab('equipes')}
          type="button"
        >Classement par équipe</button>
      </div>
      {tab === 'individuel' && (
        <div className="page-stack">
          <Card title={`Équipe Pro (Division ${divisions.pro || '-'})`}>
            {pro.length === 0 ? (
              <div>Aucun classement disponible.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th style={{color: '#181c24'}}>Cl.</th>
                      <th style={{color: '#181c24'}}>Nom</th>
                      <th style={{color: '#181c24'}}>Équipe</th>
                      <th style={{color: '#181c24'}}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pro.map((r, i) => {
                      const isTeamRider = r.team === "Kritoff Team";
                      const rank = i + 1;
                      const suffix = rank === 1 ? 'er' : 'ème';
                      return (
                        <tr key={i} className={isTeamRider ? "highlight-row" : undefined}>
                          <td>{rank}{suffix}</td>
                          <td>{r.name}</td>
                          <td>{r.team}</td>
                          <td>{r.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title={`Équipe U25 (Division ${divisions.u25 || '-'})`}>
            {u25.length === 0 ? (
              <div>Aucun classement disponible.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Cl.</th>
                      <th>Nom</th>
                      <th>Équipe</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u25.map((r, i) => {
                      const isTeamRider = r.team === "Kritoff Team";
                      const rank = i + 1;
                      const suffix = rank === 1 ? 'er' : 'ème';
                      return (
                        <tr key={i} className={isTeamRider ? "highlight-row" : undefined}>
                          <td>{rank}{suffix}</td>
                          <td>{r.name}</td>
                          <td>{r.team}</td>
                          <td>{r.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title={`Équipe U21 (Division ${divisions.u21 || '-'})`}>
            {u21.length === 0 ? (
              <div>Aucun classement disponible.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Cl.</th>
                      <th>Nom</th>
                      <th>Équipe</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u21.map((r, i) => {
                      const isTeamRider = r.team === "Kritoff Team";
                      const rank = i + 1;
                      const suffix = rank === 1 ? 'er' : 'ème';
                      return (
                        <tr key={i} className={isTeamRider ? "highlight-row" : undefined}>
                          <td>{rank}{suffix}</td>
                          <td>{r.name}</td>
                          <td>{r.team}</td>
                          <td>{r.points}</td>
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
      {tab === 'equipes' && (
        <div className="page-stack">
          <Card title={`Classement par équipe Pro (Division ${divisions.pro || '-'})`}>
            {proTeams.length === 0 ? (
              <div>Aucun classement disponible.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th style={{color: '#181c24'}}>Équipe</th>
                      <th style={{color: '#181c24'}}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proTeams.map((t, i) => (
                      <tr key={i} className={t.team === "Kritoff Team" ? "highlight-row" : undefined}>
                        <td>{t.team}</td>
                        <td>{t.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title={`Classement par équipe U25 (Division ${divisions.u25 || '-'})`}>
            {u25Teams.length === 0 ? (
              <div>Aucun classement disponible.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Équipe</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u25Teams.map((t, i) => (
                      <tr key={i} className={t.team === "Kritoff Team" ? "highlight-row" : undefined}>
                        <td>{t.team}</td>
                        <td>{t.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title={`Classement par équipe U21 (Division ${divisions.u21 || '-'})`}>
            {u21Teams.length === 0 ? (
              <div>Aucun classement disponible.</div>
            ) : (
              <div className="table-container">
                <table className="data-table styled-table">
                  <thead>
                    <tr>
                      <th>Équipe</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u21Teams.map((t, i) => (
                      <tr key={i} className={t.team === "Kritoff Team" ? "highlight-row" : undefined}>
                        <td>{t.team}</td>
                        <td>{t.points}</td>
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

export default RankingPage;