import type { PlanningCategory, SeasonMilestone, SeasonPlanningData } from "../../types/seasonPlanning";
import { loadClubSettings } from "./settingsStorage";

const STORAGE_KEY = "cymanager:season-planning:v1";
const LEGACY_STORAGE_KEY = "cymanager:season-planning";

function buildId(): string {
  return `milestone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeWeek(value: unknown): number {
  const week = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(week)) {
    return 1;
  }

  return Math.max(1, Math.min(10, Math.trunc(week)));
}

function sanitizeSeason(value: unknown, fallbackSeason: number): number {
  const season = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(season)) {
    return fallbackSeason;
  }

  return Math.max(1, Math.trunc(season));
}

function sanitizeCategory(value: unknown): PlanningCategory {
  if (value === "sport" || value === "finance" || value === "training" || value === "other") {
    return value;
  }

  return "other";
}

function sanitizeMilestone(value: unknown, fallbackSeason: number): SeasonMilestone | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SeasonMilestone>;

  if (typeof candidate.title !== "string" || candidate.title.trim().length === 0) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: typeof candidate.id === "string" && candidate.id.length > 0 ? candidate.id : buildId(),
    season: sanitizeSeason(candidate.season, fallbackSeason),
    week: sanitizeWeek(candidate.week),
    category: sanitizeCategory(candidate.category),
    title: candidate.title.trim(),
    notes: typeof candidate.notes === "string" ? candidate.notes.trim() : "",
    done: candidate.done === true,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

function getDefaultSeasonFromSettings(): number {
  const settings = loadClubSettings();
  return typeof settings.baseSeason === "number" && settings.baseSeason > 0
    ? settings.baseSeason
    : 97;
}

function defaultData(currentSeason = getDefaultSeasonFromSettings()): SeasonPlanningData {
  return {
    version: 1,
    currentSeason,
    milestones: [],
  };
}

function readRawPlanning(): string | null {
  const v1 = localStorage.getItem(STORAGE_KEY);

  if (v1) {
    return v1;
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (legacy) {
    try {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      console.error("Erreur de migration clé planification legacy", error);
    }

    return legacy;
  }

  return null;
}

function normalizePlanningData(parsed: Partial<SeasonPlanningData>): {
  data: SeasonPlanningData;
  changed: boolean;
} {
  const fallbackSeason = getDefaultSeasonFromSettings();
  const currentSeason = sanitizeSeason(parsed.currentSeason, fallbackSeason);
  const sourceMilestones = Array.isArray(parsed.milestones) ? parsed.milestones : [];
  const milestones = sourceMilestones
    .map((milestone) => sanitizeMilestone(milestone, currentSeason))
    .filter((milestone): milestone is SeasonMilestone => milestone !== null)
    .sort((left, right) => {
      if (left.season !== right.season) {
        return left.season - right.season;
      }

      if (left.week !== right.week) {
        return left.week - right.week;
      }

      return left.title.localeCompare(right.title, "fr");
    });

  const normalized: SeasonPlanningData = {
    version: 1,
    currentSeason,
    milestones,
  };

  const changed =
    parsed.version !== 1 ||
    !Array.isArray(parsed.milestones) ||
    milestones.length !== sourceMilestones.length ||
    currentSeason !== parsed.currentSeason;

  return {
    data: normalized,
    changed,
  };
}

export function loadSeasonPlanning(): SeasonPlanningData {
  try {
    const raw = readRawPlanning();

    if (!raw) {
      return defaultData();
    }

    const parsed = JSON.parse(raw) as Partial<SeasonPlanningData>;
    const normalized = normalizePlanningData(parsed);

    if (normalized.changed) {
      saveSeasonPlanning(normalized.data);
    }

    return normalized.data;
  } catch (error) {
    console.error("Erreur de lecture planification multi-saison", error);
    return defaultData();
  }
}

export function saveSeasonPlanning(data: SeasonPlanningData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Erreur d'ecriture planification multi-saison", error);
  }
}

export function createMilestone(input: {
  season: number;
  week: number;
  category: PlanningCategory;
  title: string;
  notes?: string;
}): SeasonMilestone {
  const now = new Date().toISOString();

  return {
    id: buildId(),
    season: sanitizeSeason(input.season, 97),
    week: sanitizeWeek(input.week),
    category: sanitizeCategory(input.category),
    title: input.title.trim(),
    notes: input.notes?.trim() ?? "",
    done: false,
    createdAt: now,
    updatedAt: now,
  };
}
