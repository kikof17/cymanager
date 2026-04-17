import { useEffect, useMemo, useState } from "react";
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
import { loadRaceSetup, saveRaceSetup } from "../lib/storage/raceStorage";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { initialRiders } from "../store/initialState";
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
  const [race, setRace] = useState<ParsedRace | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [setupByRider, setSetupByRider] = useState<Record<string, RiderRaceSetup>>({});

  useEffect(() => {
    const storedRiders = loadRidersFromStorage();
    setRiders(storedRiders.length > 0 ? storedRiders : initialRiders);
  }, []);

  function handleAnalyze(rawText: string) {
    if (!rawText.trim()) {
      setMessages(["Le texte de course est vide."]);
      return;
    }

    const parsed = parseRaceText(rawText);

    localStorage.setItem(
      "cymanager:last-race",
      JSON.stringify({
        name: parsed.name,
        raceType: parsed.raceType,
        distanceKm: parsed.distanceKm,
        detectedProfile: parsed.detectedProfile,
      })
    );

    setRace(parsed);
    setMessages([
      "Course analysée.",
      `Profil détecté : ${parsed.detectedProfile}.`,
      `Type : ${parsed.raceType === "etapes" ? "course à étapes" : "course simple"}.`,
    ]);
  }

  const analysis = useMemo(() => {
    if (!race) {
      return null;
    }

    return buildRaceAnalysis(riders, race);
  }, [riders, race]);

  const raceKey = useMemo(() => buildRaceKey(race), [race]);

  useEffect(() => {
    if (!analysis || !raceKey) {
      setSetupByRider({});
      return;
    }

    const saved = loadRaceSetup(raceKey);
    const hasSaved = Object.keys(saved).length > 0;

    if (hasSaved) {
      setSetupByRider(saved);
      return;
    }

    setSetupByRider(buildDefaultRaceSetupMap(analysis.race, analysis.selected));
  }, [analysis, raceKey]);

  useEffect(() => {
    if (!raceKey || Object.keys(setupByRider).length === 0) {
      return;
    }

    saveRaceSetup(raceKey, setupByRider);
  }, [raceKey, setupByRider]);

  function handleRoleChange(
    riderId: string,
    role: Exclude<RaceRole, "Remplaçant">
  ) {
    setSetupByRider((current) => {
      const existing =
        current[riderId] ?? {
          riderId,
          role: "Équipier",
          effortPercent: 50,
          morningBreakaway: false,
        };

      return {
        ...current,
        [riderId]: {
          ...existing,
          role,
        },
      };
    });
  }

  function handlePercentChange(riderId: string, effortPercent: number) {
    setSetupByRider((current) => {
      const existing =
        current[riderId] ?? {
          riderId,
          role: "Équipier",
          effortPercent: 50,
          morningBreakaway: false,
        };

      return {
        ...current,
        [riderId]: {
          ...existing,
          effortPercent,
        },
      };
    });
  }

  function handleBreakawayChange(riderId: string, morningBreakaway: boolean) {
    setSetupByRider((current) => {
      const existing =
        current[riderId] ?? {
          riderId,
          role: "Équipier",
          effortPercent: 50,
          morningBreakaway: false,
        };

      return {
        ...current,
        [riderId]: {
          ...existing,
          morningBreakaway,
        },
      };
    });
  }

  function handleApplyDefaultPresets() {
    if (!analysis) {
      return;
    }

    setSetupByRider(buildDefaultRaceSetupMap(analysis.race, analysis.selected));
    setMessages((current) => [
      "Réglages automatiques réappliqués.",
      ...current,
    ]);
  }

  return (
    <div className="page-stack">
      <PageTitle
        title="Courses"
        subtitle="Analyse d'une course, sélection des 7 et réglages d'inscription plus proches de l'écran de jeu."
      />

      <div className="two-columns">
        <Card title="Import course">
          <RaceImportBox onAnalyze={handleAnalyze} />
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

      <RaceSummary race={race} />

      {analysis ? (
        <>
          <Card title="Écran d'inscription / réglages">
            <div className="page-stack">
              <OdcPresetSelector onApplyDefault={handleApplyDefaultPresets} />
              <RaceSetupTable
                riders={analysis.selected}
                setupByRider={setupByRider}
                onRoleChange={handleRoleChange}
                onPercentChange={handlePercentChange}
                onBreakawayChange={handleBreakawayChange}
              />
            </div>
          </Card>

          <Card title="Remplaçants">
            <TeamSelectionTable
              title="Remplaçants conseillés"
              riders={analysis.substitutes}
            />
          </Card>

          <Card title="Classement complet">
            <TeamSelectionTable
              title="Tous les coureurs classés"
              riders={analysis.ranking}
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}