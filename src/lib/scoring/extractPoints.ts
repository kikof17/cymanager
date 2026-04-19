// Extraction des points de tous les résultats collés
// Format attendu : chaque résultat est une string TSV (tabulation)

export type RiderPoints = {
  name: string;
  team: string;
  points: number;
};

export type StoredResult = { result: string; category: "pro" | "u25" | "u21" } | string;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeStoredResult(value: unknown): StoredResult | null {
  if (typeof value === "string") {
    return value.trim().length > 0 ? value : null;
  }

  if (!isObjectRecord(value) || typeof value.result !== "string") {
    return null;
  }

  const category = value.category === "u25" || value.category === "u21" ? value.category : "pro";

  return {
    result: value.result,
    category,
  };
}

export function normalizeStoredResults(value: unknown): Record<string, StoredResult> {
  if (!isObjectRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, StoredResult>>((results, [raceId, stored]) => {
    const normalized = normalizeStoredResult(stored);

    if (normalized) {
      results[raceId] = normalized;
    }

    return results;
  }, {});
}

export function extractPointsFromResults(results: Record<string, StoredResult>): RiderPoints[] {
  const all: RiderPoints[] = [];
  Object.values(results).forEach((stored) => {
    const result = typeof stored === "string" ? stored : stored.result;
    const lines = result.trim().split(/\r?\n/);
    if (lines.length < 2) return;
    const headers = lines[0].split('\t');
    const nameIdx = headers.findIndex((h) => h.toLowerCase().includes('nom'));
    const teamIdx = headers.findIndex((h) => h.toLowerCase().includes('equipe'));
    const pointsIdx = headers.findIndex((h) => h.toLowerCase().includes('point'));
    if (nameIdx === -1 || teamIdx === -1 || pointsIdx === -1) return;
    lines.slice(1).forEach((line) => {
      const cells = line.split('\t');
      const name = cells[nameIdx]?.trim();
      const team = cells[teamIdx]?.trim();
      const points = parseInt(cells[pointsIdx]?.replace(/[^\d]/g, "") || "0", 10);
      if (name && team && !isNaN(points)) {
        all.push({ name, team, points });
      }
    });
  });
  return all;
}

// Utilitaire pour accès universel (évite import cyclique)
export function getAllResultsFromStorage(): Record<string, StoredResult> {
  try {
    const raw = localStorage.getItem("cymanager:results");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizeStoredResults(parsed);
  } catch {
    return {};
  }
}

export function saveAllResultsToStorage(results: Record<string, StoredResult>): void {
  try {
    localStorage.setItem("cymanager:results", JSON.stringify(normalizeStoredResults(results)));
  } catch (error) {
    console.error("Erreur d'écriture localStorage results", error);
  }
}
