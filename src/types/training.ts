export type TrainingType =
  | "Endurance"
  | "Plaine"
  | "Sprint"
  | "Vallon"
  | "Montagne"
  | "Course à étapes"
  | "CLM"
  | "Rouleur"
  | "Baroudeur"
  | "Pavé"
  | "Flandrien";

export type RiderProfile =
  | "Grimpeur"
  | "Puncheur"
  | "Rouleur"
  | "Sprinteur"
  | "Flandrien"
  | "Coureur de classement"
  | "Baroudeur"
  | "Polyvalent"
  | "Équipier en formation";

export type RiderProfileSummary = {
  riderId: string;
  primaryProfile: RiderProfile;
  secondaryProfile: RiderProfile;
  strengths: string[];
  weaknesses: string[];
};

export type StrategyMode = "court-terme" | "long-terme" | "mixte";
export type TrainingPhilosophy = "polyvalent" | "immediat" | "montagne-clm";

export type TrainingPriority =
  | "Foncier très prioritaire"
  | "Foncier prioritaire"
  | "Équilibre possible"
  | "Primaire prioritaire"
  | "Optimisation économique";

export type SalaryRisk = "Faible" | "Moyen" | "Fort";

export type IndividualTrainingAdvice = {
  riderId: string;
  riderName: string;
  riderCategory: string;
  riderAge: string;
  dominantPrimary: string;
  dominantPrimaryValue: number;
  currentFoncier: number;
  targetFoncier: number;
  foncierGap: number;
  priority: TrainingPriority;
  idealTraining: TrainingType;
  suggestedTraining: TrainingType;
  salaryRisk: SalaryRisk;
  urgencyScore: number;
  reason: string;
  reassigned: boolean;
};

// Correction : ajout d'un type RiderTrainingAssignment minimal pour compatibilité
export type RiderTrainingAssignment = IndividualTrainingAdvice;

export type TrainingPlan = {
  selectedTypes: TrainingType[];
  rationale: string[];
  individualAdvices: IndividualTrainingAdvice[];
  coverageCounts: Array<{ training: TrainingType; count: number }>;
};