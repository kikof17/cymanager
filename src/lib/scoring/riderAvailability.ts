import type { Rider } from "../../types/rider";

export type RiderUnavailabilityReason = "injury" | "critical-form";

export type RiderAvailabilityIssue = {
  riderId: string;
  riderName: string;
  form: number;
  injury: string;
  reason: RiderUnavailabilityReason;
  label: string;
};

export type RiderAvailabilitySummary = {
  availableRiders: Rider[];
  unavailableRiders: RiderAvailabilityIssue[];
  lowFormWarningCount: number;
};

const INJURY_FREE_TOKENS = ["", "aucune", "aucun", "none", "ok", "-"];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function hasBlockingInjury(injury: string | null | undefined): boolean {
  const normalized = normalizeText(injury ?? "");
  return !INJURY_FREE_TOKENS.includes(normalized);
}

/**
 * Lot 3 — Stratégie liée à l'effectif:
 * - Exclut les blessés et les coureurs avec forme critique (< 35)
 * - Signale les coureurs à forme fragile (35-49)
 */
export function buildRiderAvailabilitySummary(riders: Rider[]): RiderAvailabilitySummary {
  const availableRiders: Rider[] = [];
  const unavailableRiders: RiderAvailabilityIssue[] = [];
  let lowFormWarningCount = 0;

  riders.forEach((rider) => {
    const blockingInjury = hasBlockingInjury(rider.injury);

    if (blockingInjury) {
      unavailableRiders.push({
        riderId: rider.id,
        riderName: rider.name,
        form: rider.form,
        injury: rider.injury,
        reason: "injury",
        label: `Indisponible (blessure: ${rider.injury})`,
      });
      return;
    }

    if (rider.form < 35) {
      unavailableRiders.push({
        riderId: rider.id,
        riderName: rider.name,
        form: rider.form,
        injury: rider.injury,
        reason: "critical-form",
        label: "Indisponible (forme critique < 35)",
      });
      return;
    }

    if (rider.form < 50) {
      lowFormWarningCount += 1;
    }

    availableRiders.push(rider);
  });

  return {
    availableRiders,
    unavailableRiders,
    lowFormWarningCount,
  };
}
