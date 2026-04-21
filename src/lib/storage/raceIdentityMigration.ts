/**
 * Lot 2 — Identité stable des courses
 *
 * Ce module migre les todos du calendrier dont la raceKey est absente ou au
 * format legacy (`nom::type::dist::profil`) vers des clés opaques stables
 * (`race-<uuid>`), puis déplace les setups et profils de course associés.
 */

import { createRaceKey, isStableOpaqueRaceKey } from "../utils/raceIdentity";
import { loadManualTodos, saveManualTodos } from "./todoStorage";
import { loadRaceSetupStore, saveRaceSetupStore } from "./raceStorage";
import {
  loadCalendarRaceProfileStore,
  saveCalendarRaceProfileStore,
} from "./calendarRaceProfile";
import {
  getAllResultsFromStorage,
  reconcileStoredResultsWithCourses,
  saveAllResultsToStorage,
} from "../scoring/extractPoints";
import type { TodoItem } from "../../types/todo";

export type CalendarIdentityMigrationResult = {
  /** Nombre de todos ayant reçu une nouvelle clé stable */
  migratedCount: number;
  /** Nombre de setups déplacés vers la nouvelle clé */
  setupsMigrated: number;
  /** Nombre de profils déplacés vers la nouvelle clé */
  profilesMigrated: number;
  /** Nombre de résultats réconciliés avec la nouvelle clé */
  resultsReconciled: number;
};

/** Analyse sans modifier — retourne le nombre de todos non stabilisés. */
export function countUnstableCalendarIdentities(): number {
  const todos = loadManualTodos();
  return todos
    .filter((todo) => todo.id.startsWith("calendar-"))
    .filter((todo) => !isStableOpaqueRaceKey(todo.raceKey)).length;
}

/**
 * Migre tous les todos calendrier sans clé stable.
 * - Clé absente : assigne une nouvelle clé opaque.
 * - Clé legacy (pas de préfixe "race-") : assigne une nouvelle clé opaque et
 *   déplace le setup et le profil de course stockés sous l'ancienne clé.
 *
 * Sauvegarde les todos, setups et profils mis à jour, puis réconcilie les
 * résultats pour aligner leur raceKey interne.
 */
export function migrateCalendarRaceIdentities(): CalendarIdentityMigrationResult {
  const todos = loadManualTodos();
  const setupStore = loadRaceSetupStore();
  const profileStore = loadCalendarRaceProfileStore();

  let migratedCount = 0;
  let setupsMigrated = 0;
  let profilesMigrated = 0;

  // Table de correspondance : ancienne clé legacy → nouvelle clé opaque
  const keyMap = new Map<string, string>();

  const updatedTodos: TodoItem[] = todos.map((todo) => {
    if (!todo.id.startsWith("calendar-")) return todo;
    if (isStableOpaqueRaceKey(todo.raceKey)) return todo;

    const oldKey = todo.raceKey ?? null;
    const newKey = createRaceKey();

    if (oldKey) {
      keyMap.set(oldKey, newKey);
    }

    migratedCount++;
    return { ...todo, raceKey: newKey };
  });

  if (migratedCount === 0) {
    return { migratedCount: 0, setupsMigrated: 0, profilesMigrated: 0, resultsReconciled: 0 };
  }

  // Déplacer les setups et profils des anciennes clés vers les nouvelles
  keyMap.forEach((newKey, oldKey) => {
    if (setupStore[oldKey]) {
      setupStore[newKey] = setupStore[oldKey];
      delete setupStore[oldKey];
      setupsMigrated++;
    }

    if (profileStore[oldKey]) {
      profileStore[newKey] = { ...profileStore[oldKey], raceKey: newKey };
      delete profileStore[oldKey];
      profilesMigrated++;
    }
  });

  // Persistance
  saveManualTodos(updatedTodos);
  saveRaceSetupStore(setupStore);
  saveCalendarRaceProfileStore(profileStore);

  // Réconciliation des résultats (alignement de la raceKey interne)
  const calendarTodos = updatedTodos.filter((t) => t.id.startsWith("calendar-"));
  const { results, repairedCount } = reconcileStoredResultsWithCourses(
    getAllResultsFromStorage(),
    calendarTodos
  );
  if (repairedCount > 0) {
    saveAllResultsToStorage(results);
  }

  return {
    migratedCount,
    setupsMigrated,
    profilesMigrated,
    resultsReconciled: repairedCount,
  };
}
