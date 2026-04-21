import type { ParsedRace } from "../../types/race";

function createOpaqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildLegacyRaceKey(
  race: Pick<ParsedRace, "name" | "raceType" | "distanceKm" | "detectedProfile"> | null | undefined
): string {
  if (!race) {
    return "";
  }

  return `${race.name}::${race.raceType}::${race.distanceKm}::${race.detectedProfile}`;
}

export function createRaceKey(): string {
  return createOpaqueId("race");
}

export function getRaceKey(
  race: Pick<ParsedRace, "raceKey" | "name" | "raceType" | "distanceKm" | "detectedProfile"> | null | undefined
): string {
  if (!race) {
    return "";
  }

  if (typeof race.raceKey === "string" && race.raceKey.trim().length > 0) {
    return race.raceKey;
  }

  return buildLegacyRaceKey(race);
}

/** Retourne true si la clé est une clé opaque stable (préfixe "race-"), false si absente ou format legacy. */
export function isStableOpaqueRaceKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== "string") return false;
  return key.startsWith("race-");
}

export function ensureRaceKey<T extends ParsedRace>(race: T): T {
  if (typeof race.raceKey === "string" && race.raceKey.trim().length > 0) {
    return race;
  }

  return {
    ...race,
    raceKey: createRaceKey(),
  };
}