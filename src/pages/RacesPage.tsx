import type { ParsedRaceTable } from "../lib/parser/raceTableParser";
// Adaptateur : ParsedRaceTable -> ParsedRace (pour compatibilité UI)
function adaptRaceTableToParsedRace(parsed: ParsedRaceTable): ParsedRace {
  return {
    rawText: '',
    name: parsed.name,
    raceType: 'simple',
    distanceKm: parsed.distanceKm,
    detectedProfile: parsed.profil,
    weights: {
      flat: parsed.secteursPlats ? 40 : 0,
      hill: parsed.secteursVallonnes ? 40 : 0,
      mountain: parsed.secteursMontagneux ? 40 : 0,
      sprint: parsed.arrivee.toLowerCase().includes('sprint') ? 30 : 0,
      cobble: parsed.terrain.toLowerCase().includes('pavé') ? 30 : 0,
      timeTrial: parsed.terrain.toLowerCase().includes('clm') ? 30 : 0,
      breakaway: 0,
      endurance: parsed.difficulte.toLowerCase().includes('long') ? 20 : 0,
      resistance: parsed.difficulte.toLowerCase().includes('difficile') ? 20 : 0,
      recovery: 0,
      stageRace: 0,
    },
    summary: [
      `Profil détecté : ${parsed.profil}`,
      `Distance : ${parsed.distanceKm} km`,
      `Dénivelé : ${parsed.elevation} m`,
      `Cols : ${parsed.cols} | Côtes : ${parsed.cotes}`,
      `Plats : ${parsed.secteursPlats} | Vallonné : ${parsed.secteursVallonnes} | Montagneux : ${parsed.secteursMontagneux}`,
      `Arrivée : ${parsed.arrivee}`,
      `Terrain : ${parsed.terrain}`,
      `Difficulté : ${parsed.difficulte}`,
    ],
  };
}
import { useState } from "react";
import Card from "../components/common/Card";
import PageTitle from "../components/common/PageTitle";
import OdcPresetSelector from "../components/races/OdcPresetSelector";
import RaceImportBox from "../components/races/RaceImportBox";
import RaceSetupTable from "../components/races/RaceSetupTable";
import RaceSummary from "../components/races/RaceSummary";
import TeamSelectionTable from "../components/races/TeamSelectionTable";
import { parseRaceTable } from "../lib/parser/raceTableParser";
import { buildDefaultRaceSetupMap } from "../lib/scoring/odcScores";
import { buildRaceAnalysis } from "../lib/scoring/raceScores";
import { loadRaceSetup, saveRaceSetup } from "../lib/storage/raceStorage";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { initialRiders } from "../store/initialState";
import { saveManualTodos, loadManualTodos } from "../lib/storage/todoStorage";
import { saveCalendarRaceProfile } from "../lib/storage/calendarRaceProfile";
import type { TodoItem } from "../types/todo";
import type { ParsedRace, RaceRole, RiderRaceSetup } from "../types/race";
import type { Rider } from "../types/rider";

type StoredRaceSetupMap = Record<string, Record<string, RiderRaceSetup>>;

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

function buildRaceKey(race: ParsedRace | null): string {
  if (!race) {
    return "";
  }

  return `${race.name}::${race.raceType}::${race.distanceKm}::${race.detectedProfile}`;
}

function getInitialRiders(): Rider[] {
  const storedRiders = loadRidersFromStorage();
  return storedRiders.length > 0 ? storedRiders : initialRiders;
}

function buildSetupMap(
  races: ParsedRace[],
  riders: Rider[]
): Record<string, Record<string, RiderRaceSetup>> {
  const next: Record<string, Record<string, RiderRaceSetup>> = {};
  const proRaceIndices: number[] = races
    .map((race, idx) => (race.name.toLowerCase().includes("pro") ? idx : -1))
    .filter((idx) => idx !== -1);
  const u25u21InPro = new Set<string>();

  proRaceIndices.forEach((idx) => {
    const race = races[idx];
    const analysis = buildRaceAnalysis(riders, race);
    analysis.selected.forEach((rider) => {
      if (rider.riderCategory === "U25" || rider.riderCategory === "U21") {
        u25u21InPro.add(rider.riderId);
      }
    });
  });

  races.forEach((race) => {
    let filteredRiders = riders;
    const isU25 =
      race.name.toLowerCase().includes("u25") ||
      race.summary?.some((summaryLine) => summaryLine.toLowerCase().includes("u25"));
    const isU21 =
      race.name.toLowerCase().includes("u21") ||
      race.summary?.some((summaryLine) => summaryLine.toLowerCase().includes("u21"));

    if (isU25) {
      filteredRiders = filteredRiders.filter(
        (rider) =>
          rider.category === "U25" &&
          rider.ageYears >= 22 &&
          rider.ageYears <= 25 &&
          !u25u21InPro.has(rider.id)
      );
    } else if (isU21) {
      filteredRiders = filteredRiders.filter(
        (rider) => rider.category === "U21" && !u25u21InPro.has(rider.id)
      );
    }

    const analysis = buildRaceAnalysis(filteredRiders, race);
    const raceKey = buildRaceKey(race);
    const saved = loadRaceSetup(raceKey);
    next[raceKey] = Object.keys(saved).length > 0
      ? saved
      : buildDefaultRaceSetupMap(analysis.race, analysis.selected);
  });

  return next;
}

export default function RacesPage() {
  const [riders] = useState<Rider[]>(getInitialRiders);
  const [races, setRaces] = useState<ParsedRace[]>([]); // Plusieurs étapes
  const [messages, setMessages] = useState<string[]>([]);
  const [setupByRiderList, setSetupByRiderList] = useState<Record<string, Record<string, RiderRaceSetup>>>({}); // par étape
  const [generalSummary, setGeneralSummary] = useState<string>("");

  // Filtrage spécial pour U25 : exclure U21 et >25 ans
  function filterRidersForRace(race: ParsedRace, riders: Rider[]): Rider[] {
    // Si le nom ou le résumé de la course contient U25, on filtre
    const isU25 =
      race.name.toLowerCase().includes("u25") ||
      race.summary?.some((s) => s.toLowerCase().includes("u25"));
    if (!isU25) return riders;
    return riders.filter(
      (r) => r.category === "U25" && r.ageYears >= 22 && r.ageYears <= 25
    );
  }


  function handleAnalyze(rawText: string) {
    if (!rawText.trim()) {
      setMessages(["Le texte de course est vide."]);
      return;
    }

    // Découpage en plusieurs tableaux (séparateur : 2 lignes vides ou plus)
    const tableBlocks = rawText.split(/(?:\r?\n){2,}/).map(b => b.trim()).filter(Boolean);
    const parsedRaces: ParsedRace[] = [];
    const debugMessages: string[] = [];

    tableBlocks.forEach((block, idx) => {
      try {
        const parsedTable = parseRaceTable(block);
        const parsed = adaptRaceTableToParsedRace(parsedTable);
        parsedRaces.push(parsed);
        debugMessages.push(
          `--- Course ${idx + 1} ---`,
          ...parsed.summary,
          `Profil détecté : ${parsed.detectedProfile}`,
          `Type : course simple.`
        );
      } catch (e) {
        debugMessages.push(`Erreur lors de l'analyse du tableau ${idx + 1} : ${(e as Error).message}`);
      }
    });

    setRaces(parsedRaces);
    setSetupByRiderList(buildSetupMap(parsedRaces, riders));
    setMessages([
      `Nombre de courses détectées : ${parsedRaces.length}`,
      ...debugMessages,
      parsedRaces.length === 0 ? "Aucune course valide détectée." : "Analyse terminée."
    ]);
  }

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
    const newSetup = buildDefaultRaceSetupMap(analysis.race, analysis.selected);
    setSetupByRiderList((current) => ({
      ...current,
      [raceKey]: newSetup,
    }));
    // Sauvegarde dans le localStorage pour écraser l'ancien setup
    saveRaceSetup(raceKey, newSetup);
    setMessages((current) => [
      `Réglages automatiques réappliqués pour l'étape ${raceIdx + 1}.`,
      ...current,
    ]);
  }

  // Ajout au calendrier et todo
  function handleAddToCalendar() {
    if (!races.length) return;
    const todos: TodoItem[] = races.map(race => {
      const raceKey = buildRaceKey(race);
      // Recherche de la date si possible (depuis rawText ou summary)
      let date = '';
      if (race.rawText) {
        const m = race.rawText.match(/Date\s*\|\s*([\d/-]+)/i);
        if (m) date = m[1];
      }
      if (!date && race.summary) {
        const found = race.summary.find(s => s.toLowerCase().includes('date'));
        if (found) {
          const m = found.match(/([\d]{2}\/\d{2}\/\d{4})/);
          if (m) date = m[1];
        }
      }
      return {
        id: `calendar-${Date.now()}-${Math.floor(Math.random()*10000)}`,
        title: `${race.name} (${date ? date + ' · ' : ''}${race.distanceKm ? race.distanceKm + ' km' : ''})`,
        details: `Date: ${date}\nProfil: ${race.detectedProfile}\nType: ${race.raceType}\nRésumé: ${race.summary?.join(' | ')}`,
        source: 'manual',
        status: 'todo',
        priority: 'moyenne',
        category: 'courses',
        createdAt: new Date().toISOString(),
        raceKey,
      };
    });
    // Sauvegarder la tactique (ODC) courante ET le profil de course pour chaque course dans le localStorage
    try {
      const allSetups = loadStoredRaceSetups();
      races.forEach((race) => {
        const raceKey = buildRaceKey(race);
        const setup = setupByRiderList[raceKey];
        if (setup && Object.keys(setup).length > 0) {
          allSetups[raceKey] = setup;
          // Sauvegarde du profil complet de la course pour le calendrier
          saveCalendarRaceProfile(raceKey, race);
        }
      });
      localStorage.setItem('cymanager:race-setup', JSON.stringify(allSetups));
    } catch (error) {
      console.error('Erreur de sauvegarde des réglages de course', error);
    }
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
          {messages.length > 0 && (
            <div style={{ margin: "1em 0", color: "#2b2" }}>
              {messages.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
          )}
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
        // Filtrage spécial U25
        const filteredRiders = filterRidersForRace(race, riders);
        const analysis = buildRaceAnalysis(filteredRiders, race);
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