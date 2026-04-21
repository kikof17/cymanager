import { BEGINNER_GUIDE_SAFETY_RESERVE_TARGET } from "../storage/financeStorage";

export type RecruitmentSimulationVerdict = "safe" | "caution" | "danger";

export type RecruitmentSimulation = {
  /** Solde actuel avant transfert */
  balanceBefore: number;
  /** Solde après déduction du montant du transfert */
  balanceAfter: number;
  /** Charge salariale hebdo actuelle (salary + maintenance) */
  weeklyFixedCostsBefore: number;
  /** Charge salariale hebdo après ajout du coureur */
  weeklyFixedCostsAfter: number;
  /** Salaire hebdo du candidat */
  candidateWeeklySalary: number;
  /** Montant du transfert */
  transferAmount: number;
  /** Autonomie en semaines avant recrutement (au-dessus de la réserve) */
  autonomyWeeksBefore: number;
  /** Autonomie en semaines après recrutement (au-dessus de la réserve) */
  autonomyWeeksAfter: number;
  /** Delta d'autonomie */
  autonomyDelta: number;
  /** Réserve de sécurité cible */
  safetyReserve: number;
  /** Le solde après passe-t-il sous la réserve de sécurité ? */
  breachesReserve: boolean;
  /** Verdict global */
  verdict: RecruitmentSimulationVerdict;
  /** Texte explicatif court */
  verdictLabel: string;
};

function clampAutonomy(balance: number, reserve: number, weeklyFixedCosts: number): number {
  if (weeklyFixedCosts <= 0) return 0;
  const margin = balance - reserve;
  return Math.max(0, margin / weeklyFixedCosts);
}

function buildVerdict(
  balanceAfter: number,
  autonomyAfter: number,
  safetyReserve: number
): { verdict: RecruitmentSimulationVerdict; verdictLabel: string } {
  if (balanceAfter < safetyReserve) {
    return {
      verdict: "danger",
      verdictLabel: "Transfert dangereux : le solde passe sous la réserve de sécurité.",
    };
  }

  if (autonomyAfter < 3) {
    return {
      verdict: "caution",
      verdictLabel: "Vigilance : autonomie résiduelle inférieure à 3 semaines après recrutement.",
    };
  }

  if (autonomyAfter < 5) {
    return {
      verdict: "caution",
      verdictLabel: "Recrutement possible mais confortable à surveiller (< 5 semaines d'autonomie).",
    };
  }

  return {
    verdict: "safe",
    verdictLabel: "Recrutement viable : solde et autonomie restent au-dessus des seuils de sécurité.",
  };
}

export function simulateRecruitment(
  currentBalance: number,
  weeklyFixedCostsBefore: number,
  candidateWeeklySalary: number,
  transferAmount: number
): RecruitmentSimulation {
  const safetyReserve = BEGINNER_GUIDE_SAFETY_RESERVE_TARGET;
  const balanceAfter = currentBalance - transferAmount;
  const weeklyFixedCostsAfter = weeklyFixedCostsBefore + candidateWeeklySalary;

  const autonomyWeeksBefore = clampAutonomy(currentBalance, safetyReserve, weeklyFixedCostsBefore);
  const autonomyWeeksAfter = clampAutonomy(balanceAfter, safetyReserve, weeklyFixedCostsAfter);
  const autonomyDelta = autonomyWeeksAfter - autonomyWeeksBefore;
  const breachesReserve = balanceAfter < safetyReserve;

  const { verdict, verdictLabel } = buildVerdict(balanceAfter, autonomyWeeksAfter, safetyReserve);

  return {
    balanceBefore: currentBalance,
    balanceAfter,
    weeklyFixedCostsBefore,
    weeklyFixedCostsAfter,
    candidateWeeklySalary,
    transferAmount,
    autonomyWeeksBefore,
    autonomyWeeksAfter,
    autonomyDelta,
    safetyReserve,
    breachesReserve,
    verdict,
    verdictLabel,
  };
}
