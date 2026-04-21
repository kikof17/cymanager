import { loadCalendarRaceProfileStore, saveCalendarRaceProfileStore } from "./calendarRaceProfile";
import { getAllResultsFromStorage, getStoredResultRaceKey, reconcileStoredResultsWithCourses, saveAllResultsToStorage } from "../scoring/extractPoints";
import { buildRaceSnapshotKey, loadLastRaceSnapshot, saveLastRaceSnapshot } from "./lastRaceStorage";
import { loadRaceSetupStore, saveRaceSetupStore } from "./raceStorage";
import { syncFinanceWithSettings } from "./financeStorage";
import { loadClubSettings } from "./settingsStorage";
import { loadManualTodos, loadTodoStatuses } from "./todoStorage";
import { buildLegacyRaceKey, isStableOpaqueRaceKey } from "../utils/raceIdentity";
import { migrateCalendarRaceIdentities } from "./raceIdentityMigration";

type DiagnosticSeverity = "info" | "warning";

export type StorageDiagnosticIssue = {
  code: string;
  severity: DiagnosticSeverity;
  label: string;
  count: number;
  details?: string;
  keys?: string[];
  cleanupLabel?: string;
};

export type StorageDiagnosticsSummary = {
  invalidRecordCount: number;
  orphanRecordCount: number;
  issueCount: number;
  issues: StorageDiagnosticIssue[];
};

export type StorageCleanupResult = {
  removedEntries: number;
  refreshedFinance: boolean;
};

function readRawJson(storageKey: string): unknown | undefined {
  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return undefined;
    }

    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function countObjectKeys(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }

  return Object.keys(value).length;
}

function countRawRaceSetupEntries(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }

  return Object.values(value).reduce((total, setupByRider) => {
    if (!setupByRider || typeof setupByRider !== "object" || Array.isArray(setupByRider)) {
      return total;
    }

    return total + Object.keys(setupByRider).length;
  }, 0);
}

function countNormalizedRaceSetupEntries(store: Record<string, Record<string, unknown>>): number {
  return Object.values(store).reduce((total, setupByRider) => total + Object.keys(setupByRider).length, 0);
}

function buildDetails(keys: string[], maxItems = 3): string | undefined {
  if (keys.length === 0) {
    return undefined;
  }

  const visibleKeys = keys.slice(0, maxItems);
  const suffix = keys.length > maxItems ? `, +${keys.length - maxItems}` : "";

  return `${visibleKeys.join(", ")}${suffix}`;
}

export function getStorageDiagnostics(): StorageDiagnosticsSummary {
  const issues: StorageDiagnosticIssue[] = [];

  const rawManualTodos = readRawJson("cymanager:manual-todos");
  const normalizedManualTodos = loadManualTodos();
  const invalidManualTodos = Array.isArray(rawManualTodos)
    ? Math.max(0, rawManualTodos.length - normalizedManualTodos.length)
    : rawManualTodos === undefined
      ? 0
      : 1;

  if (invalidManualTodos > 0) {
    issues.push({
      code: "invalid-manual-todos",
      severity: "info",
      label: "Des todos incomplets ont été écartés à l'ouverture.",
      count: invalidManualTodos,
    });
  }

  const rawTodoStatuses = readRawJson("cymanager:todo-status");
  const normalizedTodoStatuses = loadTodoStatuses();
  const invalidTodoStatuses = rawTodoStatuses && typeof rawTodoStatuses === "object" && !Array.isArray(rawTodoStatuses)
    ? Math.max(0, Object.keys(rawTodoStatuses).length - Object.keys(normalizedTodoStatuses).length)
    : rawTodoStatuses === undefined
      ? 0
      : 1;

  if (invalidTodoStatuses > 0) {
    issues.push({
      code: "invalid-todo-statuses",
      severity: "info",
      label: "Des statuts todo incohérents ont été remis à zéro.",
      count: invalidTodoStatuses,
    });
  }

  const rawRaceSetup = readRawJson("cymanager:race-setup");
  const normalizedRaceSetup = loadRaceSetupStore();
  const invalidRaceSetupEntries = Math.max(
    0,
    countRawRaceSetupEntries(rawRaceSetup) - countNormalizedRaceSetupEntries(normalizedRaceSetup as Record<string, Record<string, unknown>>)
  );

  if (invalidRaceSetupEntries > 0) {
    issues.push({
      code: "invalid-race-setup",
      severity: "info",
      label: "Des réglages de course incomplets ont été ignorés.",
      count: invalidRaceSetupEntries,
    });
  }

  const rawCalendarProfiles = readRawJson("cymanager:calendar-race-profiles");
  const normalizedCalendarProfiles = loadCalendarRaceProfileStore();
  const invalidCalendarProfiles = Math.max(
    0,
    countObjectKeys(rawCalendarProfiles) - Object.keys(normalizedCalendarProfiles).length
  );

  if (invalidCalendarProfiles > 0) {
    issues.push({
      code: "invalid-calendar-profiles",
      severity: "info",
      label: "Des profils calendrier invalides ont été écartés.",
      count: invalidCalendarProfiles,
    });
  }

  const rawResults = readRawJson("cymanager:results");
  const normalizedResults = getAllResultsFromStorage();
  const invalidResults = Math.max(0, countObjectKeys(rawResults) - Object.keys(normalizedResults).length);

  if (invalidResults > 0) {
    issues.push({
      code: "invalid-results",
      severity: "info",
      label: "Des résultats incomplets ont été exclus du chargement.",
      count: invalidResults,
    });
  }

  const rawLastRace = readRawJson("cymanager:last-race");
  const normalizedLastRace = loadLastRaceSnapshot();
  const invalidLastRace = rawLastRace !== undefined && normalizedLastRace === null ? 1 : 0;

  if (invalidLastRace > 0) {
    issues.push({
      code: "invalid-last-race",
      severity: "info",
      label: "Le dernier snapshot de course n'a pas pu être repris.",
      count: invalidLastRace,
    });
  }

  const calendarTodos = normalizedManualTodos.filter((todo) => todo.id.startsWith("calendar-"));
  const calendarTodoMap = new Map(calendarTodos.map((todo) => [todo.id, todo]));
  const calendarTodoIds = new Set(calendarTodos.map((todo) => todo.id));
  const calendarRaceKeys = new Set(
    calendarTodos
      .map((todo) => todo.raceKey)
      .filter((raceKey): raceKey is string => typeof raceKey === "string" && raceKey.length > 0)
  );
  const calendarProfileLegacyKeys = new Set(
    Object.values(normalizedCalendarProfiles).map((profile) => buildLegacyRaceKey(profile))
  );
  // Lot 2 — identité stable : todos calendrier sans raceKey opaque stable
  const unstableIdentityTodos = calendarTodos.filter(
    (todo) => !isStableOpaqueRaceKey(todo.raceKey)
  );

  const raceSetupOrphans = Object.keys(normalizedRaceSetup).filter((raceKey) => !calendarRaceKeys.has(raceKey));
  const calendarProfileOrphans = Object.keys(normalizedCalendarProfiles).filter(
    (raceKey) => !calendarRaceKeys.has(raceKey)
  );
  const resultOrphans = Object.keys(normalizedResults).filter((resultKey) => !calendarTodoIds.has(resultKey));
  const resultMissingRaceReferences = Object.entries(normalizedResults)
    .filter(([courseId]) => calendarTodoIds.has(courseId))
    .filter(([, stored]) => getStoredResultRaceKey(stored) === null)
    .map(([courseId]) => courseId);
  const resultMismatchedRaceReferences = Object.entries(normalizedResults)
    .filter(([courseId]) => calendarTodoIds.has(courseId))
    .filter(([courseId, stored]) => {
      const todo = calendarTodoMap.get(courseId);
      const storedRaceKey = getStoredResultRaceKey(stored);

      if (!todo?.raceKey || !storedRaceKey) {
        return false;
      }

      return todo.raceKey !== storedRaceKey;
    })
    .map(([courseId]) => courseId);

  if (unstableIdentityTodos.length > 0) {
    issues.push({
      code: "unstable-calendar-race-identity",
      severity: "warning",
      label: "Des courses du calendrier n'ont pas encore de clé d'identité stable.",
      count: unstableIdentityTodos.length,
      details: buildDetails(unstableIdentityTodos.map((t) => t.title)),
      keys: unstableIdentityTodos.map((t) => t.id),
      cleanupLabel: "Stabiliser l'identité de ces courses",
    });
  }

  if (raceSetupOrphans.length > 0) {
    issues.push({
      code: "orphan-race-setup",
      severity: "warning",
      label: "Des réglages de course ne sont plus reliés au calendrier.",
      count: raceSetupOrphans.length,
      details: buildDetails(raceSetupOrphans),
      keys: raceSetupOrphans,
      cleanupLabel: "Supprimer ces réglages isolés",
    });
  }

  if (calendarProfileOrphans.length > 0) {
    issues.push({
      code: "orphan-calendar-profiles",
      severity: "warning",
      label: "Des profils de course ne sont plus reliés au calendrier.",
      count: calendarProfileOrphans.length,
      details: buildDetails(calendarProfileOrphans),
      keys: calendarProfileOrphans,
      cleanupLabel: "Supprimer ces profils isolés",
    });
  }

  if (resultOrphans.length > 0) {
    issues.push({
      code: "orphan-results",
      severity: "warning",
      label: "Des résultats ne correspondent plus à une course du calendrier.",
      count: resultOrphans.length,
      details: buildDetails(resultOrphans),
      keys: resultOrphans,
      cleanupLabel: "Supprimer ces résultats isolés",
    });
  }

  if (resultMissingRaceReferences.length > 0) {
    issues.push({
      code: "missing-result-race-reference",
      severity: "warning",
      label: "Des résultats enregistrés n'ont pas encore de référence stable de course.",
      count: resultMissingRaceReferences.length,
      details: buildDetails(resultMissingRaceReferences),
      keys: resultMissingRaceReferences,
      cleanupLabel: "Rattacher ces résultats à leur course",
    });
  }

  if (resultMismatchedRaceReferences.length > 0) {
    issues.push({
      code: "mismatched-result-race-reference",
      severity: "warning",
      label: "Des résultats pointent vers une référence de course qui ne correspond plus au calendrier.",
      count: resultMismatchedRaceReferences.length,
      details: buildDetails(resultMismatchedRaceReferences),
      keys: resultMismatchedRaceReferences,
      cleanupLabel: "Réaligner ces références de résultats",
    });
  }

  const lastRaceKey = buildRaceSnapshotKey(normalizedLastRace);

  if (
    lastRaceKey &&
    !calendarRaceKeys.has(lastRaceKey) &&
    !calendarProfileLegacyKeys.has(lastRaceKey) &&
    !Object.prototype.hasOwnProperty.call(normalizedCalendarProfiles, lastRaceKey) &&
    !Object.prototype.hasOwnProperty.call(normalizedRaceSetup, lastRaceKey)
  ) {
    issues.push({
      code: "orphan-last-race",
      severity: "warning",
      label: "La dernière course mémorisée ne correspond plus aux données actuelles.",
      count: 1,
      details: lastRaceKey,
      keys: [lastRaceKey],
      cleanupLabel: "Effacer cette dernière course",
    });
  }

  return {
    invalidRecordCount: issues
      .filter((issue) => issue.severity === "info")
      .reduce((total, issue) => total + issue.count, 0),
    orphanRecordCount: issues
      .filter((issue) => issue.severity === "warning")
      .reduce((total, issue) => total + issue.count, 0),
    issueCount: issues.length,
    issues,
  };
}

export function cleanupStorageDiagnosticIssue(issue: StorageDiagnosticIssue): StorageCleanupResult {
  let removedEntries = 0;
  let refreshedFinance = false;

  if (!issue.keys || issue.keys.length === 0) {
    return { removedEntries, refreshedFinance };
  }

  switch (issue.code) {
    case "orphan-race-setup": {
      const store = loadRaceSetupStore();

      issue.keys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(store, key)) {
          delete store[key];
          removedEntries += 1;
        }
      });

      saveRaceSetupStore(store);
      break;
    }
    case "orphan-calendar-profiles": {
      const store = loadCalendarRaceProfileStore();

      issue.keys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(store, key)) {
          removedEntries += 1;
        }
      });

      saveCalendarRaceProfileStore(store);
      break;
    }
    case "orphan-results": {
      const store = getAllResultsFromStorage();

      issue.keys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(store, key)) {
          delete store[key];
          removedEntries += 1;
        }
      });

      saveAllResultsToStorage(store);
      syncFinanceWithSettings(loadClubSettings());
      refreshedFinance = true;
      break;
    }
    case "missing-result-race-reference":
    case "mismatched-result-race-reference": {
      const store = getAllResultsFromStorage();
      const courses = loadManualTodos().filter((todo) => todo.id.startsWith("calendar-"));
      const repaired = reconcileStoredResultsWithCourses(store, courses);

      if (repaired.repairedCount > 0) {
        saveAllResultsToStorage(repaired.results);
        removedEntries = repaired.repairedCount;
        syncFinanceWithSettings(loadClubSettings());
        refreshedFinance = true;
      }

      break;
    }
    case "unstable-calendar-race-identity": {
      const result = migrateCalendarRaceIdentities();
      removedEntries = result.migratedCount;
      if (result.resultsReconciled > 0) {
        syncFinanceWithSettings(loadClubSettings());
        refreshedFinance = true;
      }
      break;
    }
    case "orphan-last-race": {
      if (loadLastRaceSnapshot()) {
        saveLastRaceSnapshot(null);
        removedEntries = 1;
      }
      break;
    }
    default:
      break;
  }

  return { removedEntries, refreshedFinance };
}