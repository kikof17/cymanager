import { loadClubSettings } from "../storage/settingsStorage";

export const WEEKS_PER_SEASON = 10;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type SeasonCycle = {
  season: number;
  week: number;
  seasonStartIso: string;
};

function getSafeSeasonStartIso(candidate: string | undefined): string {
  if (!candidate) {
    return "2026-04-15T00:00:00.000Z";
  }

  const time = new Date(candidate).getTime();

  if (Number.isNaN(time)) {
    return "2026-04-15T00:00:00.000Z";
  }

  return candidate;
}

export function getSeasonCycle(referenceDate = new Date()): SeasonCycle {
  const settings = loadClubSettings();
  const baseSeason = settings.baseSeason ?? 97;
  const seasonStartIso = getSafeSeasonStartIso(settings.seasonStartIso);
  const baseStartMs = new Date(seasonStartIso).getTime();

  const weekDelta = Math.floor((referenceDate.getTime() - baseStartMs) / WEEK_MS);
  const seasonOffset = Math.floor(weekDelta / WEEKS_PER_SEASON);
  const weekIndex = ((weekDelta % WEEKS_PER_SEASON) + WEEKS_PER_SEASON) % WEEKS_PER_SEASON;

  return {
    season: baseSeason + seasonOffset,
    week: weekIndex + 1,
    seasonStartIso,
  };
}

export function formatSeasonStartLabel(seasonStartIso: string, season: number): string {
  const date = new Date(seasonStartIso);

  if (Number.isNaN(date.getTime())) {
    return `Saison ${season}`;
  }

  return `${new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)} (Saison ${season})`;
}
