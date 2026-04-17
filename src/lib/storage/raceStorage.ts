import type { RiderRaceSetup } from "../../types/race";

const RACE_SETUP_STORAGE_KEY = "cymanager:race-setup";

type RaceSetupStore = Record<string, Record<string, RiderRaceSetup>>;

function loadStore(): RaceSetupStore {
  try {
    const raw = localStorage.getItem(RACE_SETUP_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed as RaceSetupStore;
  } catch (error) {
    console.error("Erreur de lecture localStorage race setup", error);
    return {};
  }
}

function saveStore(store: RaceSetupStore): void {
  try {
    localStorage.setItem(RACE_SETUP_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Erreur d'écriture localStorage race setup", error);
  }
}

export function loadRaceSetup(raceKey: string): Record<string, RiderRaceSetup> {
  const store = loadStore();
  return store[raceKey] ?? {};
}

export function saveRaceSetup(
  raceKey: string,
  setupByRider: Record<string, RiderRaceSetup>
): void {
  const store = loadStore();
  store[raceKey] = setupByRider;
  saveStore(store);
}