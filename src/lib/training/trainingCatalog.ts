import type { Rider } from "../../types/rider";
import type { TrainingType } from "../../types/training";

export type RiderStatKey =
  | "endurance"
  | "recovery"
  | "flat"
  | "sprint"
  | "resistance"
  | "agility"
  | "hill"
  | "mountain"
  | "downhill"
  | "stageRace"
  | "timeTrial"
  | "breakaway"
  | "cobble";

export type TrainingDefinition = {
  type: TrainingType;
  primary: RiderStatKey;
  secondary1: RiderStatKey;
  secondary2: RiderStatKey;
  primaryLabel: string;
  secondaryLabels: [string, string];
};

export const TRAINING_DEFINITIONS: TrainingDefinition[] = [
  {
    type: "Endurance",
    primary: "endurance",
    secondary1: "recovery",
    secondary2: "flat",
    primaryLabel: "Endurance",
    secondaryLabels: ["Récupération", "Plaine"],
  },
  {
    type: "Plaine",
    primary: "flat",
    secondary1: "sprint",
    secondary2: "endurance",
    primaryLabel: "Plaine",
    secondaryLabels: ["Sprint", "Endurance"],
  },
  {
    type: "Sprint",
    primary: "sprint",
    secondary1: "resistance",
    secondary2: "agility",
    primaryLabel: "Sprint",
    secondaryLabels: ["Résistance", "Agilité"],
  },
  {
    type: "Vallon",
    primary: "hill",
    secondary1: "resistance",
    secondary2: "sprint",
    primaryLabel: "Vallon",
    secondaryLabels: ["Résistance", "Sprint"],
  },
  {
    type: "Montagne",
    primary: "mountain",
    secondary1: "recovery",
    secondary2: "downhill",
    primaryLabel: "Montagne",
    secondaryLabels: ["Récupération", "Descente"],
  },
  {
    type: "Course à étapes",
    primary: "stageRace",
    secondary1: "mountain",
    secondary2: "recovery",
    primaryLabel: "Course à étapes",
    secondaryLabels: ["Montagne", "Récupération"],
  },
  {
    type: "CLM",
    primary: "timeTrial",
    secondary1: "resistance",
    secondary2: "recovery",
    primaryLabel: "CLM",
    secondaryLabels: ["Résistance", "Récupération"],
  },
  {
    type: "Rouleur",
    primary: "endurance",
    secondary1: "timeTrial",
    secondary2: "resistance",
    primaryLabel: "Endurance",
    secondaryLabels: ["CLM", "Résistance"],
  },
  {
    type: "Baroudeur",
    primary: "breakaway",
    secondary1: "hill",
    secondary2: "downhill",
    primaryLabel: "Baroudeur",
    secondaryLabels: ["Vallon", "Descente"],
  },
  {
    type: "Pavé",
    primary: "cobble",
    secondary1: "resistance",
    secondary2: "agility",
    primaryLabel: "Pavé",
    secondaryLabels: ["Résistance", "Agilité"],
  },
  {
    type: "Flandrien",
    primary: "flat",
    secondary1: "cobble",
    secondary2: "agility",
    primaryLabel: "Plaine",
    secondaryLabels: ["Pavé", "Agilité"],
  },
];

export function getTrainingDefinition(type: TrainingType): TrainingDefinition {
  const found = TRAINING_DEFINITIONS.find((item) => item.type === type);

  if (!found) {
    throw new Error(`Entraînement introuvable : ${type}`);
  }

  return found;
}

export function getRiderStatValue(rider: Rider, stat: RiderStatKey): number {
  return rider[stat];
}