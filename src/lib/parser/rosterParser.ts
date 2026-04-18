import type { Rider, RiderCategory } from "../../types/rider";
import { parseFrenchInteger } from "../utils/numbers";

type ParsedRosterResult = {
  riders: Rider[];
  errors: string[];
};

const labelMap: Record<string, keyof Rider | "age" | "name" | "ignore"> = {
  Equipe: "currentTeam",
  Valeur: "value",
  Salaire: "salaryWeekly",
  Nationalité: "nationality",
  Age: "age",
  Forme: "form",
  Blessure: "injury",
  Catégorie: "category",
  Endurance: "endurance",
  Résistance: "resistance",
  Récupération: "recovery",
  Plaine: "flat",
  Vallon: "hill",
  Sprint: "sprint",
  Pavé: "cobble",
  Agilité: "agility",
  Baroudeur: "breakaway",
  Montagne: "mountain",
  Descente: "downhill",
  "Contre-la-montre": "timeTrial",
  "Course à étapes": "stageRace",
  Expérience: "experience",
  Total: "total",
};

function slugifyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRiderName(rawName: string): string {
  return rawName
    .replace(/\s*-\s*Informations générales\s*$/i, "")
    .trim();
}

function createEmptyRider(name: string): Rider {
  const normalizedName = normalizeRiderName(name);

  return {
    id: slugifyName(normalizedName),
    name: normalizedName,
    currentTeam: "",
    value: 0,
    salaryWeekly: 0,
    nationality: "",
    ageYears: 0,
    ageWeeks: 0,
    form: 0,
    injury: "",
    category: "Pro",
    endurance: 0,
    resistance: 0,
    recovery: 0,
    flat: 0,
    hill: 0,
    sprint: 0,
    cobble: 0,
    agility: 0,
    breakaway: 0,
    mountain: 0,
    downhill: 0,
    timeTrial: 0,
    stageRace: 0,
    experience: 0,
    total: 0,
    updatedAt: new Date().toISOString(),
  };
}

function parseAge(value: string): { ageYears: number; ageWeeks: number } {
  const match = value.match(/(\d+)\s+ans?\s+(\d+)\s+semaines?/i);

  if (!match) {
    return { ageYears: 0, ageWeeks: 0 };
  }

  return {
    ageYears: Number.parseInt(match[1], 10),
    ageWeeks: Number.parseInt(match[2], 10),
  };
}

function normalizeCategory(value: string): RiderCategory {
  if (value.includes("U21")) {
    return "U21";
  }

  if (value.includes("U25")) {
    return "U25";
  }

  return "Pro";
}

function isLikelyRiderName(line: string): boolean {
  if (!line.trim()) {
    return false;
  }

  if (line.includes("\t")) {
    return false;
  }

  if (Object.keys(labelMap).some((label) => line.startsWith(label))) {
    return false;
  }

  if (/^Informations générales$/i.test(line.trim())) {
    return false;
  }

  return true;
}

function splitIntoBlocks(input: string): string[] {
  const lines = input.replace(/\r/g, "").split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (currentBlock.length > 0) {
        currentBlock.push("");
      }
      continue;
    }

    if (isLikelyRiderName(line) && currentBlock.length > 0) {
      blocks.push(currentBlock.join("\n").trim());
      currentBlock = [line];
      continue;
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n").trim());
  }

  return blocks.filter(Boolean);
}

function extractPairs(block: string): Array<[string, string]> {
  const normalized = block.replace(/\r/g, "");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const pairs: Array<[string, string]> = [];

  for (const line of lines) {
    if (isLikelyRiderName(line)) {
      pairs.push(["__NAME__", line]);
      continue;
    }

    const tabParts = line.split("\t").map((part) => part.trim()).filter(Boolean);

    if (tabParts.length >= 2) {
      for (let index = 0; index < tabParts.length; index += 2) {
        const label = tabParts[index];
        const value = tabParts[index + 1];

        if (label && value) {
          pairs.push([label, value]);
        }
      }
      continue;
    }

    const spaceMatch = line.match(
      /^(Valeur|Salaire|Nationalité|Age|Forme|Blessure|Catégorie|Endurance|Résistance|Récupération|Plaine|Vallon|Sprint|Pavé|Agilité|Baroudeur|Montagne|Descente|Contre-la-montre|Course à étapes|Expérience|Total)\s+(.+)$/
    );

    if (spaceMatch) {
      pairs.push([spaceMatch[1], spaceMatch[2].trim()]);
    }
  }

  return pairs;
}

function parseRiderBlock(block: string, index: number): Rider | null {
  const pairs = extractPairs(block);
  const namePair = pairs.find(([label]) => label === "__NAME__");

  if (!namePair) {
    return null;
  }

  const rider = createEmptyRider(namePair[1]);

  for (const [label, value] of pairs) {
    if (label === "__NAME__") {
      continue;
    }

    const mapped = labelMap[label];

    if (!mapped) {
      continue;
    }

    if (mapped === "age") {
      const parsedAge = parseAge(value);
      rider.ageYears = parsedAge.ageYears;
      rider.ageWeeks = parsedAge.ageWeeks;
      continue;
    }

    if (mapped === "category") {
      rider.category = normalizeCategory(value);
      continue;
    }

    if (mapped === "currentTeam" || mapped === "nationality" || mapped === "injury") {
      rider[mapped] = value;
      continue;
    }

    if (mapped === "value" || mapped === "salaryWeekly") {
      rider[mapped] = parseFrenchInteger(value);
      continue;
    }

    if (mapped === "name" || mapped === "ignore") {
      continue;
    }

    rider[mapped] = parseFrenchInteger(value) as never;
  }

  rider.updatedAt = new Date().toISOString();

  if (!rider.id) {
    rider.id = `rider-${index + 1}`;
  }

  return rider;
}

export function parseRosterText(input: string): ParsedRosterResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      riders: [],
      errors: ["Le texte collé est vide."],
    };
  }

  const blocks = splitIntoBlocks(trimmed);
  const riders: Rider[] = [];
  const errors: string[] = [];

  blocks.forEach((block, index) => {
    const rider = parseRiderBlock(block, index);

    if (!rider) {
      errors.push(`Bloc ${index + 1} ignoré : nom de coureur introuvable.`);
      return;
    }

    riders.push(rider);
  });

  return { riders, errors };
}

export function mergeRidersByName(
  currentRiders: Rider[],
  importedRiders: Rider[]
): Rider[] {
  const map = new Map<string, Rider>();

  for (const rider of currentRiders) {
    map.set(rider.id, rider);
  }

  for (const rider of importedRiders) {
    map.set(rider.id, rider);
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}