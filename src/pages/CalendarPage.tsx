import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import PageTitle from '../components/common/PageTitle';
import { saveManualTodos, loadManualTodos, loadTodoStatuses, saveTodoStatuses } from '../lib/storage/todoStorage';
import type { TodoItem } from '../types/todo';


const CalendarPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [parsedList, setParsedList] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [calendarTodos, setCalendarTodos] = useState<TodoItem[]>([]);
  const [statuses, setStatuses] = useState<Record<string, 'todo' | 'done'>>({});

  // Parsing multi-lignes
  function parseLines(text: string) {
    return text
      .split(/\r?\n/)
      .map((line) => {
        const parts = line.split('\t');
        if (parts.length < 6) return null;
        // Gestion des lignes "sélection" (pas d'étape)
        return {
          semaine: parts[0],
          jour: parts[1],
          date: parts[2],
          type: parts[3],
          lieu: parts[4],
          etape: parts[5] || '',
          tactique: parts[6] || '',
          infos: parts[7] || '',
        };
      })
      .filter((x) => x && (x.etape || x.lieu));
  }

  // Charger les todos "calendar" existants
  useEffect(() => {
    const all = loadManualTodos();
    setCalendarTodos(all.filter((t) => t.id.startsWith('calendar-')));
    setStatuses(loadTodoStatuses());
  }, [addedCount]);

  function handleParse() {
    const result = parseLines(input);
    setParsedList(result);
    setSuccess(false);
  }

  function handleCreateTodos() {
    const dataList = parseLines(input);
    if (!dataList.length) return;

    const newTodos: TodoItem[] = dataList
      .map((data) => {
        if (!data) return null; // Vérification si data est null
        return {
          id: `calendar-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          title: `${data.etape || data.lieu} (${data.date})`,
          details: `Tactique: ${data.tactique || ''}\nInfos: ${data.infos || ''}\nType: ${data.type || ''} - ${data.lieu || ''}`,
          source: 'manual',
          status: 'todo',
          priority: 'moyenne',
          category: 'courses',
          createdAt: new Date().toISOString(),
        } as TodoItem; // Forcer le typage ici
      })
      .filter((todo) => todo !== null) as TodoItem[]; // Filtrer et forcer le typage
    const todos = loadManualTodos();
    saveManualTodos([...newTodos, ...todos]);
    setSuccess(true);
    setAddedCount((c) => c + 1);
  }

  // Affichage graphique des étapes détectées
  function renderStageCard(stage: any, idx: number) {
    return (
      <div key={idx} className="card" style={{ marginBottom: 8, padding: 12 }}>
        <div style={{ fontWeight: 600 }}>{stage.etape || stage.lieu}</div>
        <div style={{ fontSize: 13, color: '#666' }}>{stage.jour} {stage.date} | {stage.type}</div>
        {stage.tactique && <div style={{ fontSize: 13 }}>Tactique: {stage.tactique}</div>}
        {stage.infos && <div style={{ fontSize: 13 }}>Infos: {stage.infos}</div>}
      </div>
    );
  }

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
      const RESULT_KEY = 'cymanager:results';
      let map: Record<string, any> = {};
      try {
        const raw = localStorage.getItem(RESULT_KEY);
        if (raw) map = JSON.parse(raw);
      } catch {}
      const course = calendarTodos.find(t => t.id === resultModalId);
      const category = detectCourseCategory(course?.title || "");
      map[resultModalId] = { result: resultInput, category };
      localStorage.setItem(RESULT_KEY, JSON.stringify(map));
    }
    setResultModalId(null);
    setResultInput('');
  }

  // Affichage des étapes déjà ajoutées (code couleur harmonisé)
  function renderCalendarTodo(todo: TodoItem) {
    const isDone = statuses[todo.id] === 'done';
    // Couleur bordure selon priorité/catégorie (comme todo)
    let borderColor = '#bdbdbd';
    if (todo.category === 'courses') borderColor = '#bfa600';
    if (todo.priority === 'haute') borderColor = '#b83a3a';
    if (todo.priority === 'basse') borderColor = '#4caf50';

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
        }}
      >
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`todo-badge priority-${todo.priority}`}>{todo.priority}</span>
            <span className="todo-badge">{todo.category}</span>
            <span className="todo-badge">{todo.source}</span>
            <span style={{ color: '#aaa', fontSize: 12 }}>{new Date(todo.createdAt).toLocaleDateString()}</span>
          </div>
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
          onClick={() => handleDeleteCalendarTodo(todo.id)}
        >
          Supprimer
        </button>
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

      <div className="card-grid" style={{ alignItems: 'flex-start' }}>
        <Card title="Import calendrier">
          <div style={{ marginBottom: 12 }}>
            <strong>Colle ici les lignes du calendrier</strong>
            <p className="muted" style={{ margin: '4px 0 12px 0', fontSize: 13 }}>
              Semaine, jour, date, type, lieu, étape, tactique, infos (une ligne par étape ou sélection)
            </p>
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setSuccess(false); setParsedList([]); }}
              rows={7}
              className="input"
              style={{ width: '100%', marginBottom: 12, fontFamily: 'inherit' }}
              placeholder={"S5\tSam\t18/04/2026\tMT\tMontagne\tEtape 1 : Oviedo - Langreo by Zabak\tTactique\tInformations\nS5\tDim\t19/04/2026\tMT\t\tEtape 2 : GP Indurain by The Crow\tTactique\tInformations"}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button button-primary" onClick={handleParse} type="button">Analyser</button>
              <button className="button" onClick={() => { setInput(''); setParsedList([]); setSuccess(false); }} type="button">Vider</button>
              <button className="button button-primary" onClick={handleCreateTodos} disabled={!parsedList.length} type="button">
                Ajouter toutes les étapes à la To-do
              </button>
            </div>
            {success && (
              <div style={{ color: 'green', marginTop: 12 }}>
                ✅ Étapes ajoutées à la to-do !
              </div>
            )}
          </div>
        </Card>

        <Card title="Aperçu des étapes détectées">
          {parsedList.length === 0 && <div className="muted">Aucune étape détectée pour le moment.</div>}
          <div className="page-stack">
            {parsedList.map(renderStageCard)}
          </div>
        </Card>
      </div>

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
