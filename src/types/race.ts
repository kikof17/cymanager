export type RaceProfileType =
  | "Plaine"
  | "Vallon"
  | "Montagne"
  | "CLM"
  | "Pavé"
  | "Flandrien"
  | "Mixte";

export type RaceType = "simple" | "etapes";

export type RaceProfileWeights = {
  flat: number;
  hill: number;
  mountain: number;
  sprint: number;
  cobble: number;
  timeTrial: number;
  breakaway: number;
  endurance: number;
  resistance: number;
  recovery: number;
  stageRace: number;
};

export type ParsedRace = {
  rawText: string;
  name: string;
  raceType: RaceType;
  distanceKm: number;
  detectedProfile: RaceProfileType;
  weights: RaceProfileWeights;
  summary: string[];
  category: 'U21' | 'U25' | 'Pro' | null;
};

export type RaceRole = "Leader" | "Équipier" | "Électron libre" | "Remplaçant";

export type RiderRaceSetup = {
  riderId: string;
  role: Exclude<RaceRole, "Remplaçant">;
  effortPercent: number;
  morningBreakaway: boolean;
};

export type RaceRiderScore = {
  riderId: string;
  riderName: string;
  riderForm: number;
  riderCategory: string;
  score: number;
  role: RaceRole;
  reasons: string[];
};

export type RaceAnalysisResult = {
  race: ParsedRace;
  ranking: RaceRiderScore[];
  selected: RaceRiderScore[];
  substitutes: RaceRiderScore[];
};