import type { Rider } from "../../types/rider";
import type {
  ParsedRace,
  RaceAnalysisResult,
  RaceRiderScore,
  RaceProfileWeights,
} from "../../types/race";

function weightedRaceScore(rider: Rider, weights: RaceProfileWeights): number {
  return Number(
    (
      rider.flat * weights.flat +
      rider.hill * weights.hill +
      rider.mountain * weights.mountain +
      rider.sprint * weights.sprint +
      rider.cobble * weights.cobble +
      rider.timeTrial * weights.timeTrial +
      rider.breakaway * weights.breakaway +
      rider.endurance * weights.endurance +
      rider.resistance * weights.resistance +
      rider.recovery * weights.recovery +
      rider.stageRace * weights.stageRace
    ).toFixed(2)
  );
}

function buildReasons(rider: Rider, race: ParsedRace): string[] {
  const stats = [
    ["Plaine", rider.flat, race.weights.flat],
    ["Vallon", rider.hill, race.weights.hill],
    ["Montagne", rider.mountain, race.weights.mountain],
    ["Sprint", rider.sprint, race.weights.sprint],
    ["Pavé", rider.cobble, race.weights.cobble],
    ["CLM", rider.timeTrial, race.weights.timeTrial],
    ["Baroudeur", rider.breakaway, race.weights.breakaway],
    ["Endurance", rider.endurance, race.weights.endurance],
    ["Résistance", rider.resistance, race.weights.resistance],
    ["Récupération", rider.recovery, race.weights.recovery],
    ["CAE", rider.stageRace, race.weights.stageRace],
  ]
    .filter(([, , weight]) => weight > 0)
    .map(([label, stat, weight]) => ({
      label,
      contribution: Number(stat) * Number(weight),
      stat: Number(stat),
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);

  return stats.map((item) => `${item.label} ${item.stat}`);
}

function assignRoleFromScoreIndex(
  index: number,
  rider: Rider,
  race: ParsedRace
): RaceRiderScore["role"] {
  if (index === 0) {
    return "Leader";
  }

  if (
    race.raceType === "etapes" &&
    (rider.stageRace >= 65 || rider.recovery >= 75 || rider.timeTrial >= 72)
  ) {
    return index <= 2 ? "Électron libre" : "Équipier";
  }

  if (index <= 2) {
    return "Électron libre";
  }

  return "Équipier";
}

export function buildRaceAnalysis(riders: Rider[], race: ParsedRace): RaceAnalysisResult {
  const ranking: RaceRiderScore[] = riders
    .map((rider) => {
      const score = weightedRaceScore(rider, race.weights);
      const reasons = buildReasons(rider, race);

      return {
        riderId: rider.id,
        riderName: rider.name,
        riderForm: rider.form,
        riderCategory: rider.category,
        score,
        role: "Remplaçant",
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => {
      if (index < 7) {
        const rider = riders.find((r) => r.id === item.riderId)!;

        return {
          ...item,
          role: assignRoleFromScoreIndex(index, rider, race),
        };
      }

      return item;
    });

  const selected = ranking.slice(0, 7);
  const substitutes = ranking.slice(7, 9).map((item) => ({
    ...item,
    role: "Remplaçant" as const,
  }));

  return {
    race,
    ranking,
    selected,
    substitutes,
  };
}