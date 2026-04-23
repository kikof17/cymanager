export type PlanningCategory = "sport" | "finance" | "training" | "other";

export type SeasonMilestone = {
  id: string;
  season: number;
  week: number;
  category: PlanningCategory;
  title: string;
  notes: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SeasonPlanningData = {
  version: 1;
  currentSeason: number;
  milestones: SeasonMilestone[];
};
