import { useMemo } from "react";
import PageTitle from "../components/common/PageTitle";
import Card from "../components/common/Card";
import ClubOverviewCard from "../components/home/ClubOverviewCard";
import FacilitiesOverviewCard from "../components/home/FacilitiesOverviewCard";
import RaceOverviewCard from "../components/home/RaceOverviewCard";
import TodoOverviewCard from "../components/home/TodoOverviewCard";
import TrainingOverviewCard from "../components/home/TrainingOverviewCard";
import { buildRaceAnalysis } from "../lib/scoring/raceScores";
import { buildTrainingPlan } from "../lib/scoring/trainingScores";
import { getFinanceSnapshot } from "../lib/storage/financeStorage";
import { loadRaceSetup } from "../lib/storage/raceStorage";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import { loadTodoStatuses, loadManualTodos } from "../lib/storage/todoStorage";
import { buildTodoList } from "../lib/todo/buildTodoList";
import { initialRiders } from "../store/initialState";
import type { ParsedRace } from "../types/race";
import type { Rider } from "../types/rider";

type RaceSnapshot = {
  name: string;
  raceType: "simple" | "etapes";
  distanceKm: number;
  detectedProfile: ParsedRace["detectedProfile"];
};

function loadLastRaceSnapshot(): RaceSnapshot | null {
  try {
    const raw = localStorage.getItem("cymanager:last-race");

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as RaceSnapshot;
  } catch (error) {
    console.error("Erreur de lecture localStorage last race", error);
    return null;
  }
}

function buildRaceKey(race: RaceSnapshot | null): string {
  if (!race) {
    return "";
  }

  return `${race.name}::${race.raceType}::${race.distanceKm}::${race.detectedProfile}`;
}

export default function HomePage() {
  const riders = useMemo<Rider[]>(() => {
    const stored = loadRidersFromStorage();
    return stored.length > 0 ? stored : initialRiders;
  }, []);

  const clubSettings = useMemo(() => loadClubSettings(), []);

  const trainingPlan = useMemo(() => {
    return buildTrainingPlan(riders, clubSettings);
  }, [riders, clubSettings]);

  const financeSnapshot = useMemo(() => {
    return getFinanceSnapshot(clubSettings, riders);
  }, [clubSettings, riders]);

  const raceSnapshot = useMemo(() => loadLastRaceSnapshot(), []);
  const raceKey = useMemo(() => buildRaceKey(raceSnapshot), [raceSnapshot]);

  const race = useMemo<ParsedRace | null>(() => {
    if (!raceSnapshot) {
      return null;
    }

    return {
      rawText: "",
      name: raceSnapshot.name,
      raceType: raceSnapshot.raceType,
      distanceKm: raceSnapshot.distanceKm,
      detectedProfile: raceSnapshot.detectedProfile,
      weights: {
        flat: 0,
        hill: 0,
        mountain: 0,
        sprint: 0,
        cobble: 0,
        timeTrial: 0,
        breakaway: 0,
        endurance: 0,
        resistance: 0,
        recovery: 0,
        stageRace: 0,
      },
      summary: [],
      category: null,
    };
  }, [raceSnapshot]);

  const raceSelected = useMemo(() => {
    if (!race) {
      return [];
    }

    return buildRaceAnalysis(riders, race).selected;
  }, [race, riders]);

  const todoItems = useMemo(() => {
    const manualTodos = loadManualTodos();
    const statuses = loadTodoStatuses();
    const raceSetupCount = raceKey ? Object.keys(loadRaceSetup(raceKey)).length : 0;

    const autoTodos = buildTodoList({
      riders,
      trainingExists: riders.length > 0,
      race,
      raceSetupCount,
      clubSettings,
    });

    return [...autoTodos, ...manualTodos].map((item) => ({
      ...item,
      status: statuses[item.id] ?? item.status,
    }));
  }, [riders, race, raceKey, clubSettings]);

  // Bloc présentation équipe/manager (infos dynamiques)
  // À adapter si tu veux rendre pays, id, date, etc. dynamiques (ici valeurs fixes ou issues des settings)
  const country = "France"; // À rendre dynamique si besoin
  const teamId = "55893"; // À rendre dynamique si besoin
  const startDate = "15/04/2026 (Saison 97)"; // À rendre dynamique si besoin
  // Divisions dynamiques depuis settings
  const divisionPro = clubSettings.divisionPro || "D9";
  const divisionU25 = clubSettings.divisionU25 || "D9";
  const divisionU21 = clubSettings.divisionU21 || "D9";
  // Installations dynamiques
  const ss = clubSettings.facilities.headOffice.level;
  const bt = clubSettings.facilities.shop.level;
  const cde = clubSettings.facilities.trainingCenter.level;
  const cdf = clubSettings.facilities.formationCenter.level;

  return (
    <div className="page-stack">
      <PageTitle
        title="Accueil"
        subtitle="Vue d'ensemble du club, des priorités et des décisions à prendre."
      />

      <Card title="Club et manager" className="home-club-panel">
        <div className="home-club-panel-header">
          <div>
            <p className="eyebrow">Manager</p>
            <p className="home-club-panel-name">Kritoff</p>
            <p className="home-club-panel-subtitle">
              Repères rapides pour piloter le club sans perdre les priorités de vue.
            </p>
          </div>

          <div className="home-club-panel-chip">Saison 97</div>
        </div>

        <div className="home-club-panel-grid">
          <div className="home-club-panel-stat">
            <span className="home-club-panel-label">Pays</span>
            <strong>{country}</strong>
          </div>
          <div className="home-club-panel-stat">
            <span className="home-club-panel-label">ID équipe</span>
            <strong>{teamId}</strong>
          </div>
          <div className="home-club-panel-stat">
            <span className="home-club-panel-label">Depuis</span>
            <strong>{startDate}</strong>
          </div>
          <div className="home-club-panel-stat">
            <span className="home-club-panel-label">Installations</span>
            <strong>SS {ss} · Bt {bt} · CdE {cde} · CdF {cdf}</strong>
          </div>
          <div className="home-club-panel-stat">
            <span className="home-club-panel-label">Division Pro</span>
            <strong>{divisionPro}</strong>
          </div>
          <div className="home-club-panel-stat">
            <span className="home-club-panel-label">Division U25</span>
            <strong>{divisionU25}</strong>
          </div>
          <div className="home-club-panel-stat">
            <span className="home-club-panel-label">Division U21</span>
            <strong>{divisionU21}</strong>
          </div>
        </div>
      </Card>

      <div className="dashboard-grid">
        <ClubOverviewCard
          riders={riders}
          financialBalance={financeSnapshot.currentBalance}
          weeklySalaryExpense={financeSnapshot.weeklySalaryExpense}
        />
        <TrainingOverviewCard plan={trainingPlan} />
        <RaceOverviewCard race={race} selected={raceSelected} />
        <TodoOverviewCard items={todoItems} />
        <FacilitiesOverviewCard settings={clubSettings} />
      </div>
    </div>
  );
}