const ROSTER_HISTORY_VIEW_STORAGE_KEY = "cymanager:roster-history-view";

export type RosterHistoryCategoryFilter = "all" | "Pro" | "U25" | "U21";
export type RosterHistoryAlertKindFilter = "all" | "salary-drift" | "value-drop" | "veteran-yield" | "peak-passed";

export type RosterHistoryViewPreferences = {
  categoryFilter: RosterHistoryCategoryFilter;
  alertKindFilter: RosterHistoryAlertKindFilter;
  highAlertsOnly: boolean;
  selectedRiderId: string;
};

const DEFAULT_ROSTER_HISTORY_VIEW_PREFERENCES: RosterHistoryViewPreferences = {
  categoryFilter: "all",
  alertKindFilter: "all",
  highAlertsOnly: false,
  selectedRiderId: "",
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeCategoryFilter(value: unknown): RosterHistoryCategoryFilter {
  return value === "Pro" || value === "U25" || value === "U21" ? value : "all";
}

function normalizeAlertKindFilter(value: unknown): RosterHistoryAlertKindFilter {
  return value === "salary-drift" || value === "value-drop" || value === "veteran-yield" || value === "peak-passed"
    ? value
    : "all";
}

export function normalizeRosterHistoryViewPreferences(value: unknown): RosterHistoryViewPreferences {
  if (!isObjectRecord(value)) {
    return DEFAULT_ROSTER_HISTORY_VIEW_PREFERENCES;
  }

  return {
    categoryFilter: normalizeCategoryFilter(value.categoryFilter),
    alertKindFilter: normalizeAlertKindFilter(value.alertKindFilter),
    highAlertsOnly: value.highAlertsOnly === true,
    selectedRiderId: typeof value.selectedRiderId === "string" ? value.selectedRiderId : "",
  };
}

export function loadRosterHistoryViewPreferences(): RosterHistoryViewPreferences {
  try {
    const raw = localStorage.getItem(ROSTER_HISTORY_VIEW_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_ROSTER_HISTORY_VIEW_PREFERENCES;
    }

    return normalizeRosterHistoryViewPreferences(JSON.parse(raw));
  } catch (error) {
    console.error("Erreur de lecture localStorage vue historique roster", error);
    return DEFAULT_ROSTER_HISTORY_VIEW_PREFERENCES;
  }
}

export function saveRosterHistoryViewPreferences(
  preferences: RosterHistoryViewPreferences
): RosterHistoryViewPreferences {
  const normalized = normalizeRosterHistoryViewPreferences(preferences);

  try {
    localStorage.setItem(ROSTER_HISTORY_VIEW_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error("Erreur d'écriture localStorage vue historique roster", error);
  }

  return normalized;
}