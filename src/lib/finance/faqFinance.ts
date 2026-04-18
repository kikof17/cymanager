import faqHtml from "../../assets/data/cymanager-faq-reference.html?raw";
import type { PrizeReferenceRow, PrizeReferenceTable } from "../../types/finance";
import type { DivisionLevel, FacilityKey } from "../../types/settings";

type FacilityFinancialRule = {
  upgradeCost: number | null;
  weeklyMaintenance: number;
};

type FacilityFinancialRules = Record<
  FacilityKey,
  Record<number, FacilityFinancialRule>
>;

const FACILITY_LABELS: Record<FacilityKey, string> = {
  headOffice: "Siège social",
  trainingCenter: "Centre d'entraînement",
  formationCenter: "Centre de formation",
  shop: "Boutique",
};

let cachedDocument: Document | null = null;

function getFaqDocument(): Document {
  if (!cachedDocument) {
    cachedDocument = new DOMParser().parseFromString(faqHtml, "text/html");
  }

  return cachedDocument;
}

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeComparable(value: string): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizePositionLabel(value: string): string {
  const normalized = normalizeComparable(value);
  const digits = normalized.replace(/[^\d]/g, "");

  if (!digits) {
    return normalized;
  }

  return digits;
}

function parseAmount(value: string): number | null {
  const digits = value.replace(/[^\d-]/g, "");
  return digits ? Number.parseInt(digits, 10) : null;
}

function parseTable(table: Element): string[][] {
  return Array.from(table.querySelectorAll("tr"))
    .map((row) =>
      Array.from(row.querySelectorAll("th, td")).map((cell) =>
        normalizeText(cell.textContent ?? "")
      )
    )
    .filter((row) => row.some((cell) => cell.length > 0));
}

function findPortletContent(title: string): Element | null {
  const document = getFaqDocument();
  const boxes = Array.from(document.querySelectorAll(".portlet_boite"));

  for (const box of boxes) {
    const rawTitle = normalizeText(
      box.querySelector(".portlet_titre")?.textContent ?? ""
    );

    if (rawTitle.toLowerCase() === title.toLowerCase()) {
      return box.querySelector(".portlet_contenu");
    }
  }

  return null;
}

function getFacilityKey(label: string): FacilityKey | null {
  const normalized = normalizeText(label).toLowerCase();

  if (normalized.includes("siège social") || normalized.includes("siege social")) {
    return "headOffice";
  }

  if (
    normalized.includes("centre d'entraînement") ||
    normalized.includes("centre d entrainement")
  ) {
    return "trainingCenter";
  }

  if (normalized.includes("centre de formation")) {
    return "formationCenter";
  }

  if (normalized.includes("boutique")) {
    return "shop";
  }

  return null;
}

function buildFacilityFinancialRules(): FacilityFinancialRules {
  const emptyRules: FacilityFinancialRules = {
    headOffice: {},
    trainingCenter: {},
    formationCenter: {},
    shop: {},
  };

  const content = findPortletContent("Les installations");
  const table = content?.querySelector("table");

  if (!table) {
    return emptyRules;
  }

  const rows = parseTable(table).slice(1);

  rows.forEach((cells) => {
    const [facilityLabel, levelLabel, costLabel, maintenanceLabel] = cells;
    const facilityKey = getFacilityKey(facilityLabel);
    const level = Number.parseInt(levelLabel ?? "", 10);

    if (!facilityKey || Number.isNaN(level)) {
      return;
    }

    emptyRules[facilityKey][level] = {
      upgradeCost: parseAmount(costLabel ?? ""),
      weeklyMaintenance: parseAmount(maintenanceLabel ?? "") ?? 0,
    };
  });

  return emptyRules;
}

function findTableTitle(table: Element, index: number): string {
  let current = table.previousElementSibling;

  while (current) {
    const text = normalizeText(current.textContent ?? "");

    if (text) {
      return text;
    }

    current = current.previousElementSibling;
  }

  return `Tableau des primes ${index + 1}`;
}

function normalizePrizeTableId(title: string, index: number): string {
  const normalized = title.toLowerCase();

  if (normalized.includes("courses individuelles")) {
    return "race-individual";
  }

  if (
    normalized.includes("clm par équipe") ||
    normalized.includes("clm par equipe")
  ) {
    return "race-team-time-trial";
  }

  if (
    normalized.includes("championnat par équipes pro") ||
    normalized.includes("championnat par equipes pro")
  ) {
    return "season-pro-team";
  }

  if (normalized.includes("championnat individuel pro")) {
    return "season-pro-individual";
  }

  if (
    normalized.includes("championnats u21") ||
    normalized.includes("championnats u25")
  ) {
    return "season-young-team";
  }

  if (
    normalized.includes("cdm interéquipe") ||
    normalized.includes("cdm interequipe")
  ) {
    return "season-world-cup";
  }

  return `prize-table-${index + 1}`;
}

function buildPrizeReferenceTables(): PrizeReferenceTable[] {
  const content = findPortletContent("Les primes");

  if (!content) {
    return [];
  }

  return Array.from(content.querySelectorAll("table"))
    .map((table, index) => {
      const matrix = parseTable(table);

      if (matrix.length < 2) {
        return null;
      }

      const headers = matrix[0];
      const columnLabels = headers.slice(1).map((header, headerIndex) => {
        const normalizedHeader = normalizeText(header);
        return normalizedHeader || (headerIndex === 0 ? "Montant" : `Colonne ${headerIndex + 1}`);
      });

      const rows: PrizeReferenceRow[] = matrix.slice(1).map((cells) => {
        const values = Object.fromEntries(
          columnLabels.map((columnLabel, columnIndex) => [
            columnLabel,
            parseAmount(cells[columnIndex + 1] ?? ""),
          ])
        );

        return {
          position: cells[0],
          values,
        };
      });

      const title = findTableTitle(table, index);

      return {
        id: normalizePrizeTableId(title, index),
        title,
        columnLabels,
        rows,
      };
    })
    .filter((table): table is PrizeReferenceTable => table !== null);
}

export const FACILITY_FINANCIAL_RULES = buildFacilityFinancialRules();
export const PRIZE_REFERENCE_TABLES = buildPrizeReferenceTables();

export function getFacilityLabel(facilityKey: FacilityKey): string {
  return FACILITY_LABELS[facilityKey];
}

export function getFacilityUpgradeCost(
  facilityKey: FacilityKey,
  targetLevel: number
): number | null {
  return FACILITY_FINANCIAL_RULES[facilityKey][targetLevel]?.upgradeCost ?? null;
}

export function getFacilityWeeklyMaintenance(
  facilityKey: FacilityKey,
  level: number
): number {
  return FACILITY_FINANCIAL_RULES[facilityKey][level]?.weeklyMaintenance ?? 0;
}

export function getPrizeColumnLabelForDivision(division: DivisionLevel): string {
  return `Division ${division.replace("D", "")}`;
}

export function getPrizeAmount(
  tableId: string,
  position: string,
  columnLabel: string
): number | null {
  const table = PRIZE_REFERENCE_TABLES.find((entry) => entry.id === tableId);
  const row = table?.rows.find((entry) => {
    return normalizePositionLabel(entry.position) === normalizePositionLabel(position);
  });

  if (!row) {
    return null;
  }

  const exactColumn = Object.keys(row.values).find(
    (label) => normalizeComparable(label) === normalizeComparable(columnLabel)
  );

  return row.values[exactColumn ?? columnLabel] ?? null;
}