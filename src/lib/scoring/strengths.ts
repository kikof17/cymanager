import type { Rider } from "../../types/rider";
import type { RaceProfileWeights, ParsedRace } from "../../types/race";

/**
 * Calcule les points forts d'un coureur pour une course donnée (top 2 secteurs pondérés)
 */
export function getRiderStrengths(rider: Rider, race: ParsedRace | { weights: RaceProfileWeights }): string[] {
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
  ];
  return stats
    .filter(([, , weight]) => Number(weight) > 0)
    .map(([label, stat, weight]) => ({
      label,
      contribution: Number(stat) * Number(weight),
      stat: Number(stat),
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((item) => `${item.label} ${item.stat}`);
}
