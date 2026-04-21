import { buildRiderAvailabilitySummary } from "../scoring/riderAvailability";
import type { ResultReferenceSummary } from "../scoring/extractPoints";
import type { Rider } from "../../types/rider";

export type CrossRecommendationSeverity = "info" | "warning" | "critical";

export type CrossRecommendationItem = {
  severity: CrossRecommendationSeverity;
  text: string;
};

export type CrossRecommendationSummary = {
  unavailableCount: number;
  lowFormWarningCount: number;
  training: CrossRecommendationItem[];
  finance: CrossRecommendationItem[];
  results: CrossRecommendationItem[];
};

type CrossRecommendationInput = {
  riders: Rider[];
  resultReferenceSummary?: ResultReferenceSummary | null;
  invalidRacePrizeCount?: number;
  currentBalance?: number;
  weeklyFixedCosts?: number;
};

export function buildCrossRecommendations(
  input: CrossRecommendationInput
): CrossRecommendationSummary {
  const availability = buildRiderAvailabilitySummary(input.riders);
  const unavailableCount = availability.unavailableRiders.length;
  const lowFormWarningCount = availability.lowFormWarningCount;

  const training: CrossRecommendationItem[] = [];
  const finance: CrossRecommendationItem[] = [];
  const results: CrossRecommendationItem[] = [];

  if (unavailableCount > 0) {
    training.push({
      severity: unavailableCount >= 4 ? "critical" : "warning",
      text: `${unavailableCount} coureur(s) indisponible(s) : privilégie un plan hebdo de consolidation (foncier/récupération) plutôt qu'une poussée primaire agressive.`,
    });

    results.push({
      severity: unavailableCount >= 4 ? "critical" : "warning",
      text: `Lecture résultats à contextualiser : l'effectif alignable est réduit de ${unavailableCount} coureur(s) cette semaine.`,
    });
  }

  if (lowFormWarningCount > 0) {
    training.push({
      severity: lowFormWarningCount >= 4 ? "warning" : "info",
      text: `${lowFormWarningCount} coureur(s) en forme fragile (35-49) : surveille la charge avant inscription pour éviter d'élargir l'indisponibilité.`,
    });
  }

  const referenceSummary = input.resultReferenceSummary ?? null;
  const resultReferenceIssues = referenceSummary
    ? referenceSummary.missingRaceReferenceCount +
      referenceSummary.mismatchedRaceReferenceCount +
      referenceSummary.orphanCount
    : 0;

  if (resultReferenceIssues > 0) {
    results.push({
      severity: "warning",
      text: `${resultReferenceIssues} résultat(s) présentent une référence course non validée : réaligne avant d'analyser finement la performance.`,
    });

    finance.push({
      severity: "warning",
      text: `${resultReferenceIssues} référence(s) résultat non validée(s) : certaines primes peuvent reposer sur une base encore instable.`,
    });
  }

  if ((input.invalidRacePrizeCount ?? 0) > 0) {
    finance.push({
      severity: "warning",
      text: `${input.invalidRacePrizeCount} prime(s) de course sont liées à des résultats non validés. Utilise le filtre dédié pour audit ciblé.`,
    });
  }

  if (
    typeof input.currentBalance === "number" &&
    typeof input.weeklyFixedCosts === "number" &&
    input.weeklyFixedCosts > 0
  ) {
    const autonomyWeeks = input.currentBalance / input.weeklyFixedCosts;

    if (autonomyWeeks < 2) {
      finance.push({
        severity: "critical",
        text: `Autonomie trésorerie courte (${autonomyWeeks.toFixed(1)} semaine(s)) : priorise stabilité d'effectif et sécurisation des revenus.`,
      });
    } else if (autonomyWeeks < 4) {
      finance.push({
        severity: "warning",
        text: `Autonomie trésorerie sous tension (${autonomyWeeks.toFixed(1)} semaine(s)) : limite les décisions qui augmentent la charge sportive et salariale.`,
      });
    }
  }

  if (training.length === 0) {
    training.push({
      severity: "info",
      text: "Signal effectif stable : tu peux conserver une logique d'entraînement orientée performance.",
    });
  }

  if (finance.length === 0) {
    finance.push({
      severity: "info",
      text: "Lecture finance cohérente avec l'état sportif actuel, pas d'alerte transverse majeure.",
    });
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      text: "Résultats exploitables sans réserve transverse majeure pour l'analyse de performance.",
    });
  }

  return {
    unavailableCount,
    lowFormWarningCount,
    training,
    finance,
    results,
  };
}
