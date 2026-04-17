import type { RaceRole, RaceRiderScore, RiderRaceSetup } from "../../types/race";

type RaceSetupTableProps = {
  riders: RaceRiderScore[];
  setupByRider: Record<string, RiderRaceSetup>;
  onRoleChange: (riderId: string, role: Exclude<RaceRole, "Remplaçant">) => void;
  onPercentChange: (riderId: string, effortPercent: number) => void;
  onBreakawayChange: (riderId: string, morningBreakaway: boolean) => void;
  readOnly?: boolean;
};

const ROLE_OPTIONS: Array<Exclude<RaceRole, "Remplaçant">> = [
  "Leader",
  "Équipier",
  "Électron libre",
];

export default function RaceSetupTable({
  riders,
  setupByRider,
  onRoleChange,
  onPercentChange,
  onBreakawayChange,
  readOnly = false,
}: RaceSetupTableProps) {
  if (riders.length === 0) {
    return <p>Aucun coureur sélectionné.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table race-setup-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nom</th>
            <th>Cat.</th>
            <th>Forme</th>
            <th>Score</th>
            <th>Rôle</th>
            <th>%</th>
            <th>Échappée mat.</th>
            <th>Points forts</th>
          </tr>
        </thead>

        <tbody>
          {riders.map((rider, index) => {
            const setup = setupByRider[rider.riderId];

            return (
              <tr key={rider.riderId}>
                <td>{index + 1}</td>

                <td>
                  <div className="race-rider-name-cell">
                    <span
                      className={`race-role-dot ${
                        (setup?.role ?? rider.role) === "Leader"
                          ? "role-Leader"
                          : (setup?.role ?? rider.role) === "Électron libre"
                          ? "role-ElectronLibre"
                          : "role-Equipier"
                      }`}
                    />
                    <span>{rider.riderName}</span>
                  </div>
                </td>

                <td>{rider.riderCategory}</td>

                <td>
                  <span className="form-badge">{rider.riderForm}</span>
                </td>

                <td>{rider.score}</td>

                <td>
                  {readOnly ? (
                    <span>{setup?.role ?? "Équipier"}</span>
                  ) : (
                    <select
                      className="input input-compact"
                      value={setup?.role ?? "Équipier"}
                      onChange={(event) =>
                        onRoleChange(
                          rider.riderId,
                          event.target.value as Exclude<RaceRole, "Remplaçant">
                        )
                      }
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </td>

                <td>
                  <div className="effort-cell effort-cell-tight">
                    {readOnly ? (
                      <span className="effort-value">{setup?.effortPercent ?? 50}%</span>
                    ) : (
                      <>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={setup?.effortPercent ?? 50}
                          onChange={(event) =>
                            onPercentChange(
                              rider.riderId,
                              Number.parseInt(event.target.value, 10)
                            )
                          }
                        />
                        <span className="effort-value">{setup?.effortPercent ?? 50}%</span>
                      </>
                    )}
                  </div>
                </td>

                <td>
                  {readOnly ? (
                    <input type="checkbox" checked={setup?.morningBreakaway ?? false} disabled readOnly />
                  ) : (
                    <input
                      type="checkbox"
                      checked={setup?.morningBreakaway ?? false}
                      onChange={(event) =>
                        onBreakawayChange(rider.riderId, event.target.checked)
                      }
                    />
                  )}
                </td>

                <td>{rider.reasons.join(" · ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}