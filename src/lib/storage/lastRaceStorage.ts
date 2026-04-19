import type { ParsedRace } from "../../types/race";

export type RaceSnapshot = {
  name: string;
  raceType: "simple" | "etapes";
  distanceKm: number;
  detectedProfile: ParsedRace["detectedProfile"];
};

const LAST_RACE_STORAGE_KEY = "cymanager:last-race";

const VALID_RACE_TYPES: RaceSnapshot["raceType"][] = ["simple", "etapes"];
const VALID_RACE_PROFILES: ParsedRace["detectedProfile"][] = [
  "Plaine",
  "Vallon",
  "Montagne",
  "CLM",
  "Pavé",
  "Flandrien",
  "Mixte",
];

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function normalizeLastRaceSnapshot(value: unknown): RaceSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<RaceSnapshot>;

  if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
    return null;
  }

  const raceType = VALID_RACE_TYPES.includes(candidate.raceType as RaceSnapshot["raceType"])
    ? (candidate.raceType as RaceSnapshot["raceType"])
    : null;
  const detectedProfile = VALID_RACE_PROFILES.includes(
    candidate.detectedProfile as ParsedRace["detectedProfile"]
  )
    ? (candidate.detectedProfile as ParsedRace["detectedProfile"])
    : null;

  if (!raceType || !detectedProfile) {
    return null;
  }

  return {
    name: candidate.name.trim(),
    raceType,
    distanceKm: Math.max(0, toFiniteNumber(candidate.distanceKm)),
    detectedProfile,
  };
}

export function buildRaceSnapshotKey(snapshot: RaceSnapshot | null): string {
  if (!snapshot) {
    return "";
  }

  return `${snapshot.name}::${snapshot.raceType}::${snapshot.distanceKm}::${snapshot.detectedProfile}`;
}

export function loadLastRaceSnapshot(): RaceSnapshot | null {
  try {
    const raw = localStorage.getItem(LAST_RACE_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return normalizeLastRaceSnapshot(JSON.parse(raw));
  } catch (error) {
    console.error("Erreur de lecture localStorage last race", error);
    return null;
  }
}

export function saveLastRaceSnapshot(snapshot: RaceSnapshot | null): void {
  try {
    const normalized = normalizeLastRaceSnapshot(snapshot);

    if (!normalized) {
      localStorage.removeItem(LAST_RACE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(LAST_RACE_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error("Erreur d'écriture localStorage last race", error);
  }
}