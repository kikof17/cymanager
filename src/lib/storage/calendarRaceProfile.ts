import type { ParsedRace } from '../../types/race';

const CALENDAR_RACE_PROFILE_KEY = 'cymanager:calendar-race-profiles';

type CalendarRaceProfileStore = Record<string, ParsedRace>;

function loadStore(): CalendarRaceProfileStore {
  try {
    const raw = localStorage.getItem(CALENDAR_RACE_PROFILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as CalendarRaceProfileStore;
  } catch (error) {
    console.error('Erreur de lecture localStorage calendar race profiles', error);
    return {};
  }
}

function saveStore(store: CalendarRaceProfileStore): void {
  try {
    localStorage.setItem(CALENDAR_RACE_PROFILE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Erreur d\'écriture localStorage calendar race profiles', error);
  }
}

export function saveCalendarRaceProfile(raceKey: string, profile: ParsedRace): void {
  const store = loadStore();
  store[raceKey] = profile;
  saveStore(store);
}

export function loadCalendarRaceProfile(raceKey: string): ParsedRace | null {
  const store = loadStore();
  return store[raceKey] ?? null;
}
