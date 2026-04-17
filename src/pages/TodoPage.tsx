import { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import TodoFilters from "../components/todo/TodoFilters";
import TodoList from "../components/todo/TodoList";
import { buildTodoList } from "../lib/todo/buildTodoList";
import { loadRaceSetup } from "../lib/storage/raceStorage";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import {
  loadManualTodos,
  loadTodoStatuses,
  saveManualTodos,
  saveTodoStatuses,
} from "../lib/storage/todoStorage";
import { initialRiders } from "../store/initialState";
import type { ParsedRace } from "../types/race";
import type { Rider } from "../types/rider";
import type { ClubSettings } from "../types/settings";
import type {
  ManualTodoDraft,
  TodoCategory,
  TodoItem,
  TodoStatus,
} from "../types/todo";

type RaceSnapshot = {
  name: string;
  raceType: "simple" | "etapes";
  distanceKm: number;
  detectedProfile: ParsedRace["detectedProfile"];
};

function loadLastRaceSnapshot(): RaceSnapshot | null {
  try {
    const raw = localStorage.getItem("cymanager:last-race");

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as RaceSnapshot;
  } catch (error) {
    console.error("Erreur de lecture localStorage last race", error);
    return null;
  }
}

function buildRaceKey(race: RaceSnapshot | null): string {
  if (!race) {
    return "";
  }

  return `${race.name}::${race.raceType}::${race.distanceKm}::${race.detectedProfile}`;
}

export default function TodoPage() {
  const [riders] = useState<Rider[]>(() => {
    const storedRiders = loadRidersFromStorage();
    return storedRiders.length > 0 ? storedRiders : initialRiders;
  });

  const [manualTodos, setManualTodos] = useState<TodoItem[]>(() => loadManualTodos());

  const [statuses, setStatuses] = useState<Record<string, TodoStatus>>(
    () => loadTodoStatuses()
  );

  const [clubSettings] = useState<ClubSettings>(() => loadClubSettings());

  const [raceSnapshot] = useState<RaceSnapshot | null>(() => loadLastRaceSnapshot());

  const [statusFilter, setStatusFilter] = useState<TodoStatus | "all">("todo");
  const [categoryFilter, setCategoryFilter] = useState<TodoCategory | "all">("all");

  const [draft, setDraft] = useState<ManualTodoDraft>({
    title: "",
    details: "",
    priority: "moyenne",
    category: "general",
  });

  useEffect(() => {
    saveManualTodos(manualTodos);
  }, [manualTodos]);

  useEffect(() => {
    saveTodoStatuses(statuses);
  }, [statuses]);

  const raceKey = useMemo(() => buildRaceKey(raceSnapshot), [raceSnapshot]);

  const raceSetupCount = useMemo(() => {
    if (!raceKey) {
      return 0;
    }

    return Object.keys(loadRaceSetup(raceKey)).length;
  }, [raceKey]);

  const autoTodos = useMemo(() => {
    return buildTodoList({
      riders,
      trainingExists: riders.length > 0,
      race: raceSnapshot
        ? {
            rawText: "",
            name: raceSnapshot.name,
            raceType: raceSnapshot.raceType,
            distanceKm: raceSnapshot.distanceKm,
            detectedProfile: raceSnapshot.detectedProfile,
            weights: {
              flat: 0,
              hill: 0,
              mountain: 0,
              sprint: 0,
              cobble: 0,
              timeTrial: 0,
              breakaway: 0,
              endurance: 0,
              resistance: 0,
              recovery: 0,
              stageRace: 0,
            },
            summary: [],
          }
        : null,
      raceSetupCount,
      clubSettings,
    });
  }, [riders, raceSnapshot, raceSetupCount, clubSettings]);

  const mergedTodos = useMemo(() => {
    const allTodos = [...autoTodos, ...manualTodos];

    return allTodos.map((item) => ({
      ...item,
      status: statuses[item.id] ?? item.status,
    }));
  }, [autoTodos, manualTodos, statuses]);

  const filteredTodos = useMemo(() => {
    return mergedTodos.filter((item) => {
      const statusOk = statusFilter === "all" || item.status === statusFilter;
      const categoryOk =
        categoryFilter === "all" || item.category === categoryFilter;

      return statusOk && categoryOk;
    });
  }, [mergedTodos, statusFilter, categoryFilter]);

  function handleToggle(id: string) {
    setStatuses((current) => ({
      ...current,
      [id]: current[id] === "done" ? "todo" : "done",
    }));
  }

  function handleDeleteManual(id: string) {
    setManualTodos((current) => current.filter((item) => item.id !== id));

    setStatuses((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function handleAddManualTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = draft.title.trim();

    if (!title) {
      return;
    }

    const newTodo: TodoItem = {
      id: `manual-${crypto.randomUUID()}`,
      title,
      details: draft.details.trim(),
      source: "manual",
      status: "todo",
      priority: draft.priority,
      category: draft.category,
      createdAt: new Date().toISOString(),
    };

    setManualTodos((current) => [newTodo, ...current]);
    setDraft({
      title: "",
      details: "",
      priority: "moyenne",
      category: "general",
    });
  }

  const totalCount = mergedTodos.length;
  const doneCount = mergedTodos.filter((item) => item.status === "done").length;
  const todoCount = totalCount - doneCount;

  return (
    <div className="page-stack">
      <PageTitle
        title="To-do"
        subtitle="Suivi des tâches automatiques et manuelles du club."
      />

      <div className="stat-grid">
        <Card title="Total tâches">
          <p className="stat-value">{totalCount}</p>
        </Card>

        <Card title="À faire">
          <p className="stat-value">{todoCount}</p>
        </Card>

        <Card title="Faites">
          <p className="stat-value">{doneCount}</p>
        </Card>

        <Card title="Effectif chargé">
          <p className="stat-value">{riders.length}</p>
        </Card>
      </div>

      <div className="two-columns">
        <Card title="Ajouter une tâche manuelle">
          <form className="page-stack" onSubmit={handleAddManualTodo}>
            <div>
              <label className="field-label" htmlFor="todo-title">
                Titre
              </label>
              <input
                id="todo-title"
                className="input"
                type="text"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ex: Vérifier le marché des transferts"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="todo-details">
                Détails
              </label>
              <textarea
                id="todo-details"
                className="textarea"
                rows={5}
                value={draft.details}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, details: event.target.value }))
                }
                placeholder="Optionnel"
              />
            </div>

            <div className="todo-filters">
              <div>
                <label className="field-label" htmlFor="todo-priority">
                  Priorité
                </label>
                <select
                  id="todo-priority"
                  className="input"
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      priority: event.target.value as ManualTodoDraft["priority"],
                    }))
                  }
                >
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="basse">Basse</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="todo-category">
                  Catégorie
                </label>
                <select
                  id="todo-category"
                  className="input"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      category: event.target.value as TodoCategory,
                    }))
                  }
                >
                  <option value="general">Général</option>
                  <option value="effectif">Effectif</option>
                  <option value="entrainement">Entraînement</option>
                  <option value="courses">Courses</option>
                  <option value="installations">Installations</option>
                </select>
              </div>
            </div>

            <div className="inline-actions">
              <button type="submit" className="button button-primary">
                Ajouter la tâche
              </button>
            </div>
          </form>
        </Card>

        <Card title="Filtres">
          <TodoFilters
            status={statusFilter}
            category={categoryFilter}
            onStatusChange={setStatusFilter}
            onCategoryChange={setCategoryFilter}
          />
        </Card>
      </div>

      <Card title="Liste des tâches">
        <TodoList
          items={filteredTodos}
          onToggle={handleToggle}
          onDeleteManual={handleDeleteManual}
        />
      </Card>
    </div>
  );
}