export type FacilityKey =
  | "headOffice"
  | "trainingCenter"
  | "formationCenter"
  | "shop";

export type FacilitySettings = {
  level: number;
  upgradeInProgress: boolean;
  targetLevel: number | null;
  upgradeStartedAt: string;
  notes: string;
};

export type DivisionLevel =
  | "D1"
  | "D2"
  | "D3"
  | "D4"
  | "D5"
  | "D6"
  | "D7"
  | "D8"
  | "D9";

export type ClubObjective = "formation" | "performance" | "mixte";

export type SalaryTolerance = "prudente" | "normale" | "agressive";

export type ClubSettings = {
  facilities: Record<FacilityKey, FacilitySettings>;
  globalNotes: string;
  currentDivision: DivisionLevel;
  targetDivision: DivisionLevel;
  clubObjective: ClubObjective;
  salaryTolerance: SalaryTolerance;
};