import { useEffect, useState } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import OdcPresetSelector from "../components/races/OdcPresetSelector";
import RaceImportBox from "../components/races/RaceImportBox";
import RaceSetupTable from "../components/races/RaceSetupTable";
import RaceSummary from "../components/races/RaceSummary";
import TeamSelectionTable from "../components/races/TeamSelectionTable";
import { parseRaceText } from "../lib/parser/raceParser";
import { buildDefaultRaceSetupMap } from "../lib/scoring/odcScores";
import { buildRaceAnalysis } from "../lib/scoring/raceScores";
import { loadRaceSetup } from "../lib/storage/raceStorage";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { initialRiders } from "../store/initialState";
import { saveManualTodos, loadManualTodos } from "../lib/storage/todoStorage";
import type { TodoItem } from "../types/todo";
import type { ParsedRace, RaceRole, RiderRaceSetup } from "../types/race";
import type { Rider } from "../types/rider";

function buildRaceKey(race: ParsedRace | null): string {
  if (!race) {
    return "";
  }

  return `${race.name}::${race.raceType}::${race.distanceKm}::${race.detectedProfile}`;
}

export default function RacesPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [races, setRaces] = useState<ParsedRace[]>([]); // Plusieurs étapes
  const [messages, setMessages] = useState<string[]>([]);
  const [setupByRiderList, setSetupByRiderList] = useState<Record<string, Record<string, RiderRaceSetup>>>({}); // par étape
  const [generalSummary, setGeneralSummary] = useState<string>("");

  useEffect(() => {
    const storedRiders = loadRidersFromStorage();
    setRiders(storedRiders.length > 0 ? storedRiders : initialRiders);
  }, []);

  function splitStages(rawText: string): { general: string, stages: string[] } {
    // Découpe le texte en général + étapes (titre d'étape = "Étape X" ou "Etape X")
    const lines = rawText.split(/\r?\n/);
    let general = "";
    const stages: string[] = [];
    let currentStage: string[] = [];
    let inStage = false;
    for (const line of lines) {
      if (/^\s*(Étape|Etape)\s*\d+/i.test(line)) {
        if (currentStage.length > 0) {
          stages.push(currentStage.join("\n"));
          currentStage = [];
        }
        inStage = true;
      }
      if (inStage) {
        currentStage.push(line);
      } else {
        general += (general ? "\n" : "") + line;
      }
    }
    if (currentStage.length > 0) {
      stages.push(currentStage.join("\n"));
    }
    return { general: general.trim(), stages };
  }

  function handleAnalyze(rawText: string) {
    if (!rawText.trim()) {
      setMessages(["Le texte de course est vide."]);
      return;
    }

    const { general, stages } = splitStages(rawText);
    setGeneralSummary(general);
    if (stages.length === 0) {
      // Cas : une seule étape ou texte non découpé
      const parsed = parseRaceText(rawText);
      setRaces([parsed]);
      setMessages([
        "Course analysée.",
        `Profil détecté : ${parsed.detectedProfile}.`,
        `Type : ${parsed.raceType === "etapes" ? "course à étapes" : "course simple"}.`,
      ]);
      return;
    }
    // Plusieurs étapes
    const parsedStages = stages.map(txt => parseRaceText(txt));
    setRaces(parsedStages);
    setMessages([`Mini-tour détecté : ${parsedStages.length} étapes analysées.`]);
  }

  // Analyse et réglages pour chaque étape
  useEffect(() => {
    const next: Record<string, Record<string, RiderRaceSetup>> = {};
    races.forEach((race) => {
      const analysis = buildRaceAnalysis(riders, race);
      const raceKey = buildRaceKey(race);
      const saved = loadRaceSetup(raceKey);
      const hasSaved = Object.keys(saved).length > 0;
      next[raceKey] = hasSaved
        ? saved
        : buildDefaultRaceSetupMap(analysis.race, analysis.selected);
    });
    setSetupByRiderList(next);
  }, [races, riders]);

  function handleRoleChange(raceIdx: number, riderId: string, role: Exclude<RaceRole, "Remplaçant">) {
    const race = races[raceIdx];
    const raceKey = buildRaceKey(race);
    setSetupByRiderList((current) => {
      const prev = current[raceKey] || {};
      const existing = prev[riderId] ?? {
        riderId,
        role: "Équipier",
        effortPercent: 50,
        morningBreakaway: false,
      };
      return {
        ...current,
        [raceKey]: {
          ...prev,
          [riderId]: {
            ...existing,
            role,
          },
        },
      };
    });
  }

  function handlePercentChange(raceIdx: number, riderId: string, effortPercent: number) {
    const race = races[raceIdx];
    const raceKey = buildRaceKey(race);
    setSetupByRiderList((current) => {
      const prev = current[raceKey] || {};
      const existing = prev[riderId] ?? {
        riderId,
        role: "Équipier",
        effortPercent: 50,
        morningBreakaway: false,
      };
      return {
        ...current,
        [raceKey]: {
          ...prev,
          [riderId]: {
            ...existing,
            effortPercent,
          },
        },
      };
    });
  }

  function handleBreakawayChange(raceIdx: number, riderId: string, morningBreakaway: boolean) {
    const race = races[raceIdx];
    const raceKey = buildRaceKey(race);
    setSetupByRiderList((current) => {
      const prev = current[raceKey] || {};
      const existing = prev[riderId] ?? {
        riderId,
        role: "Équipier",
        effortPercent: 50,
        morningBreakaway: false,
      };
      return {
        ...current,
        [raceKey]: {
          ...prev,
          [riderId]: {
            ...existing,
            morningBreakaway,
          },
        },
      };
    });
  }

  function handleApplyDefaultPresets(raceIdx: number) {
    const race = races[raceIdx];
    const analysis = buildRaceAnalysis(riders, race);
    const raceKey = buildRaceKey(race);
    setSetupByRiderList((current) => ({
      ...current,
      [raceKey]: buildDefaultRaceSetupMap(analysis.race, analysis.selected),
    }));
    setMessages((current) => [
      `Réglages automatiques réappliqués pour l'étape ${raceIdx + 1}.`,
      ...current,
    ]);
  }

  // Ajout au calendrier et todo
  function handleAddToCalendar() {
    if (!races.length) return;
    const todos: TodoItem[] = races.map(race => ({
      id: `calendar-${Date.now()}-${Math.floor(Math.random()*10000)}`,
      title: `${race.name} (${race.distanceKm ? race.distanceKm + ' km' : ''})`,
      details: `Profil: ${race.detectedProfile}\nType: ${race.raceType}\nRésumé: ${race.summary?.join(' | ')}`,
      source: 'manual',
      status: 'todo',
      priority: 'moyenne',
      category: 'courses',
      createdAt: new Date().toISOString(),
    }));
    const existing = loadManualTodos();
    saveManualTodos([...todos, ...existing]);
    setMessages((msgs) => [
      `✅ ${races.length > 1 ? 'Étapes ajoutées au calendrier et à la to-do !' : 'Course ajoutée au calendrier et à la to-do !'}`,
      ...msgs,
    ]);
  }

  return (
    <div className="page-stack">
      <PageTitle
        title="Courses"
        subtitle="Analyse d'une course ou d'un mini-tour, sélection des 7 et réglages d'inscription plus proches de l'écran de jeu."
      />

      <div className="two-columns">
        <Card title="Import course ou mini-tour">
          <RaceImportBox onAnalyze={handleAnalyze} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="button" onClick={() => { setRaces([]); setGeneralSummary(""); }} type="button">Vider</button>
            <button className="button button-primary" onClick={handleAddToCalendar} type="button" disabled={!races.length}>Ajouter au calendrier</button>
          </div>
        </Card>

        <Card title="Messages">
          <div className="message-box">
            {messages.length > 0 ? (
              <ul className="clean-list">
                {messages.map((message, index) => (
                  <li key={`${message}-${index}`}>{message}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Aucun message pour le moment.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Résumé général du mini-tour */}
      {generalSummary && (
        <Card title="Résumé général du mini-tour">
          <div style={{ whiteSpace: 'pre-line', fontSize: 15 }}>{generalSummary}</div>
        </Card>
      )}

      {/* Affichage de chaque étape */}
      {races.map((race, idx) => {
        const analysis = buildRaceAnalysis(riders, race);
        const raceKey = buildRaceKey(race);
        const setupByRider = setupByRiderList[raceKey] || {};
        return (
          <div key={raceKey} style={{ marginBottom: 32 }}>
            <Card title={`Étape ${idx + 1} : ${race.name}`}>
              <RaceSummary race={race} />
              <div style={{ margin: '12px 0 0 0' }}>
                <OdcPresetSelector onApplyDefault={() => handleApplyDefaultPresets(idx)} />
                <RaceSetupTable
                  riders={analysis.selected}
                  setupByRider={setupByRider}
                  onRoleChange={(riderId, role) => handleRoleChange(idx, riderId, role)}
                  onPercentChange={(riderId, percent) => handlePercentChange(idx, riderId, percent)}
                  onBreakawayChange={(riderId, val) => handleBreakawayChange(idx, riderId, val)}
                />
              </div>
              <Card title="Remplaçants" style={{ marginTop: 18 }}>
                <TeamSelectionTable
                  title="Remplaçants conseillés"
                  riders={analysis.substitutes}
                />
              </Card>
              <Card title="Classement complet" style={{ marginTop: 18 }}>
                <TeamSelectionTable
                  title="Tous les coureurs classés"
                  riders={analysis.ranking}
                />
              </Card>
            </Card>
          </div>
        );
      })}
    </div>
  );
}