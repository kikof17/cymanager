export type TeamStrategyAxis =
  | "courses-etapes"
  | "montagne"
  | "vallon"
  | "sprint"
  | "pave"
  | "clm"
  | "baroudeur"
  | "formation"
  | "polyvalence";

export type TeamPlanningHorizon = "immediat" | "equilibre" | "long-terme";

export type TeamBuildingStrategy = {
  primaryAxis: TeamStrategyAxis;
  secondaryAxis: TeamStrategyAxis;
  tertiaryAxis: TeamStrategyAxis;
  planningHorizon: TeamPlanningHorizon;
};