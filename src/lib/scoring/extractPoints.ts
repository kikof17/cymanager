// Extraction des points de tous les résultats collés
// Format attendu : chaque résultat est une string TSV (tabulation)

import { getTodoResultCategory } from "../utils/courseCategory";
import { getTodoScheduledAt } from "../utils/courseDates";
import type { TodoItem } from "../../types/todo";

export type RiderPoints = {
  name: string;
  team: string;
  points: number;
};

export type ResultReferenceIssue = {
  courseId: string;
  courseTitle: string;
  storedRaceKey: string | null;
  expectedRaceKey: string | null;
  status: "orphan" | "missing-race-reference" | "mismatched-race-reference" | "valid";
};

export type ResultReferenceSummary = {
  totalResults: number;
  validCount: number;
  orphanCount: number;
  missingRaceReferenceCount: number;
  mismatchedRaceReferenceCount: number;
  issues: ResultReferenceIssue[];
};

export type StoredResultObject = {
  result: string;
  category: "pro" | "u25" | "u21";
  raceKey?: string;
  recordedAt?: string;
};

export type StoredResult = StoredResultObject | string;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function createStoredResult(
  result: string,
  course?: Pick<TodoItem, "raceKey" | "courseCategory" | "title" | "details" | "scheduledAt" | "createdAt"> | null
): StoredResultObject {
  return {
    result,
    category: getTodoResultCategory(course),
    raceKey:
      course && typeof course.raceKey === "string" && course.raceKey.trim().length > 0
        ? course.raceKey
        : undefined,
    recordedAt: course ? getTodoScheduledAt(course) ?? course.createdAt : new Date().toISOString(),
  };
}

function normalizeStoredResult(value: unknown): StoredResult | null {
  if (typeof value === "string") {
    return value.trim().length > 0 ? value : null;
  }

  if (!isObjectRecord(value) || typeof value.result !== "string") {
    return null;
  }

  const category = value.category === "u25" || value.category === "u21" ? value.category : "pro";

  return {
    result: value.result,
    category,
    raceKey:
      typeof value.raceKey === "string" && value.raceKey.trim().length > 0
        ? value.raceKey.trim()
        : undefined,
    recordedAt: toIsoDate(value.recordedAt) ?? undefined,
  };
}

export function normalizeStoredResults(value: unknown): Record<string, StoredResult> {
  if (!isObjectRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, StoredResult>>((results, [raceId, stored]) => {
    const normalized = normalizeStoredResult(stored);

    if (normalized) {
      results[raceId] = normalized;
    }

    return results;
  }, {});
}

export function getStoredResultText(stored: StoredResult | undefined): string {
  if (!stored) {
    return "";
  }

  return typeof stored === "string" ? stored : stored.result;
}

export function getStoredResultRaceKey(stored: StoredResult | undefined): string | null {
  if (!stored || typeof stored === "string") {
    return null;
  }

  return typeof stored.raceKey === "string" && stored.raceKey.trim().length > 0 ? stored.raceKey : null;
}

export function reconcileStoredResultsWithCourses(
  results: Record<string, StoredResult>,
  courses: Array<Pick<TodoItem, "id" | "raceKey" | "courseCategory" | "title" | "details" | "scheduledAt" | "createdAt">>
): { results: Record<string, StoredResult>; repairedCount: number } {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  let repairedCount = 0;

  const nextResults = Object.entries(results).reduce<Record<string, StoredResult>>((accumulator, [courseId, stored]) => {
    const course = courseMap.get(courseId);

    if (!course) {
      accumulator[courseId] = stored;
      return accumulator;
    }

    const nextStored = createStoredResult(getStoredResultText(stored), course);
    const previousRaceKey = getStoredResultRaceKey(stored);
    const nextRaceKey = nextStored.raceKey ?? null;
    const previousCategory = typeof stored === "string" ? null : stored.category;

    if (previousRaceKey !== nextRaceKey || previousCategory !== nextStored.category || typeof stored === "string") {
      repairedCount += 1;
    }

    accumulator[courseId] = nextStored;
    return accumulator;
  }, {});

  return { results: nextResults, repairedCount };
}

export function buildResultReferenceSummary(
  results: Record<string, StoredResult>,
  courses: Array<Pick<TodoItem, "id" | "title" | "raceKey">>
): ResultReferenceSummary {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const issues = Object.entries(results).map<ResultReferenceIssue>(([courseId, stored]) => {
    const course = courseMap.get(courseId);
    const storedRaceKey = getStoredResultRaceKey(stored);
    const expectedRaceKey = course?.raceKey ?? null;

    if (!course) {
      return {
        courseId,
        courseTitle: courseId,
        storedRaceKey,
        expectedRaceKey: null,
        status: "orphan",
      };
    }

    if (!storedRaceKey) {
      return {
        courseId,
        courseTitle: course.title,
        storedRaceKey: null,
        expectedRaceKey,
        status: "missing-race-reference",
      };
    }

    if (expectedRaceKey && storedRaceKey !== expectedRaceKey) {
      return {
        courseId,
        courseTitle: course.title,
        storedRaceKey,
        expectedRaceKey,
        status: "mismatched-race-reference",
      };
    }

    return {
      courseId,
      courseTitle: course.title,
      storedRaceKey,
      expectedRaceKey,
      status: "valid",
    };
  });

  return {
    totalResults: issues.length,
    validCount: issues.filter((issue) => issue.status === "valid").length,
    orphanCount: issues.filter((issue) => issue.status === "orphan").length,
    missingRaceReferenceCount: issues.filter((issue) => issue.status === "missing-race-reference").length,
    mismatchedRaceReferenceCount: issues.filter((issue) => issue.status === "mismatched-race-reference").length,
    issues,
  };
}

export function extractPointsFromResults(results: Record<string, StoredResult>): RiderPoints[] {
  const all: RiderPoints[] = [];
  Object.values(results).forEach((stored) => {
    const result = getStoredResultText(stored);
    const lines = result.trim().split(/\r?\n/);
    if (lines.length < 2) return;
    const headers = lines[0].split('\t');
    const nameIdx = headers.findIndex((h) => {
      const n = h.toLowerCase().trim();
      return n.includes('nom') || n.includes('coureur') || n.includes('rider') || n === 'name';
    });
    const teamIdx = headers.findIndex((h) => {
      const n = h.toLowerCase().trim();
      return n.includes('equipe') || n.includes('team');
    });
    const pointsIdx = headers.findIndex((h) => {
      const n = h.toLowerCase().trim();
      return n.includes('point') || n === 'pts' || n.startsWith('pts ') || n.startsWith('pts\t');
    });
    if (nameIdx === -1 || teamIdx === -1 || pointsIdx === -1) return;
    lines.slice(1).forEach((line) => {
      const cells = line.split('\t');
      const name = cells[nameIdx]?.trim();
      const team = cells[teamIdx]?.trim();
      const points = parseInt(cells[pointsIdx]?.replace(/[^\d]/g, "") || "0", 10);
      if (name && team && !isNaN(points)) {
        all.push({ name, team, points });
      }
    });
  });
  return all;
}

// Utilitaire pour accès universel (évite import cyclique)
export function getAllResultsFromStorage(): Record<string, StoredResult> {
  try {
    const raw = localStorage.getItem("cymanager:results");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizeStoredResults(parsed);
  } catch {
    return {};
  }
}

export function saveAllResultsToStorage(results: Record<string, StoredResult>): void {
  try {
    localStorage.setItem("cymanager:results", JSON.stringify(normalizeStoredResults(results)));
  } catch (error) {
    console.error("Erreur d'écriture localStorage results", error);
  }
}
