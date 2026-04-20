import type { Rider, RiderCategory } from "../../types/rider";
import type {
  TransferAuctionSnapshot,
  TransferMarketCandidate,
} from "../../types/transfer";
import { parseFrenchInteger } from "../utils/numbers";

type ParsedTransferMarketResult = {
  candidates: TransferMarketCandidate[];
  errors: string[];
};

type CsvRow = Record<string, string>;

type AuctionCsvRow = {
  deadlineLabel: string;
  displayName: string;
  seller: string;
  ageYears: number;
  ageWeeks: number;
  form: number;
  value: number;
  salaryWeekly: number;
  currentBid: number;
  highestBidder: string;
};

function getRowValue(row: CsvRow, ...candidateHeaders: string[]): string {
  for (const candidateHeader of candidateHeaders) {
    if (candidateHeader in row) {
      return row[candidateHeader] ?? "";
    }
  }

  const normalizedEntries = Object.entries(row).map(([key, value]) => ({
    normalizedKey: normalizeComparable(key),
    value,
  }));

  for (const candidateHeader of candidateHeaders) {
    const normalizedCandidate = normalizeComparable(candidateHeader);
    const match = normalizedEntries.find((entry) => entry.normalizedKey === normalizedCandidate);

    if (match) {
      return match.value;
    }
  }

  return "";
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugifyName(name: string): string {
  return normalizeComparable(name).replace(/\s+/g, "-");
}

function parseSemicolonCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ";" && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(input: string): { rows: CsvRow[]; errors: string[] } {
  const lines = input
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: ["Le CSV est vide."] };
  }

  const headers = parseSemicolonCsvLine(lines[0]);
  const rows: CsvRow[] = [];
  const errors: string[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const cells = parseSemicolonCsvLine(lines[index]);

    if (cells.length !== headers.length) {
      errors.push(`Ligne ${index + 1} ignorée : ${cells.length} colonne(s) au lieu de ${headers.length}.`);
      continue;
    }

    rows.push(
      headers.reduce<CsvRow>((accumulator, header, headerIndex) => {
        accumulator[header] = cells[headerIndex] ?? "";
        return accumulator;
      }, {})
    );
  }

  return { rows, errors };
}

function parseLongAge(value: string): { ageYears: number; ageWeeks: number } {
  const match = value.match(/(\d+)\s*ans?\s*(\d+)\s*semaines?/i);

  if (!match) {
    return { ageYears: 0, ageWeeks: 0 };
  }

  return {
    ageYears: Number.parseInt(match[1], 10),
    ageWeeks: Number.parseInt(match[2], 10),
  };
}

function parseShortAge(value: string): { ageYears: number; ageWeeks: number } {
  const match = value.match(/(\d+)\/(\d+)/);

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

function buildRiderFromCsvRow(row: CsvRow): Rider {
  const age = parseLongAge(getRowValue(row, "Age", "Âge"));
  const name = getRowValue(row, "Nom").trim();

  return {
    id: slugifyName(name),
    name,
    currentTeam: getRowValue(row, "Equipe", "Équipe").trim(),
    value: parseFrenchInteger(getRowValue(row, "Valeur") || "0"),
    salaryWeekly: parseFrenchInteger(
      getRowValue(row, "Salaire par semaine", "Salaire_par_semaine") || "0"
    ),
    nationality: getRowValue(row, "Nationalité", "Nationalite").trim(),
    ageYears: age.ageYears,
    ageWeeks: age.ageWeeks,
    form: parseFrenchInteger(getRowValue(row, "Forme") || "0"),
    injury: getRowValue(row, "Blessure").trim(),
    category: normalizeCategory(getRowValue(row, "Catégorie", "Categorie") || "Pro"),
    endurance: parseFrenchInteger(getRowValue(row, "Endurance") || "0"),
    resistance: parseFrenchInteger(getRowValue(row, "Résistance", "Resistance") || "0"),
    recovery: parseFrenchInteger(getRowValue(row, "Récupération", "Recuperation") || "0"),
    flat: parseFrenchInteger(getRowValue(row, "Plaine") || "0"),
    hill: parseFrenchInteger(getRowValue(row, "Vallon") || "0"),
    sprint: parseFrenchInteger(getRowValue(row, "Sprint") || "0"),
    cobble: parseFrenchInteger(getRowValue(row, "Pavé", "Pave") || "0"),
    agility: parseFrenchInteger(getRowValue(row, "Agilité", "Agilite") || "0"),
    breakaway: parseFrenchInteger(getRowValue(row, "Baroudeur") || "0"),
    mountain: parseFrenchInteger(getRowValue(row, "Montagne") || "0"),
    downhill: parseFrenchInteger(getRowValue(row, "Descente") || "0"),
    timeTrial: parseFrenchInteger(
      getRowValue(row, "Contre-la-montre", "Contre la montre") || "0"
    ),
    stageRace: parseFrenchInteger(
      getRowValue(row, "Course à étapes", "Course_a_etapes", "Course a etapes") || "0"
    ),
    experience: parseFrenchInteger(getRowValue(row, "Expérience", "Experience") || "0"),
    total: parseFrenchInteger(getRowValue(row, "Total") || "0"),
    updatedAt: new Date().toISOString(),
  };
}

function buildAuctionRow(row: CsvRow): AuctionCsvRow {
  const age = parseShortAge(getRowValue(row, "Âge", "Age"));

  return {
    deadlineLabel: getRowValue(row, "Échéance", "Echéance").trim(),
    displayName: getRowValue(row, "Nom").trim(),
    seller: getRowValue(row, "Vendeur").trim(),
    ageYears: age.ageYears,
    ageWeeks: age.ageWeeks,
    form: parseFrenchInteger(getRowValue(row, "Forme") || "0"),
    value: parseFrenchInteger(getRowValue(row, "Valeur") || "0"),
    salaryWeekly: parseFrenchInteger(getRowValue(row, "Salaire") || "0"),
    currentBid: parseFrenchInteger(getRowValue(row, "Enchère", "Enchere") || "0"),
    highestBidder: getRowValue(row, "Acheteur").trim(),
  };
}

function buildRiderSignature(rider: Rider): string {
  const parts = normalizeComparable(rider.name).split(/\s+/).filter(Boolean);
  const surname = parts[0] ?? "";
  const initials = parts.slice(1).map((part) => part[0]).join("");
  return `${surname}|${initials}`;
}

function buildAuctionSignature(displayName: string): string {
  const cleaned = normalizeComparable(displayName.replace(/\./g, " "));
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const surname = parts[0] ?? "";
  const initials = parts.slice(1).map((part) => part[0]).join("");
  return `${surname}|${initials}`;
}

function parseAuctionDeadline(label: string, referenceDate: Date): string {
  const match = label.match(/(\d{2})\/(\d{2})\s+(\d{2})h(\d{2})/);

  if (!match) {
    return new Date(referenceDate).toISOString();
  }

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const hours = Number.parseInt(match[3], 10);
  const minutes = Number.parseInt(match[4], 10);
  const currentYear = referenceDate.getFullYear();
  const parsed = new Date(currentYear, month - 1, day, hours, minutes, 0, 0);

  if (parsed.getTime() < referenceDate.getTime() - 180 * 24 * 60 * 60 * 1000) {
    parsed.setFullYear(currentYear + 1);
  }

  return parsed.toISOString();
}

function scoreCandidateMatch(rider: Rider, row: AuctionCsvRow): number {
  let score = 0;

  if (rider.ageYears === row.ageYears) {
    score += 4;
  }

  if (rider.ageWeeks === row.ageWeeks) {
    score += 3;
  }

  if (rider.form === row.form) {
    score += 3;
  }

  if (rider.value === row.value) {
    score += 3;
  }

  if (rider.salaryWeekly === row.salaryWeekly) {
    score += 3;
  }

  if (normalizeComparable(rider.currentTeam ?? "") === normalizeComparable(row.seller)) {
    score += 2;
  }

  return score;
}

function findMatchingRider(riders: Rider[], row: AuctionCsvRow): Rider | null {
  const signature = buildAuctionSignature(row.displayName);
  const sameSignature = riders.filter((rider) => buildRiderSignature(rider) === signature);
  const candidatePool = sameSignature.length > 0 ? sameSignature : riders;

  const ranked = candidatePool
    .map((rider) => ({ rider, score: scoreCandidateMatch(rider, row) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.rider ?? null;
}

export function isTransferAuctionExpired(
  auction: TransferAuctionSnapshot,
  referenceDate = new Date()
): boolean {
  const deadlineTime = new Date(auction.deadlineAt).getTime();

  if (Number.isNaN(deadlineTime)) {
    return false;
  }

  return deadlineTime <= referenceDate.getTime();
}

export function parseTransferMarketData(
  ridersCsv: string,
  auctionsCsv: string,
  referenceDate = new Date()
): ParsedTransferMarketResult {
  const errors: string[] = [];

  if (!ridersCsv.trim()) {
    errors.push("Le CSV des coureurs du marché est vide.");
  }

  if (!auctionsCsv.trim()) {
    errors.push("Le CSV des enchères est vide.");
  }

  if (errors.length > 0) {
    return { candidates: [], errors };
  }

  const parsedRiders = parseCsv(ridersCsv);
  const parsedAuctions = parseCsv(auctionsCsv);

  errors.push(...parsedRiders.errors, ...parsedAuctions.errors);

  const riders = parsedRiders.rows
    .filter((row) => (row.Nom ?? "").trim().length > 0)
    .map(buildRiderFromCsvRow);
  const auctionRows = parsedAuctions.rows
    .filter((row) => (row.Nom ?? "").trim().length > 0)
    .map(buildAuctionRow);

  const candidates: TransferMarketCandidate[] = [];

  auctionRows.forEach((auctionRow, index) => {
    const matchedRider = findMatchingRider(riders, auctionRow);

    if (!matchedRider) {
      errors.push(`Enchère ${index + 1} ignorée : correspondance introuvable pour ${auctionRow.displayName}.`);
      return;
    }

    candidates.push({
      id: matchedRider.id,
      rider: matchedRider,
      auction: {
        deadlineAt: parseAuctionDeadline(auctionRow.deadlineLabel, referenceDate),
        deadlineLabel: auctionRow.deadlineLabel,
        currentBid: auctionRow.currentBid,
        highestBidder: auctionRow.highestBidder,
        seller: auctionRow.seller,
        displayName: auctionRow.displayName,
      },
    });
  });

  return {
    candidates,
    errors,
  };
}