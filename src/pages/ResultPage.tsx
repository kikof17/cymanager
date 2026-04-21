import { useEffect, useMemo, useRef, useState } from 'react';
import Card from '../components/common/Card';
import PageTitle from '../components/common/PageTitle';
import { getProRacePrize } from '../lib/finance/racePrizeTable';
import { getStoredResultCategory, type ResultCategory } from '../lib/utils/courseCategory';
import { loadClubSettings } from '../lib/storage/settingsStorage';
import { loadManualTodos } from '../lib/storage/todoStorage';
import { getTodoScheduledAt } from '../lib/utils/courseDates';
import { getCourseDisplayTitle, groupCourseTodos } from '../lib/utils/stageRaces';
import { formatCurrency } from '../lib/utils/numbers';
import type { TodoItem } from '../types/todo';

// Pour stocker les résultats associés à chaque course (clé = id de la course)
const RESULT_KEY = 'cymanager:results';

type ResultMap = Record<string, string | { result: string; category: string }>

const TEAM_NAME = 'Kritoff Team';

function hasStoredResult(result: string | { result: string } | undefined): boolean {
  if (!result) {
    return false;
  }

  return getResultString(result).trim().length > 0;
}

function getResultString(res: string | { result: string }): string {
  if (typeof res === "string") return res;
  if (res && typeof res === "object" && "result" in res) return res.result;
  return "";
}

function normalizeComparable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getStoredCategory(
  result: string | { result: string; category?: string },
  course: TodoItem | undefined
) {
  return getStoredResultCategory(result, course);
}

function getDivisionForCategory(category: 'pro' | 'u25' | 'u21') {
  const settings = loadClubSettings();

  if (category === 'u25') {
    return settings.divisionU25;
  }

  if (category === 'u21') {
    return settings.divisionU21;
  }

  return settings.divisionPro;
}

function findColumnIndex(headers: string[], matcher: (header: string) => boolean): number {
  return headers.findIndex((header) => matcher(normalizeComparable(header)));
}

function getPrizeForRow(
  position: string,
  teamName: string,
  category: ResultCategory,
  courseTitle: string
): number | null {
  if (normalizeComparable(teamName) !== normalizeComparable(TEAM_NAME)) {
    return null;
  }

  if (category !== 'pro') {
    return null;
  }

  const division = getDivisionForCategory(category);
  return getProRacePrize(division, position, courseTitle);
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

function loadCourses(): TodoItem[] {
  return loadManualTodos().filter((todo) => todo.id.startsWith('calendar-'));
}

export default function ResultPage() {
  const [courses] = useState<TodoItem[]>(loadCourses);
  const [results] = useState<ResultMap>(loadResults);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => loadCourses()[0]?.id ?? '');
  const [isCourseListOpen, setIsCourseListOpen] = useState(false);
  const courseSelectRef = useRef<HTMLDivElement | null>(null);
  const selectedCourseHasResult = hasStoredResult(results[selectedCourseId]);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const courseGroups = useMemo(() => groupCourseTodos(courses), [courses]);
  const selectedCourseGroup = useMemo(
    () => courseGroups.find((group) => group.todos.some((course) => course.id === selectedCourseId)) ?? null,
    [courseGroups, selectedCourseId]
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!courseSelectRef.current?.contains(event.target as Node)) {
        setIsCourseListOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsCourseListOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function renderResultTable(result: string | { result: string; category?: string }) {
    const courseTitle = selectedCourse?.title ?? '';
    const category = getStoredCategory(result, selectedCourse);
    const showPrizeColumn = category === 'pro';
    const resultStr = getResultString(result);
    const lines = resultStr.trim().split(/\r?\n/);
    if (lines.length < 2) return <div className="muted">Aucun résultat collé.</div>;
    const headers = lines[0].split('\t');
    const positionIdx = findColumnIndex(headers, (header) =>
      header === '#' ||
      header.includes('place') ||
      header === 'cl' ||
      header === 'cl.' ||
      header.includes('classement')
    );
    const teamIdx = findColumnIndex(headers, (header) =>
      header.includes('equipe') || header.includes('team')
    );
    const safePositionIdx = positionIdx >= 0 ? positionIdx : 0;
    const safeTeamIdx = teamIdx >= 0 ? teamIdx : 3;

    return (
      <div className="table-container">
        <table className="data-table styled-table">
          <thead>
            <tr>
              {headers.map((h, i) => <th key={i}>{h}</th>)}
              {showPrizeColumn ? <th>Prime</th> : null}
            </tr>
          </thead>
          <tbody>
            {lines.slice(1).map((line, i) => {
              const cells = line.split('\t');
              const position = cells[safePositionIdx]?.trim() ?? '';
              const teamName = cells[safeTeamIdx]?.trim() ?? '';
              const isTeamRider = normalizeComparable(teamName) === normalizeComparable(TEAM_NAME);
              const prize = position
                ? getPrizeForRow(position, teamName, category, courseTitle)
                : null;

              return (
                <tr key={i} className={isTeamRider ? "highlight-row" : undefined}>
                  {cells.map((cell, j) => <td key={j}>{cell}</td>)}
                  {showPrizeColumn ? <td>{prize === null ? '' : formatCurrency(prize)}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="page-stack page-stack-narrow">
      <PageTitle title="Résultats des courses" subtitle="Consulte tous les résultats enregistrés pour chaque course du calendrier." />
      <div className="page-stack">
        {courses.length === 0 && <div className="muted">Aucune course enregistrée.</div>}
        {courses.length > 0 && (
          <div className="select-row">
            <label htmlFor="result-course-trigger" className="select-label">Choisir une course :</label>
            <div ref={courseSelectRef} className="result-select-wrap">
              <button
                id="result-course-trigger"
                type="button"
                className={selectedCourseHasResult ? "input select-input result-select-input result-select-input-done custom-select-trigger" : "input select-input result-select-input result-select-input-upcoming custom-select-trigger"}
                aria-haspopup="listbox"
                aria-expanded={isCourseListOpen}
                onClick={() => setIsCourseListOpen((open) => !open)}
              >
                <span className="custom-select-trigger-label">
                  {selectedCourseHasResult ? "[Resultat] " : "[A venir] "}
                  {selectedCourse?.title ?? 'Choisir une course'}
                </span>
                <span className={isCourseListOpen ? "custom-select-chevron custom-select-chevron-open" : "custom-select-chevron"} aria-hidden="true">
                  ▾
                </span>
              </button>

              {isCourseListOpen && (
                <div className="custom-select-menu" role="listbox" aria-label="Choisir une course">
                  {courseGroups.map((group) => (
                    <div key={group.key} className="result-group-options">
                      {group.isTour ? (
                        <div className="result-group-option-header">
                          <span className="result-group-option-title">{group.title}</span>
                          <span className="result-group-option-meta">{group.todos.length} étape(s)</span>
                        </div>
                      ) : null}

                      {group.todos.map((course) => {
                        const courseHasResult = hasStoredResult(results[course.id]);
                        const isSelected = course.id === selectedCourseId;
                        const className = courseHasResult
                          ? "custom-select-option custom-select-option-done"
                          : "custom-select-option custom-select-option-upcoming";

                        return (
                          <button
                            key={course.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={isSelected ? `${className} custom-select-option-selected` : className}
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setIsCourseListOpen(false);
                            }}
                          >
                            <span className={courseHasResult ? "custom-select-option-text custom-select-option-text-bold" : "custom-select-option-text"}>
                              {courseHasResult ? "[Resultat] " : "[A venir] "}
                              {group.isTour ? `${course.stageNumber ? `Étape ${course.stageNumber} - ` : ''}${getCourseDisplayTitle(course)}` : course.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {selectedCourseId && (
          <Card
            key={selectedCourseId}
            title={selectedCourse?.title || "Course"}
          >
            <div className={selectedCourseHasResult ? "result-status-badge result-status-badge-done" : "result-status-badge result-status-badge-upcoming"}>
              {selectedCourseHasResult ? "Résultat enregistré" : "Course à venir"}
            </div>
            {selectedCourseGroup?.isTour ? (
              <div className="result-tour-summary">
                <div className="result-tour-summary-header">
                  <strong>{selectedCourseGroup.title}</strong>
                  <span>{selectedCourseGroup.todos.filter((course) => hasStoredResult(results[course.id])).length}/{selectedCourseGroup.todos.length} étape(s) avec résultat</span>
                </div>
                <div className="result-tour-stage-list">
                  {selectedCourseGroup.todos.map((course) => {
                    const courseHasResult = hasStoredResult(results[course.id]);
                    const isSelected = course.id === selectedCourseId;

                    return (
                      <button
                        key={course.id}
                        type="button"
                        className={isSelected ? 'result-tour-stage-chip result-tour-stage-chip-selected' : 'result-tour-stage-chip'}
                        onClick={() => setSelectedCourseId(course.id)}
                      >
                        <span>{course.stageNumber ? `E${course.stageNumber}` : 'Etape'}</span>
                        <span>{courseHasResult ? 'Résultat' : 'À venir'}</span>
                        <span>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(getTodoScheduledAt(course) ?? course.createdAt))}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="course-details">{selectedCourse?.details?.split('\n').join(' | ')}</div>
            {selectedCourse && getStoredCategory(results[selectedCourseId] ?? '', selectedCourse) !== 'pro' ? (
              <div className="message-box">
                <p className="muted">
                  Les primes individuelles U25/U21 ne sont plus calculées automatiquement. Le système actuel repose sur le classement par équipe de l'étape et n'est pas encore documenté dans la FAQ.
                </p>
              </div>
            ) : null}
            {results[selectedCourseId]
              ? renderResultTable(results[selectedCourseId])
              : <div className="muted">Aucun résultat enregistré pour cette course.</div>}
          </Card>
        )}
      </div>
    </div>
  );
}
