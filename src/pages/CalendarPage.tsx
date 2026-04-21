import React, { useMemo, useState } from 'react';
import Card from '../components/common/Card';
import PageTitle from '../components/common/PageTitle';
import RaceSetupTable from '../components/races/RaceSetupTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { buildRiderAvailabilitySummary } from '../lib/scoring/riderAvailability';
import { buildRaceAnalysis } from '../lib/scoring/raceScores';
import { buildDefaultRaceSetupMap } from '../lib/scoring/odcScores';
import { loadCalendarRaceProfile } from '../lib/storage/calendarRaceProfile';
import { createStoredResult, getAllResultsFromStorage, getStoredResultText, saveAllResultsToStorage, type StoredResult } from '../lib/scoring/extractPoints';
import { syncFinanceWithSettings } from '../lib/storage/financeStorage';
import { appendManagementHistoryEntry } from '../lib/storage/managementHistoryStorage';
import { loadRaceSetupStore, saveRaceSetupStore } from '../lib/storage/raceStorage';
import { loadClubSettings } from '../lib/storage/settingsStorage';
import { getTodoResultCategory } from '../lib/utils/courseCategory';
import { getTodoScheduledAt } from '../lib/utils/courseDates';
import { getCourseDisplayTitle, groupCourseTodos } from '../lib/utils/stageRaces';

import { countUnstableCalendarIdentities, migrateCalendarRaceIdentities } from '../lib/storage/raceIdentityMigration';
import { saveManualTodos, loadManualTodos, loadTodoStatuses, saveTodoStatuses } from '../lib/storage/todoStorage';
import type { ParsedRace, RaceRiderScore, RiderRaceSetup } from '../types/race';
import type { TodoItem } from '../types/todo';
import type { Rider } from '../types/rider';

type CourseCategory = 'pro' | 'u25' | 'u21';

function loadStoredResults(): Record<string, StoredResult> {
  return getAllResultsFromStorage();
}

function loadStoredRiders(): Rider[] {
  try {
    const raw = localStorage.getItem('cymanager:riders');
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Rider[]) : [];
  } catch {
    return [];
  }
}

function getCalendarPriorityTone(todo: TodoItem): string {
  if (todo.priority === 'haute') {
    return 'calendar-course-item-danger';
  }

  if (todo.priority === 'basse') {
    return 'calendar-course-item-success';
  }

  if (todo.category === 'courses') {
    return 'calendar-course-item-warning';
  }

  return 'calendar-course-item-neutral';
}

function formatCalendarDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
  }).format(date);
}

function getCourseCategoryForTactic(todo: TodoItem, profile: ParsedRace | null): CourseCategory {
  if (todo.courseCategory === 'u25' || todo.courseCategory === 'u21' || todo.courseCategory === 'pro') {
    return todo.courseCategory;
  }

  if (profile?.category === 'U25') {
    return 'u25';
  }

  if (profile?.category === 'U21') {
    return 'u21';
  }

  return 'pro';
}

function filterEligibleRidersForCourseCategory(riders: Rider[], courseCategory: CourseCategory): Rider[] {
  if (courseCategory === 'u25') {
    return riders.filter(
      (rider) =>
        rider.category === 'U25' &&
        rider.ageYears >= 22 &&
        rider.ageYears <= 25
    );
  }

  if (courseCategory === 'u21') {
    return riders.filter(
      (rider) => rider.category === 'U21' && rider.ageYears <= 21
    );
  }

  return riders;
}


const CalendarPage: React.FC = () => {
  // Hooks inutilisés supprimés (input, parsedList, success)
  const [calendarTodos, setCalendarTodos] = useState<TodoItem[]>(() =>
    loadManualTodos().filter((todo) => todo.id.startsWith('calendar-'))
  );
  const [statuses, setStatuses] = useState<Record<string, 'todo' | 'done'>>(loadTodoStatuses);
  const [identityIssueCount, setIdentityIssueCount] = useState<number>(() =>
    countUnstableCalendarIdentities()
  );
  const [identityRepairMessage, setIdentityRepairMessage] = useState<string | null>(null);

  const groupedCalendarTodos = useMemo(
    () => groupCourseTodos(calendarTodos),
    [calendarTodos]
  );

  // Parsing multi-lignes
  // parseLines supprimé (plus utilisé)

  // handleParse et handleCreateTodos supprimés (plus utilisés)

  // Affichage graphique des étapes détectées
  // renderStageCard supprimé (plus utilisé)

  // Gestion du statut (coché ou non)
  function handleMigrateIdentities() {
    const result = migrateCalendarRaceIdentities();
    setIdentityIssueCount(0);
    setCalendarTodos(loadManualTodos().filter((todo) => todo.id.startsWith('calendar-')));
    setIdentityRepairMessage(
      result.migratedCount > 0
        ? `Identité stabilisée pour ${result.migratedCount} course(s). Setups déplacés : ${result.setupsMigrated}. Profils migrés : ${result.profilesMigrated}.`
        : 'Aucune course à migrer.'
    );
  }

  function handleToggleStatus(id: string) {
    setStatuses((current) => {
      const nextStatus = current[id] === 'done' ? 'todo' : 'done';
      const next: Record<string, "todo" | "done"> = { ...current, [id]: nextStatus };
      saveTodoStatuses(next);
      const todo = calendarTodos.find((item) => item.id === id);

      if (todo) {
        appendManagementHistoryEntry({
          area: 'calendar',
          kind: 'calendar-status',
          title: `${todo.title} marqué ${nextStatus === 'done' ? 'fait' : 'à faire'}`,
          note: `${todo.title} a été basculé dans le calendrier au statut ${nextStatus === 'done' ? 'traité' : 'à traiter'}.`,
          occurredAt: getTodoScheduledAt(todo) ?? todo.createdAt,
        });
      }

      return next;
    });
  }

  // Affichage des étapes déjà ajoutées
  // Suppression d'une étape
  // Confirmation suppression
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  function handleDeleteCalendarTodo(id: string) {
    const deletedTodo = calendarTodos.find((todo) => todo.id === id);

    setCalendarTodos((current) => {
      const next = current.filter((t) => t.id !== id);
      // Mise à jour du localStorage
      const all = loadManualTodos();
      saveManualTodos(all.filter((t) => t.id !== id));
      // Nettoyage du statut
      setStatuses((s) => {
        const ns = { ...s };
        delete ns[id];
        saveTodoStatuses(ns);
        return ns;
      });
      return next;
    });

    if (deletedTodo) {
      appendManagementHistoryEntry({
        area: 'calendar',
        kind: 'calendar-delete',
        title: `Course retirée du calendrier : ${deletedTodo.title}`,
        note: `${deletedTodo.title} a été retirée du calendrier local.`,
        occurredAt: getTodoScheduledAt(deletedTodo) ?? deletedTodo.createdAt,
      });
    }

    setConfirmDeleteId(null);
  }

  // Gestion du module résultat (état local)
  const [resultModalId, setResultModalId] = useState<string|null>(null);
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});
  const [activeResultCourseId, setActiveResultCourseId] = useState<string | null>(null);

  const resultModalCourses = useMemo(() => {
    if (!resultModalId) {
      return [];
    }

    const matchingGroup = groupedCalendarTodos.find((group) =>
      group.todos.some((todo) => todo.id === resultModalId)
    );

    return matchingGroup?.todos ?? [];
  }, [groupedCalendarTodos, resultModalId]);

  const activeResultCourse = useMemo(
    () => resultModalCourses.find((course) => course.id === activeResultCourseId) ?? resultModalCourses[0] ?? null,
    [activeResultCourseId, resultModalCourses]
  );

  const completedResultCount = useMemo(
    () => resultModalCourses.filter((course) => (resultDrafts[course.id] ?? '').trim().length > 0).length,
    [resultDrafts, resultModalCourses]
  );

  function persistResultsForCourses(courseIds: string[]) {
    if (courseIds.length === 0) {
      return;
    }

    const map = loadStoredResults();
    const savedCourses: TodoItem[] = [];

    courseIds.forEach((courseId) => {
      const course = calendarTodos.find((todo) => todo.id === courseId);
      const result = (resultDrafts[courseId] ?? '').trim();

      if (!course || result.length === 0) {
        return;
      }

      map[courseId] = createStoredResult(result, course);
      savedCourses.push(course);
    });

    saveAllResultsToStorage(map);
    const settings = loadClubSettings();
    syncFinanceWithSettings(settings, settings.financialBalance);
    window.dispatchEvent(new Event('cymanager:finance-updated'));

    if (savedCourses.length > 0) {
      const primaryCourse = savedCourses[0];
      appendManagementHistoryEntry({
        area: 'results',
        kind: 'result-save',
        title:
          savedCourses.length > 1
            ? `Résultats enregistrés pour ${savedCourses.length} étape(s)`
            : `Résultat enregistré : ${primaryCourse.title}`,
        note:
          savedCourses.length > 1
            ? `${savedCourses.map((course) => course.stageNumber ? `E${course.stageNumber}` : course.title).join(', ')}.`
            : `${primaryCourse.title} enregistré avec catégorie ${getTodoResultCategory(primaryCourse).toUpperCase()}.`,
        occurredAt: getTodoScheduledAt(primaryCourse) ?? primaryCourse.createdAt,
      });
    }
  }

  function handleOpenResultModal(id: string) {
    const storedResults = loadStoredResults();
    const matchingGroup = groupedCalendarTodos.find((group) =>
      group.todos.some((todo) => todo.id === id)
    );
    const modalCourses = matchingGroup?.todos ?? [];

    setResultModalId(id);
    setActiveResultCourseId(id);
    setResultDrafts(
      modalCourses.reduce<Record<string, string>>((drafts, course) => {
        drafts[course.id] = getStoredResultText(storedResults[course.id]);
        return drafts;
      }, {})
    );
  }
  function handleCloseResultModal() {
    setResultModalId(null);
    setActiveResultCourseId(null);
    setResultDrafts({});
  }

  function handleSaveCurrentResult() {
    if (!activeResultCourse) {
      return;
    }

    persistResultsForCourses([activeResultCourse.id]);
  }

  function handleSaveAllResults() {
    persistResultsForCourses(resultModalCourses.map((course) => course.id));
  }

  function handleSaveAndNextResult() {
    if (!activeResultCourse) {
      return;
    }

    persistResultsForCourses([activeResultCourse.id]);

    const currentIndex = resultModalCourses.findIndex((course) => course.id === activeResultCourse.id);
    const nextCourse = resultModalCourses[currentIndex + 1];

    if (nextCourse) {
      setActiveResultCourseId(nextCourse.id);
    }
  }

  const [tacticModalId, setTacticModalId] = useState<string | null>(null);
  const [tacticCourse, setTacticCourse] = useState<TodoItem | null>(null);
  const [tacticGroupCourses, setTacticGroupCourses] = useState<TodoItem[]>([]);
  const [tacticRaceProfile, setTacticRaceProfile] = useState<ParsedRace | null>(null);
  const [tacticCourseCategory, setTacticCourseCategory] = useState<CourseCategory>('pro');
  const [tacticRanking, setTacticRanking] = useState<RaceRiderScore[]>([]);
  const [tacticRegisteredIds, setTacticRegisteredIds] = useState<string[]>([]);
  const [tacticSetupByRider, setTacticSetupByRider] = useState<Record<string, RiderRaceSetup>>({});
  const [tacticError, setTacticError] = useState<string | null>(null);

  function buildSetupForRegisteredIds(
    race: ParsedRace,
    ranking: RaceRiderScore[],
    registeredIds: string[],
    previousSetup: Record<string, RiderRaceSetup>
  ): Record<string, RiderRaceSetup> {
    const selectedScores = ranking.filter((rider) => registeredIds.includes(rider.riderId));
    const defaults = buildDefaultRaceSetupMap(race, selectedScores);

    return registeredIds.reduce<Record<string, RiderRaceSetup>>((setup, riderId) => {
      setup[riderId] =
        previousSetup[riderId] ??
        defaults[riderId] ?? {
          riderId,
          role: 'Équipier',
          effortPercent: 75,
          morningBreakaway: false,
        };
      return setup;
    }, {});
  }

  function handleOpenTacticModal(todoId: string) {
    const todo = calendarTodos.find((item) => item.id === todoId);

    if (!todo || !todo.raceKey) {
      setTacticError('Impossible d\'ouvrir la tactique: clé de course absente.');
      return;
    }

    const raceProfile = loadCalendarRaceProfile(todo.raceKey);

    if (!raceProfile) {
      setTacticError('Impossible d\'ouvrir la tactique: profil de course introuvable. Réimporte la course depuis la page Courses.');
      return;
    }

    const riders = loadStoredRiders();
    const courseCategory = getCourseCategoryForTactic(todo, raceProfile);
    const eligibleRiders = filterEligibleRidersForCourseCategory(riders, courseCategory);
    const availability = buildRiderAvailabilitySummary(eligibleRiders);
    const analysis = buildRaceAnalysis(availability.availableRiders, raceProfile);
    const store = loadRaceSetupStore();
    const existingSetup = store[todo.raceKey] ?? {};
    const initialRegisteredIds =
      Object.keys(existingSetup).length > 0
        ? Object.keys(existingSetup).slice(0, 7)
        : analysis.selected.map((rider) => rider.riderId).slice(0, 7);

    setTacticModalId(todoId);
    setTacticCourse(todo);
    setTacticGroupCourses(
      todo.tourKey
        ? groupedCalendarTodos.find((group) => group.key === todo.tourKey)?.todos ?? [todo]
        : [todo]
    );
    setTacticRaceProfile(raceProfile);
    setTacticCourseCategory(courseCategory);
    setTacticRanking(analysis.ranking);
    setTacticRegisteredIds(initialRegisteredIds);
    setTacticSetupByRider(
      buildSetupForRegisteredIds(raceProfile, analysis.ranking, initialRegisteredIds, existingSetup)
    );
    setTacticError(null);
  }

  function handleCloseTacticModal() {
    setTacticModalId(null);
    setTacticCourse(null);
    setTacticGroupCourses([]);
    setTacticRaceProfile(null);
    setTacticCourseCategory('pro');
    setTacticRanking([]);
    setTacticRegisteredIds([]);
    setTacticSetupByRider({});
    setTacticError(null);
  }

  function handleToggleTacticRider(riderId: string) {
    if (!tacticRaceProfile) {
      return;
    }

    setTacticRegisteredIds((current) => {
      const isSelected = current.includes(riderId);

      if (!isSelected && current.length >= 7) {
        setTacticError('Inscription limitée à 7 coureurs. Retire un coureur avant d\'en ajouter un autre.');
        return current;
      }

      const next = isSelected
        ? current.filter((id) => id !== riderId)
        : [...current, riderId];

      setTacticSetupByRider((previous) =>
        buildSetupForRegisteredIds(tacticRaceProfile, tacticRanking, next, previous)
      );
      setTacticError(null);
      return next;
    });
  }

  function handleApplyAutoOdcForCurrentSelection() {
    if (!tacticRaceProfile || tacticRegisteredIds.length === 0) {
      return;
    }

    const nextSetup = buildSetupForRegisteredIds(
      tacticRaceProfile,
      tacticRanking,
      tacticRegisteredIds,
      {}
    );

    setTacticSetupByRider(nextSetup);
    setTacticError(null);
  }

  function handleApplyAutoSelectionAndOdc() {
    if (!tacticRaceProfile) {
      return;
    }

    const riders = loadStoredRiders();
    const eligibleRiders = filterEligibleRidersForCourseCategory(riders, tacticCourseCategory);
    const availability = buildRiderAvailabilitySummary(eligibleRiders);

    if (availability.availableRiders.length < 7) {
      setTacticError(`Effectif disponible insuffisant pour ${tacticCourseCategory.toUpperCase()}: ${availability.availableRiders.length} coureur(s) éligible(s).`);
      return;
    }

    let autoTop7Ids: string[] = [];

    if (tacticCourse?.tourKey && tacticGroupCourses.length > 1) {
      const aggregateByRiderId = new Map<string, number>();
      const riderTotalById = new Map<string, number>(
        availability.availableRiders.map((rider) => [rider.id, rider.total])
      );

      tacticGroupCourses.forEach((course) => {
        if (!course.raceKey) {
          return;
        }

        const profile = loadCalendarRaceProfile(course.raceKey);

        if (!profile) {
          return;
        }

        const stageCategory = getCourseCategoryForTactic(course, profile);
        const stageEligibleRiders = filterEligibleRidersForCourseCategory(
          availability.availableRiders,
          stageCategory
        );
        const stageRanking = buildRaceAnalysis(stageEligibleRiders, profile).ranking;
        stageRanking.forEach((entry) => {
          aggregateByRiderId.set(
            entry.riderId,
            (aggregateByRiderId.get(entry.riderId) ?? 0) + entry.score
          );
        });
      });

      autoTop7Ids = [...aggregateByRiderId.entries()]
        .sort((left, right) => {
          if (right[1] !== left[1]) {
            return right[1] - left[1];
          }

          return (riderTotalById.get(right[0]) ?? 0) - (riderTotalById.get(left[0]) ?? 0);
        })
        .slice(0, 7)
        .map(([riderId]) => riderId);
    } else {
      autoTop7Ids = buildRaceAnalysis(availability.availableRiders, tacticRaceProfile)
        .selected
        .slice(0, 7)
        .map((rider) => rider.riderId);
    }

    if (autoTop7Ids.length < 7) {
      setTacticError('Impossible de déterminer automatiquement un Top 7 complet avec les données disponibles.');
      return;
    }

    const nextSetup = buildSetupForRegisteredIds(
      tacticRaceProfile,
      tacticRanking,
      autoTop7Ids,
      {}
    );

    setTacticRegisteredIds(autoTop7Ids);
    setTacticSetupByRider(nextSetup);
    setTacticError(null);
  }

  function handleSaveTactic() {
    if (!tacticCourse || !tacticCourse.raceKey || !tacticRaceProfile) {
      return;
    }

    if (tacticRegisteredIds.length !== 7) {
      setTacticError('Tu dois inscrire exactement 7 coureurs avant d\'enregistrer.');
      return;
    }

    const riders = loadStoredRiders();
    const eligibleRiders = filterEligibleRidersForCourseCategory(riders, tacticCourseCategory);
    const availability = buildRiderAvailabilitySummary(eligibleRiders);
    const store = loadRaceSetupStore();

    const coursesToUpdate =
      tacticCourse.tourKey && tacticGroupCourses.length > 1
        ? tacticGroupCourses.filter((course) => Boolean(course.raceKey))
        : [tacticCourse];

    coursesToUpdate.forEach((course) => {
      if (!course.raceKey) {
        return;
      }

      const raceProfile = loadCalendarRaceProfile(course.raceKey) ?? tacticRaceProfile;
      const stageCategory = getCourseCategoryForTactic(course, raceProfile);
      const stageEligibleRiders = filterEligibleRidersForCourseCategory(
        availability.availableRiders,
        stageCategory
      );
      const stageRanking = buildRaceAnalysis(stageEligibleRiders, raceProfile).ranking;
      const stageExistingSetup = store[course.raceKey] ?? {};

      const nextSetup =
        course.id === tacticCourse.id
          ? buildSetupForRegisteredIds(raceProfile, stageRanking, tacticRegisteredIds, tacticSetupByRider)
          : buildSetupForRegisteredIds(raceProfile, stageRanking, tacticRegisteredIds, stageExistingSetup);

      store[course.raceKey] = nextSetup;
    });

    saveRaceSetupStore(store);

    appendManagementHistoryEntry({
      area: 'calendar',
      kind: 'calendar-status',
      title:
        coursesToUpdate.length > 1
          ? `Tactique de tour mise à jour (${coursesToUpdate.length} étapes)`
          : `Tactique mise à jour : ${tacticCourse.title}`,
      note:
        coursesToUpdate.length > 1
          ? `${tacticRegisteredIds.length} coureur(s) inscrits sur tout le tour.`
          : `${tacticRegisteredIds.length} coureur(s) inscrits sur la course.`,
      occurredAt: getTodoScheduledAt(tacticCourse) ?? tacticCourse.createdAt,
    });

    setIdentityRepairMessage(
      coursesToUpdate.length > 1
        ? `Tactique enregistrée pour ${coursesToUpdate.length} étape(s) du tour.`
        : 'Tactique de course enregistrée.'
    );
    handleCloseTacticModal();
  }

  function renderCalendarTodo(todo: TodoItem) {
    const isDone = statuses[todo.id] === 'done';
    const courseToneClass = getCalendarPriorityTone(todo);

    return (
      <div
        key={todo.id}
        className={[
          'calendar-course-item',
          courseToneClass,
          isDone ? 'calendar-course-item-done' : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="calendar-course-row">
          <input
            type="checkbox"
            checked={isDone}
            onChange={() => handleToggleStatus(todo.id)}
            className="calendar-course-checkbox"
            title={isDone ? 'Marquer comme à faire' : 'Marquer comme fait'}
          />
          <div className="calendar-course-copy">
            <div className="calendar-course-title">{todo.title}</div>
            {todo.tourKey ? <div className="calendar-course-subtitle">{getCourseDisplayTitle(todo)}</div> : null}
            <div className="calendar-course-details">{todo.details?.split('\n').join(' | ')}</div>
            <span className="calendar-course-date">{formatCalendarDate(getTodoScheduledAt(todo) ?? todo.createdAt)}</span>
          </div>
          <div className="calendar-course-actions">
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => handleOpenResultModal(todo.id)}
            >
              Résultat
            </button>
            <button
              type="button"
              className="button button-danger button-small"
              onClick={() => setConfirmDeleteId(todo.id)}
            >
              Supprimer
            </button>
            <button
              type="button"
              className="button button-primary button-small"
              onClick={() => handleOpenTacticModal(todo.id)}
            >
              Tactique
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderTacticModal() {
    if (!tacticModalId || !tacticCourse || !tacticRaceProfile) {
      return null;
    }

    const selectedRiders = tacticRanking.filter((rider) => tacticRegisteredIds.includes(rider.riderId));

    return (
      <div className="calendar-result-overlay">
        <div className="calendar-result-dialog">
          <div className="calendar-result-header">
            <div>
              <h3 className="calendar-result-title">Tactique de course</h3>
              <p className="calendar-result-subtitle">{tacticCourse.title}</p>
            </div>
            {tacticCourse.tourKey && tacticGroupCourses.length > 1 ? (
              <span className="calendar-result-badge">Tour: inscription commune</span>
            ) : null}
          </div>

          <div className="message-box">
            <p>
              Inscrits: <strong>{tacticRegisteredIds.length}/7</strong>.
              {tacticCourse.tourKey && tacticGroupCourses.length > 1
                ? ' Sur un tour, la même inscription est appliquée à toutes les étapes.'
                : ' Cette inscription est propre à la course.'}
            </p>
            <p className="muted">Catégorie détectée: {tacticCourseCategory.toUpperCase()} (sélection auto filtrée sur cette catégorie)</p>
          </div>

          <div className="inline-actions">
            <button type="button" className="button button-secondary" onClick={handleApplyAutoSelectionAndOdc}>
              Auto sélection ({tacticCourseCategory.toUpperCase()}) + ODC auto
            </button>
            <button type="button" className="button button-secondary" onClick={handleApplyAutoOdcForCurrentSelection} disabled={tacticRegisteredIds.length === 0}>
              ODC auto (inscrits)
            </button>
          </div>

          {tacticError ? (
            <div className="message-box message-box-warning">
              <p>{tacticError}</p>
            </div>
          ) : null}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Inscription</th>
                  <th>Nom</th>
                  <th>Cat.</th>
                  <th>Forme</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {tacticRanking.map((rider) => {
                  const selected = tacticRegisteredIds.includes(rider.riderId);
                  const canSelectMore = selected || tacticRegisteredIds.length < 7;

                  return (
                    <tr key={rider.riderId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!canSelectMore}
                          onChange={() => handleToggleTacticRider(rider.riderId)}
                        />
                      </td>
                      <td>{rider.riderName}</td>
                      <td>{rider.riderCategory}</td>
                      <td>{rider.riderForm}</td>
                      <td>{rider.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="calendar-tactic-panel">
            <p className="field-label">ODC des coureurs inscrits</p>
            <div className="calendar-tactic-table-wrap">
              <RaceSetupTable
                riders={selectedRiders}
                setupByRider={tacticSetupByRider}
                onRoleChange={(riderId, role) =>
                  setTacticSetupByRider((current) => ({
                    ...current,
                    [riderId]: {
                      ...(current[riderId] ?? { riderId, role: 'Équipier', effortPercent: 75, morningBreakaway: false }),
                      role,
                    },
                  }))
                }
                onPercentChange={(riderId, effortPercent) =>
                  setTacticSetupByRider((current) => ({
                    ...current,
                    [riderId]: {
                      ...(current[riderId] ?? { riderId, role: 'Équipier', effortPercent: 75, morningBreakaway: false }),
                      effortPercent,
                    },
                  }))
                }
                onBreakawayChange={(riderId, morningBreakaway) =>
                  setTacticSetupByRider((current) => ({
                    ...current,
                    [riderId]: {
                      ...(current[riderId] ?? { riderId, role: 'Équipier', effortPercent: 75, morningBreakaway: false }),
                      morningBreakaway,
                    },
                  }))
                }
              />
            </div>
          </div>

          <div className="calendar-result-actions">
            <button className="button" onClick={handleCloseTacticModal} type="button">Annuler</button>
            <button className="button button-primary" onClick={handleSaveTactic} type="button" disabled={tacticRegisteredIds.length !== 7}>
              {tacticCourse.tourKey && tacticGroupCourses.length > 1
                ? `Enregistrer le tour (${tacticGroupCourses.length} étapes)`
                : 'Enregistrer la tactique'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Module résultat (modal simple)
  function renderResultModal() {
    if (!resultModalId) return null;

    return (
      <div className="calendar-result-overlay">
        <div className="calendar-result-dialog">
          <div className="calendar-result-header">
            <div>
              <h3 className="calendar-result-title">
                {resultModalCourses.length > 1 ? 'Résultats du tour' : 'Résultat de course'}
              </h3>
              <p className="calendar-result-subtitle">
                {resultModalCourses.length > 1
                  ? `${completedResultCount}/${resultModalCourses.length} étape(s) renseignée(s)`
                  : activeResultCourse?.title}
              </p>
            </div>
            {resultModalCourses.length > 1 ? (
              <span className="calendar-result-badge">Saisie séquentielle</span>
            ) : null}
          </div>

          {resultModalCourses.length > 1 ? (
            <div className="calendar-result-stage-list">
              {resultModalCourses.map((course) => {
                const isActive = course.id === activeResultCourse?.id;
                const isFilled = (resultDrafts[course.id] ?? '').trim().length > 0;

                return (
                  <button
                    key={course.id}
                    type="button"
                    className={isActive ? 'calendar-result-stage-chip calendar-result-stage-chip-active' : 'calendar-result-stage-chip'}
                    onClick={() => setActiveResultCourseId(course.id)}
                  >
                    <span>{course.stageNumber ? `Étape ${course.stageNumber}` : getCourseDisplayTitle(course)}</span>
                    <span>{isFilled ? 'Renseigné' : 'À saisir'}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="calendar-result-course-meta">
            <strong>{activeResultCourse?.title}</strong>
            <span>{activeResultCourse ? formatCalendarDate(getTodoScheduledAt(activeResultCourse) ?? activeResultCourse.createdAt) : ''}</span>
          </div>

          <textarea
            value={activeResultCourse ? (resultDrafts[activeResultCourse.id] ?? '') : ''}
            onChange={(event) => {
              if (!activeResultCourse) {
                return;
              }

              setResultDrafts((current) => ({
                ...current,
                [activeResultCourse.id]: event.target.value,
              }));
            }}
            rows={12}
            className="textarea calendar-result-input"
            placeholder={"Colle ici le résultat de la course (tableau)"}
          />
          <div className="calendar-result-actions">
            <button className="button" onClick={handleCloseResultModal} type="button">Annuler</button>
            {resultModalCourses.length > 1 ? (
              <button className="button button-secondary" onClick={handleSaveCurrentResult} type="button">Enregistrer l'étape</button>
            ) : null}
            {resultModalCourses.length > 1 ? (
              <button className="button button-secondary" onClick={handleSaveAndNextResult} type="button">Enregistrer et suivante</button>
            ) : null}
            <button className="button button-primary" onClick={resultModalCourses.length > 1 ? handleSaveAllResults : handleSaveCurrentResult} type="button">
              {resultModalCourses.length > 1 ? 'Tout enregistrer' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageTitle
        title="Calendrier"
        subtitle="Importe et visualise les étapes à venir ou passées. Ajoute-les à la todo pour planifier facilement."
      />

      {identityRepairMessage && (
        <div className="message-box message-box-success">
          <p>{identityRepairMessage}</p>
          <button type="button" className="button button-small" onClick={() => setIdentityRepairMessage(null)}>Fermer</button>
        </div>
      )}

      {identityIssueCount > 0 && !identityRepairMessage && (
        <div className="message-box message-box-warning">
          <p>
            <strong>{identityIssueCount} course(s)</strong> du calendrier n'ont pas encore de clé d'identité stable.
            Les réglages ODC et les résultats associés pourraient être perdus si le nom ou la date de ces courses change.
          </p>
          <button type="button" className="button button-primary button-small" onClick={handleMigrateIdentities}>
            Stabiliser l'identité
          </button>
        </div>
      )}

      <Card title="Courses à venir et passées" className="calendar-card">
        {calendarTodos.length === 0 && <div className="muted">Aucune étape ajoutée pour l'instant.</div>}
        <div className="page-stack calendar-course-list">
          {groupedCalendarTodos.map((group) => {
            const completedCount = group.todos.filter((todo) => statuses[todo.id] === 'done').length;

            return (
              <div key={group.key} className={group.isTour ? 'calendar-group calendar-group-tour' : 'calendar-group'}>
                {group.isTour ? (
                  <div className="calendar-group-header">
                    <div>
                      <p className="calendar-group-eyebrow">Tour</p>
                      <h3 className="calendar-group-title">{group.title}</h3>
                    </div>
                    <span className="calendar-group-badge">
                      {completedCount}/{group.todos.length} étape(s) traitée(s)
                    </span>
                  </div>
                ) : null}

                <div className="page-stack calendar-group-list">
                  {group.todos.map(renderCalendarTodo)}
                </div>
              </div>
            );
          })}
        </div>
        <ConfirmDialog
          open={!!confirmDeleteId}
          title="Confirmer la suppression"
          message="Voulez-vous vraiment supprimer cette course du calendrier ? Cette action est irréversible."
          onConfirm={() => confirmDeleteId && handleDeleteCalendarTodo(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
        {renderResultModal()}
        {renderTacticModal()}
      </Card>
    </div>
  );
};

export default CalendarPage;
