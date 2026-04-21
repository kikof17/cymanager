import type { RaceType } from "../../types/race";
import type { TodoItem } from "../../types/todo";

export type RaceImportMode = "auto" | RaceType;
export type CourseTodoGroup = {
  key: string;
  title: string;
  isTour: boolean;
  todos: TodoItem[];
};

function normalizeStageRaceValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

export function extractStageNumber(name: string): number | null {
  const match = name.match(/^etape\s*(\d+)\b/i);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

export function stripStagePrefix(name: string): string {
  return name.replace(/^etape\s*\d+\s*:?\s*/i, "").trim();
}

export function stripCourseMetaSuffix(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function getCourseDisplayTitle(todo: Pick<TodoItem, "title">): string {
  return stripCourseMetaSuffix(todo.title);
}

export function getCourseGroupTitle(todo: TodoItem): string {
  return todo.tourKey
    ? stripStagePrefix(getCourseDisplayTitle(todo))
    : getCourseDisplayTitle(todo);
}

export function groupCourseTodos(todos: TodoItem[]): CourseTodoGroup[] {
  const groups = new Map<string, CourseTodoGroup>();

  todos.forEach((todo) => {
    const key = todo.tourKey ?? todo.id;
    const existing = groups.get(key);

    if (existing) {
      existing.todos.push(todo);
      return;
    }

    groups.set(key, {
      key,
      title: getCourseGroupTitle(todo),
      isTour: Boolean(todo.tourKey),
      todos: [todo],
    });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      todos: [...group.todos].sort((left, right) => {
        const leftStage = left.stageNumber ?? Number.MAX_SAFE_INTEGER;
        const rightStage = right.stageNumber ?? Number.MAX_SAFE_INTEGER;

        if (leftStage !== rightStage) {
          return leftStage - rightStage;
        }

        const leftDate = left.scheduledAt ?? left.createdAt;
        const rightDate = right.scheduledAt ?? right.createdAt;
        return new Date(leftDate).getTime() - new Date(rightDate).getTime();
      }),
    }))
    .sort((left, right) => {
      const leftDate = left.todos[0]?.scheduledAt ?? left.todos[0]?.createdAt ?? "";
      const rightDate = right.todos[0]?.scheduledAt ?? right.todos[0]?.createdAt ?? "";
      return new Date(leftDate).getTime() - new Date(rightDate).getTime();
    });
}

export function detectRaceTypeFromImport(name: string, mode: RaceImportMode): RaceType {
  if (mode === "simple" || mode === "etapes") {
    return mode;
  }

  return extractStageNumber(name) !== null ? "etapes" : "simple";
}

export function buildTourKey(seed: string, scheduledAt?: string | null): string {
  const normalizedSeed = normalizeStageRaceValue(stripStagePrefix(seed)) || "tour";
  const dateSeed = scheduledAt?.slice(0, 10) ?? "undated";
  return `tour:${dateSeed}:${normalizedSeed}`;
}

function getDateDistanceInDays(left: string, right: string): number {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(leftTime - rightTime) / (1000 * 60 * 60 * 24);
}

export function findMatchingTourKey(
  stageNumber: number | null,
  scheduledAt: string | null,
  todos: TodoItem[]
): string | null {
  if (stageNumber === null || !scheduledAt) {
    return null;
  }

  const candidates = todos
    .filter((todo) => typeof todo.tourKey === "string" && typeof todo.stageNumber === "number")
    .map((todo) => ({
      tourKey: todo.tourKey as string,
      stageNumber: todo.stageNumber as number,
      scheduledAt: todo.scheduledAt ?? todo.createdAt,
    }))
    .filter((todo) => {
      const dateGap = getDateDistanceInDays(scheduledAt, todo.scheduledAt);
      const stageGap = Math.abs(stageNumber - todo.stageNumber);
      return dateGap <= 5 && stageGap <= 2;
    })
    .sort((left, right) => {
      const leftStageGap = Math.abs(stageNumber - left.stageNumber);
      const rightStageGap = Math.abs(stageNumber - right.stageNumber);

      if (leftStageGap !== rightStageGap) {
        return leftStageGap - rightStageGap;
      }

      const leftDateGap = getDateDistanceInDays(scheduledAt, left.scheduledAt);
      const rightDateGap = getDateDistanceInDays(scheduledAt, right.scheduledAt);
      return leftDateGap - rightDateGap;
    });

  return candidates[0]?.tourKey ?? null;
}