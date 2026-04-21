import React, { useMemo, useState } from 'react';
import Card from '../components/common/Card';
import PageTitle from '../components/common/PageTitle';
import RaceSetupTable from '../components/races/RaceSetupTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getRiderStrengths } from '../lib/scoring/strengths';
import { loadCalendarRaceProfile } from '../lib/storage/calendarRaceProfile';
import { createStoredResult, getAllResultsFromStorage, getStoredResultText, saveAllResultsToStorage, type StoredResult } from '../lib/scoring/extractPoints';
import { syncFinanceWithSettings } from '../lib/storage/financeStorage';
import { appendManagementHistoryEntry } from '../lib/storage/managementHistoryStorage';
import { loadClubSettings } from '../lib/storage/settingsStorage';
import { getTodoResultCategory } from '../lib/utils/courseCategory';
import { getTodoScheduledAt } from '../lib/utils/courseDates';
import { getCourseDisplayTitle, groupCourseTodos } from '../lib/utils/stageRaces';

import { countUnstableCalendarIdentities, migrateCalendarRaceIdentities } from '../lib/storage/raceIdentityMigration';
import { saveManualTodos, loadManualTodos, loadTodoStatuses, saveTodoStatuses } from '../lib/storage/todoStorage';
import type { RaceRiderScore, RiderRaceSetup } from '../types/race';
import type { TodoItem } from '../types/todo';
import type { Rider } from '../types/rider';

type StoredRaceSetupMap = Record<string, Record<string, RiderRaceSetup>>;

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

function loadStoredRaceSetups(): StoredRaceSetupMap {
  try {
    const raw = localStorage.getItem('cymanager:race-setup');
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    return parsed as StoredRaceSetupMap;
  } catch {
    return {};
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

  // Affichage des étapes déjà ajoutées (code couleur harmonisé)
  // Affichage ODC (tactique) déroulante
  const [openTacticId, setOpenTacticId] = useState<string|null>(null);
  function renderCalendarTodo(todo: TodoItem) {
    const isDone = statuses[todo.id] === 'done';
    const courseToneClass = getCalendarPriorityTone(todo);

    // Récupérer l'ODC/réglages si dispo (clé = titre de la course)
    let odcContent: React.ReactNode = null;
    try {
      const raceKey = todo.raceKey;
      const allSetups = loadStoredRaceSetups();
      const ridersArr = loadStoredRiders();
      if (raceKey) {
        const setup = allSetups[raceKey];
        if (setup) {
          // Charger le vrai profil de course (ParsedRace) pour cette étape
          const raceProfile = loadCalendarRaceProfile(raceKey);
          const ridersForTable: RaceRiderScore[] = Object.values(setup).map((r) => {
            const rider = ridersArr.find(rr => rr.id === r.riderId);
            return {
              riderId: r.riderId,
              riderName: rider?.name || r.riderId,
              riderForm: rider?.form ?? 0,
              riderCategory: rider?.category ?? '',
              score: raceProfile && rider ? (
                rider.flat * raceProfile.weights.flat +
                rider.hill * raceProfile.weights.hill +
                rider.mountain * raceProfile.weights.mountain +
                rider.sprint * raceProfile.weights.sprint +
                rider.cobble * raceProfile.weights.cobble +
                rider.timeTrial * raceProfile.weights.timeTrial +
                rider.breakaway * raceProfile.weights.breakaway +
                rider.endurance * raceProfile.weights.endurance +
                rider.resistance * raceProfile.weights.resistance +
                rider.recovery * raceProfile.weights.recovery +
                rider.stageRace * raceProfile.weights.stageRace
              ) : (rider?.total ?? 0),
              role: r.role,
              reasons: rider && raceProfile ? getRiderStrengths(rider, raceProfile) : [],
            };
          });
          odcContent = (
            <div className="calendar-tactic-panel">
              <div className="calendar-tactic-table-wrap">
                <RaceSetupTable
                  riders={ridersForTable}
                  setupByRider={setup}
                  onRoleChange={() => {}}
                  onPercentChange={() => {}}
                  onBreakawayChange={() => {}}
                  readOnly
                />
              </div>
            </div>
          );
        }
      }
    } catch (error) {
      console.error('Erreur de chargement de la tactique de course', error);
    }

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
            onClick={() => setOpenTacticId(openTacticId === todo.id ? null : todo.id)}
          >
            Tactique
          </button>
          </div>
        </div>
        {/* Affichage ODC déroulant */}
        {openTacticId === todo.id && odcContent}
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
      </Card>
    </div>
  );
};

export default CalendarPage;
