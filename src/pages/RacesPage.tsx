import type { ParsedRaceTable } from "../lib/parser/raceTableParser";
// Adaptateur : ParsedRaceTable -> ParsedRace (pour compatibilité UI)
function adaptRaceTableToParsedRace(parsed: ParsedRaceTable): ParsedRace {
  return {
    rawText: '',
    name: parsed.name,
    raceType: 'simple',
    distanceKm: parsed.distanceKm,
    raceKey: undefined,
    scheduledAt: undefined,
    stageNumber: undefined,
    tourKey: undefined,
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
    category: parsed.category,
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
import { getParsedRaceResultCategory } from "../lib/utils/courseCategory";
import { extractRaceScheduledAt, formatCourseDateLabel } from "../lib/utils/courseDates";
import { ensureRaceKey, getRaceKey } from "../lib/utils/raceIdentity";
import {
  buildTourKey,
  detectRaceTypeFromImport,
  extractStageNumber,
  findMatchingTourKey,
  type RaceImportMode,
} from "../lib/utils/stageRaces";
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

function getInitialRiders(): Rider[] {
  const storedRiders = loadRidersFromStorage();
  return storedRiders.length > 0 ? storedRiders : initialRiders;
}

function detectRaceCategory(race: ParsedRace): "U21" | "U25" | "Pro" | null {
  if (race.category) {
    return race.category;
  }

  const haystacks = [race.name, race.rawText, ...(race.summary ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystacks.includes("u21")) {
    return "U21";
  }

  if (haystacks.includes("u25")) {
    return "U25";
  }

  if (haystacks.includes("pro")) {
    return "Pro";
  }

  return null;
}

function getBlockedYoungRidersInProRaces(
  races: ParsedRace[],
  riders: Rider[]
): Set<string> {
  const blocked = new Set<string>();
  const proRaceIndices: number[] = races
    .map((race, idx) => (detectRaceCategory(race) === "Pro" ? idx : -1))
    .filter((idx) => idx !== -1);

  proRaceIndices.forEach((idx) => {
    const race = races[idx];
    const analysis = buildRaceAnalysis(riders, race);
    analysis.selected.forEach((rider) => {
      if (rider.riderCategory === "U25" || rider.riderCategory === "U21") {
        blocked.add(rider.riderId);
      }
    });
  });

  return blocked;
}

function filterRidersForRace(
  race: ParsedRace,
  riders: Rider[],
  blockedYoungRiders: Set<string> = new Set()
): Rider[] {
  const raceCategory = detectRaceCategory(race);

  if (raceCategory === "U25") {
    return riders.filter(
      (rider) =>
        rider.category === "U25" &&
        rider.ageYears >= 22 &&
        rider.ageYears <= 25 &&
        !blockedYoungRiders.has(rider.id)
    );
  }

  if (raceCategory === "U21") {
    return riders.filter(
      (rider) =>
        rider.category === "U21" &&
        rider.ageYears <= 21 &&
        !blockedYoungRiders.has(rider.id)
    );
  }

  return riders;
}

function sanitizeSavedSetup(
  saved: Record<string, RiderRaceSetup>,
  selectedRiders: { riderId: string }[]
): Record<string, RiderRaceSetup> {
  const allowedIds = new Set(selectedRiders.map((rider) => rider.riderId));
  return Object.fromEntries(
    Object.entries(saved).filter(([riderId]) => allowedIds.has(riderId))
  );
}

function getSelectedRiderIdsFromSetup(setup: Record<string, RiderRaceSetup>): string[] {
  return Object.keys(setup);
}

function buildTourSelection(
  races: ParsedRace[],
  riders: Rider[],
  blockedYoungRiders: Set<string>
): string[] {
  const aggregateScores = new Map<string, { rider: Rider; score: number }>();

  races.forEach((race) => {
    const filteredRiders = filterRidersForRace(race, riders, blockedYoungRiders);
    const ranking = buildRaceAnalysis(filteredRiders, race).ranking;

    ranking.forEach((entry) => {
      const rider = filteredRiders.find((candidate) => candidate.id === entry.riderId);

      if (!rider) {
        return;
      }

      const current = aggregateScores.get(entry.riderId);
      aggregateScores.set(entry.riderId, {
        rider,
        score: (current?.score ?? 0) + entry.score,
      });
    });
  });

  return [...aggregateScores.entries()]
    .sort((left, right) => {
      if (right[1].score !== left[1].score) {
        return right[1].score - left[1].score;
      }

      return right[1].rider.total - left[1].rider.total;
    })
    .slice(0, 7)
    .map(([riderId]) => riderId);
}

function resolveImportedRaces(
  races: ParsedRace[],
  mode: RaceImportMode,
  tourLabel: string,
  existingTodos: TodoItem[]
): { races: ParsedRace[]; warnings: string[] } {
  const warnings: string[] = [];
  const explicitTourKey = tourLabel.trim() ? buildTourKey(tourLabel.trim()) : null;
  const stageRaces = races.filter((race) => race.raceType === "etapes");
  const batchTourKey =
    explicitTourKey ??
    (stageRaces.length > 1
      ? buildTourKey(stageRaces[0].name, stageRaces[0].scheduledAt)
      : null);

  return {
    races: races.map((race) => {
      const raceType = detectRaceTypeFromImport(race.name, mode);
      const stageNumber = extractStageNumber(race.name);

      if (raceType !== "etapes") {
        return ensureRaceKey({
          ...race,
          raceType,
          stageNumber: undefined,
          tourKey: undefined,
        });
      }

      const matchedTourKey = findMatchingTourKey(stageNumber, race.scheduledAt ?? null, existingTodos);
      const detectedTourKey =
        explicitTourKey ??
        batchTourKey ??
        matchedTourKey ??
        buildTourKey(race.name, race.scheduledAt);

      if (!explicitTourKey && !batchTourKey && !matchedTourKey && stageNumber !== 1) {
        warnings.push(
          `Étape ${stageNumber} importée sans tour existant clairement identifiable. Ajoute une référence du tour pour verrouiller l'inscription commune sur les prochains imports.`
        );
      }

      return ensureRaceKey({
        ...race,
        raceType,
        stageNumber: stageNumber ?? undefined,
        tourKey: detectedTourKey,
        weights: {
          ...race.weights,
          stageRace: Math.max(race.weights.stageRace, 38),
          recovery: Math.max(race.weights.recovery, 20),
          endurance: Math.max(race.weights.endurance, 12),
          resistance: Math.max(race.weights.resistance, 8),
        },
      });
    }),
    warnings,
  };
}

function buildSetupMap(
  races: ParsedRace[],
  riders: Rider[]
): Record<string, Record<string, RiderRaceSetup>> {
  const next: Record<string, Record<string, RiderRaceSetup>> = {};
  const u25u21InPro = getBlockedYoungRidersInProRaces(races, riders);

  const existingTodos = loadManualTodos();
  const racesByGroup = new Map<string, ParsedRace[]>();

  races.forEach((race) => {
    const groupKey = race.raceType === "etapes" ? race.tourKey ?? getRaceKey(race) : getRaceKey(race);
    const currentGroup = racesByGroup.get(groupKey) ?? [];
    currentGroup.push(race);
    racesByGroup.set(groupKey, currentGroup);
  });

  racesByGroup.forEach((groupRaces, groupKey) => {
    let lockedSelectedIds: string[] | undefined;

    if (groupRaces[0]?.raceType === "etapes") {
      const existingGroupTodos = existingTodos.filter((todo) => todo.tourKey === groupKey);

      for (const todo of existingGroupTodos) {
        if (!todo.raceKey) {
          continue;
        }

        const setup = loadRaceSetup(todo.raceKey);

        if (Object.keys(setup).length > 0) {
          lockedSelectedIds = getSelectedRiderIdsFromSetup(setup);
          break;
        }
      }

      if (!lockedSelectedIds || lockedSelectedIds.length === 0) {
        lockedSelectedIds = buildTourSelection(groupRaces, riders, u25u21InPro);
      }
    }

    groupRaces.forEach((race) => {
      const filteredRiders = filterRidersForRace(race, riders, u25u21InPro);
      const analysis = buildRaceAnalysis(filteredRiders, race, lockedSelectedIds);
      const raceKey = getRaceKey(race);
      const saved = loadRaceSetup(raceKey);
      const sanitizedSaved = sanitizeSavedSetup(saved, analysis.selected);
      next[raceKey] = Object.keys(sanitizedSaved).length > 0
        ? sanitizedSaved
        : buildDefaultRaceSetupMap(analysis.race, analysis.selected);
    });
  });

  return next;
}

export default function RacesPage() {
  const [riders] = useState<Rider[]>(getInitialRiders);
  const [races, setRaces] = useState<ParsedRace[]>([]); // Plusieurs étapes
  const [messages, setMessages] = useState<string[]>([]);
  const [setupByRiderList, setSetupByRiderList] = useState<Record<string, Record<string, RiderRaceSetup>>>({}); // par étape
  const [generalSummary, setGeneralSummary] = useState<string>("");


  function handleAnalyze(rawText: string, mode: RaceImportMode, tourLabel: string) {
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
        parsed.rawText = block;
        parsed.scheduledAt = extractRaceScheduledAt(parsed) ?? undefined;
        parsed.raceType = detectRaceTypeFromImport(parsed.name, mode);
        parsed.stageNumber = extractStageNumber(parsed.name) ?? undefined;
        parsedRaces.push(parsed);
        debugMessages.push(
          `--- Course ${idx + 1} ---`,
          ...parsed.summary,
          `Catégorie détectée : ${detectRaceCategory(parsed) ?? "Aucune"}`,
          `Profil détecté : ${parsed.detectedProfile}`,
          `Type : ${parsed.raceType === "etapes" ? "course à étapes" : "course simple"}.`
        );
      } catch (e) {
        debugMessages.push(`Erreur lors de l'analyse du tableau ${idx + 1} : ${(e as Error).message}`);
      }
    });

    const resolvedImport = resolveImportedRaces(parsedRaces, mode, tourLabel, loadManualTodos());

    setRaces(resolvedImport.races);
    setSetupByRiderList(buildSetupMap(resolvedImport.races, riders));
    setMessages([
      `Nombre de courses détectées : ${resolvedImport.races.length}`,
      ...resolvedImport.warnings,
      ...debugMessages,
      resolvedImport.races.length === 0 ? "Aucune course valide détectée." : "Analyse terminée."
    ]);
  }

  function handleRoleChange(raceIdx: number, riderId: string, role: Exclude<RaceRole, "Remplaçant">) {
    const race = races[raceIdx];
    const raceKey = getRaceKey(race);
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
    const raceKey = getRaceKey(race);
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
    const raceKey = getRaceKey(race);
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
    const blockedYoungRiders = getBlockedYoungRidersInProRaces(races, riders);
    const filteredRiders = filterRidersForRace(race, riders, blockedYoungRiders);
    const raceKey = getRaceKey(race);
    const lockedSelectedIds = Object.keys(setupByRiderList[raceKey] || {});
    const analysis = buildRaceAnalysis(filteredRiders, race, lockedSelectedIds);
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
      const raceKey = getRaceKey(race);
      const scheduledAt = extractRaceScheduledAt(race);
      const dateLabel = scheduledAt ? formatCourseDateLabel(scheduledAt) : '';

      return {
        id: `calendar-${Date.now()}-${Math.floor(Math.random()*10000)}`,
        title: `${race.name} (${dateLabel ? dateLabel + ' · ' : ''}${race.distanceKm ? race.distanceKm + ' km' : ''})`,
        details: `Date: ${dateLabel || '-'}\nProfil: ${race.detectedProfile}\nType: ${race.raceType}\nRésumé: ${race.summary?.join(' | ')}`,
        source: 'manual',
        status: 'todo',
        priority: 'moyenne',
        category: 'courses',
        createdAt: new Date().toISOString(),
        scheduledAt: scheduledAt ?? undefined,
        courseCategory: getParsedRaceResultCategory(race),
        stageNumber: race.stageNumber,
        tourKey: race.tourKey,
        raceKey,
      };
    });
    // Sauvegarder la tactique (ODC) courante ET le profil de course pour chaque course dans le localStorage
    try {
      const allSetups = loadStoredRaceSetups();
      races.forEach((race) => {
        const raceKey = getRaceKey(race);
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
            <div className="race-import-success-list">
              {messages.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
          )}
          <div className="race-import-actions">
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
          <div className="race-general-summary">{generalSummary}</div>
        </Card>
      )}

      {/* Affichage de chaque étape */}
      {races.map((race, idx) => {
        const blockedYoungRiders = getBlockedYoungRidersInProRaces(races, riders);
        const filteredRiders = filterRidersForRace(race, riders, blockedYoungRiders);
        const raceKey = getRaceKey(race);
        const setupByRider = setupByRiderList[raceKey] || {};
        const analysis = buildRaceAnalysis(filteredRiders, race, Object.keys(setupByRider));
        return (
          <div key={raceKey} className="race-stage-block">
            <Card title={`${race.raceType === 'etapes' ? `Étape ${race.stageNumber ?? idx + 1}` : 'Course'} : ${race.name}`}>
              <RaceSummary race={race} />
              {race.raceType === 'etapes' ? (
                <p className="muted">
                  Inscription commune sur le tour : les 7 coureurs restent identiques sur toutes les étapes de cette série.
                </p>
              ) : null}
              <div className="race-stage-setup">
                <OdcPresetSelector onApplyDefault={() => handleApplyDefaultPresets(idx)} />
                <RaceSetupTable
                  riders={analysis.selected}
                  setupByRider={setupByRider}
                  onRoleChange={(riderId, role) => handleRoleChange(idx, riderId, role)}
                  onPercentChange={(riderId, percent) => handlePercentChange(idx, riderId, percent)}
                  onBreakawayChange={(riderId, val) => handleBreakawayChange(idx, riderId, val)}
                />
              </div>
              <Card title="Remplaçants" className="race-stage-subcard">
                <TeamSelectionTable
                  title="Remplaçants conseillés"
                  riders={analysis.substitutes}
                />
              </Card>
              <Card title="Classement complet" className="race-stage-subcard">
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