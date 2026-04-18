import type { Rider } from "../../types/rider";
import type { ClubSettings, DivisionLevel } from "../../types/settings";
import type { TeamBuildingStrategy, TeamPlanningHorizon, TeamStrategyAxis } from "../../types/teamStrategy";

type StrategyStat = {
  label: string;
  value: number;
};

export type StrategyCoverageRow = {
  axis: TeamStrategyAxis;
  label: string;
  average: number;
  target: number;
  gap: number;
};

export type SquadSaleCandidate = {
  riderId: string;
  riderName: string;
  category: Rider["category"];
  saleScore: number;
  rationale: string[];
  weeklySalary: number;
  total: number;
  strategyFitScore: number;
  ageYears: number;
  baseFitness: number;
  recentWeeklyPrizeIncome: number;
};

export type SquadRecruitmentProfile = {
  title: string;
  summary: string;
  recommendedCategory: Rider["category"];
  ageRange: string;
  salaryRange: string;
  transferBudget: string;
  targetProfile: string;
  priorityStats: string[];
  strategicReasons: string[];
  avoidProfiles: string[];
};

export type SquadAnalysis = {
  divisionReadiness: Array<{
    category: Rider["category"];
    label: string;
    averageTotal: number;
    targetTotal: number;
    gap: number;
  }>;
  strategyCoverage: StrategyCoverageRow[];
  strategySummary: string;
  budgetSummary: string;
  squadSummary: string;
  recruitmentProfile: SquadRecruitmentProfile;
  sellCandidatesNotice?: string;
  sellCandidates: SquadSaleCandidate[];
  strongestAxes: Array<{ label: string; value: number }>;
  weakestAxes: Array<{ label: string; value: number }>;
};

const DIVISION_TARGET_TOTALS: Record<DivisionLevel, number> = {
  D1: 980,
  D2: 960,
  D3: 940,
  D4: 920,
  D5: 900,
  D6: 880,
  D7: 860,
  D8: 840,
  D9: 820,
};

const CATEGORY_TARGET_OFFSETS: Record<Rider["category"], number> = {
  Pro: 0,
  U25: -20,
  U21: -40,
};

const HORIZON_BONUS: Record<TeamPlanningHorizon, number> = {
  immediat: 0,
  equilibre: -2,
  "long-terme": -5,
};

const AXIS_LABELS: Record<TeamStrategyAxis, string> = {
  "courses-etapes": "Courses à étapes",
  montagne: "Montagne",
  vallon: "Classiques vallonnées",
  sprint: "Plaine / sprint",
  pave: "Classiques pavé",
  clm: "CLM / rouleurs",
  baroudeur: "Baroudeurs",
  formation: "Formation",
  polyvalence: "Polyvalence",
};

const TOLERANCE_MULTIPLIER: Record<ClubSettings["salaryTolerance"], number> = {
  prudente: 0.9,
  normale: 1.1,
  agressive: 1.3,
};

const AXIS_STAT_PRIORITIES: Record<TeamStrategyAxis, Array<{ key: keyof Rider; label: string }>> = {
  "courses-etapes": [
    { key: "stageRace", label: "Course à étapes" },
    { key: "mountain", label: "Montagne" },
    { key: "recovery", label: "Récupération" },
    { key: "endurance", label: "Endurance" },
  ],
  montagne: [
    { key: "mountain", label: "Montagne" },
    { key: "recovery", label: "Récupération" },
    { key: "resistance", label: "Résistance" },
    { key: "endurance", label: "Endurance" },
  ],
  vallon: [
    { key: "hill", label: "Vallon" },
    { key: "resistance", label: "Résistance" },
    { key: "sprint", label: "Sprint" },
    { key: "flat", label: "Plaine" },
  ],
  sprint: [
    { key: "sprint", label: "Sprint" },
    { key: "flat", label: "Plaine" },
    { key: "agility", label: "Agilité" },
    { key: "endurance", label: "Endurance" },
  ],
  pave: [
    { key: "cobble", label: "Pavé" },
    { key: "resistance", label: "Résistance" },
    { key: "flat", label: "Plaine" },
    { key: "sprint", label: "Sprint" },
  ],
  clm: [
    { key: "timeTrial", label: "CLM" },
    { key: "resistance", label: "Résistance" },
    { key: "recovery", label: "Récupération" },
    { key: "endurance", label: "Endurance" },
  ],
  baroudeur: [
    { key: "breakaway", label: "Baroudeur" },
    { key: "hill", label: "Vallon" },
    { key: "flat", label: "Plaine" },
    { key: "endurance", label: "Endurance" },
  ],
  formation: [
    { key: "endurance", label: "Endurance" },
    { key: "resistance", label: "Résistance" },
    { key: "recovery", label: "Récupération" },
    { key: "stageRace", label: "Course à étapes" },
  ],
  polyvalence: [
    { key: "endurance", label: "Endurance" },
    { key: "resistance", label: "Résistance" },
    { key: "recovery", label: "Récupération" },
    { key: "hill", label: "Vallon" },
  ],
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getBaseFitness(rider: Rider): number {
  return rider.endurance + rider.resistance + rider.recovery;
}

function getPrimaryPeak(rider: Rider): number {
  return Math.max(
    rider.flat,
    rider.hill,
    rider.sprint,
    rider.mountain,
    rider.breakaway,
    rider.timeTrial,
    rider.stageRace,
    rider.cobble
  );
}

function hasPromisingDevelopmentProfile(rider: Rider): boolean {
  const baseFitness = getBaseFitness(rider);
  const primaryPeak = getPrimaryPeak(rider);
  const balancedPrimaryFloor = Math.min(
    rider.flat,
    rider.hill,
    rider.sprint,
    rider.mountain,
    rider.timeTrial
  );

  return rider.ageYears <= 22 && baseFitness >= 185 && (primaryPeak >= 60 || balancedPrimaryFloor >= 52);
}

function getDevelopmentContextScore(
  settings: ClubSettings,
  strategy: TeamBuildingStrategy
): number {
  let score = 0;

  if (settings.clubObjective === "formation") {
    score += 2;
  } else if (settings.clubObjective === "mixte") {
    score += 1;
  }

  if (
    strategy.primaryAxis === "formation" ||
    strategy.secondaryAxis === "formation" ||
    strategy.tertiaryAxis === "formation"
  ) {
    score += 2;
  }

  if (strategy.planningHorizon === "long-terme") {
    score += 2;
  } else if (strategy.planningHorizon === "equilibre") {
    score += 1;
  }

  if (settings.facilities.trainingCenter.level >= 4) {
    score += 2;
  } else if (settings.facilities.trainingCenter.level >= 2) {
    score += 1;
  }

  return score;
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getStrategyAxisLabel(axis: TeamStrategyAxis): string {
  return AXIS_LABELS[axis];
}

export function getStrategyAxisScore(rider: Rider, axis: TeamStrategyAxis): number {
  switch (axis) {
    case "courses-etapes":
      return rider.stageRace * 2.6 + rider.mountain * 1.7 + rider.recovery * 1.6 + rider.endurance * 1.2 + rider.timeTrial * 0.9;
    case "montagne":
      return rider.mountain * 2.8 + rider.hill * 1.6 + rider.resistance * 1.3 + rider.endurance * 1.1;
    case "vallon":
      return rider.hill * 2.6 + rider.sprint * 1.2 + rider.flat * 1 + rider.resistance * 1 + rider.agility * 0.8;
    case "sprint":
      return rider.sprint * 2.8 + rider.flat * 1.7 + rider.agility * 1.2 + rider.endurance * 0.8;
    case "pave":
      return rider.cobble * 2.9 + rider.flat * 1.4 + rider.hill * 1.1 + rider.resistance * 1.1 + rider.breakaway * 0.7;
    case "clm":
      return rider.timeTrial * 2.7 + rider.flat * 1.5 + rider.endurance * 1.2 + rider.resistance * 1.2;
    case "baroudeur":
      return rider.breakaway * 2.8 + rider.hill * 1.3 + rider.flat * 1.1 + rider.endurance * 1 + rider.agility * 0.8;
    case "formation":
      return (34 - rider.ageYears) * 8 + rider.total * 0.55 + rider.experience * 0.2;
    case "polyvalence":
    default:
      return rider.total + rider.endurance + rider.resistance + rider.recovery;
  }
}

export function getStrategyFitScore(
  rider: Rider,
  strategy: TeamBuildingStrategy
): number {
  const primary = getStrategyAxisScore(rider, strategy.primaryAxis) * 1;
  const secondary = getStrategyAxisScore(rider, strategy.secondaryAxis) * 0.68;
  const tertiary = getStrategyAxisScore(rider, strategy.tertiaryAxis) * 0.42;
  const horizonAdjustment =
    strategy.planningHorizon === "immediat"
      ? rider.ageYears <= 30 ? 18 : 8
      : strategy.planningHorizon === "long-terme"
        ? rider.ageYears <= 25 ? 18 : 4
        : rider.ageYears <= 28 ? 14 : 8;

  return primary + secondary + tertiary + horizonAdjustment;
}

function getTargetAxisLevel(
  settings: ClubSettings,
  strategy: TeamBuildingStrategy,
  axis: TeamStrategyAxis
): number {
  const baseDivision = DIVISION_TARGET_TOTALS[settings.divisionPro];
  const base = 74 + (baseDivision - 820) / 10 + HORIZON_BONUS[strategy.planningHorizon];

  if (axis === strategy.primaryAxis) {
    return base + 7;
  }

  if (axis === strategy.secondaryAxis) {
    return base + 3;
  }

  if (axis === strategy.tertiaryAxis) {
    return base + 1;
  }

  return base - 2;
}

function getStrategyCoverage(
  riders: Rider[],
  settings: ClubSettings,
  strategy: TeamBuildingStrategy
): StrategyCoverageRow[] {
  return ([
    strategy.primaryAxis,
    strategy.secondaryAxis,
    strategy.tertiaryAxis,
  ] as TeamStrategyAxis[]).map((axis) => {
    const values = riders.map((rider) => getStrategyAxisScore(rider, axis));
    const averageScore = average(values);
    const normalizedAverage = averageScore / (axis === "formation" ? 10.5 : 5.4);
    const target = getTargetAxisLevel(settings, strategy, axis);

    return {
      axis,
      label: getStrategyAxisLabel(axis),
      average: Math.round(normalizedAverage * 10) / 10,
      target,
      gap: Math.round((normalizedAverage - target) * 10) / 10,
    };
  });
}

function getDivisionReadiness(
  riders: Rider[],
  settings: ClubSettings
): SquadAnalysis["divisionReadiness"] {
  return (["Pro", "U25", "U21"] as Rider["category"][]).map((category) => {
    const categoryRiders = riders.filter((rider) => rider.category === category);
    const averageTotal = average(categoryRiders.map((rider) => rider.total));
    const division =
      category === "Pro"
        ? settings.divisionPro
        : category === "U25"
          ? settings.divisionU25
          : settings.divisionU21;
    const targetTotal = DIVISION_TARGET_TOTALS[division] + CATEGORY_TARGET_OFFSETS[category];

    return {
      category,
      label: category,
      averageTotal: Math.round(averageTotal * 10) / 10,
      targetTotal,
      gap: Math.round((averageTotal - targetTotal) * 10) / 10,
    };
  });
}

function getAxisAverages(riders: Rider[]): StrategyStat[] {
  const rows: Array<{ axis: TeamStrategyAxis; label: string; divisor: number }> = [
    { axis: "courses-etapes", label: AXIS_LABELS["courses-etapes"], divisor: 5.4 },
    { axis: "montagne", label: AXIS_LABELS.montagne, divisor: 4.8 },
    { axis: "vallon", label: AXIS_LABELS.vallon, divisor: 4.6 },
    { axis: "sprint", label: AXIS_LABELS.sprint, divisor: 4.7 },
    { axis: "pave", label: AXIS_LABELS.pave, divisor: 4.8 },
    { axis: "clm", label: AXIS_LABELS.clm, divisor: 4.7 },
    { axis: "baroudeur", label: AXIS_LABELS.baroudeur, divisor: 4.5 },
    { axis: "formation", label: AXIS_LABELS.formation, divisor: 10.5 },
    { axis: "polyvalence", label: AXIS_LABELS.polyvalence, divisor: 4.3 },
  ];

  return rows
    .map((row) => ({
      label: row.label,
      value:
        Math.round((average(riders.map((rider) => getStrategyAxisScore(rider, row.axis))) / row.divisor) * 10) / 10,
    }))
    .sort((left, right) => right.value - left.value);
}

function getCategoryGroup(riders: Rider[], category: Rider["category"]): Rider[] {
  const sameCategory = riders.filter((rider) => rider.category === category);
  return sameCategory.length > 0 ? sameCategory : riders;
}

function getAgeRange(
  settings: ClubSettings,
  strategy: TeamBuildingStrategy,
  category: Rider["category"],
  autonomyWeeks: number
): string {
  if (strategy.planningHorizon === "long-terme" || settings.clubObjective === "formation") {
    return category === "Pro" ? "22-26 ans" : category === "U25" ? "19-23 ans" : "18-20 ans";
  }

  if (strategy.planningHorizon === "immediat" || settings.clubObjective === "performance") {
    return category === "Pro" ? "28-32 ans" : category === "U25" ? "23-25 ans" : "20-21 ans";
  }

  return autonomyWeeks >= 14
    ? category === "Pro"
      ? "25-29 ans"
      : category === "U25"
        ? "21-24 ans"
        : "19-20 ans"
    : category === "Pro"
      ? "27-30 ans"
      : category === "U25"
        ? "22-25 ans"
        : "20-21 ans";
}

function getTargetProfileLabel(primaryAxis: TeamStrategyAxis, secondaryAxis: TeamStrategyAxis): string {
  if (primaryAxis === "formation") {
    return `jeune base athlétique à spécialiser vers ${getStrategyAxisLabel(secondaryAxis).toLowerCase()}`;
  }

  if (secondaryAxis === "formation") {
    return `${getStrategyAxisLabel(primaryAxis).toLowerCase()} avec marge de progression`;
  }

  return `${getStrategyAxisLabel(primaryAxis).toLowerCase()} capable d'apporter aussi en ${getStrategyAxisLabel(secondaryAxis).toLowerCase()}`;
}

function buildRecruitmentProfile(
  riders: Rider[],
  settings: ClubSettings,
  strategy: TeamBuildingStrategy,
  currentBalance: number,
  weeklyFixedCosts: number,
  strategyCoverage: StrategyCoverageRow[],
  divisionReadiness: SquadAnalysis["divisionReadiness"]
): SquadRecruitmentProfile {
  const autonomyWeeks = weeklyFixedCosts > 0 ? currentBalance / weeklyFixedCosts : 0;
  const biggestNeed = [...divisionReadiness].sort((left, right) => left.gap - right.gap)[0];
  const recommendedCategory = biggestNeed?.category ?? "Pro";
  const categoryRiders = getCategoryGroup(riders, recommendedCategory);
  const averageCategorySalary = average(categoryRiders.map((rider) => rider.salaryWeekly));
  const salaryCap = Math.max(
    averageCategorySalary * TOLERANCE_MULTIPLIER[settings.salaryTolerance],
    averageCategorySalary + 2500
  );
  const budgetRatio = autonomyWeeks >= 18 ? 0.22 : autonomyWeeks >= 10 ? 0.14 : 0.08;
  const transferBudgetCap = Math.max(50000, currentBalance * budgetRatio);
  const orderedAxes = [strategy.primaryAxis, strategy.secondaryAxis, strategy.tertiaryAxis];
  const axesByNeed = [...strategyCoverage].sort((left, right) => left.gap - right.gap);
  const recruitmentAxes = axesByNeed.length > 0
    ? axesByNeed.map((row) => row.axis)
    : orderedAxes;
  const selectedAxes = recruitmentAxes.slice(0, 2);
  const desiredStats = selectedAxes.flatMap((axis) => AXIS_STAT_PRIORITIES[axis]).slice(0, 6);
  const uniqueStatLabels = Array.from(
    new Map(desiredStats.map((stat) => [stat.label, stat])).values()
  );
  const priorityStats = uniqueStatLabels.slice(0, 5).map((stat) => {
    const categoryAverage = average(categoryRiders.map((rider) => Number(rider[stat.key] ?? 0)));
    const targetValue = Math.max(60, Math.round(categoryAverage + 6));
    return `${stat.label} cible ${targetValue}+`;
  });

  const strategicReasons = [
    `Catégorie la plus en retard aujourd'hui: ${biggestNeed?.label ?? recommendedCategory}.`,
    `Axe prioritaire le moins couvert: ${getStrategyAxisLabel(selectedAxes[0] ?? strategy.primaryAxis)}.`,
    `Second levier de recrutement: ${getStrategyAxisLabel(selectedAxes[1] ?? strategy.secondaryAxis)}.`,
  ];

  const avoidProfiles = [
    "Éviter les salaires qui cassent la masse salariale sans gain net immédiat.",
    "Éviter les profils mono-caractéristique avec foncier trop faible.",
    strategy.planningHorizon === "long-terme" || settings.clubObjective === "formation"
      ? "Éviter les recrues trop âgées sans valeur de transmission sportive sur plusieurs semaines."
      : "Éviter les paris trop jeunes si l'équipe a besoin d'impact immédiat.",
  ];

  return {
    title: `Cibler un ${getTargetProfileLabel(selectedAxes[0] ?? strategy.primaryAxis, selectedAxes[1] ?? strategy.secondaryAxis)}`,
    summary:
      currentBalance <= weeklyFixedCosts * 8
        ? "Le recrutement doit être ciblé, utile tout de suite, et rester compatible avec une trésorerie courte."
        : strategy.planningHorizon === "long-terme"
          ? "Le projet permet de viser un profil encore perfectible, mais avec une vraie base athlétique pour nourrir les axes prioritaires."
          : "Le recrutement peut servir à accélérer le projet d'équipe sans sortir de la structure salariale actuelle.",
    recommendedCategory,
    ageRange: getAgeRange(settings, strategy, recommendedCategory, autonomyWeeks),
    salaryRange: `jusqu'à ${Math.round(salaryCap).toLocaleString("fr-FR")} € / semaine`,
    transferBudget: `enveloppe cible jusqu'à ${Math.round(transferBudgetCap).toLocaleString("fr-FR")} €`,
    targetProfile: getTargetProfileLabel(selectedAxes[0] ?? strategy.primaryAxis, selectedAxes[1] ?? strategy.secondaryAxis),
    priorityStats,
    strategicReasons,
    avoidProfiles,
  };
}

function buildSellCandidates(
  riders: Rider[],
  settings: ClubSettings,
  strategy: TeamBuildingStrategy,
  recentPrizeIncomeByRider: Record<string, number>
): SquadSaleCandidate[] {
  const salaryAverage = average(riders.map((rider) => rider.salaryWeekly));
  const strategyAverage = average(riders.map((rider) => getStrategyFitScore(rider, strategy)));
  const developmentContextScore = getDevelopmentContextScore(settings, strategy);

  return riders
    .map((rider) => {
      const strategyFitScore = getStrategyFitScore(rider, strategy);
      const baseFitness = getBaseFitness(rider);
      const promisingDevelopmentProfile = hasPromisingDevelopmentProfile(rider);
      const recentWeeklyPrizeIncome =
        recentPrizeIncomeByRider[normalizeComparable(rider.name)] ?? 0;
      const categoryDivision =
        rider.category === "Pro"
          ? settings.divisionPro
          : rider.category === "U25"
            ? settings.divisionU25
            : settings.divisionU21;
      const divisionTarget = DIVISION_TARGET_TOTALS[categoryDivision] + CATEGORY_TARGET_OFFSETS[rider.category];
      const rationale: string[] = [];
      let saleScore = 0;

      if (rider.ageYears >= 32) {
        rationale.push("Âge de déclin atteint, la revente devient prioritaire si le rendement n'est pas dominant.");
        saleScore += 26;
      } else if (rider.ageYears >= 30 && rider.salaryWeekly >= salaryAverage) {
        rationale.push("Fin de cycle proche avec un coût déjà installé au-dessus de la moyenne.");
        saleScore += 12;
      }

      if (rider.salaryWeekly > salaryAverage * 1.45) {
        rationale.push("Salaire très supérieur à la moyenne de l'effectif.");
        saleScore += 28;
      }

      if (rider.total < divisionTarget - 20) {
        rationale.push("Niveau global sous le standard attendu pour la division visée.");
        saleScore += 20;
      }

      if (strategyFitScore < strategyAverage * 0.78) {
        rationale.push("Profil peu aligné avec les 3 axes stratégiques choisis.");
        saleScore += 18;
      }

      if (baseFitness < 180 && rider.ageYears >= 27) {
        rationale.push("Foncier trop court pour son âge, donc faible marge de correction à court terme.");
        saleScore += 10;
      }

      if (rider.form < 85) {
        rationale.push("Forme immédiate insuffisante pour justifier son coût actuel.");
        saleScore += 6;
      }

      if (rider.ageYears >= 30) {
        if (recentWeeklyPrizeIncome >= rider.salaryWeekly * 1.05) {
          rationale.push("Malgré l'âge, ses primes récentes couvrent son salaire hebdomadaire.");
          saleScore -= 22;
        } else if (recentWeeklyPrizeIncome >= rider.salaryWeekly * 0.6) {
          rationale.push("Le coureur reste partiellement rentable sur la dernière semaine.");
          saleScore -= 10;
        } else if (recentWeeklyPrizeIncome <= rider.salaryWeekly * 0.25) {
          rationale.push("Ses gains récents compensent trop peu son salaire hebdomadaire.");
          saleScore += 12;
        }
      }

      if (promisingDevelopmentProfile) {
        saleScore -= developmentContextScore >= 3 ? 26 : 14;
      } else if (rider.ageYears <= 24 && baseFitness >= 170 && rider.salaryWeekly <= salaryAverage * 1.1) {
        saleScore -= developmentContextScore >= 3 ? 16 : 8;
      }

      if (rider.category !== "Pro" && rider.ageYears <= 25 && developmentContextScore >= 4) {
        saleScore -= 8;
      }

      if (rider.ageYears <= 21 && rider.salaryWeekly < salaryAverage * 0.85) {
        saleScore -= 6;
      }

      if (saleScore < 0) {
        saleScore = 0;
      }

      if (saleScore < 24 && promisingDevelopmentProfile) {
        rationale.push("Jeune profil à potentiel: le foncier et l'âge invitent plutôt à développer qu'à vendre.");
      } else if (saleScore < 24 && rider.ageYears <= 24 && baseFitness >= 170) {
        rationale.push("Âge encore favorable au développement, même sans spécialisation franche pour l'instant.");
      }

      return {
        riderId: rider.id,
        riderName: rider.name,
        category: rider.category,
        saleScore,
        rationale,
        weeklySalary: rider.salaryWeekly,
        total: rider.total,
        strategyFitScore: Math.round(strategyFitScore),
        ageYears: rider.ageYears,
        baseFitness,
        recentWeeklyPrizeIncome,
      };
    })
    .filter((candidate) => candidate.saleScore >= 24 && candidate.rationale.length > 0)
    .sort((left, right) => right.saleScore - left.saleScore || right.weeklySalary - left.weeklySalary)
    .slice(0, 6);
}

export function analyzeSquad(
  riders: Rider[],
  settings: ClubSettings,
  strategy: TeamBuildingStrategy,
  currentBalance: number,
  weeklyFixedCosts: number,
  recentPrizeIncomeByRider: Record<string, number>,
  availableHistoryWeeks: number
): SquadAnalysis {
  const strategyCoverage = getStrategyCoverage(riders, settings, strategy);
  const strongestAxes = getAxisAverages(riders).slice(0, 3);
  const weakestAxes = getAxisAverages(riders).slice(-3).reverse();
  const divisionReadiness = getDivisionReadiness(riders, settings);
  const recruitmentProfile = buildRecruitmentProfile(
    riders,
    settings,
    strategy,
    currentBalance,
    weeklyFixedCosts,
    strategyCoverage,
    divisionReadiness
  );
  const sellCandidates =
    availableHistoryWeeks >= 3
      ? buildSellCandidates(
          riders,
          settings,
          strategy,
          recentPrizeIncomeByRider
        )
      : [];
  const autonomyWeeks = weeklyFixedCosts > 0 ? currentBalance / weeklyFixedCosts : 0;
  const primaryGap = strategyCoverage[0]?.gap ?? 0;
  const weakestLabel = weakestAxes[0]?.label ?? "aucun axe";
  const strongestLabel = strongestAxes[0]?.label ?? "aucun axe";
  const bestReadiness = divisionReadiness.sort((left, right) => right.gap - left.gap)[0];
  const worstReadiness = divisionReadiness.sort((left, right) => left.gap - right.gap)[0];

  return {
    divisionReadiness,
    strategyCoverage,
    strategySummary:
      primaryGap >= 0
        ? `L'effectif commence à ressembler à une équipe ${strategyCoverage[0]?.label.toLowerCase()}. L'axe fort actuel est ${strongestLabel.toLowerCase()}, mais le plus faible reste ${weakestLabel.toLowerCase()}.`
        : `L'axe prioritaire ${strategyCoverage[0]?.label.toLowerCase()} n'est pas encore au niveau visé. L'effectif s'appuie davantage aujourd'hui sur ${strongestLabel.toLowerCase()}.`,
    budgetSummary:
      autonomyWeeks >= 18
        ? `La trésorerie couvre environ ${Math.round(autonomyWeeks)} semaines de charges fixes. Tu peux recruter, mais sans casser la logique salariale.`
        : autonomyWeeks >= 10
          ? `La marge reste correcte avec environ ${Math.round(autonomyWeeks)} semaines de sécurité. Il faut cibler des recrutements justifiés.`
          : `La trésorerie ne couvre qu'environ ${Math.max(0, Math.round(autonomyWeeks))} semaines de charges fixes. Les ventes et les salaires doivent rester sous contrôle.`,
    squadSummary:
      `${bestReadiness.label} est la catégorie la plus prête pour sa division (${bestReadiness.gap >= 0 ? "+" : ""}${bestReadiness.gap}). ${worstReadiness.label} est la plus en retard (${worstReadiness.gap >= 0 ? "+" : ""}${worstReadiness.gap}).`,
    recruitmentProfile,
    sellCandidatesNotice:
      availableHistoryWeeks < 3
        ? "Aucune suggestion de vente avant la 3e semaine de jeu: il faut d'abord accumuler un minimum d'historique sur les performances et la rentabilité."
        : undefined,
    sellCandidates,
    strongestAxes,
    weakestAxes,
  };
}