import type { Rider } from "../../types/rider";

const RIDERS_STORAGE_KEY = "cymanager:riders";

export function loadRidersFromStorage(): Rider[] {
  try {
    const raw = localStorage.getItem(RIDERS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Rider[];
  } catch (error) {
    console.error("Erreur de lecture localStorage riders", error);
    return [];
  }
}

export function saveRidersToStorage(riders: Rider[]): void {
  try {
    localStorage.setItem(RIDERS_STORAGE_KEY, JSON.stringify(riders));
  } catch (error) {
    console.error("Erreur d'écriture localStorage riders", error);
  }
}