import type { ParsedRace } from '../../types/race';
import { parseCourseDateLabel } from '../utils/courseDates';
import { extractStageNumber } from '../utils/stageRaces';

const CALENDAR_RACE_PROFILE_KEY = 'cymanager:calendar-race-profiles';

type CalendarRaceProfileStore = Record<string, ParsedRace>;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

const VALID_RACE_TYPES: ParsedRace['raceType'][] = ['simple', 'etapes'];
const VALID_RACE_PROFILES: ParsedRace['detectedProfile'][] = [
  'Plaine',
  'Vallon',
  'Montagne',
  'CLM',
  'Pavé',
  'Flandrien',
  'Mixte',
];

function normalizeParsedRace(value: unknown): ParsedRace | null {
  if (!isObjectRecord(value) || typeof value.name !== 'string') {
    return null;
  }

  const raceType = VALID_RACE_TYPES.includes(value.raceType as ParsedRace['raceType'])
    ? (value.raceType as ParsedRace['raceType'])
    : null;
  const detectedProfile = VALID_RACE_PROFILES.includes(
    value.detectedProfile as ParsedRace['detectedProfile']
  )
    ? (value.detectedProfile as ParsedRace['detectedProfile'])
    : null;

  if (!raceType || !detectedProfile) {
    return null;
  }

  const weightsCandidate = isObjectRecord(value.weights) ? value.weights : {};

  return {
    rawText: typeof value.rawText === 'string' ? value.rawText : '',
    name: value.name.trim(),
    raceType,
    distanceKm: Math.max(0, toFiniteNumber(value.distanceKm)),
    raceKey: typeof value.raceKey === 'string' && value.raceKey.trim().length > 0 ? value.raceKey : undefined,
    scheduledAt:
      typeof value.scheduledAt === 'string' && value.scheduledAt.trim().length > 0
        ? parseCourseDateLabel(value.scheduledAt) ?? value.scheduledAt
        : undefined,
    stageNumber:
      typeof value.stageNumber === 'number' && Number.isInteger(value.stageNumber)
        ? value.stageNumber
        : extractStageNumber(value.name) ?? undefined,
    tourKey: typeof value.tourKey === 'string' ? value.tourKey : undefined,
    detectedProfile,
    weights: {
      flat: toFiniteNumber(weightsCandidate.flat),
      hill: toFiniteNumber(weightsCandidate.hill),
      mountain: toFiniteNumber(weightsCandidate.mountain),
      sprint: toFiniteNumber(weightsCandidate.sprint),
      cobble: toFiniteNumber(weightsCandidate.cobble),
      timeTrial: toFiniteNumber(weightsCandidate.timeTrial),
      breakaway: toFiniteNumber(weightsCandidate.breakaway),
      endurance: toFiniteNumber(weightsCandidate.endurance),
      resistance: toFiniteNumber(weightsCandidate.resistance),
      recovery: toFiniteNumber(weightsCandidate.recovery),
      stageRace: toFiniteNumber(weightsCandidate.stageRace),
    },
    summary: Array.isArray(value.summary)
      ? value.summary.filter((line): line is string => typeof line === 'string')
      : [],
    category: value.category === 'U21' || value.category === 'U25' || value.category === 'Pro'
      ? value.category
      : null,
  };
}

export function normalizeCalendarRaceProfileStore(value: unknown): CalendarRaceProfileStore {
  if (!isObjectRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<CalendarRaceProfileStore>((store, [raceKey, profile]) => {
    const normalized = normalizeParsedRace(profile);

    if (normalized) {
      store[raceKey] = normalized;
    }

    return store;
  }, {});
}

function loadStore(): CalendarRaceProfileStore {
  try {
    const raw = localStorage.getItem(CALENDAR_RACE_PROFILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizeCalendarRaceProfileStore(parsed);
  } catch (error) {
    console.error('Erreur de lecture localStorage calendar race profiles', error);
    return {};
  }
}

function saveStore(store: CalendarRaceProfileStore): void {
  try {
    localStorage.setItem(CALENDAR_RACE_PROFILE_KEY, JSON.stringify(normalizeCalendarRaceProfileStore(store)));
  } catch (error) {
    console.error('Erreur d\'écriture localStorage calendar race profiles', error);
  }
}

export function saveCalendarRaceProfile(raceKey: string, profile: ParsedRace): void {
  const store = loadStore();
  store[raceKey] = { ...profile, raceKey };
  saveStore(store);
}

export function loadCalendarRaceProfile(raceKey: string): ParsedRace | null {
  const store = loadStore();
  return store[raceKey] ?? null;
}

export function loadCalendarRaceProfileStore(): CalendarRaceProfileStore {
  return loadStore();
}

export function saveCalendarRaceProfileStore(store: CalendarRaceProfileStore): void {
  saveStore(store);
}
