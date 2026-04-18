import type { TeamBuildingStrategy, TeamPlanningHorizon, TeamStrategyAxis } from "../../types/teamStrategy";

const TEAM_STRATEGY_KEY = "cymanager:team-strategy";

const VALID_AXES: TeamStrategyAxis[] = [
  "courses-etapes",
  "montagne",
  "vallon",
  "sprint",
  "pave",
  "clm",
  "baroudeur",
  "formation",
  "polyvalence",
];

const VALID_HORIZONS: TeamPlanningHorizon[] = ["immediat", "equilibre", "long-terme"];

export const defaultTeamStrategy: TeamBuildingStrategy = {
  primaryAxis: "courses-etapes",
  secondaryAxis: "vallon",
  tertiaryAxis: "formation",
  planningHorizon: "equilibre",
};

function isValidAxis(value: unknown): value is TeamStrategyAxis {
  return typeof value === "string" && VALID_AXES.includes(value as TeamStrategyAxis);
}

function isValidHorizon(value: unknown): value is TeamPlanningHorizon {
  return typeof value === "string" && VALID_HORIZONS.includes(value as TeamPlanningHorizon);
}

function dedupeAxes(
  primaryAxis: TeamStrategyAxis,
  secondaryAxis: TeamStrategyAxis,
  tertiaryAxis: TeamStrategyAxis
): Pick<TeamBuildingStrategy, "primaryAxis" | "secondaryAxis" | "tertiaryAxis"> {
  const pool = VALID_AXES.filter(
    (axis) => axis !== primaryAxis && axis !== secondaryAxis && axis !== tertiaryAxis
  );
  const nextSecondary = secondaryAxis === primaryAxis ? pool.shift() ?? defaultTeamStrategy.secondaryAxis : secondaryAxis;
  const nextTertiary = tertiaryAxis === primaryAxis || tertiaryAxis === nextSecondary
    ? pool.shift() ?? defaultTeamStrategy.tertiaryAxis
    : tertiaryAxis;

  return {
    primaryAxis,
    secondaryAxis: nextSecondary,
    tertiaryAxis: nextTertiary,
  };
}

export function normalizeTeamStrategy(value: unknown): TeamBuildingStrategy {
  if (!value || typeof value !== "object") {
    return defaultTeamStrategy;
  }

  const candidate = value as Partial<TeamBuildingStrategy>;
  const primaryAxis = isValidAxis(candidate.primaryAxis)
    ? candidate.primaryAxis
    : defaultTeamStrategy.primaryAxis;
  const secondaryAxis = isValidAxis(candidate.secondaryAxis)
    ? candidate.secondaryAxis
    : defaultTeamStrategy.secondaryAxis;
  const tertiaryAxis = isValidAxis(candidate.tertiaryAxis)
    ? candidate.tertiaryAxis
    : defaultTeamStrategy.tertiaryAxis;
  const planningHorizon = isValidHorizon(candidate.planningHorizon)
    ? candidate.planningHorizon
    : defaultTeamStrategy.planningHorizon;

  return {
    ...dedupeAxes(primaryAxis, secondaryAxis, tertiaryAxis),
    planningHorizon,
  };
}

export function loadTeamStrategy(): TeamBuildingStrategy {
  try {
    const raw = localStorage.getItem(TEAM_STRATEGY_KEY);

    if (!raw) {
      return defaultTeamStrategy;
    }

    return normalizeTeamStrategy(JSON.parse(raw));
  } catch (error) {
    console.error("Erreur de lecture localStorage team strategy", error);
    return defaultTeamStrategy;
  }
}

export function saveTeamStrategy(strategy: TeamBuildingStrategy): TeamBuildingStrategy {
  const normalized = normalizeTeamStrategy(strategy);

  try {
    localStorage.setItem(TEAM_STRATEGY_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error("Erreur d'écriture localStorage team strategy", error);
  }

  return normalized;
}

export const TEAM_STRATEGY_OPTIONS: Array<{ value: TeamStrategyAxis; label: string }> = [
  { value: "courses-etapes", label: "Courses à étapes" },
  { value: "montagne", label: "Montagne" },
  { value: "vallon", label: "Classiques vallonnées" },
  { value: "sprint", label: "Plaine / sprint" },
  { value: "pave", label: "Classiques pavé" },
  { value: "clm", label: "CLM / rouleurs" },
  { value: "baroudeur", label: "Baroudeurs" },
  { value: "formation", label: "Formation de jeunes" },
  { value: "polyvalence", label: "Polyvalence" },
];

export const TEAM_HORIZON_OPTIONS: Array<{ value: TeamPlanningHorizon; label: string }> = [
  { value: "immediat", label: "Impact immédiat" },
  { value: "equilibre", label: "Équilibre court / moyen terme" },
  { value: "long-terme", label: "Construction long terme" },
];