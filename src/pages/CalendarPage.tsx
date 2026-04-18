import React, { useState } from 'react';
import Card from '../components/common/Card';
import PageTitle from '../components/common/PageTitle';
import RaceSetupTable from '../components/races/RaceSetupTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getRiderStrengths } from '../lib/scoring/strengths';
import { loadCalendarRaceProfile } from '../lib/storage/calendarRaceProfile';
import type { StoredResult } from '../lib/scoring/extractPoints';

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
    }
    setResultModalId(null);
    setResultInput('');
  }

  // Affichage des étapes déjà ajoutées (code couleur harmonisé)
  // Affichage ODC (tactique) déroulante
  const [openTacticId, setOpenTacticId] = useState<string|null>(null);
  function renderCalendarTodo(todo: TodoItem) {
    const isDone = statuses[todo.id] === 'done';
    // Couleur bordure selon priorité/catégorie (comme todo)
    let borderColor = '#bdbdbd';
    if (todo.category === 'courses') borderColor = '#bfa600';
    if (todo.priority === 'haute') borderColor = '#b83a3a';
    if (todo.priority === 'basse') borderColor = '#4caf50';

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
            <div
              style={{
                marginTop: 10,
                background: '#23242a',
                borderRadius: 10,
                padding: 16,
                boxShadow: '0 2px 12px #0006',
                border: '1px solid #333',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <style>{`
                  .race-setup-table thead th { color: #111 !important; background: #f7f7fa !important; }
                `}</style>
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
        className="card"
        style={{
          marginBottom: 12,
          padding: 16,
          background: isDone ? '#e6e6e6' : '#fff',
          opacity: isDone ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderLeft: `6px solid ${borderColor}`,
          boxShadow: '0 1px 4px 0 #0001',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 16 }}>
          <input
            type="checkbox"
            checked={isDone}
            onChange={() => handleToggleStatus(todo.id)}
            style={{ marginRight: 12, width: 18, height: 18 }}
            title={isDone ? 'Marquer comme à faire' : 'Marquer comme fait'}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#181c24' }}>{todo.title}</div>
            <div style={{ fontSize: 13, color: '#444', margin: '2px 0 6px 0' }}>{todo.details?.split('\n').join(' | ')}</div>
            <span style={{ color: '#aaa', fontSize: 12 }}>{new Date(todo.createdAt).toLocaleDateString()}</span>
          </div>
          <button
            type="button"
            className="button button-secondary button-small"
            style={{ marginLeft: 8, minWidth: 80 }}
            onClick={() => handleOpenResultModal(todo.id)}
          >
            Résultat
          </button>
          <button
            type="button"
            className="button button-danger button-small"
            style={{ marginLeft: 8, minWidth: 80 }}
            onClick={() => setConfirmDeleteId(todo.id)}
          >
            Supprimer
          </button>
                {/* Dialog de confirmation suppression */}
                <ConfirmDialog
                  open={!!confirmDeleteId}
                  title="Confirmer la suppression"
                  message="Voulez-vous vraiment supprimer cette course du calendrier ? Cette action est irréversible."
                  onConfirm={() => confirmDeleteId && handleDeleteCalendarTodo(confirmDeleteId)}
                  onCancel={() => setConfirmDeleteId(null)}
                />
          <button
            type="button"
            className="button button-primary button-small"
            style={{ marginLeft: 8, minWidth: 80 }}
            onClick={() => setOpenTacticId(openTacticId === todo.id ? null : todo.id)}
          >
            Tactique
          </button>
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
      <div style={{
        position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0002', padding: 32, minWidth: 400, maxWidth: '90vw' }}>
          <h3>Résultat pour : {course?.title}</h3>
          <textarea
            value={resultInput}
            onChange={e => setResultInput(e.target.value)}
            rows={12}
            className="input"
            style={{ width: '100%', marginBottom: 16, fontFamily: 'inherit' }}
            placeholder={"Colle ici le résultat de la course (tableau)"}
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
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
    <div className="page-content" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <PageTitle
        title="Calendrier"
        subtitle="Importe et visualise les étapes à venir ou passées. Ajoute-les à la todo pour planifier facilement."
      />



      <Card title="Courses à venir et passées" style={{ marginTop: 32 }}>
        {calendarTodos.length === 0 && <div className="muted">Aucune étape ajoutée pour l'instant.</div>}
        <div className="page-stack">
          {calendarTodos.map(renderCalendarTodo)}
        </div>
        {renderResultModal()}
      </Card>
    </div>
  );
};

export default CalendarPage;
