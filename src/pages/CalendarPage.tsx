import React, { useState } from 'react';
import { saveManualTodos, loadManualTodos } from '../lib/storage/todoStorage';
import type { TodoItem } from '../types/todo';

const CalendarPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  // Fonction de parsing simple
  function parseLine(line: string) {
    // Exemple de ligne :
    // S5\tSam\t18/04/2026\tMT\tMontagne\tEtape 1 : Oviedo - Langreo by Zabak\tTactique\tInformations
    const parts = line.split('\t');
    if (parts.length < 8) return null;
    return {
      semaine: parts[0],
      jour: parts[1],
      date: parts[2],
      type: parts[3],
      lieu: parts[4],
      etape: parts[5],
      tactique: parts[6],
      infos: parts[7],
    };
  }


  function handleParse() {
    const result = parseLine(input);
    setParsed(result);
    setSuccess(false);
  }

  function handleCreateTodo() {
    const data = parseLine(input);
    if (!data) return;

    // Construction de la tâche
    const newTodo: TodoItem = {
      id: `calendar-${Date.now()}-${Math.floor(Math.random()*10000)}`,
      title: `${data.etape} (${data.date})`,
      details: `Tactique: ${data.tactique}\nInfos: ${data.infos}\nType: ${data.type} - ${data.lieu}`,
      source: 'manual',
      status: 'todo',
      priority: 'moyenne',
      category: 'courses',
      createdAt: new Date().toISOString(),
    };

    // Ajout au localStorage
    const todos = loadManualTodos();
    saveManualTodos([newTodo, ...todos]);
    setSuccess(true);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Calendrier</h1>
      <p>Collez ici une ligne du calendrier :</p>
      <textarea
        value={input}
        onChange={e => { setInput(e.target.value); setSuccess(false); }}
        rows={3}
        style={{ width: '100%', marginBottom: 12 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleParse}>Analyser</button>
        <button onClick={handleCreateTodo} disabled={!parsed}>Créer une tâche To-do</button>
      </div>
      {parsed && (
        <div style={{ marginTop: 24 }}>
          <h3>Résultat du parsing :</h3>
          <pre>{JSON.stringify(parsed, null, 2)}</pre>
        </div>
      )}
      {success && (
        <div style={{ color: 'green', marginTop: 16 }}>
          ✅ Tâche ajoutée à la to-do !
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
