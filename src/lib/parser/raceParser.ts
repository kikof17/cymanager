// Helper : détecte si un mot-clé est précédé d'une négation (ni, aucun, sans, pas de)
function isNegated(normalized: string, keyword: string): boolean {
  // Gère le pluriel automatiquement
  const variants = [keyword, keyword + 's'];
  const negations = [];
  for (const variant of variants) {
    negations.push(
      `ni ${variant}`,
      `aucun ${variant}`,
      `aucune ${variant}`,
      `sans ${variant}`,
      `pas de ${variant}`,
      `pas ${variant}`,
      `0 ${variant}`
    );
  }
  return negations.some((neg) => normalized.includes(neg));
}
import type {
  ParsedRace,
  RaceProfileType,
  RaceProfileWeights,
  RaceType,
} from "../../types/race";

const EMPTY_WEIGHTS: RaceProfileWeights = {
  flat: 0,
  hill: 0,
  mountain: 0,
  sprint: 0,
  cobble: 0,
  timeTrial: 0,
  breakaway: 0,
  endurance: 0,
  resistance: 0,
  recovery: 0,
  stageRace: 0,
};

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractDistanceKm(input: string): number {
  const match = input.match(/(\d+(?:[.,]\d+)?)\s*km/i);

  if (!match) {
    return 0;
  }

  return Number.parseFloat(match[1].replace(",", "."));
}

function extractName(input: string): string {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "Course à analyser";
  }

  return lines[0];
}

function detectRaceType(normalized: string): RaceType {
  if (
    normalized.includes("etape") ||
    normalized.includes("general") ||
    normalized.includes("classement general") ||
    normalized.includes("course a etapes")
  ) {
    return "etapes";
  }

  return "simple";
}

function addWeights(
  base: RaceProfileWeights,
  delta: Partial<RaceProfileWeights>
): RaceProfileWeights {
  return {
    ...base,
    flat: base.flat + (delta.flat ?? 0),
    hill: base.hill + (delta.hill ?? 0),
    mountain: base.mountain + (delta.mountain ?? 0),
    sprint: base.sprint + (delta.sprint ?? 0),
    cobble: base.cobble + (delta.cobble ?? 0),
    timeTrial: base.timeTrial + (delta.timeTrial ?? 0),
    breakaway: base.breakaway + (delta.breakaway ?? 0),
    endurance: base.endurance + (delta.endurance ?? 0),
    resistance: base.resistance + (delta.resistance ?? 0),
    recovery: base.recovery + (delta.recovery ?? 0),
    stageRace: base.stageRace + (delta.stageRace ?? 0),
  };
}

function detectWeights(normalized: string, raceType: RaceType, distanceKm: number): RaceProfileWeights {
  let weights = { ...EMPTY_WEIGHTS };
  // Détection explicite du plat/roulant/faible relief
  if (
    (normalized.includes("plat") || normalized.includes("roulant") || normalized.includes("faible relief") || normalized.includes("sans difficulté") || normalized.includes("sans difficulte")) &&
    !normalized.includes("montagne") && !normalized.includes("col") && !normalized.includes("grimpe")
  ) {
    weights = addWeights(weights, {
      flat: 55,
      sprint: 25,
      endurance: 12,
      resistance: 10,
    });
  }

  if (normalized.includes("plaine")) {
    weights = addWeights(weights, {
      flat: 45,
      sprint: 20,
      endurance: 10,
      resistance: 8,
    });
  }

  if (normalized.includes("vallon") || normalized.includes("vallonne")) {
    weights = addWeights(weights, {
      hill: 42,
      resistance: 12,
      sprint: 10,
      breakaway: 10,
      endurance: 8,
    });
  }

  // Ajout montagne seulement si pas de négation
  const montagneOk = normalized.includes("montagne") && !isNegated(normalized, "montagne");
  const colOk = normalized.includes("col") && !isNegated(normalized, "col");
  const grimpeOk = normalized.includes("grimpe") && !isNegated(normalized, "grimpe");
  if (montagneOk || colOk || grimpeOk) {
    weights = addWeights(weights, {
      mountain: 48,
      resistance: 14,
      endurance: 12,
      recovery: 10,
    });
  }

  if (
    normalized.includes("contre-la-montre") ||
    normalized.includes("contre la montre") ||
    normalized.includes("clm") ||
    normalized.includes("chrono")
  ) {
    weights = addWeights(weights, {
      timeTrial: 52,
      flat: 12,
      resistance: 12,
      recovery: 8,
    });
  }

  if (normalized.includes("pave") || normalized.includes("cobble")) {
    weights = addWeights(weights, {
      cobble: 42,
      flat: 14,
      resistance: 14,
      hill: 8,
      endurance: 8,
    });
  }

  if (normalized.includes("flandr")) {
    weights = addWeights(weights, {
      cobble: 28,
      flat: 20,
      hill: 18,
      resistance: 12,
      endurance: 8,
    });
  }

  if (normalized.includes("baroudeur") || normalized.includes("echappee") || normalized.includes("echappe")) {
    weights = addWeights(weights, {
      breakaway: 18,
      endurance: 10,
      hill: 8,
      resistance: 8,
    });
  }

  if (normalized.includes("arrivee au sprint") || normalized.includes("sprint massif")) {
    weights = addWeights(weights, {
      sprint: 18,
      flat: 10,
    });
  }

  if (raceType === "etapes") {
    weights = addWeights(weights, {
      stageRace: 38,
      recovery: 20,
      endurance: 12,
      resistance: 8,
    });
  }

  if (distanceKm >= 220) {
    weights = addWeights(weights, {
      endurance: 14,
      resistance: 8,
      recovery: raceType === "etapes" ? 8 : 0,
    });
  } else if (distanceKm >= 180) {
    weights = addWeights(weights, {
      endurance: 8,
      resistance: 5,
    });
  }

  const sum = Object.values(weights).reduce((acc, value) => acc + value, 0);

  if (sum === 0) {
    return {
      ...weights,
      flat: 25,
      hill: 20,
      endurance: 15,
      resistance: 15,
      sprint: 10,
      breakaway: 10,
      mountain: 5,
    };
  }

  return weights;
}

function detectProfile(weights: RaceProfileWeights): RaceProfileType {
    // Forçage si la plaine est très dominante
    if (weights.flat >= 50 && weights.mountain < 15 && weights.hill < 20) {
      return "Plaine";
    }
  // On donne plus de poids à la plaine si la montagne est faible
  const flatScore = weights.flat + weights.sprint * 0.6;
  const hillScore = weights.hill + weights.breakaway * 0.4;
  const mountainScore = weights.mountain + weights.stageRace * 0.2;
  const clmScore = weights.timeTrial;
  const cobbleScore = weights.cobble;
  const flandrienScore = weights.cobble * 0.6 + weights.flat * 0.4 + weights.hill * 0.4;

  // Si la montagne est faible (<15) et la plaine > montagne+10, on force plaine
  if (mountainScore < 15 && flatScore > mountainScore + 10) {
    if (flatScore > hillScore + 5) return "Plaine";
  }

  // Si la montagne est très dominante
  if (mountainScore > flatScore + 10 && mountainScore > hillScore + 5) {
    return "Montagne";
  }

  // Si le vallon est dominant
  if (hillScore > flatScore + 5 && hillScore > mountainScore + 5) {
    return "Vallon";
  }

  // CLM ou Pavé ou Flandrien
  if (clmScore > 25 && clmScore > flatScore && clmScore > hillScore && clmScore > mountainScore) {
    return "CLM";
  }
  if (cobbleScore > 25 && cobbleScore > flatScore && cobbleScore > hillScore && cobbleScore > mountainScore) {
    return "Pavé";
  }
  if (flandrienScore > 25 && flandrienScore > flatScore && flandrienScore > hillScore && flandrienScore > mountainScore) {
    return "Flandrien";
  }

  // Mixte si scores proches
  const arr = [flatScore, hillScore, mountainScore];
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  if (max - min <= 8) return "Mixte";

  // Sinon, le plus fort l'emporte
  if (flatScore >= hillScore && flatScore >= mountainScore) return "Plaine";
  if (hillScore >= flatScore && hillScore >= mountainScore) return "Vallon";
  return "Montagne";
}

function buildSummary(
  raceType: RaceType,
  profile: RaceProfileType,
  distanceKm: number,
  weights: RaceProfileWeights
): string[] {
  const summary: string[] = [];

  summary.push(`Type détecté : ${raceType === "etapes" ? "course à étapes" : "course simple"}.`);
  summary.push(`Profil dominant : ${profile}.`);

  if (distanceKm > 0) {
    summary.push(`Distance détectée : ${distanceKm} km.`);
  }

  const keyStats = [
    ["Plaine", weights.flat],
    ["Vallon", weights.hill],
    ["Montagne", weights.mountain],
    ["Sprint", weights.sprint],
    ["Pavé", weights.cobble],
    ["CLM", weights.timeTrial],
    ["Baroudeur", weights.breakaway],
    ["Endurance", weights.endurance],
    ["Résistance", weights.resistance],
    ["Récupération", weights.recovery],
    ["CAE", weights.stageRace],
  ]
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 4)
    .map(([label, value]) => `${label} ${value}`);

  summary.push(`Axes majeurs : ${keyStats.join(", ")}.`);

  return summary;
}

export function parseRaceText(input: string): ParsedRace {
  const rawText = input.trim();
  const normalized = normalizeText(rawText);
  const name = extractName(rawText);
  const distanceKm = extractDistanceKm(rawText);
  const raceType = detectRaceType(normalized);
  const weights = detectWeights(normalized, raceType, distanceKm);
  const detectedProfile = detectProfile(weights);
  const summary = buildSummary(raceType, detectedProfile, distanceKm, weights);

  return {
    rawText,
    name,
    raceType,
    distanceKm,
    detectedProfile,
    weights,
    summary,
    category: null,
  };
}