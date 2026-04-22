import type { TeamProfile } from "../../types/teamProfile";

const TEAM_PROFILE_STORAGE_KEY = "cymanager:team-profile";

function toIsoDate(value: string): string {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export const defaultTeamProfile: TeamProfile = {
  teamName: "Kritoff Team",
  managerName: "Manager",
  teamId: "",
  country: "France",
  startedAt: new Date().toISOString(),
  activeSeasonLabel: "Saison 1",
  onboardingCompleted: false,
};

export function normalizeTeamProfile(value: unknown): TeamProfile {
  if (!value || typeof value !== "object") {
    return defaultTeamProfile;
  }

  const candidate = value as Partial<TeamProfile>;

  return {
    teamName: normalizeText(candidate.teamName, defaultTeamProfile.teamName),
    managerName: normalizeText(candidate.managerName, defaultTeamProfile.managerName),
    teamId: typeof candidate.teamId === "string" ? candidate.teamId.trim() : "",
    country: normalizeText(candidate.country, defaultTeamProfile.country),
    startedAt: toIsoDate(typeof candidate.startedAt === "string" ? candidate.startedAt : ""),
    activeSeasonLabel: normalizeText(candidate.activeSeasonLabel, defaultTeamProfile.activeSeasonLabel),
    onboardingCompleted: candidate.onboardingCompleted === true,
  };
}

export function loadTeamProfile(): TeamProfile {
  try {
    const raw = localStorage.getItem(TEAM_PROFILE_STORAGE_KEY);

    if (!raw) {
      return defaultTeamProfile;
    }

    return normalizeTeamProfile(JSON.parse(raw));
  } catch (error) {
    console.error("Erreur de lecture localStorage team profile", error);
    return defaultTeamProfile;
  }
}

export function saveTeamProfile(profile: TeamProfile): void {
  try {
    const normalized = normalizeTeamProfile(profile);
    localStorage.setItem(TEAM_PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error("Erreur d'écriture localStorage team profile", error);
  }
}

export function isOnboardingCompleted(): boolean {
  return loadTeamProfile().onboardingCompleted;
}
