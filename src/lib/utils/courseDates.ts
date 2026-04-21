import type { ParsedRace } from "../../types/race";
import type { TodoItem } from "../../types/todo";

function toIsoDate(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function parseCourseDateLabel(value: string): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return toIsoDate(`${year}-${month}-${day}T12:00:00`);
}

export function formatCourseDateLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function extractRaceScheduledAt(race: Pick<ParsedRace, "scheduledAt" | "rawText" | "summary" | "name">): string | null {
  if (race.scheduledAt) {
    return toIsoDate(race.scheduledAt) ?? race.scheduledAt;
  }

  const rawTextDate = parseCourseDateLabel(race.rawText);

  if (rawTextDate) {
    return rawTextDate;
  }

  const summaryDate = race.summary
    .map((line) => parseCourseDateLabel(line))
    .find((value): value is string => Boolean(value));

  if (summaryDate) {
    return summaryDate;
  }

  return parseCourseDateLabel(race.name);
}

export function getTodoScheduledAt(todo: Pick<TodoItem, "scheduledAt" | "details" | "title" | "createdAt"> | undefined): string | null {
  if (!todo) {
    return null;
  }

  const explicitDate = todo.scheduledAt ? toIsoDate(todo.scheduledAt) ?? todo.scheduledAt : null;

  if (explicitDate) {
    return explicitDate;
  }

  const detailsDate = parseCourseDateLabel(todo.details ?? "");

  if (detailsDate) {
    return detailsDate;
  }

  const titleDate = parseCourseDateLabel(todo.title);

  if (titleDate) {
    return titleDate;
  }

  return toIsoDate(todo.createdAt) ?? todo.createdAt;
}