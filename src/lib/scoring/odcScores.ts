import type { ParsedRace, RaceRiderScore, RiderRaceSetup } from "../../types/race";

function defaultPercentForRole(role: RaceRiderScore["role"]): number {
  switch (role) {
    case "Leader":
      return 100;
    case "Électron libre":
      return 85;
    case "Équipier":
      return 65;
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

export function buildDefaultRaceSetupForRider(
  race: ParsedRace,
  rider: RaceRiderScore
): RiderRaceSetup {
  return {
    riderId: rider.riderId,
    role: rider.role === "Remplaçant" ? "Équipier" : rider.role,
    effortPercent: defaultPercentForRole(rider.role),
    morningBreakaway: defaultBreakawayFlag(race, rider),
  };
}

export function buildDefaultRaceSetupMap(
  race: ParsedRace,
  selected: RaceRiderScore[]
): Record<string, RiderRaceSetup> {
  return selected.reduce<Record<string, RiderRaceSetup>>((acc, rider) => {
    acc[rider.riderId] = buildDefaultRaceSetupForRider(race, rider);
    return acc;
  }, {});
}