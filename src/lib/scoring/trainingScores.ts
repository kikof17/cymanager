import type { Rider } from "../../types/rider";
import type {
  IndividualTrainingAdvice,
  SalaryRisk,
  TrainingPlan,
  TrainingPriority,
  TrainingType,
} from "../../types/training";
import type { ClubSettings, DivisionLevel } from "../../types/settings";

function getTargetDivisionForCategory(
  settings: ClubSettings,
  category: Rider["category"]
): DivisionLevel {
  if (category === "U25") {
    return settings.targetDivisionU25;
  }

  if (category === "U21") {
    return settings.targetDivisionU21;
  }

  return settings.targetDivisionPro;
}

type PrimaryDescriptor = {
  label: string;
  value: number;
};

function getDominantPrimary(rider: Rider): PrimaryDescriptor {
  const stats: PrimaryDescriptor[] = [
    { label: "Plaine", value: rider.flat },
    { label: "Vallon", value: rider.hill },
    { label: "Sprint", value: rider.sprint },
    { label: "Montagne", value: rider.mountain },
    { label: "Pavé", value: rider.cobble },
    { label: "CLM", value: rider.timeTrial },
    { label: "Baroudeur", value: rider.breakaway },
    { label: "Course à étapes", value: rider.stageRace },
  ];

  return stats.sort((a, b) => b.value - a.value)[0];
}

function getCurrentFoncier(rider: Rider): number {
  return rider.endurance + rider.resistance + rider.recovery;
}

function getBaseTargetFoncier(primaryValue: number): number {
  if (primaryValue <= 70) return 200;
  if (primaryValue <= 80) return 240;
  if (primaryValue <= 85) return 280;
  return 300;
}

function divisionAdjustment(targetDivision: DivisionLevel): number {
  switch (targetDivision) {
    case "D1":
    case "D2":
      return 25;
    case "D3":
    case "D4":
      return 15;
    case "D5":
      return 5;
    case "D6":
      return 0;
    case "D7":
    case "D8":
    case "D9":
      return -5;
    default:
      return 0;
  }
}

function adjustedTargetFoncier(
  rider: Rider,
  primaryValue: number,
  settings: ClubSettings
): number {
  const base = getBaseTargetFoncier(primaryValue);
  const adjusted = base + divisionAdjustment(getTargetDivisionForCategory(settings, rider.category));
  return Math.max(180, adjusted);
}

function getPriority(
  rider: Rider,
  foncierGap: number,
  settings: ClubSettings
): TrainingPriority {
  if (rider.category === "U21" && foncierGap > 20) {
    return "Foncier très prioritaire";
  }

  if (foncierGap > 30) {
    return "Foncier très prioritaire";
  }

  if (foncierGap > 10) {
    return "Foncier prioritaire";
  }

  if (foncierGap > 0) {
    return "Équilibre possible";
  }

  if (settings.salaryTolerance === "prudente" && rider.salaryWeekly >= 15000) {
    return "Optimisation économique";
  }

  if (rider.category === "U21" && foncierGap <= 0) {
    return "Équilibre possible";
  }

  return "Primaire prioritaire";
}

function getSalaryRisk(rider: Rider, primaryValue: number): SalaryRisk {
  if (rider.salaryWeekly >= 18000 || primaryValue >= 82) {
    return "Fort";
  }

  if (rider.salaryWeekly >= 9000 || primaryValue >= 74) {
    return "Moyen";
  }

  return "Faible";
}

function getFoncierTrainingForRider(rider: Rider, primaryLabel: string): TrainingType {
  if (primaryLabel === "Montagne" || primaryLabel === "Course à étapes") {
    return rider.stageRace >= rider.mountain ? "Course à étapes" : "Montagne";
  }

  if (primaryLabel === "CLM") {
    return "Rouleur";
  }

  if (primaryLabel === "Pavé") {
    return "Rouleur";
  }

  return "Endurance";
}

function getPrimaryTraining(primaryLabel: string): TrainingType {
  switch (primaryLabel) {
    case "Plaine":
      return "Plaine";
    case "Vallon":
      return "Vallon";
    case "Sprint":
      return "Sprint";
    case "Montagne":
      return "Montagne";
    case "Pavé":
      return "Pavé";
    case "CLM":
      return "CLM";
    case "Baroudeur":
      return "Baroudeur";
    case "Course à étapes":
      return "Course à étapes";
    default:
      return "Endurance";
  }
}

function getIdealTraining(
  rider: Rider,
  primaryLabel: string,
  priority: TrainingPriority,
  salaryRisk: SalaryRisk
): TrainingType {
  if (
    priority === "Foncier très prioritaire" ||
    priority === "Foncier prioritaire"
  ) {
    return getFoncierTrainingForRider(rider, primaryLabel);
  }

  if (priority === "Optimisation économique") {
    if (primaryLabel === "Montagne" || primaryLabel === "Course à étapes") {
      return "Course à étapes";
    }

    if (primaryLabel === "CLM") {
      return "Rouleur";
    }

    return "Endurance";
  }

  if (priority === "Équilibre possible" && salaryRisk === "Fort") {
    return getFoncierTrainingForRider(rider, primaryLabel);
  }

  return getPrimaryTraining(primaryLabel);
}

function buildReason(
  rider: Rider,
  priority: TrainingPriority,
  currentFoncier: number,
  targetFoncier: number,
  dominantPrimary: PrimaryDescriptor,
  salaryRisk: SalaryRisk
): string {
  switch (priority) {
    case "Foncier très prioritaire":
      return `${rider.category} avec foncier ${currentFoncier} trop bas pour soutenir une primaire ${dominantPrimary.label} à ${dominantPrimary.value}. Cible recommandée : ${targetFoncier}.`;
    case "Foncier prioritaire":
      return `Le foncier ${currentFoncier} reste en retard sur le seuil conseillé ${targetFoncier}. Il vaut mieux consolider la base avant de pousser davantage la primaire.`;
    case "Équilibre possible":
      return `Le foncier ${currentFoncier} est proche de la cible ${targetFoncier}. Tu peux encore renforcer la base ou commencer à pousser la primaire selon ta stratégie.`;
    case "Optimisation économique":
      return `La primaire monte le salaire trop vite ici. Risque salarial ${salaryRisk.toLowerCase()} à fort. Mieux vaut optimiser le profil sans gonfler la masse salariale.`;
    case "Primaire prioritaire":
    default:
      return `Le foncier ${currentFoncier} est suffisant pour la cible ${targetFoncier}. La primaire ${dominantPrimary.label} peut être priorisée.`;
  }
}

function getUrgencyScore(priority: TrainingPriority, foncierGap: number): number {
  switch (priority) {
    case "Foncier très prioritaire":
      return 100 + foncierGap;
    case "Foncier prioritaire":
      return 80 + foncierGap;
    case "Optimisation économique":
      return 65;
    case "Primaire prioritaire":
      return 55;
    case "Équilibre possible":
    default:
      return 50;
  }
}

function buildIndividualAdvice(
  rider: Rider,
  settings: ClubSettings
): IndividualTrainingAdvice {
  const dominantPrimary = getDominantPrimary(rider);
  const currentFoncier = getCurrentFoncier(rider);
  const targetFoncier = adjustedTargetFoncier(rider, dominantPrimary.value, settings);
  const foncierGap = targetFoncier - currentFoncier;
  const priority = getPriority(rider, foncierGap, settings);
  const salaryRisk = getSalaryRisk(rider, dominantPrimary.value);
  const idealTraining = getIdealTraining(
    rider,
    dominantPrimary.label,
    priority,
    salaryRisk
  );
  const reason = buildReason(
    rider,
    priority,
    currentFoncier,
    targetFoncier,
    dominantPrimary,
    salaryRisk
  );
  const urgencyScore = getUrgencyScore(priority, foncierGap);

  return {
    riderId: rider.id,
    riderName: rider.name,
    riderCategory: rider.category,
    riderAge: `${rider.ageYears}a ${rider.ageWeeks}s`,
    dominantPrimary: dominantPrimary.label,
    dominantPrimaryValue: dominantPrimary.value,
    currentFoncier,
    targetFoncier,
    foncierGap,
    priority,
    idealTraining,
    suggestedTraining: idealTraining,
    salaryRisk,
    urgencyScore,
    reason,
    reassigned: false,
  };
}

function buildWeeklySummary(individualAdvices: IndividualTrainingAdvice[]): {
  selectedTypes: TrainingType[];
} {
  const counts = new Map<TrainingType, number>();

  individualAdvices.forEach((advice) => {
    counts.set(advice.idealTraining, (counts.get(advice.idealTraining) ?? 0) + 1);
  });

  const selectedTypes = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([training]) => training);

  return { selectedTypes };
}

function chooseFallbackTraining(
  advice: IndividualTrainingAdvice,
  selectedTypes: TrainingType[]
): TrainingType {
  if (selectedTypes.includes(advice.idealTraining)) {
    return advice.idealTraining;
  }

  const foncierFriendly: TrainingType[] = [
    "Endurance",
    "Rouleur",
    "Course à étapes",
    "Montagne",
  ];

  if (
    advice.priority === "Foncier très prioritaire" ||
    advice.priority === "Foncier prioritaire" ||
    advice.priority === "Optimisation économique"
  ) {
    const fallback = selectedTypes.find((item) => foncierFriendly.includes(item));
    if (fallback) {
      return fallback;
    }
  }

  const primaryMap: Record<string, TrainingType[]> = {
    Plaine: ["Plaine", "Flandrien", "Endurance", "Rouleur"],
    Vallon: ["Vallon", "Baroudeur", "Endurance", "Montagne"],
    Sprint: ["Sprint", "Plaine", "Vallon", "Endurance"],
    Montagne: ["Montagne", "Course à étapes", "Endurance", "Rouleur"],
    Pavé: ["Pavé", "Flandrien", "Rouleur", "Endurance"],
    CLM: ["CLM", "Rouleur", "Endurance", "Plaine"],
    Baroudeur: ["Baroudeur", "Vallon", "Endurance", "Montagne"],
    "Course à étapes": ["Course à étapes", "Montagne", "Rouleur", "Endurance"],
  };

  const preferredOrder = primaryMap[advice.dominantPrimary] ?? ["Endurance"];

  for (const preferred of preferredOrder) {
    if (selectedTypes.includes(preferred)) {
      return preferred;
    }
  }

  return selectedTypes[0];
}

function finalizeAdvices(
  individualAdvices: IndividualTrainingAdvice[],
  selectedTypes: TrainingType[]
): IndividualTrainingAdvice[] {
  return individualAdvices.map((advice) => {
    const finalTraining = chooseFallbackTraining(advice, selectedTypes);

    return {
      ...advice,
      suggestedTraining: finalTraining,
      reassigned: finalTraining !== advice.idealTraining,
    };
  });
}

function buildCoverageCounts(
  advices: IndividualTrainingAdvice[]
): Array<{ training: TrainingType; count: number }> {
  const counts = new Map<TrainingType, number>();

  advices.forEach((advice) => {
    counts.set(
      advice.suggestedTraining,
      (counts.get(advice.suggestedTraining) ?? 0) + 1
    );
  });

  return Array.from(counts.entries())
    .map(([training, count]) => ({ training, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildTrainingPlan(
  riders: Rider[],
  settings: ClubSettings
): TrainingPlan {
  if (riders.length === 0) {
    return {
      selectedTypes: [],
      rationale: ["Aucun coureur disponible pour calculer un plan."],
      individualAdvices: [],
      coverageCounts: [],
    };
  }

  const rawAdvices = riders
    .map((rider) => buildIndividualAdvice(rider, settings))
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  const weeklySummary = buildWeeklySummary(rawAdvices);
  const finalAdvices = finalizeAdvices(rawAdvices, weeklySummary.selectedTypes);
  const coverageCounts = buildCoverageCounts(finalAdvices);

  const reassignedCount = finalAdvices.filter((item) => item.reassigned).length;

  const rationale = [
    "Le raisonnement part d'abord de chaque coureur individuellement, puis seulement ensuite de la synthèse hebdo.",
    "Le foncier est calculé via endurance + résistance + récupération.",
    `Les cibles utilisées sont Pro ${settings.targetDivisionPro}, U25 ${settings.targetDivisionU25} et U21 ${settings.targetDivisionU21}.`,
    `${reassignedCount} coureur(s) ont été rabattus sur un des 3 entraînements retenus.`,
  ];

  return {
    selectedTypes: weeklySummary.selectedTypes,
    rationale,
    individualAdvices: finalAdvices,
    coverageCounts,
  };
}