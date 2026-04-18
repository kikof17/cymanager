import { buildRiderProfileSummary } from "../scoring/riderProfile";
import { getStrategyAxisLabel, getStrategyFitScore } from "../roster/rosterAnalysis";
import type { Rider } from "../../types/rider";
import type { ClubSettings, DivisionLevel } from "../../types/settings";
import type { TeamBuildingStrategy } from "../../types/teamStrategy";

type RiderStatKey =
  | "endurance"
  | "resistance"
  | "recovery"
  | "flat"
  | "hill"
  | "sprint"
  | "cobble"
  | "agility"
  | "breakaway"
  | "mountain"
  | "timeTrial"
  | "stageRace";

export type TransferRecommendation =
  | "Priorité haute"
  | "Option solide"
  | "Opportunité conditionnelle"
  | "À éviter";

export type TransferAnalysis = {
  rider: Rider;
  score: number;
  recommendation: TransferRecommendation;
  canRecruit: boolean;
  blockingReasons: string[];
  summary: string;
  profileLabel: string;
  budgetFit: string;
  wageFit: string;
  divisionFit: string;
  squadFit: string;
  objectiveFit: string;
  strategyFit: string;
  maxBid: number;
  maxBidFit: string;
  strengths: string[];
  concerns: string[];
  needMatches: string[];
  comparisons: Array<{ label: string; value: string }>;
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

const OBJECTIVE_AGE_TARGET: Record<ClubSettings["clubObjective"], number> = {
  formation: 24,
  performance: 30,
  mixte: 27,
};

const TOLERANCE_MULTIPLIER: Record<ClubSettings["salaryTolerance"], number> = {
  prudente: 0.95,
  normale: 1.15,
  agressive: 1.35,
};

const STAT_LABELS: Array<{ key: RiderStatKey; label: string }> = [
  { key: "mountain", label: "Montagne" },
  { key: "hill", label: "Vallon" },
  { key: "flat", label: "Plaine" },
  { key: "sprint", label: "Sprint" },
  { key: "cobble", label: "Pavé" },
  { key: "timeTrial", label: "CLM" },
  { key: "stageRace", label: "Course à étapes" },
  { key: "breakaway", label: "Baroudeur" },
  { key: "endurance", label: "Endurance" },
  { key: "resistance", label: "Résistance" },
  { key: "recovery", label: "Récupération" },
  { key: "agility", label: "Agilité" },
];

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function getDivisionForCategory(
  settings: ClubSettings,
  category: Rider["category"]
): DivisionLevel {
  if (category === "U25") {
    return settings.divisionU25;
  }

  if (category === "U21") {
    return settings.divisionU21;
  }

  return settings.divisionPro;
}

function getCategoryGroup(riders: Rider[], category: Rider["category"]): Rider[] {
  const sameCategory = riders.filter((rider) => rider.category === category);
  return sameCategory.length > 0 ? sameCategory : riders;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getWeakTeamStats(riders: Rider[]): Array<{ key: RiderStatKey; label: string; average: number }> {
  return STAT_LABELS.map(({ key, label }) => ({
    key,
    label,
    average: average(riders.map((rider) => rider[key])),
  })).sort((left, right) => left.average - right.average);
}

function getNeedMatches(rider: Rider, weakStats: Array<{ key: RiderStatKey; label: string; average: number }>): string[] {
  return weakStats
    .slice(0, 4)
    .filter((stat) => rider[stat.key] >= stat.average + 8)
    .map((stat) => `${stat.label} ${rider[stat.key]}`);
}

function getDivisionScore(rider: Rider, settings: ClubSettings): { score: number; text: string } {
  const division = getDivisionForCategory(settings, rider.category);
  const target = DIVISION_TARGET_TOTALS[division] + CATEGORY_TARGET_OFFSETS[rider.category];
  const gap = rider.total - target;

  if (gap >= 40) {
    return { score: 26, text: `Très au-dessus du niveau attendu pour ${division}.` };
  }

  if (gap >= 15) {
    return { score: 21, text: `Au-dessus du niveau attendu pour ${division}.` };
  }

  if (gap >= 0) {
    return { score: 16, text: `Dans le bon niveau pour ${division}.` };
  }

  if (gap >= -20) {
    return { score: 9, text: `Profil jouable, mais pas dominant pour ${division}.` };
  }

  return { score: 3, text: `Risque d'être court pour ${division}.` };
}

function getBudgetScore(
  transferAmount: number,
  currentBalance: number
): { score: number; text: string; concerns: string[] } {
  const concerns: string[] = [];

  if (transferAmount <= 0 || currentBalance <= 0) {
    return {
      score: 10,
      text: "Montant de transfert non saisi : analyse budget neutre.",
      concerns,
    };
  }

  const ratio = transferAmount / currentBalance;

  if (transferAmount > currentBalance) {
    concerns.push("Le montant dépasse le solde disponible.");
    return { score: 0, text: "Transfert hors budget immédiat.", concerns };
  }

  if (ratio <= 0.12) {
    return { score: 18, text: "Impact budget faible.", concerns };
  }

  if (ratio <= 0.25) {
    return { score: 13, text: "Impact budget maîtrisable.", concerns };
  }

  if (ratio <= 0.4) {
    concerns.push("Le transfert mobilise une part importante de la trésorerie.");
    return { score: 7, text: "Impact budget élevé.", concerns };
  }

  concerns.push("Le transfert consomme trop de trésorerie pour rester confortable.");
  return { score: 2, text: "Impact budget très lourd.", concerns };
}

function getWageScore(
  rider: Rider,
  riders: Rider[],
  settings: ClubSettings
): { score: number; text: string; concerns: string[]; averageSalary: number } {
  const concerns: string[] = [];
  const group = getCategoryGroup(riders, rider.category);
  const averageSalary = average(group.map((current) => current.salaryWeekly));
  const toleranceThreshold = averageSalary * TOLERANCE_MULTIPLIER[settings.salaryTolerance];

  if (averageSalary === 0) {
    return {
      score: 12,
      text: "Pas de référence salariale existante dans cette catégorie.",
      concerns,
      averageSalary,
    };
  }

  if (rider.salaryWeekly <= toleranceThreshold * 0.8) {
    return { score: 18, text: "Salaire très bien calibré pour ton effectif.", concerns, averageSalary };
  }

  if (rider.salaryWeekly <= toleranceThreshold) {
    return { score: 14, text: "Salaire cohérent avec ta politique actuelle.", concerns, averageSalary };
  }

  if (rider.salaryWeekly <= toleranceThreshold * 1.25) {
    concerns.push("Le salaire est au-dessus de ta tolérance actuelle.");
    return { score: 7, text: "Salaire un peu lourd pour le cadre actuel.", concerns, averageSalary };
  }

  concerns.push("Le salaire risque de déséquilibrer la masse salariale.");
  return { score: 2, text: "Salaire trop lourd par rapport à l'effectif actuel.", concerns, averageSalary };
}

function getSquadScore(rider: Rider, riders: Rider[]): { score: number; text: string; betterThanCount: number; weakMatches: string[] } {
  const group = getCategoryGroup(riders, rider.category);
  const weakMatches = getNeedMatches(rider, getWeakTeamStats(group));
  const betterThanCount = group.filter((current) => rider.total > current.total).length;
  const ratio = group.length > 0 ? betterThanCount / group.length : 0;
  const weakMatchBonus = Math.min(weakMatches.length * 4, 12);

  if (ratio >= 0.75) {
    return {
      score: 16 + weakMatchBonus,
      text: "Le coureur améliorerait nettement la hiérarchie de sa catégorie.",
      betterThanCount,
      weakMatches,
    };
  }

  if (ratio >= 0.45) {
    return {
      score: 10 + weakMatchBonus,
      text: "Le coureur renforcerait utilement la rotation actuelle.",
      betterThanCount,
      weakMatches,
    };
  }

  if (weakMatches.length >= 2) {
    return {
      score: 8 + weakMatchBonus,
      text: "Le coureur apporte surtout un profil complémentaire.",
      betterThanCount,
      weakMatches,
    };
  }

  return {
    score: 4,
    text: "Le gain sportif interne semble limité.",
    betterThanCount,
    weakMatches,
  };
}

function getObjectiveScore(rider: Rider, settings: ClubSettings): { score: number; text: string } {
  const objective = settings.clubObjective;
  const ageTarget = OBJECTIVE_AGE_TARGET[objective];

  if (objective === "formation") {
    if (rider.category !== "Pro" && rider.ageYears <= ageTarget) {
      return { score: 18, text: "Très cohérent avec un objectif de formation." };
    }

    if (rider.ageYears <= ageTarget + 2) {
      return { score: 10, text: "Possible, mais moins orienté développement pur." };
    }

    return { score: 3, text: "Profil trop mature pour un projet formation." };
  }

  if (objective === "performance") {
    if (rider.total >= 900 || rider.category === "Pro") {
      return { score: 18, text: "Très cohérent avec un objectif de performance immédiate." };
    }

    return { score: 9, text: "Profil exploitable, mais pas taillé pour un impact immédiat maximal." };
  }

  if (rider.ageYears <= ageTarget + 2 && rider.total >= 840) {
    return { score: 16, text: "Bon compromis entre rendement et développement." };
  }

  return { score: 10, text: "Profil correct dans une logique mixte." };
}

function getAgeConcern(rider: Rider, settings: ClubSettings): string | null {
  if (settings.clubObjective === "formation" && rider.ageYears >= 29) {
    return "Âge peu cohérent avec un objectif formation.";
  }

  if (rider.category === "Pro" && rider.ageYears >= 33) {
    return "Profil expérimenté mais proche du déclin sportif.";
  }

  return null;
}

function roundBid(value: number): number {
  return Math.max(0, Math.floor(value / 1000) * 1000);
}

function getMaxBidRecommendation(
  rider: Rider,
  settings: ClubSettings,
  currentBalance: number,
  score: number,
  averageSalary: number,
  transferAmount: number
): { amount: number; text: string; concerns: string[] } {
  const concerns: string[] = [];
  const toleranceThreshold =
    averageSalary > 0
      ? averageSalary * TOLERANCE_MULTIPLIER[settings.salaryTolerance]
      : rider.salaryWeekly * 1.05;

  const liquidityRatio =
    currentBalance >= 1500000
      ? 0.24
      : currentBalance >= 800000
        ? 0.18
        : currentBalance >= 400000
          ? 0.14
          : 0.1;

  const objectiveBonus =
    settings.clubObjective === "performance"
      ? 0.02
      : settings.clubObjective === "formation" && rider.ageYears <= 24
        ? 0.02
        : 0;

  let valueMultiplier =
    score >= 75 ? 1.3 : score >= 58 ? 1.15 : score >= 42 ? 0.95 : 0.72;

  if (rider.salaryWeekly > toleranceThreshold * 1.15) {
    valueMultiplier -= 0.12;
    concerns.push("Le salaire réduit le plafond d'enchère raisonnable.");
  }

  if (rider.ageYears >= 32) {
    valueMultiplier -= 0.1;
  } else if (settings.clubObjective === "formation" && rider.ageYears <= 24) {
    valueMultiplier += 0.06;
  }

  if (settings.clubObjective === "formation" && rider.ageYears >= 29) {
    valueMultiplier -= 0.15;
  }

  const valueCap = rider.value * Math.max(0.55, valueMultiplier);
  const liquidityCap = currentBalance * Math.max(0.06, liquidityRatio + objectiveBonus);
  const amount = roundBid(Math.min(currentBalance, valueCap, liquidityCap));

  if (transferAmount > 0 && transferAmount > amount) {
    concerns.push("Le montant saisi dépasse l'enchère max conseillée.");
  }

  if (amount <= 0) {
    return {
      amount: 0,
      text: "Aucune enchère conseillée dans le contexte actuel.",
      concerns,
    };
  }

  return {
    amount,
    text: `Ne pas dépasser ${amount.toLocaleString("fr-FR")} € dans les enchères avec le contexte actuel.`,
    concerns,
  };
}

function getRecommendation(score: number): TransferRecommendation {
  if (score >= 75) {
    return "Priorité haute";
  }

  if (score >= 58) {
    return "Option solide";
  }

  if (score >= 42) {
    return "Opportunité conditionnelle";
  }

  return "À éviter";
}

function getTransferBlockingReasons(
  rider: Rider,
  settings: ClubSettings
): string[] {
  const reasons: string[] = [];
  const division = getDivisionForCategory(settings, rider.category);
  const structureTotal =
    settings.facilities.shop.level + settings.facilities.headOffice.level;

  if (division === "D9" && rider.salaryWeekly >= 80000) {
    reasons.push(
      "Refusé par la règle divisionnaire : en D9, les coureurs à 80 000€ de salaire hebdo ou plus ne veulent pas signer."
    );
  }

  if (division === "D8" && rider.salaryWeekly >= 100000) {
    reasons.push(
      "Refusé par la règle divisionnaire : en D8, les coureurs à 100 000€ de salaire hebdo ou plus ne veulent pas signer."
    );
  }

  if (rider.salaryWeekly >= 100000 && structureTotal < 8) {
    reasons.push(
      `Refusé par le conseil d'administration : avec Boutique + Siège Social = ${structureTotal}, il faut un total de 8 terminé pour embaucher un coureur à 100 000€ ou plus.`
    );
  }

  return reasons;
}

export function analyzeTransferCandidate(
  rider: Rider,
  currentRiders: Rider[],
  settings: ClubSettings,
  strategy: TeamBuildingStrategy,
  currentBalance: number,
  transferAmount = 0
): TransferAnalysis {
  const profile = buildRiderProfileSummary(rider);
  const division = getDivisionScore(rider, settings);
  const budget = getBudgetScore(transferAmount, currentBalance);
  const wage = getWageScore(rider, currentRiders, settings);
  const squad = getSquadScore(rider, currentRiders);
  const objective = getObjectiveScore(rider, settings);
  const strategyFitScore = getStrategyFitScore(rider, strategy);
  const squadStrategyAverage = currentRiders.length > 0
    ? currentRiders.reduce((sum, current) => sum + getStrategyFitScore(current, strategy), 0) / currentRiders.length
    : strategyFitScore;
  const ageConcern = getAgeConcern(rider, settings);
  const blockingReasons = getTransferBlockingReasons(rider, settings);
  const canRecruit = blockingReasons.length === 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      division.score +
        budget.score +
        wage.score +
        squad.score +
        objective.score +
        (strategyFitScore >= squadStrategyAverage * 1.1
          ? 12
          : strategyFitScore >= squadStrategyAverage * 0.95
            ? 7
            : 2)
    )
  );
  const recommendation = canRecruit ? getRecommendation(score) : "À éviter";
  const concerns = [...budget.concerns, ...wage.concerns];
  const maxBid = getMaxBidRecommendation(
    rider,
    settings,
    currentBalance,
    score,
    wage.averageSalary,
    transferAmount
  );

  if (ageConcern) {
    concerns.push(ageConcern);
  }

  if (rider.form < 90) {
    concerns.push("La forme n'est pas optimale pour un impact immédiat.");
  }

  if (rider.injury && !/aucune/i.test(rider.injury)) {
    concerns.push(`Blessure à surveiller : ${rider.injury}.`);
  }

  concerns.push(...blockingReasons);
  concerns.push(...maxBid.concerns);

  return {
    rider,
    score: canRecruit ? score : Math.min(score, 15),
    recommendation,
    canRecruit,
    blockingReasons,
    summary: canRecruit
      ? `${recommendation} : ${division.text} ${squad.text}`
      : `Transfert impossible : ${blockingReasons[0]}`,
    profileLabel: `${profile.primaryProfile} / ${profile.secondaryProfile}`,
    budgetFit: budget.text,
    wageFit: wage.text,
    divisionFit: division.text,
    squadFit: squad.text,
    objectiveFit: objective.text,
    maxBid: maxBid.amount,
    maxBidFit: maxBid.text,
    strategyFit:
      strategyFitScore >= squadStrategyAverage * 1.1
        ? `Très bon fit avec la stratégie ${getStrategyAxisLabel(strategy.primaryAxis).toLowerCase()} > ${getStrategyAxisLabel(strategy.secondaryAxis).toLowerCase()} > ${getStrategyAxisLabel(strategy.tertiaryAxis).toLowerCase()}.`
        : strategyFitScore >= squadStrategyAverage * 0.95
          ? `Fit correct avec la stratégie d'équipe, sans être un profil structurant.`
          : `Fit limité avec la stratégie actuelle. Le coureur ne renforce pas assez les axes prioritaires.` ,
    strengths: profile.strengths,
    concerns,
    needMatches: squad.weakMatches,
    comparisons: [
      { label: "Total", value: `${rider.total}` },
      { label: "Forme", value: `${rider.form}` },
      { label: "Salaire hebdo", value: `${rider.salaryWeekly}` },
      { label: "Salaire cat. moyen", value: `${Math.round(wage.averageSalary)}` },
      { label: "Valeur", value: `${rider.value}` },
      { label: "Enchère max", value: `${maxBid.amount}` },
      { label: "Âge", value: `${rider.ageYears} ans ${rider.ageWeeks} sem.` },
      { label: "Division ciblée", value: getDivisionForCategory(settings, rider.category) },
      { label: "Fit stratégie", value: `${Math.round(strategyFitScore)}` },
      { label: "Coureurs dépassés", value: `${squad.betterThanCount}` },
      { label: "Score global", value: `${round(score)}/100` },
    ],
  };
}

export function analyzeTransferCandidates(
  riders: Rider[],
  currentRiders: Rider[],
  settings: ClubSettings,
  strategy: TeamBuildingStrategy,
  currentBalance: number,
  transferAmount = 0
): TransferAnalysis[] {
  return riders
    .map((rider) =>
      analyzeTransferCandidate(
        rider,
        currentRiders,
        settings,
        strategy,
        currentBalance,
        transferAmount
      )
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.rider.total !== left.rider.total) {
        return right.rider.total - left.rider.total;
      }

      return left.rider.name.localeCompare(right.rider.name, "fr");
    });
}