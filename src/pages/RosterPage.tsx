import { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card";
import CollapsibleBox from "../components/common/CollapsibleBox";
import PageTitle from "../components/common/PageTitle";
import RosterAnalysisPanel from "../components/roster/RosterAnalysisPanel";
import RiderDrawer from "../components/roster/RiderDrawer";
import RiderHistoryCard from "../components/roster/RiderHistoryCard";
import RiderTable from "../components/roster/RiderTable";
import RosterImportBox from "../components/roster/RosterImportBox";
import RosterStats from "../components/roster/RosterStats";
import type { Rider } from "../types/rider";
import {
  getAvailableHistoryWeeks,
  getFinanceSnapshot,
  getRecentPrizeIncomeByRider,
} from "../lib/storage/financeStorage";
import { loadRiderHistorySnapshots } from "../lib/storage/riderHistoryStorage";
import { loadRidersFromStorage, saveRidersToStorage } from "../lib/storage/localStorage";
import { loadClubSettings } from "../lib/storage/settingsStorage";
import { loadTeamStrategy, saveTeamStrategy } from "../lib/storage/teamStrategyStorage";
import { mergeRidersByName, parseRosterText } from "../lib/parser/rosterParser";
import { initialRiders } from "../store/initialState";
import type { TeamBuildingStrategy } from "../types/teamStrategy";

type RosterTab = "tous" | "pro" | "u25" | "u21" | "indispos";

function getInitialRiders(): Rider[] {
  const storedRiders = loadRidersFromStorage();

  return storedRiders.length > 0 ? storedRiders : initialRiders;
}

export default function RosterPage() {
  const [riders, setRiders] = useState<Rider[]>(getInitialRiders);
  const [messages, setMessages] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [teamStrategy, setTeamStrategy] = useState<TeamBuildingStrategy>(loadTeamStrategy);
  const [riderHistorySnapshots, setRiderHistorySnapshots] = useState(loadRiderHistorySnapshots);
  const [rosterTab, setRosterTab] = useState<RosterTab>("tous");
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);

  const settings = useMemo(() => loadClubSettings(), []);
  const financeSnapshot = useMemo(() => getFinanceSnapshot(settings, riders), [settings, riders]);
  const recentPrizeIncomeByRider = useMemo(
    () => getRecentPrizeIncomeByRider(financeSnapshot.state),
    [financeSnapshot.state]
  );
  const availableHistoryWeeks = useMemo(
    () => getAvailableHistoryWeeks(financeSnapshot.state),
    [financeSnapshot.state]
  );

  useEffect(() => {
    if (riders.length > 0) {
      saveRidersToStorage(riders);
      setRiderHistorySnapshots(loadRiderHistorySnapshots());
    }
  }, [riders]);

  function handleImport(rawText: string) {
    const result = parseRosterText(rawText);

    if (result.riders.length === 0) {
      setMessages(result.errors.length > 0 ? result.errors : ["Aucun coureur importé."]);
      return;
    }

    setRiders((current) => mergeRidersByName(current, result.riders));

    setMessages([
      `${result.riders.length} coureur(s) importé(s) ou mis à jour.`,
      ...result.errors,
    ]);
  }

  function handleDelete(riderId: string) {
    setRiders((current) => current.filter((rider) => rider.id !== riderId));
    setMessages(["Coureur supprimé de l'effectif local."]);
  }

  function handleResetToDefault() {
    setRiders(initialRiders);
    setMessages(["Effectif réinitialisé avec les données de départ."]);
  }

  const filteredRiders = useMemo(() => {
    const search = filter.trim().toLowerCase();
    let base = riders;

    // Tab filter
    if (rosterTab === "pro") base = riders.filter(r => r.category === "Pro");
    else if (rosterTab === "u25") base = riders.filter(r => r.category === "U25");
    else if (rosterTab === "u21") base = riders.filter(r => r.category === "U21");
    else if (rosterTab === "indispos") base = riders.filter(r =>
      r.form < 35 || (r.injury && r.injury.trim() !== "" && r.injury.toLowerCase() !== "aucune" && r.injury.toLowerCase() !== "sain")
    );

    if (!search) return base;
    return base.filter(r =>
      r.name.toLowerCase().includes(search) || r.category.toLowerCase().includes(search)
    );
  }, [riders, filter, rosterTab]);

  const selectedRider = useMemo(
    () => selectedRiderId ? riders.find(r => r.id === selectedRiderId) ?? null : null,
    [selectedRiderId, riders]
  );

  function handleStrategyChange(nextStrategy: TeamBuildingStrategy) {
    const normalized = saveTeamStrategy(nextStrategy);
    setTeamStrategy(normalized);
  }

  const rosterBoard = useMemo(() => {
    const total = riders.length;
    const pro = riders.filter(r => r.category === "Pro").length;
    const u25 = riders.filter(r => r.category === "U25").length;
    const u21 = riders.filter(r => r.category === "U21").length;
    const injured = riders.filter(r => r.injury && r.injury.trim() !== "" && r.injury.toLowerCase() !== "aucune" && r.injury.toLowerCase() !== "sain").length;
    const criticalForm = riders.filter(r => r.form < 35).length;
    const lowForm = riders.filter(r => r.form >= 35 && r.form < 50).length;
    return { total, pro, u25, u21, injured, criticalForm, lowForm };
  }, [riders]);

  return (
    <div className="page-stack">
      <PageTitle
        title="Effectif"
        subtitle="Import brut, profils automatiques, mémoire sportive et lecture des tendances de l'effectif."
      />

      <section className="finance-board" aria-label="Tableau de bord effectif">
        <div className="finance-board-header">
          <span className="finance-board-title">Effectif</span>
        </div>
        <div className="finance-board-grid">
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Coureurs</span>
            <span className="finance-board-value">{rosterBoard.total}</span>
            <span className="finance-board-sub">Pro {rosterBoard.pro} · U25 {rosterBoard.u25} · U21 {rosterBoard.u21}</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Masse salariale</span>
            <span className="finance-board-value">{financeSnapshot.weeklySalaryExpense.toLocaleString("fr-FR")} €</span>
            <span className="finance-board-sub">/semaine</span>
          </div>
          <div className={`finance-board-item ${rosterBoard.injured > 0 ? "finance-board-item--warning" : "finance-board-item--success"}`}>
            <span className="finance-board-label">Blessés</span>
            <span className="finance-board-value">{rosterBoard.injured}</span>
          </div>
          <div className={`finance-board-item ${rosterBoard.criticalForm > 0 ? "finance-board-item--danger" : rosterBoard.lowForm > 0 ? "finance-board-item--warning" : "finance-board-item--success"}`}>
            <span className="finance-board-label">Forme critique</span>
            <span className="finance-board-value">{rosterBoard.criticalForm}</span>
            {rosterBoard.lowForm > 0 && <span className="finance-board-sub">{rosterBoard.lowForm} fragile{rosterBoard.lowForm > 1 ? "s" : ""}</span>}
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Solde club</span>
            <span className="finance-board-value">{financeSnapshot.currentBalance.toLocaleString("fr-FR")} €</span>
          </div>
          <div className="finance-board-item finance-board-item--neutral">
            <span className="finance-board-label">Valeur effectif</span>
            <span className="finance-board-value">{riders.reduce((s, r) => s + r.value, 0).toLocaleString("fr-FR")} €</span>
          </div>
        </div>
      </section>

      <RosterStats riders={riders} weeklySalaryExpense={financeSnapshot.weeklySalaryExpense} />

      {/* Split view : onglets + table à gauche, drawer à droite */}
      <div className={`roster-split${selectedRider ? " roster-split--open" : ""}`}>
        <div className="roster-split-left">
          <div className="roster-tabs">
            {([
              ["tous", `Tous (${riders.length})`],
              ["pro", `Pro (${riders.filter(r => r.category === "Pro").length})`],
              ["u25", `U25 (${riders.filter(r => r.category === "U25").length})`],
              ["u21", `U21 (${riders.filter(r => r.category === "U21").length})`],
              ["indispos", `Indispos (${riders.filter(r => r.form < 35 || (r.injury && r.injury.trim() !== "" && r.injury.toLowerCase() !== "aucune" && r.injury.toLowerCase() !== "sain")).length})`],
            ] as [RosterTab, string][]).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                className={rosterTab === tab ? "tab-btn tab-btn-active" : "tab-btn"}
                onClick={() => setRosterTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>

          <RiderTable
            riders={filteredRiders}
            onDelete={handleDelete}
            onRowClick={(rider) => setSelectedRiderId(prev => prev === rider.id ? null : rider.id)}
            selectedRiderId={selectedRiderId ?? undefined}
          />
        </div>

        <RiderDrawer
          rider={selectedRider}
          onClose={() => setSelectedRiderId(null)}
          recentPrizeIncomeByRider={recentPrizeIncomeByRider}
          snapshots={riderHistorySnapshots}
        />
      </div>

      <CollapsibleBox title="Analyse de l'effectif" defaultExpanded={false}>
        <RosterAnalysisPanel
          riders={riders}
          settings={settings}
          currentBalance={financeSnapshot.currentBalance}
          weeklyFixedCosts={financeSnapshot.weeklyFixedCosts}
          recentPrizeIncomeByRider={recentPrizeIncomeByRider}
          availableHistoryWeeks={availableHistoryWeeks}
          strategy={teamStrategy}
          onStrategyChange={handleStrategyChange}
        />
      </CollapsibleBox>

      <CollapsibleBox title="Historique et tendances" defaultExpanded={false}>
        <RiderHistoryCard
          riders={riders}
          snapshots={riderHistorySnapshots}
          recentPrizeIncomeByRider={recentPrizeIncomeByRider}
          settings={settings}
        />
      </CollapsibleBox>

      <CollapsibleBox title="Gestion des données" defaultExpanded={false}>
        <Card title="Import brut">
          <RosterImportBox onImport={handleImport} />
        </Card>

        <Card title="Actions">
          <div className="page-stack">
            <div>
              <label htmlFor="roster-filter" className="field-label">
                Filtrer l'effectif
              </label>
              <input
                id="roster-filter"
                className="input"
                type="text"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Nom ou catégorie..."
              />
            </div>

            <div className="inline-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={handleResetToDefault}
              >
                Réinitialiser les données de départ
              </button>
            </div>

            <div>
              <p className="field-label">Messages</p>
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
            </div>
          </div>
        </Card>
      </CollapsibleBox>

    </div>
  );
}