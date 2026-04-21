import type { StoredResult } from "../scoring/extractPoints";
import type { ParsedRace } from "../../types/race";
import type { TodoItem } from "../../types/todo";

export type ResultCategory = "pro" | "u25" | "u21";

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeResultCategory(value: unknown): ResultCategory | null {
  if (value === "u25" || value === "U25") {
    return "u25";
  }

  if (value === "u21" || value === "U21") {
    return "u21";
  }

  if (value === "pro" || value === "Pro" || value === "PRO") {
    return "pro";
  }

  return null;
}

export function inferResultCategory(...values: Array<string | null | undefined>): ResultCategory {
  const normalized = values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => normalizeComparable(value))
    .join(" ");

  if (normalized.includes("u25")) {
    return "u25";
  }

  if (normalized.includes("u21")) {
    return "u21";
  }

  return "pro";
}

export function getParsedRaceResultCategory(
  race: Pick<ParsedRace, "category" | "name" | "rawText" | "summary"> | null | undefined
): ResultCategory {
  if (!race) {
    return "pro";
  }

  return (
    normalizeResultCategory(race.category) ??
    inferResultCategory(race.name, race.rawText, ...(race.summary ?? []))
  );
}

export function getTodoResultCategory(
  todo: Pick<TodoItem, "courseCategory" | "title" | "details"> | null | undefined
): ResultCategory {
  if (!todo) {
    return "pro";
  }

  return normalizeResultCategory(todo.courseCategory) ?? inferResultCategory(todo.title, todo.details);
}

export function getStoredResultCategory(
  stored: StoredResult | { result: string; category?: string },
  todo?: Pick<TodoItem, "courseCategory" | "title" | "details"> | null
): ResultCategory {
  if (typeof stored === "object" && stored) {
    const explicitCategory = normalizeResultCategory(stored.category);

    if (explicitCategory) {
      return explicitCategory;
    }
  }

  return getTodoResultCategory(todo);
}