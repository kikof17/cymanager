
import { useState } from "react";
import type { RaceRole, RaceRiderScore, RiderRaceSetup } from "../../types/race";

type RaceSetupTableProps = {
  riders: RaceRiderScore[];
  setupByRider: Record<string, RiderRaceSetup>;
  onRoleChange: (riderId: string, role: Exclude<RaceRole, "Remplaçant">) => void;
  onPercentChange: (riderId: string, effortPercent: number) => void;
  onBreakawayChange: (riderId: string, morningBreakaway: boolean) => void;
  readOnly?: boolean;
};

type SortKey = "riderName" | "riderCategory" | "riderForm" | "score" | "role" | "effortPercent" | "morningBreakaway" | "reasons";

const columns: { key: SortKey; label: string; isNumeric?: boolean }[] = [
  { key: "riderName", label: "Nom" },
  { key: "riderCategory", label: "Cat." },
  { key: "riderForm", label: "Forme", isNumeric: true },
  { key: "score", label: "Score", isNumeric: true },
  { key: "role", label: "Rôle" },
  { key: "effortPercent", label: "%", isNumeric: true },
  { key: "morningBreakaway", label: "Échappée mat." },
  { key: "reasons", label: "Points forts" },
];

function getCellValue(rider: RaceRiderScore, setup: RiderRaceSetup | undefined, key: SortKey) {
  if (key === "riderName") return rider.riderName;
  if (key === "riderCategory") return rider.riderCategory;
  if (key === "riderForm") return rider.riderForm;
  if (key === "score") return rider.score;
  if (key === "role") return setup?.role ?? rider.role;
  if (key === "effortPercent") return setup?.effortPercent ?? 50;
  if (key === "morningBreakaway") return setup?.morningBreakaway ? 1 : 0;
  if (key === "reasons") return rider.reasons.join(", ");
  return "";
}

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
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  if (riders.length === 0) {
    return <p>Aucun coureur sélectionné.</p>;
  }

  function handleSort(colKey: SortKey) {
    if (sortKey === colKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(colKey);
      setSortOrder("asc");
    }
  }

  const sortedRiders = [...riders].sort((a, b) => {
    const setupA = setupByRider[a.riderId];
    const setupB = setupByRider[b.riderId];
    const aValue = getCellValue(a, setupA, sortKey);
    const bValue = getCellValue(b, setupB, sortKey);
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    }
    return sortOrder === "asc"
      ? String(aValue).localeCompare(String(bValue), "fr", { sensitivity: "base" })
      : String(bValue).localeCompare(String(aValue), "fr", { sensitivity: "base" });
  });

  function renderSortIndicator(colKey: SortKey) {
    if (sortKey !== colKey) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="table-wrap">
      <table className="data-table race-setup-table">
        <thead>
          <tr>
            <th>#</th>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ color: '#181c24', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort(col.key)}
                title={"Trier par " + col.label}
              >
                {col.label}
                {renderSortIndicator(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRiders.map((rider, index) => {
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