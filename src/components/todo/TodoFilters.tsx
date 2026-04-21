import type { TodoCategory, TodoStatus } from "../../types/todo";

type TodoFiltersProps = {
  status: TodoStatus | "all";
  category: TodoCategory | "all";
  searchText: string;
  sortMode: "priority" | "recent" | "category";
  onStatusChange: (value: TodoStatus | "all") => void;
  onCategoryChange: (value: TodoCategory | "all") => void;
  onSearchTextChange: (value: string) => void;
  onSortModeChange: (value: "priority" | "recent" | "category") => void;
};

export default function TodoFilters({
  status,
  category,
  searchText,
  sortMode,
  onStatusChange,
  onCategoryChange,
  onSearchTextChange,
  onSortModeChange,
}: TodoFiltersProps) {
  return (
    <div className="todo-filters">
      <div>
        <label className="field-label" htmlFor="todo-search-filter">
          Recherche
        </label>
        <input
          id="todo-search-filter"
          className="input"
          type="text"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder="Titre ou détails"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="todo-status-filter">
          Statut
        </label>
        <select
          id="todo-status-filter"
          className="input"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as TodoStatus | "all")}
        >
          <option value="all">Tous</option>
          <option value="todo">À faire</option>
          <option value="done">Fait</option>
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="todo-category-filter">
          Catégorie
        </label>
        <select
          id="todo-category-filter"
          className="input"
          value={category}
          onChange={(event) =>
            onCategoryChange(event.target.value as TodoCategory | "all")
          }
        >
          <option value="all">Toutes</option>
          <option value="effectif">Effectif</option>
          <option value="entrainement">Entraînement</option>
          <option value="courses">Courses</option>
          <option value="installations">Installations</option>
          <option value="general">Général</option>
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="todo-sort-filter">
          Tri
        </label>
        <select
          id="todo-sort-filter"
          className="input"
          value={sortMode}
          onChange={(event) =>
            onSortModeChange(event.target.value as "priority" | "recent" | "category")
          }
        >
          <option value="priority">Priorité</option>
          <option value="recent">Plus récentes</option>
          <option value="category">Catégorie</option>
        </select>
      </div>
    </div>
  );
}