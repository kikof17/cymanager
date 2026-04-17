import { useEffect, useState } from 'react';
import Card from '../components/common/Card';
import PageTitle from '../components/common/PageTitle';
import { loadManualTodos } from '../lib/storage/todoStorage';
import type { TodoItem } from '../types/todo';

// Pour stocker les résultats associés à chaque course (clé = id de la course)
const RESULT_KEY = 'cymanager:results';

type ResultMap = Record<string, string | { result: string; category: string }>

function getResultString(res: string | { result: string }): string {
  if (typeof res === "string") return res;
  if (res && typeof res === "object" && "result" in res) return res.result;
  return "";
}

function loadResults(): ResultMap {
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as ResultMap;
  } catch {
    return {};
  }
}

export default function ResultPage() {
  const [courses, setCourses] = useState<TodoItem[]>([]);
  const [results, setResults] = useState<ResultMap>({});
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  useEffect(() => {
    const all = loadManualTodos();
    const filtered = all.filter((t) => t.id.startsWith('calendar-'));
    setCourses(filtered);
    setResults(loadResults());
    if (filtered.length > 0 && !selectedCourseId) {
      setSelectedCourseId(filtered[0].id);
    }
  }, []);

  function renderResultTable(result: string | { result: string }) {
    const teamName = "Kritoff Team"; // Nom de votre équipe
    const resultStr = getResultString(result);
    const lines = resultStr.trim().split(/\r?\n/);
    if (lines.length < 2) return <div className="muted">Aucun résultat collé.</div>;
    const headers = lines[0].split('\t');
    return (
      <div className="table-container">
        <table className="data-table styled-table">
          <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {lines.slice(1).map((line, i) => {
              const cells = line.split('\t');
              const isTeamRider = cells.includes(teamName);
              return (
                <tr key={i} className={isTeamRider ? "highlight-row" : undefined}>
                  {cells.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <PageTitle title="Résultats des courses" subtitle="Consulte tous les résultats enregistrés pour chaque course du calendrier." />
      <div className="page-stack">
        {courses.length === 0 && <div className="muted">Aucune course enregistrée.</div>}
        {courses.length > 0 && (
          <div className="select-row">
            <label htmlFor="result-course-select" className="select-label">Choisir une course :</label>
            <select
              id="result-course-select"
              className="input select-input"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
            >
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>
        )}
        {selectedCourseId && (
          <Card key={selectedCourseId} title={courses.find(c => c.id === selectedCourseId)?.title || "Course"}>
            <div className="course-details">{courses.find(c => c.id === selectedCourseId)?.details?.split('\n').join(' | ')}</div>
            {results[selectedCourseId]
              ? renderResultTable(results[selectedCourseId])
              : <div className="muted">Aucun résultat enregistré pour cette course.</div>}
          </Card>
        )}
      </div>
    </div>
  );
}
