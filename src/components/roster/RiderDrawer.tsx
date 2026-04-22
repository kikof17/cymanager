import { useMemo } from "react";
import { buildRiderProfileSummary } from "../../lib/scoring/riderProfile";
import { formatCurrency, formatInteger } from "../../lib/utils/numbers";
import type { Rider } from "../../types/rider";
import type { RiderHistorySnapshot } from "../../types/riderHistory";

type RiderDrawerProps = {
  rider: Rider | null;
  onClose: () => void;
  recentPrizeIncomeByRider: Record<string, number>;
  snapshots: RiderHistorySnapshot[];
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getFormClass(form: number): string {
  if (form < 35) return "rider-drawer-badge rider-drawer-badge--danger";
  if (form < 50) return "rider-drawer-badge rider-drawer-badge--warning";
  if (form < 70) return "rider-drawer-badge rider-drawer-badge--neutral";
  return "rider-drawer-badge rider-drawer-badge--success";
}

function getStatBarClass(value: number): string {
  if (value < 30) return "rider-stat-bar--low";
  if (value < 60) return "rider-stat-bar--mid";
  if (value < 80) return "rider-stat-bar--high";
  return "rider-stat-bar--top";
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rider-stat-row">
      <span className="rider-stat-label">{label}</span>
      <div className="rider-stat-bar-track">
        <div
          className={`rider-stat-bar-fill ${getStatBarClass(value)}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="rider-stat-value-num">{value}</span>
    </div>
  );
}

export default function RiderDrawer({ rider, onClose, recentPrizeIncomeByRider, snapshots }: RiderDrawerProps) {
  const profile = useMemo(() => rider ? buildRiderProfileSummary(rider) : null, [rider]);

  const riderHistory = useMemo(() => {
    if (!rider || snapshots.length === 0) return null;
    const prev = snapshots[0].riders.find((r) => r.riderId === rider.id || normalize(r.riderName) === normalize(rider.name));
    if (!prev) return null;
    return {
      formDelta: rider.form - prev.form,
      valueDelta: rider.value - prev.value,
      salaryDelta: rider.salaryWeekly - prev.salaryWeekly,
    };
  }, [rider, snapshots]);

  const recentPrizes = useMemo(() => {
    if (!rider) return 0;
    return recentPrizeIncomeByRider[normalize(rider.name)] ?? 0;
  }, [rider, recentPrizeIncomeByRider]);

  const foncier = useMemo(() => {
    if (!rider) return 0;
    return rider.endurance + rider.resistance + rider.recovery;
  }, [rider]);

  if (!rider) return null;

  const isInjured = rider.injury && rider.injury.trim() !== "" && rider.injury.toLowerCase() !== "aucune" && rider.injury.toLowerCase() !== "sain";

  function formatDelta(delta: number, unit = ""): string {
    const sign = delta > 0 ? "+" : "";
    return `${sign}${formatInteger(delta)}${unit}`;
  }

  return (
    <aside className="rider-drawer" role="complementary" aria-label={`Fiche de ${rider.name}`}>
      <div className="rider-drawer-header">
        <div className="rider-drawer-header-info">
          <h2 className="rider-drawer-name">{rider.name}</h2>
          <div className="rider-drawer-meta">
            <span className={`rider-drawer-badge rider-drawer-badge--cat-${rider.category.toLowerCase()}`}>
              {rider.category}
            </span>
            <span className="rider-drawer-badge rider-drawer-badge--neutral">
              {rider.ageYears}a {rider.ageWeeks}s
            </span>
            {rider.nationality && (
              <span className="rider-drawer-badge rider-drawer-badge--neutral">{rider.nationality}</span>
            )}
          </div>
        </div>
        <button type="button" className="rider-drawer-close" onClick={onClose} aria-label="Fermer la fiche">
          ×
        </button>
      </div>

      <div className="rider-drawer-body">
        {/* Statut */}
        <section className="rider-drawer-section">
          <div className="rider-drawer-status-row">
            <span className={getFormClass(rider.form)}>Forme {rider.form}</span>
            {isInjured && (
              <span className="rider-drawer-badge rider-drawer-badge--danger">🩹 {rider.injury}</span>
            )}
            {riderHistory && (
              <span className={`rider-drawer-delta ${riderHistory.formDelta > 0 ? "delta-up" : riderHistory.formDelta < 0 ? "delta-down" : "delta-flat"}`}>
                {formatDelta(riderHistory.formDelta)} forme
              </span>
            )}
          </div>
        </section>

        {/* Profil */}
        {profile && (
          <section className="rider-drawer-section">
            <h3 className="rider-drawer-section-title">Profil</h3>
            <div className="rider-drawer-profile-row">
              <span className="rider-drawer-profile-primary">{profile.primaryProfile}</span>
              <span className="rider-drawer-profile-sep">·</span>
              <span className="rider-drawer-profile-secondary">{profile.secondaryProfile}</span>
            </div>
            {profile.strengths.length > 0 && (
              <p className="rider-drawer-strengths">✓ {profile.strengths.slice(0, 3).join(", ")}</p>
            )}
            {profile.weaknesses.length > 0 && (
              <p className="rider-drawer-weaknesses">△ {profile.weaknesses.slice(0, 2).join(", ")}</p>
            )}
          </section>
        )}

        {/* Stats clés */}
        <section className="rider-drawer-section">
          <h3 className="rider-drawer-section-title">Stats</h3>
          <div className="rider-drawer-kpi-row">
            <div className="rider-drawer-kpi">
              <span className="rider-drawer-kpi-label">Total</span>
              <span className="rider-drawer-kpi-value">{rider.total}</span>
            </div>
            <div className="rider-drawer-kpi">
              <span className="rider-drawer-kpi-label">Foncier</span>
              <span className="rider-drawer-kpi-value">{foncier}</span>
            </div>
            <div className="rider-drawer-kpi">
              <span className="rider-drawer-kpi-label">Expérience</span>
              <span className="rider-drawer-kpi-value">{rider.experience}</span>
            </div>
          </div>
          <div className="rider-drawer-stats">
            <StatBar label="Montagne" value={rider.mountain} />
            <StatBar label="Vallon" value={rider.hill} />
            <StatBar label="Plaine" value={rider.flat} />
            <StatBar label="Sprint" value={rider.sprint} />
            <StatBar label="CLM" value={rider.timeTrial} />
            <StatBar label="Pavé" value={rider.cobble} />
            <StatBar label="CAE" value={rider.stageRace} />
            <StatBar label="Baroudeur" value={rider.breakaway} />
          </div>
        </section>

        {/* Finance */}
        <section className="rider-drawer-section">
          <h3 className="rider-drawer-section-title">Finance</h3>
          <div className="rider-drawer-kpi-row">
            <div className="rider-drawer-kpi">
              <span className="rider-drawer-kpi-label">Salaire/sem.</span>
              <span className="rider-drawer-kpi-value">
                {formatInteger(rider.salaryWeekly)} €
                {riderHistory && riderHistory.salaryDelta !== 0 && (
                  <span className={`rider-drawer-delta ${riderHistory.salaryDelta > 0 ? "delta-down" : "delta-up"}`}>
                    {" "}{formatDelta(riderHistory.salaryDelta)}
                  </span>
                )}
              </span>
            </div>
            <div className="rider-drawer-kpi">
              <span className="rider-drawer-kpi-label">Valeur</span>
              <span className="rider-drawer-kpi-value">
                {formatCurrency(rider.value)}
                {riderHistory && riderHistory.valueDelta !== 0 && (
                  <span className={`rider-drawer-delta ${riderHistory.valueDelta > 0 ? "delta-up" : "delta-down"}`}>
                    {" "}{formatDelta(riderHistory.valueDelta)}
                  </span>
                )}
              </span>
            </div>
            {recentPrizes > 0 && (
              <div className="rider-drawer-kpi">
                <span className="rider-drawer-kpi-label">Primes 7j</span>
                <span className="rider-drawer-kpi-value rider-drawer-kpi-value--success">
                  +{formatCurrency(recentPrizes)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Foncier détail */}
        <section className="rider-drawer-section">
          <h3 className="rider-drawer-section-title">Foncier</h3>
          <StatBar label="Endurance" value={rider.endurance} />
          <StatBar label="Résistance" value={rider.resistance} />
          <StatBar label="Récupération" value={rider.recovery} />
        </section>
      </div>
    </aside>
  );
}
