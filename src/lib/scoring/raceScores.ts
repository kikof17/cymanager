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
    .filter(([, , weight]) => Number(weight) > 0)
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

export function buildRaceAnalysis(
  riders: Rider[],
  race: ParsedRace,
  lockedSelectedRiderIds?: string[]
): RaceAnalysisResult {
  // Sélection intelligente : priorité Pro, U25/U21 seulement si effectif Pro insuffisant ou score > plus faible Pro
  const allRanked: RaceRiderScore[] = riders
    .map((rider) => {
      const score = weightedRaceScore(rider, race.weights);
      const reasons = buildReasons(rider, race);
      return {
        riderId: rider.id,
        riderName: rider.name,
        riderForm: rider.form,
        riderCategory: rider.category,
        score,
        role: "Remplaçant" as const,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Séparer Pro et U25/U21
  const proRanked = allRanked.filter(r => r.riderCategory === "Pro");
  const u25u21Ranked = allRanked.filter(r => r.riderCategory === "U25" || r.riderCategory === "U21");

  let selected: RaceRiderScore[];

  if (Array.isArray(lockedSelectedRiderIds) && lockedSelectedRiderIds.length > 0) {
    const lockedIds = new Set(lockedSelectedRiderIds);
    selected = allRanked.filter((rider) => lockedIds.has(rider.riderId)).slice(0, 7);

    if (selected.length < 7) {
      const selectedIds = new Set(selected.map((rider) => rider.riderId));
      const missing = allRanked
        .filter((rider) => !selectedIds.has(rider.riderId))
        .slice(0, 7 - selected.length);
      selected = selected.concat(missing);
    }
  } else {
    // Prendre d'abord les 7 meilleurs Pro
    selected = proRanked.slice(0, 7);

    // Si moins de 7 Pro, compléter avec U25/U21
    if (selected.length < 7) {
      const needed = 7 - selected.length;
      selected = selected.concat(u25u21Ranked.slice(0, needed));
    } else {
      // Si on a 7 Pro, vérifier si un U25/U21 a un score supérieur au plus faible Pro sélectionné
      const minProScore = selected[selected.length - 1]?.score ?? -Infinity;
      const betterU25U21 = u25u21Ranked.filter(r => r.score > minProScore);
      if (betterU25U21.length > 0) {
        // Remplacer le(s) plus faible(s) Pro par le(s) meilleur(s) U25/U21
        const combined = selected.concat(betterU25U21).sort((a, b) => b.score - a.score).slice(0, 7);
        // Toujours priorité au score
        selected = combined;
      }
    }
  }

  // Mettre à jour le rôle selon le classement
  selected = selected.map((item, index) => {
    const rider = riders.find((r) => r.id === item.riderId)!;
    return {
      ...item,
      role: assignRoleFromScoreIndex(index, rider, race),
    };
  });

  // Substituts : les 8e et 9e meilleurs (hors sélection)
  const selectedIds = new Set(selected.map(r => r.riderId));
  const substitutes = allRanked.filter(r => !selectedIds.has(r.riderId)).slice(0, 2).map(item => ({
    ...item,
    role: "Remplaçant" as const,
  }));

  return {
    race,
    ranking: allRanked,
    selected,
    substitutes,
  };
}