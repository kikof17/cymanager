import React, { useState } from 'react';
import Card from '../components/common/Card';
import PageTitle from '../components/common/PageTitle';
import RaceSetupTable from '../components/races/RaceSetupTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getRiderStrengths } from '../lib/scoring/strengths';
import { loadCalendarRaceProfile } from '../lib/storage/calendarRaceProfile';
import type { StoredResult } from '../lib/scoring/extractPoints';
import { syncFinanceWithSettings } from '../lib/storage/financeStorage';
import { loadClubSettings } from '../lib/storage/settingsStorage';

import { saveManualTodos, loadManualTodos, loadTodoStatuses, saveTodoStatuses } from '../lib/storage/todoStorage';
import type { RaceRiderScore, RiderRaceSetup } from '../types/race';
import type { TodoItem } from '../types/todo';
import type { Rider } from '../types/rider';

type StoredRaceSetupMap = Record<string, Record<string, RiderRaceSetup>>;

function loadStoredResults(): Record<string, StoredResult> {
  try {
    const raw = localStorage.getItem('cymanager:results');
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    return parsed as Record<string, StoredResult>;
  } catch {
    return {};
  }
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

  // Parsing multi-lignes
  // parseLines supprimé (plus utilisé)

  // handleParse et handleCreateTodos supprimés (plus utilisés)

  // Affichage graphique des étapes détectées
  // renderStageCard supprimé (plus utilisé)

  // Gestion du statut (coché ou non)
  function handleToggleStatus(id: string) {
    setStatuses((current) => {
      const next: Record<string, "todo" | "done"> = { ...current, [id]: current[id] === 'done' ? 'todo' : 'done' };
      saveTodoStatuses(next);
      return next;
    });
  }

  // Affichage des étapes déjà ajoutées
  // Suppression d'une étape
  // Confirmation suppression
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  function handleDeleteCalendarTodo(id: string) {
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
    setConfirmDeleteId(null);
  }

  // Gestion du module résultat (état local)
  const [resultModalId, setResultModalId] = useState<string|null>(null);
  const [resultInput, setResultInput] = useState('');
  function handleOpenResultModal(id: string) {
    setResultModalId(id);
    setResultInput('');
  }
  function handleCloseResultModal() {
    setResultModalId(null);
    setResultInput('');
  }
  function handleSaveResult() {
    if (resultModalId) {
      // Sauvegarde dans localStorage
      const map = loadStoredResults();
      const course = calendarTodos.find(t => t.id === resultModalId);
      const category = detectCourseCategory(course?.title || "");
      map[resultModalId] = { result: resultInput, category };
      localStorage.setItem('cymanager:results', JSON.stringify(map));
      const settings = loadClubSettings();
      syncFinanceWithSettings(settings, settings.financialBalance);
      window.dispatchEvent(new Event('cymanager:finance-updated'));
    }
    setResultModalId(null);
    setResultInput('');
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
            <div className="calendar-course-details">{todo.details?.split('\n').join(' | ')}</div>
            <span className="calendar-course-date">{formatCalendarDate(todo.createdAt)}</span>
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
    const course = calendarTodos.find(t => t.id === resultModalId);
    return (
      <div className="calendar-result-overlay">
        <div className="calendar-result-dialog">
          <h3 className="calendar-result-title">Résultat pour : {course?.title}</h3>
          <textarea
            value={resultInput}
            onChange={e => setResultInput(e.target.value)}
            rows={12}
            className="textarea calendar-result-input"
            placeholder={"Colle ici le résultat de la course (tableau)"}
          />
          <div className="calendar-result-actions">
            <button className="button" onClick={handleCloseResultModal} type="button">Annuler</button>
            <button className="button button-primary" onClick={handleSaveResult} type="button">Enregistrer</button>
          </div>
        </div>
      </div>
    );
  }

  function detectCourseCategory(title: string): "u25" | "u21" | "pro" {
    if (/u25/i.test(title)) return "u25";
    if (/u21/i.test(title)) return "u21";
    return "pro";
  }

  return (
    <div className="page-stack">
      <PageTitle
        title="Calendrier"
        subtitle="Importe et visualise les étapes à venir ou passées. Ajoute-les à la todo pour planifier facilement."
      />

      <Card title="Courses à venir et passées" className="calendar-card">
        {calendarTodos.length === 0 && <div className="muted">Aucune étape ajoutée pour l'instant.</div>}
        <div className="page-stack calendar-course-list">
          {calendarTodos.map(renderCalendarTodo)}
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
