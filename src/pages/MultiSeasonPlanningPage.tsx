import { useMemo, useState, type FormEvent } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import {
  createMilestone,
  loadSeasonPlanning,
  saveSeasonPlanning,
} from "../lib/storage/seasonPlanningStorage";
import type { PlanningCategory, SeasonMilestone } from "../types/seasonPlanning";

type FormState = {
  season: number;
  week: number;
  category: PlanningCategory;
  title: string;
  notes: string;
};

const CATEGORY_LABELS: Record<PlanningCategory, string> = {
  sport: "Sport",
  finance: "Finance",
  training: "Entrainement",
  other: "Autre",
};

function sortMilestones(items: SeasonMilestone[]): SeasonMilestone[] {
  return [...items].sort((left, right) => {
    if (left.week !== right.week) {
      return left.week - right.week;
    }

    return left.title.localeCompare(right.title, "fr");
  });
}

export default function MultiSeasonPlanningPage() {
  const initialData = useMemo(() => loadSeasonPlanning(), []);
  const [planning, setPlanning] = useState(initialData);
  const [selectedSeason, setSelectedSeason] = useState(initialData.currentSeason);
  const [form, setForm] = useState<FormState>({
    season: initialData.currentSeason,
    week: 1,
    category: "sport",
    title: "",
    notes: "",
  });

  const seasonOptions = useMemo(() => {
    return Array.from({ length: 5 }, (_, index) => planning.currentSeason + index);
  }, [planning.currentSeason]);

  const milestonesBySeason = useMemo(() => {
    const grouped = new Map<number, SeasonMilestone[]>();

    planning.milestones.forEach((milestone) => {
      const items = grouped.get(milestone.season) ?? [];
      items.push(milestone);
      grouped.set(milestone.season, items);
    });

    return grouped;
  }, [planning.milestones]);

  const selectedMilestones = useMemo(() => {
    return sortMilestones(milestonesBySeason.get(selectedSeason) ?? []);
  }, [milestonesBySeason, selectedSeason]);

  const seasonStats = useMemo(() => {
    const total = selectedMilestones.length;
    const done = selectedMilestones.filter((item) => item.done).length;

    return {
      total,
      done,
      open: Math.max(0, total - done),
      completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  }, [selectedMilestones]);

  function updatePlanning(nextMilestones: SeasonMilestone[]) {
    const next = { ...planning, milestones: nextMilestones };
    setPlanning(next);
    saveSeasonPlanning(next);
  }

  function handleAddMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.title.trim().length < 3) {
      return;
    }

    const milestone = createMilestone({
      season: form.season,
      week: form.week,
      category: form.category,
      title: form.title,
      notes: form.notes,
    });

    updatePlanning([...planning.milestones, milestone]);
    setSelectedSeason(form.season);
    setForm((previous) => ({ ...previous, title: "", notes: "" }));
  }

  function toggleDone(id: string) {
    const next = planning.milestones.map((milestone) =>
      milestone.id === id
        ? {
            ...milestone,
            done: !milestone.done,
            updatedAt: new Date().toISOString(),
          }
        : milestone
    );

    updatePlanning(next);
  }

  function deleteMilestone(id: string) {
    updatePlanning(planning.milestones.filter((milestone) => milestone.id !== id));
  }

  function duplicateToNextSeason() {
    const source = selectedMilestones.filter((milestone) => !milestone.done);

    if (source.length === 0) {
      return;
    }

    const targetSeason = selectedSeason + 1;

    const duplicated = source.map((milestone) =>
      createMilestone({
        season: targetSeason,
        week: milestone.week,
        category: milestone.category,
        title: milestone.title,
        notes: milestone.notes,
      })
    );

    updatePlanning([...planning.milestones, ...duplicated]);
    setSelectedSeason(targetSeason);
    setForm((previous) => ({ ...previous, season: targetSeason }));
  }

  return (
    <div className="page-stack planning-page">
      <PageTitle
        title="Planification multi-saison"
        subtitle="Planifie les jalons sportifs et financiers sur 5 saisons sans te perdre dans un long scroll."
      />

      <Card className="planning-kpi-card">
        <div className="planning-kpi-grid">
          <div>
            <p className="planning-kpi-label">Saison active</p>
            <p className="planning-kpi-value">S{selectedSeason}</p>
          </div>
          <div>
            <p className="planning-kpi-label">Jalons ouverts</p>
            <p className="planning-kpi-value">{seasonStats.open}</p>
          </div>
          <div>
            <p className="planning-kpi-label">Jalons termines</p>
            <p className="planning-kpi-value">{seasonStats.done}</p>
          </div>
          <div>
            <p className="planning-kpi-label">Avancement</p>
            <p className="planning-kpi-value">{seasonStats.completionRate}%</p>
          </div>
        </div>
      </Card>

      <Card title="Saisons" className="planning-toolbar-card">
        <div className="planning-toolbar">
          <div className="planning-season-switch">
            {seasonOptions.map((season) => (
              <button
                key={season}
                type="button"
                className={season === selectedSeason ? "tab-btn tab-btn-active" : "tab-btn"}
                onClick={() => {
                  setSelectedSeason(season);
                  setForm((previous) => ({ ...previous, season }));
                }}
              >
                S{season}
              </button>
            ))}
          </div>

          <button type="button" className="ghost-button" onClick={duplicateToNextSeason}>
            Dupliquer les jalons ouverts vers S{selectedSeason + 1}
          </button>
        </div>
      </Card>

      <div className="planning-layout">
        <Card title="Nouveau jalon">
          <form className="planning-form" onSubmit={handleAddMilestone}>
            <label>
              Semaine
              <input
                type="number"
                min={1}
                max={10}
                value={form.week}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, week: Number(event.target.value) || 1 }))
                }
              />
            </label>

            <label>
              Categorie
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    category: event.target.value as PlanningCategory,
                  }))
                }
              >
                <option value="sport">Sport</option>
                <option value="training">Entrainement</option>
                <option value="finance">Finance</option>
                <option value="other">Autre</option>
              </select>
            </label>

            <label>
              Titre
              <input
                type="text"
                value={form.title}
                maxLength={120}
                placeholder="Ex: Monter CdE niveau 6"
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, title: event.target.value }))
                }
              />
            </label>

            <label>
              Notes (optionnel)
              <textarea
                value={form.notes}
                rows={4}
                placeholder="Contexte, budget, dependances"
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, notes: event.target.value }))
                }
              />
            </label>

            <button type="submit" className="primary-button">
              Ajouter le jalon
            </button>
          </form>
        </Card>

        <Card title={`Jalons S${selectedSeason}`}>
          {selectedMilestones.length === 0 ? (
            <p className="muted">Aucun jalon pour cette saison. Ajoute un premier objectif a droite.</p>
          ) : (
            <ul className="planning-list">
              {selectedMilestones.map((milestone) => (
                <li key={milestone.id} className={milestone.done ? "planning-item is-done" : "planning-item"}>
                  <div className="planning-item-main">
                    <p className="planning-item-title">S{milestone.season} · Sem. {milestone.week} · {CATEGORY_LABELS[milestone.category]}</p>
                    <strong>{milestone.title}</strong>
                    {milestone.notes ? <p className="muted">{milestone.notes}</p> : null}
                  </div>

                  <div className="planning-item-actions">
                    <button type="button" className="ghost-button" onClick={() => toggleDone(milestone.id)}>
                      {milestone.done ? "Reouvrir" : "Terminer"}
                    </button>
                    <button type="button" className="ghost-button danger" onClick={() => deleteMilestone(milestone.id)}>
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
