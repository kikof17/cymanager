import type { RaceRole, RaceRiderScore, RiderRaceSetup } from "../../types/race";

type OdcEditorProps = {
  riders: RaceRiderScore[];
  setupByRider: Record<string, RiderRaceSetup>;
  onRoleChange: (riderId: string, role: Exclude<RaceRole, "Remplaçant">) => void;
  onPercentChange: (riderId: string, effortPercent: number) => void;
  onBreakawayChange: (riderId: string, morningBreakaway: boolean) => void;
};

const ROLE_OPTIONS: Array<Exclude<RaceRole, "Remplaçant">> = [
  "Leader",
  "Équipier",
  "Électron libre",
];

export default function OdcEditor({
  riders,
  setupByRider,
  onRoleChange,
  onPercentChange,
  onBreakawayChange,
}: OdcEditorProps) {
  if (riders.length === 0) {
    return <p>Aucun réglage à éditer.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Rôle</th>
            <th>Pourcentage</th>
            <th>Échappée mat.</th>
          </tr>
        </thead>

        <tbody>
          {riders.map((rider) => {
            const setup = setupByRider[rider.riderId];

            return (
              <tr key={rider.riderId}>
                <td>{rider.riderName}</td>

                <td>
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
                </td>

                <td>
                  <div className="effort-cell">
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
                    <span>{setup?.effortPercent ?? 50}%</span>
                  </div>
                </td>

                <td>
                  <input
                    type="checkbox"
                    checked={setup?.morningBreakaway ?? false}
                    onChange={(event) =>
                      onBreakawayChange(rider.riderId, event.target.checked)
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}