import type { TodoItem } from "../../types/todo";

const MANUAL_TODOS_KEY = "cymanager:manual-todos";
const TODO_STATUS_KEY = "cymanager:todo-status";

type TodoStatusStore = Record<string, "todo" | "done">;

export function loadManualTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(MANUAL_TODOS_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as TodoItem[];
  } catch (error) {
    console.error("Erreur de lecture localStorage manual todos", error);
    return [];
  }
}

export function saveManualTodos(todos: TodoItem[]): void {
  try {
    localStorage.setItem(MANUAL_TODOS_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error("Erreur d'écriture localStorage manual todos", error);
  }
}

export function loadTodoStatuses(): TodoStatusStore {
  try {
    const raw = localStorage.getItem(TODO_STATUS_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed as TodoStatusStore;
  } catch (error) {
    console.error("Erreur de lecture localStorage todo statuses", error);
    return {};
  }
}

export function saveTodoStatuses(statuses: TodoStatusStore): void {
  try {
    localStorage.setItem(TODO_STATUS_KEY, JSON.stringify(statuses));
  } catch (error) {
    console.error("Erreur d'écriture localStorage todo statuses", error);
  }
}