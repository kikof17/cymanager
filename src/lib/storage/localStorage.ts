import type { Rider } from "../../types/rider";

const RIDERS_STORAGE_KEY = "cymanager:riders";

const RIDER_NUMERIC_KEYS: Array<keyof Rider> = [
  "value",
  "salaryWeekly",
  "ageYears",
  "ageWeeks",
  "form",
  "endurance",
  "resistance",
  "recovery",
  "flat",
  "hill",
  "sprint",
  "cobble",
  "agility",
  "breakaway",
  "mountain",
  "downhill",
  "timeTrial",
  "stageRace",
  "experience",
  "total",
];

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(normalized) ? normalized : 0;
  }

  return 0;
}

function normalizeStoredRider(value: unknown): Rider | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Rider>;

  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }

  const normalized = {
    ...candidate,
    id: candidate.id,
    name: candidate.name,
    currentTeam: typeof candidate.currentTeam === "string" ? candidate.currentTeam : "",
    nationality: typeof candidate.nationality === "string" ? candidate.nationality : "",
    injury: typeof candidate.injury === "string" ? candidate.injury : "Aucune",
    category:
      candidate.category === "Pro" || candidate.category === "U25" || candidate.category === "U21"
        ? candidate.category
        : "Pro",
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
  } as Rider;

  RIDER_NUMERIC_KEYS.forEach((key) => {
    normalized[key] = toFiniteNumber(candidate[key]) as never;
  });

  return normalized;
}

export function loadRidersFromStorage(): Rider[] {
  try {
    const raw = localStorage.getItem(RIDERS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((rider) => normalizeStoredRider(rider))
      .filter((rider): rider is Rider => rider !== null);
  } catch (error) {
    console.error("Erreur de lecture localStorage riders", error);
    return [];
  }
}

export function saveRidersToStorage(riders: Rider[]): void {
  try {
    const normalizedRiders = riders
      .map((rider) => normalizeStoredRider(rider))
      .filter((rider): rider is Rider => rider !== null);

    localStorage.setItem(RIDERS_STORAGE_KEY, JSON.stringify(normalizedRiders));
  } catch (error) {
    console.error("Erreur d'écriture localStorage riders", error);
  }
}