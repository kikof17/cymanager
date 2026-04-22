import { useMemo } from "react";
import PageTitle from "../components/common/PageTitle";
import Card from "../components/common/Card";
import ClubOverviewCard from "../components/home/ClubOverviewCard";
import FacilitiesOverviewCard from "../components/home/FacilitiesOverviewCard";
import ManagementJournalCard from "../components/home/ManagementJournalCard";
import RaceOverviewCard from "../components/home/RaceOverviewCard";
import TodoOverviewCard from "../components/home/TodoOverviewCard";
import TrainingOverviewCard from "../components/home/TrainingOverviewCard";
import { buildRaceAnalysis } from "../lib/scoring/raceScores";
import { buildTrainingPlan } from "../lib/scoring/trainingScores";
import { buildResultReferenceSummary, getAllResultsFromStorage } from "../lib/scoring/extractPoints";
import { buildRiderAvailabilitySummary } from "../lib/scoring/riderAvailability";
import { getFinanceSnapshot } from "../lib/storage/financeStorage";
import { loadLastRaceSnapshot, type RaceSnapshot } from "../lib/storage/lastRaceStorage";
import { loadRaceSetup } from "../lib/storage/raceStorage";
import { loadRidersFromStorage } from "../lib/storage/localStorage";
import { loadManagementHistory } from "../lib/storage/managementHistoryStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import { loadTeamProfile } from "../lib/storage/teamProfileStorage";
import { loadTodoStatuses, loadManualTodos } from "../lib/storage/todoStorage";
import { buildTodoList } from "../lib/todo/buildTodoList";
import { initialRiders } from "../store/initialState";
import type { ParsedRace } from "../types/race";
import type { Rider } from "../types/rider";

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
  const teamProfile = useMemo(() => loadTeamProfile(), []);

  const trainingPlan = useMemo(() => {
    return buildTrainingPlan(riders, clubSettings);
  }, [riders, clubSettings]);

  const financeSnapshot = useMemo(() => {
    return getFinanceSnapshot(clubSettings, riders);
  }, [clubSettings, riders]);

  const managementHistory = useMemo(() => loadManagementHistory().slice(0, 6), []);

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
    const calendarTodos = manualTodos.filter((todo) => todo.id.startsWith("calendar-"));
    const statuses = loadTodoStatuses();
    const raceSetupCount = raceKey ? Object.keys(loadRaceSetup(raceKey)).length : 0;
    const availabilitySummary = buildRiderAvailabilitySummary(riders);
    const resultReferenceSummary = buildResultReferenceSummary(
      getAllResultsFromStorage(),
      calendarTodos
    );
    const brokenResultReferenceCount =
      resultReferenceSummary.missingRaceReferenceCount +
      resultReferenceSummary.mismatchedRaceReferenceCount +
      resultReferenceSummary.orphanCount;

    const autoTodos = buildTodoList({
      riders,
      trainingExists: riders.length > 0,
      race,
      raceSetupCount,
      clubSettings,
      unavailableCount: availabilitySummary.unavailableRiders.length,
      brokenResultReferenceCount,
    });

    return [...autoTodos, ...manualTodos].map((item) => ({
      ...item,
      status: statuses[item.id] ?? item.status,
    }));
  }, [riders, race, raceKey, clubSettings]);

  const country = teamProfile.country || "France";
  const teamId = teamProfile.teamId || "-";
  const startDate = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(teamProfile.startedAt));
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
            <p className="home-club-panel-name">{teamProfile.managerName}</p>
            <p className="home-club-panel-subtitle">
              Repères rapides pour piloter le club sans perdre les priorités de vue.
            </p>
          </div>

          <div className="home-club-panel-chip">{teamProfile.activeSeasonLabel}</div>
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
        <ManagementJournalCard entries={managementHistory} />
      </div>
    </div>
  );
}