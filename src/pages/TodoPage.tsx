import { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import TodoFilters from "../components/todo/TodoFilters";
import TodoList from "../components/todo/TodoList";
import { buildResultReferenceSummary, getAllResultsFromStorage } from "../lib/scoring/extractPoints";
import { buildRiderAvailabilitySummary } from "../lib/scoring/riderAvailability";
import { buildTodoList } from "../lib/todo/buildTodoList";
import { loadLastRaceSnapshot, type RaceSnapshot } from "../lib/storage/lastRaceStorage";
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
import type { Rider } from "../types/rider";
import type { ClubSettings } from "../types/settings";
import type {
  ManualTodoDraft,
  TodoCategory,
  TodoItem,
  TodoStatus,
} from "../types/todo";

type TodoSortMode = "priority" | "recent" | "category";

const PRIORITY_RANK: Record<TodoItem["priority"], number> = {
  haute: 3,
  moyenne: 2,
  basse: 1,
};

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
  const [searchText, setSearchText] = useState<string>("");
  const [sortMode, setSortMode] = useState<TodoSortMode>("priority");

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
    const availabilitySummary = buildRiderAvailabilitySummary(riders);
    const resultReferenceSummary = buildResultReferenceSummary(
      getAllResultsFromStorage(),
      manualTodos.filter((todo) => todo.id.startsWith("calendar-"))
    );
    const brokenResultReferenceCount =
      resultReferenceSummary.missingRaceReferenceCount +
      resultReferenceSummary.mismatchedRaceReferenceCount +
      resultReferenceSummary.orphanCount;

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
            category: null,
          }
        : null,
      raceSetupCount,
      clubSettings,
      unavailableCount: availabilitySummary.unavailableRiders.length,
      brokenResultReferenceCount,
    });
  }, [riders, raceSnapshot, raceSetupCount, clubSettings, manualTodos]);

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
      const needle = searchText.trim().toLowerCase();
      const searchOk =
        needle.length === 0 ||
        `${item.title} ${item.details ?? ""}`.toLowerCase().includes(needle);

      return statusOk && categoryOk && searchOk;
    });
  }, [mergedTodos, statusFilter, categoryFilter, searchText]);

  const sortedTodos = useMemo(() => {
    const byDateDesc = (left: TodoItem, right: TodoItem) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

    return [...filteredTodos].sort((left, right) => {
      if (sortMode === "recent") {
        return byDateDesc(left, right);
      }

      if (sortMode === "category") {
        const categoryComparison = left.category.localeCompare(right.category, "fr", {
          sensitivity: "base",
        });

        if (categoryComparison !== 0) {
          return categoryComparison;
        }
      }

      const priorityComparison =
        PRIORITY_RANK[right.priority] - PRIORITY_RANK[left.priority];

      if (priorityComparison !== 0) {
        return priorityComparison;
      }

      return byDateDesc(left, right);
    });
  }, [filteredTodos, sortMode]);

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

  function handleMarkFilteredAsDone() {
    setStatuses((current) => {
      const next = { ...current };

      filteredTodos.forEach((item) => {
        next[item.id] = "done";
      });

      return next;
    });
  }

  function handleResetFilteredDone() {
    setStatuses((current) => {
      const next = { ...current };

      filteredTodos.forEach((item) => {
        next[item.id] = "todo";
      });

      return next;
    });
  }

  const totalCount = mergedTodos.length;
  const doneCount = mergedTodos.filter((item) => item.status === "done").length;
  const todoCount = totalCount - doneCount;

  const urgentCount = mergedTodos.filter(item => item.priority === "haute" && item.status !== "done").length;
  const autoCount = mergedTodos.filter(item => item.source !== "manual").length;

  return (
    <div className="page-stack">
      <PageTitle
        title="To-do"
        subtitle="Suivi des tâches automatiques et manuelles du club."
      />

      <section className="finance-board" aria-label="Tableau de bord tâches">
        <div className="finance-board-header">
          <span className="finance-board-title">Tâches</span>
        </div>
        <div className="finance-board-grid">
          <div className={`finance-board-item ${todoCount > 0 ? "finance-board-item--warning" : "finance-board-item--success"}`}>
            <span className="finance-board-label">À faire</span>
            <span className="finance-board-value">{todoCount}</span>
            <span className="finance-board-sub">sur {totalCount} tâches</span>
          </div>
          <div className={`finance-board-item ${urgentCount > 0 ? "finance-board-item--danger" : "finance-board-item--success"}`}>
            <span className="finance-board-label">Priorité haute</span>
            <span className="finance-board-value">{urgentCount}</span>
          </div>
          <div className="finance-board-item finance-board-item--success">
            <span className="finance-board-label">Faites</span>
            <span className="finance-board-value">{doneCount}</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Auto-générées</span>
            <span className="finance-board-value">{autoCount}</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Manuelles</span>
            <span className="finance-board-value">{manualTodos.length}</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Effectif</span>
            <span className="finance-board-value">{riders.length} coureurs</span>
          </div>
        </div>
      </section>

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
            searchText={searchText}
            sortMode={sortMode}
            onStatusChange={setStatusFilter}
            onCategoryChange={setCategoryFilter}
            onSearchTextChange={setSearchText}
            onSortModeChange={setSortMode}
          />
        </Card>
      </div>

      <Card title="Liste des tâches">
        <div className="inline-actions todo-bulk-actions">
          <button type="button" className="button button-secondary" onClick={handleMarkFilteredAsDone}>
            Tout marquer fait (vue)
          </button>
          <button type="button" className="button button-secondary" onClick={handleResetFilteredDone}>
            Remettre à faire (vue)
          </button>
        </div>
        <TodoList
          items={sortedTodos}
          onToggle={handleToggle}
          onDeleteManual={handleDeleteManual}
        />
      </Card>
    </div>
  );
}