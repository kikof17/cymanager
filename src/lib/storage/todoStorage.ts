import type { TodoItem } from "../../types/todo";
import { getTodoScheduledAt } from "../utils/courseDates";
import { inferResultCategory, normalizeResultCategory } from "../utils/courseCategory";

const MANUAL_TODOS_KEY = "cymanager:manual-todos";
const TODO_STATUS_KEY = "cymanager:todo-status";

type TodoStatusStore = Record<string, "todo" | "done">;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toIsoDate(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeTodoItem(value: unknown): TodoItem | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  if (typeof value.id !== "string" || typeof value.title !== "string") {
    return null;
  }

  const status = value.status === "done" ? "done" : "todo";
  const priority =
    value.priority === "haute" || value.priority === "moyenne" || value.priority === "basse"
      ? value.priority
      : "moyenne";
  const category =
    value.category === "effectif" ||
    value.category === "entrainement" ||
    value.category === "courses" ||
    value.category === "installations" ||
    value.category === "general"
      ? value.category
      : "general";

  return {
    id: value.id,
    title: value.title.trim(),
    details: typeof value.details === "string" ? value.details : "",
    source: value.source === "auto" ? "auto" : "manual",
    status,
    priority,
    category,
    createdAt: toIsoDate(value.createdAt),
    scheduledAt:
      typeof value.scheduledAt === "string" && value.scheduledAt.trim().length > 0
        ? toIsoDate(value.scheduledAt) ?? value.scheduledAt
        : category === "courses"
          ? getTodoScheduledAt({
              title: value.title,
              details: typeof value.details === "string" ? value.details : "",
              createdAt: toIsoDate(value.createdAt),
            }) ?? undefined
          : undefined,
    courseCategory:
      normalizeResultCategory(value.courseCategory) ??
      (category === "courses"
        ? inferResultCategory(
            typeof value.title === "string" ? value.title : "",
            typeof value.details === "string" ? value.details : ""
          )
        : undefined),
    stageNumber:
      typeof value.stageNumber === "number" && Number.isInteger(value.stageNumber)
        ? value.stageNumber
        : undefined,
    tourKey: typeof value.tourKey === "string" ? value.tourKey : undefined,
    raceKey: typeof value.raceKey === "string" ? value.raceKey : undefined,
  };
}

export function normalizeManualTodos(value: unknown): TodoItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((todo) => normalizeTodoItem(todo))
    .filter((todo): todo is TodoItem => todo !== null);
}

export function normalizeTodoStatuses(value: unknown): TodoStatusStore {
  if (!isObjectRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<TodoStatusStore>((accumulator, [key, status]) => {
    if (typeof key === "string" && (status === "todo" || status === "done")) {
      accumulator[key] = status;
    }

    return accumulator;
  }, {});
}

export function loadManualTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(MANUAL_TODOS_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return normalizeManualTodos(parsed);
  } catch (error) {
    console.error("Erreur de lecture localStorage manual todos", error);
    return [];
  }
}

export function saveManualTodos(todos: TodoItem[]): void {
  try {
    localStorage.setItem(MANUAL_TODOS_KEY, JSON.stringify(normalizeManualTodos(todos)));
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

    return normalizeTodoStatuses(parsed);
  } catch (error) {
    console.error("Erreur de lecture localStorage todo statuses", error);
    return {};
  }
}

export function saveTodoStatuses(statuses: TodoStatusStore): void {
  try {
    localStorage.setItem(TODO_STATUS_KEY, JSON.stringify(normalizeTodoStatuses(statuses)));
  } catch (error) {
    console.error("Erreur d'écriture localStorage todo statuses", error);
  }
}