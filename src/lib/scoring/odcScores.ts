import type { ParsedRace, RaceRiderScore, RiderRaceSetup } from "../../types/race";


// Calcule dynamiquement le % d'effort pour un équipier selon le guide
function computeEquipierEffortPercent(
  rider: RaceRiderScore,
  selected: RaceRiderScore[]
): number {
  // Base 60%, +10% selon score, +10% selon forme
  const base = 60;
  const maxScore = Math.max(...selected.map(r => r.score));
  const minScore = Math.min(...selected.map(r => r.score));
  const scoreRange = maxScore - minScore || 1;
  const scoreRatio = (rider.score - minScore) / scoreRange;
  // Forme : 0% si <60, +10% si >=90, linéaire entre les deux
  const form = rider.riderForm;
  const formRatio = Math.max(0, Math.min(1, (form - 60) / 30));
  const effort = base + 10 * scoreRatio + 10 * formRatio;
  return Math.round(Math.max(60, Math.min(80, effort)));
}

function defaultPercentForRole(
  role: RaceRiderScore["role"],
  rider: RaceRiderScore,
  selected: RaceRiderScore[]
): number {
  switch (role) {
    case "Leader":
      return 100;
    case "Électron libre":
      return 85;
    case "Équipier":
      return computeEquipierEffortPercent(rider, selected);
    default:
      return 50;
  }
}

function defaultBreakawayFlag(race: ParsedRace, rider: RaceRiderScore): boolean {
  if (rider.role !== "Électron libre") {
    return false;
  }

  if (race.detectedProfile === "Vallon" || race.detectedProfile === "Mixte") {
    return true;
  }

  return false;
}

// Nécessite la liste des sélectionnés pour le calcul relatif
export function buildDefaultRaceSetupForRider(
  race: ParsedRace,
  rider: RaceRiderScore,
  selected: RaceRiderScore[]
): RiderRaceSetup {
  return {
    riderId: rider.riderId,
    role: rider.role === "Remplaçant" ? "Équipier" : rider.role,
    effortPercent: defaultPercentForRole(rider.role, rider, selected),
    morningBreakaway: defaultBreakawayFlag(race, rider),
  };
}

export function buildDefaultRaceSetupMap(
  race: ParsedRace,
  selected: RaceRiderScore[]
): Record<string, RiderRaceSetup> {
  return selected.reduce<Record<string, RiderRaceSetup>>((acc, rider) => {
    acc[rider.riderId] = buildDefaultRaceSetupForRider(race, rider, selected);
    return acc;
  }, {});
}