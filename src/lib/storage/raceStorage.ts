import type { RiderRaceSetup } from "../../types/race";

const RACE_SETUP_STORAGE_KEY = "cymanager:race-setup";

type RaceSetupStore = Record<string, Record<string, RiderRaceSetup>>;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function normalizeRiderRaceSetup(value: unknown): RiderRaceSetup | null {
  if (!isObjectRecord(value) || typeof value.riderId !== "string") {
    return null;
  }

  const role =
    value.role === "Leader" || value.role === "Équipier" || value.role === "Électron libre"
      ? value.role
      : null;

  if (!role) {
    return null;
  }

  return {
    riderId: value.riderId,
    role,
    effortPercent: Math.min(100, Math.max(0, toFiniteNumber(value.effortPercent, 75))),
    morningBreakaway: Boolean(value.morningBreakaway),
  };
}

export function normalizeRaceSetupStore(value: unknown): RaceSetupStore {
  if (!isObjectRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<RaceSetupStore>((store, [raceKey, setupByRider]) => {
    if (!isObjectRecord(setupByRider)) {
      return store;
    }

    const normalizedSetup = Object.entries(setupByRider).reduce<Record<string, RiderRaceSetup>>(
      (accumulator, [riderKey, setup]) => {
        const normalized = normalizeRiderRaceSetup(setup);

        if (normalized) {
          accumulator[riderKey] = normalized;
        }

        return accumulator;
      },
      {}
    );

    if (Object.keys(normalizedSetup).length > 0) {
      store[raceKey] = normalizedSetup;
    }

    return store;
  }, {});
}

function loadStore(): RaceSetupStore {
  try {
    const raw = localStorage.getItem(RACE_SETUP_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    return normalizeRaceSetupStore(parsed);
  } catch (error) {
    console.error("Erreur de lecture localStorage race setup", error);
    return {};
  }
}

function saveStore(store: RaceSetupStore): void {
  try {
    localStorage.setItem(RACE_SETUP_STORAGE_KEY, JSON.stringify(normalizeRaceSetupStore(store)));
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
  store[raceKey] = normalizeRaceSetupStore({ [raceKey]: setupByRider })[raceKey] ?? {};
  saveStore(store);
}

export function loadRaceSetupStore(): RaceSetupStore {
  return loadStore();
}

export function saveRaceSetupStore(store: RaceSetupStore): void {
  saveStore(store);
}