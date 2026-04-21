import { useEffect, useMemo, useRef, useState } from 'react';
import Card from '../components/common/Card';
import PageTitle from '../components/common/PageTitle';
import { buildCrossRecommendations } from '../lib/app/crossRecommendations';
import { getProRacePrize } from '../lib/finance/racePrizeTable';
import { buildResultReferenceSummary, getAllResultsFromStorage, getStoredResultText, reconcileStoredResultsWithCourses, saveAllResultsToStorage, type ResultReferenceIssue, type StoredResult } from '../lib/scoring/extractPoints';
import { appendManagementHistoryEntry } from '../lib/storage/managementHistoryStorage';
import { syncFinanceWithSettings } from '../lib/storage/financeStorage';
import { getStoredResultCategory, type ResultCategory } from '../lib/utils/courseCategory';
import { loadClubSettings } from '../lib/storage/settingsStorage';
import { loadRidersFromStorage } from '../lib/storage/localStorage';
import { loadManualTodos } from '../lib/storage/todoStorage';
import { getTodoScheduledAt } from '../lib/utils/courseDates';
import { getCourseDisplayTitle, groupCourseTodos } from '../lib/utils/stageRaces';
import { formatCurrency } from '../lib/utils/numbers';
import { initialRiders } from '../store/initialState';
import type { TodoItem } from '../types/todo';

// Pour stocker les résultats associés à chaque course (clé = id de la course)
type ResultMap = Record<string, StoredResult>

const TEAM_NAME = 'Kritoff Team';

function hasStoredResult(result: StoredResult | undefined): boolean {
  if (!result) {
    return false;
  }

  return getStoredResultText(result).trim().length > 0;
}

function normalizeComparable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getStoredCategory(
  result: StoredResult,
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
  return getAllResultsFromStorage();
}

function loadCourses(): TodoItem[] {
  return loadManualTodos().filter((todo) => todo.id.startsWith('calendar-'));
}

export default function ResultPage() {
  const [courses] = useState<TodoItem[]>(loadCourses);
  const [riders] = useState(() => {
    const stored = loadRidersFromStorage();
    return stored.length > 0 ? stored : initialRiders;
  });
  const [results, setResults] = useState<ResultMap>(loadResults);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => loadCourses()[0]?.id ?? '');
  const [isCourseListOpen, setIsCourseListOpen] = useState(false);
  const [message, setMessage] = useState('Les références de résultats sont vérifiées contre le calendrier courant.');
  const courseSelectRef = useRef<HTMLDivElement | null>(null);
  const selectedCourseHasResult = hasStoredResult(results[selectedCourseId]);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const courseGroups = useMemo(() => groupCourseTodos(courses), [courses]);
  const resultReferenceSummary = useMemo(() => buildResultReferenceSummary(results, courses), [courses, results]);
  const resultReferenceIssueMap = useMemo(
    () => new Map(resultReferenceSummary.issues.map((issue) => [issue.courseId, issue])),
    [resultReferenceSummary.issues]
  );
  const selectedCourseGroup = useMemo(
    () => courseGroups.find((group) => group.todos.some((course) => course.id === selectedCourseId)) ?? null,
    [courseGroups, selectedCourseId]
  );
  const selectedCourseIssue = selectedCourseId ? resultReferenceIssueMap.get(selectedCourseId) ?? null : null;
  const crossRecommendations = useMemo(
    () =>
      buildCrossRecommendations({
        riders,
        resultReferenceSummary,
      }),
    [resultReferenceSummary, riders]
  );

  function getReferenceIssueLabel(issue: ResultReferenceIssue | null): string {
    if (!issue) {
      return 'aucune lecture disponible';
    }

    if (issue.status === 'missing-race-reference') {
      return 'résultat non encore rattaché à une référence stable';
    }

    if (issue.status === 'mismatched-race-reference') {
      return 'référence incohérente avec le calendrier actuel';
    }

    if (issue.status === 'orphan') {
      return 'résultat orphelin, sans course correspondante dans le calendrier';
    }

    return 'référence validée';
  }

  function handleRepairReferences() {
    const repaired = reconcileStoredResultsWithCourses(results, courses);

    if (repaired.repairedCount === 0) {
      setMessage('Aucune référence de résultat à réaligner.');
      return;
    }

    saveAllResultsToStorage(repaired.results);
    syncFinanceWithSettings(loadClubSettings());
    setResults(repaired.results);
    appendManagementHistoryEntry({
      area: 'results',
      kind: 'result-repair',
      title: 'Références résultats réalignées',
      note: `Correction 1.6.0 : ${repaired.repairedCount} résultat(s) rattaché(s) de nouveau à leur course et finance resynchronisée.`,
    });
    setMessage(`${repaired.repairedCount} résultat(s) réaligné(s) sur leur course.`);
  }

  function handleRemoveOrphanResults() {
    const validCourseIds = new Set(courses.map((course) => course.id));
    let removedCount = 0;

    const nextResults = Object.entries(results).reduce<ResultMap>((accumulator, [courseId, stored]) => {
      if (!validCourseIds.has(courseId)) {
        removedCount += 1;
        return accumulator;
      }

      accumulator[courseId] = stored;
      return accumulator;
    }, {});

    if (removedCount === 0) {
      setMessage('Aucun résultat orphelin à supprimer.');
      return;
    }

    saveAllResultsToStorage(nextResults);
    syncFinanceWithSettings(loadClubSettings());
    setResults(nextResults);
    appendManagementHistoryEntry({
      area: 'results',
      kind: 'result-repair',
      title: 'Résultats orphelins supprimés',
      note: `Correction 1.6.0 : ${removedCount} résultat(s) orphelin(s) supprimé(s) et finance resynchronisée.`,
    });
    setMessage(`${removedCount} résultat(s) orphelin(s) supprimé(s).`);
  }

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

  function renderResultTable(result: StoredResult) {
    const courseTitle = selectedCourse?.title ?? '';
    const category = getStoredCategory(result, selectedCourse);
    const showPrizeColumn = category === 'pro';
    const resultStr = getStoredResultText(result);
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
        <div className="message-box">
          <p className="muted">{message}</p>
        </div>

        <Card title="Recommandations croisées résultats">
          <div className="dashboard-lines">
            {crossRecommendations.results.map((item, index) => (
              <p key={`${item.severity}-${index}`} className={item.severity === 'critical' ? 'settings-diagnostic-line settings-diagnostic-line-warning' : undefined}>
                <strong>{item.severity === 'critical' ? 'Critique' : item.severity === 'warning' ? 'Vigilance' : 'Info'} :</strong> {item.text}
              </p>
            ))}
          </div>
        </Card>

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
            {selectedCourse && results[selectedCourseId] ? (
              <div className="message-box">
                <p>
                  <strong>Référence course :</strong>{' '}
                  {getReferenceIssueLabel(selectedCourseIssue)}
                </p>
              </div>
            ) : null}

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
        {resultReferenceSummary.totalResults > 0 ? (
          <Card title="Références des résultats">
            <div className="page-stack">
              <div className="settings-diagnostics-grid">
                <div className="finance-prize-preview">
                  <span className="muted">Références validées</span>
                  <strong>{resultReferenceSummary.validCount}</strong>
                  <span className="muted">Résultats alignés avec leur course</span>
                </div>
                <div className="finance-prize-preview">
                  <span className="muted">Références manquantes</span>
                  <strong>{resultReferenceSummary.missingRaceReferenceCount}</strong>
                  <span className="muted">Résultats à réaligner</span>
                </div>
                <div className="finance-prize-preview">
                  <span className="muted">Références cassées</span>
                  <strong>{resultReferenceSummary.mismatchedRaceReferenceCount + resultReferenceSummary.orphanCount}</strong>
                  <span className="muted">Incohérences ou orphelins</span>
                </div>
              </div>

              <div className="inline-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleRepairReferences}
                  disabled={resultReferenceSummary.missingRaceReferenceCount + resultReferenceSummary.mismatchedRaceReferenceCount === 0}
                >
                  Réaligner les références valides
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleRemoveOrphanResults}
                  disabled={resultReferenceSummary.orphanCount === 0}
                >
                  Supprimer les résultats orphelins
                </button>
              </div>

              {resultReferenceSummary.issues.some((issue) => issue.status !== 'valid') ? (
                <div className="dashboard-lines">
                  {resultReferenceSummary.issues
                    .filter((issue) => issue.status !== 'valid')
                    .slice(0, 5)
                    .map((issue) => (
                      <p key={issue.courseId} className="settings-diagnostic-line settings-diagnostic-line-warning">
                        <strong>{issue.courseTitle}</strong> {getReferenceIssueLabel(issue)}
                      </p>
                    ))}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
