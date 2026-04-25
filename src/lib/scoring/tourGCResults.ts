// Stockage des classements généraux finaux des tours (MT/GT)
// Chaque entrée est indexée par tourKey → texte TSV brut collé depuis PCM

const TOUR_GC_RESULTS_KEY = "cymanager:tour-gc-results";

function normalizeGCResultStore(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (store, [key, val]) => {
      if (typeof val === "string" && val.trim().length > 0) {
        store[key] = val;
      }

      return store;
    },
    {}
  );
}

export function getAllTourGCResultsFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TOUR_GC_RESULTS_KEY);

    if (!raw) {
      return {};
    }

    return normalizeGCResultStore(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveTourGCResultToStorage(tourKey: string, resultText: string): void {
  try {
    const existing = getAllTourGCResultsFromStorage();
    existing[tourKey] = resultText;
    localStorage.setItem(TOUR_GC_RESULTS_KEY, JSON.stringify(existing));

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cymanager:tour-gc-results-updated"));
    }
  } catch (error) {
    console.error("Erreur d'écriture localStorage tour GC results", error);
  }
}

export function removeTourGCResultFromStorage(tourKey: string): void {
  try {
    const existing = getAllTourGCResultsFromStorage();
    delete existing[tourKey];
    localStorage.setItem(TOUR_GC_RESULTS_KEY, JSON.stringify(existing));

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cymanager:tour-gc-results-updated"));
    }
  } catch (error) {
    console.error("Erreur suppression localStorage tour GC result", error);
  }
}

export function normalizeTourGCResultStore(value: unknown): Record<string, string> {
  return normalizeGCResultStore(value);
}
