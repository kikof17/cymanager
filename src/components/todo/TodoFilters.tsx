import type { TodoCategory, TodoStatus } from "../../types/todo";

type TodoFiltersProps = {
  status: TodoStatus | "all";
  category: TodoCategory | "all";
  onStatusChange: (value: TodoStatus | "all") => void;
  onCategoryChange: (value: TodoCategory | "all") => void;
};

export default function TodoFilters({
  status,
  category,
  onStatusChange,
  onCategoryChange,
}: TodoFiltersProps) {
  return (
    <div className="todo-filters">
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
    </div>
  );
}