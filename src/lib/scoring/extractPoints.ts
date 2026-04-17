// Extraction des points de tous les résultats collés
// Format attendu : chaque résultat est une string TSV (tabulation)

export type RiderPoints = {
  name: string;
  team: string;
  points: number;
};

export type StoredResult = { result: string; category: "pro" | "u25" | "u21" } | string;

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
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, StoredResult>;
  } catch {
    return {};
  }
}
