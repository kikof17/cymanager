import { useEffect, useState } from "react";
import PageTitle from "../components/common/PageTitle";
import Card from "../components/common/Card";
import { extractPointsFromResults, getAllResultsFromStorage } from "../lib/scoring/extractPoints";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import type { RiderPoints } from "../lib/scoring/extractPoints";
import { loadManualTodos } from "../lib/storage/todoStorage";
import type { TodoItem } from "../types/todo";
function RankingPage() {
  function detectCourseCategory(title: string): "u25" | "u21" | "pro" {
    if (/u25/i.test(title)) return "u25";
    if (/u21/i.test(title)) return "u21";
    return "pro";
  }

  const [pro, setPro] = useState<RiderPoints[]>([]);
  const [u25, setU25] = useState<RiderPoints[]>([]);
  const [u21, setU21] = useState<RiderPoints[]>([]);
  const [divisions, setDivisions] = useState<{pro: string; u25: string; u21: string}>({pro: '', u25: '', u21: ''});
  const [tab, setTab] = useState<'individuel' | 'equipes'>('individuel');
  const [proTeams, setProTeams] = useState<{team: string, points: number}[]>([]);
  const [u25Teams, setU25Teams] = useState<{team: string, points: number}[]>([]);
  const [u21Teams, setU21Teams] = useState<{team: string, points: number}[]>([]);

  useEffect(() => {
    let results = getAllResultsFromStorage();
    // Charger les divisions depuis les paramètres club
    const settings = loadClubSettings();
    setDivisions({
      pro: settings.divisionPro,
      u25: settings.divisionU25,
      u21: settings.divisionU21,
    });
    const todos: TodoItem[] = loadManualTodos().filter((t) => t.id.startsWith("calendar-"));
    const courseTitles: Record<string, string> = {};
    todos.forEach((t) => { courseTitles[t.id] = t.title; });

    // Supprimer les résultats orphelins (sans course associée)
    let changed = false;
    Object.keys(results).forEach((courseId) => {
      if (!todos.find(t => t.id === courseId)) {
        delete results[courseId];
        changed = true;
      }
    });
    if (changed) {
      try {
        localStorage.setItem("cymanager:results", JSON.stringify(results));
      } catch {}
    }

    // MIGRATION automatique des anciens résultats (string)
    let migrated = false;
    Object.entries(results).forEach(([courseId, stored]) => {
      if (typeof stored === "string") {
        const title = courseTitles[courseId] || "";
        const category = detectCourseCategory(title);
        results[courseId] = { result: stored, category };
        migrated = true;
      }
    });
    if (migrated) {
      try {
        localStorage.setItem("cymanager:results", JSON.stringify(results));
      } catch {}
    }

    // Agrégation par catégorie
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
      if (category === "u25") {
        points.forEach(({ name, team, points }) => {
          if (!u25Map.has(name)) {
            u25Map.set(name, { name, team, points });
          } else {
            const prev = u25Map.get(name)!;
            u25Map.set(name, { ...prev, points: prev.points + points });
          }
        });
      } else if (category === "u21") {
        points.forEach(({ name, team, points }) => {
          if (!u21Map.has(name)) {
            u21Map.set(name, { name, team, points });
          } else {
            const prev = u21Map.get(name)!;
            u21Map.set(name, { ...prev, points: prev.points + points });
          }
        });
      } else {
        points.forEach(({ name, team, points }) => {
          if (!proMap.has(name)) {
            proMap.set(name, { name, team, points });
          } else {
            const prev = proMap.get(name)!;
            proMap.set(name, { ...prev, points: prev.points + points });
          }
        });
      }
    });
    const proArr = Array.from(proMap.values());
    const u25Arr = Array.from(u25Map.values());
    const u21Arr = Array.from(u21Map.values());
    setPro(proArr.sort((a, b) => b.points - a.points));
    setU25(u25Arr.sort((a, b) => b.points - a.points));
    setU21(u21Arr.sort((a, b) => b.points - a.points));

    // Classement par équipe
    function aggregateTeams(arr: RiderPoints[]) {
      const map = new Map<string, number>();
      arr.forEach(({ team, points }) => {
        if (!team) return;
        map.set(team, (map.get(team) || 0) + points);
      });
      return Array.from(map.entries())
        .map(([team, points]) => ({ team, points }))
        .sort((a, b) => b.points - a.points);
    }
    setProTeams(aggregateTeams(proArr));
    setU25Teams(aggregateTeams(u25Arr));
    setU21Teams(aggregateTeams(u21Arr));
  }, []);

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
                      <th style={{color: '#181c24'}}>Nom</th>
                      <th style={{color: '#181c24'}}>Équipe</th>
                      <th style={{color: '#181c24'}}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pro.map((r, i) => {
                      const isTeamRider = r.team === "Kritoff Team";
                      return (
                        <tr key={i} className={isTeamRider ? "highlight-row" : undefined}>
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
                      <th>Nom</th>
                      <th>Équipe</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u25.map((r, i) => {
                      const isTeamRider = r.team === "Kritoff Team";
                      return (
                        <tr key={i} className={isTeamRider ? "highlight-row" : undefined}>
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
                      <th>Nom</th>
                      <th>Équipe</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u21.map((r, i) => {
                      const isTeamRider = r.team === "Kritoff Team";
                      return (
                        <tr key={i} className={isTeamRider ? "highlight-row" : undefined}>
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