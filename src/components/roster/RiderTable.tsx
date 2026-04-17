
import type { Rider } from "../../types/rider";
import { formatCurrency, formatInteger } from "../../lib/utils/numbers";
import { useState } from "react";

type RiderTableProps = {
  riders: Rider[];
  onDelete: (riderId: string) => void;
};


export default function RiderTable({ riders, onDelete }: RiderTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  if (riders.length === 0) {
    return <p>Aucun coureur enregistré pour le moment.</p>;
  }

  // Fonction utilitaire pour la classe couleur
  function getStatClass(note: number) {
    if (note < 30) return "stat-red";
    if (note < 50) return "stat-orange";
    if (note < 70) return "stat-green";
    return "stat-blue";
  }

  // Spécifique pour la colonne total
  function getTotalClass(total: number) {
    if (total < 600) return "stat-red";
    if (total < 700) return "stat-orange";
    if (total < 800) return "stat-green";
    return "stat-blue";
  }

  // Colonnes et mapping pour le tri
  const columns = [
    { key: "name", label: "Nom", isNumeric: false },
    { key: "category", label: "Cat.", isNumeric: false },
    { key: "age", label: "Âge", isNumeric: true },
    { key: "form", label: "Forme", isNumeric: true },
    { key: "total", label: "Total", isNumeric: true },
    { key: "mountain", label: "Mont.", isNumeric: true },
    { key: "hill", label: "Vallon", isNumeric: true },
    { key: "flat", label: "Plaine", isNumeric: true },
    { key: "sprint", label: "Sprint", isNumeric: true },
    { key: "timeTrial", label: "CLM", isNumeric: true },
    { key: "cobble", label: "Pavé", isNumeric: true },
    { key: "stageRace", label: "CAE", isNumeric: true },
    { key: "salaryWeekly", label: "Salaire", isNumeric: true },
    { key: "value", label: "Valeur", isNumeric: true },
  ];

  // Tri
  let sortedRiders = [...riders];
  if (sortConfig) {
    sortedRiders.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      if (sortConfig.key === "age") {
        aValue = a.ageYears * 100 + a.ageWeeks;
        bValue = b.ageYears * 100 + b.ageWeeks;
      } else {
        aValue = a[sortConfig.key as keyof Rider];
        bValue = b[sortConfig.key as keyof Rider];
      }
      if (aValue === undefined || bValue === undefined) return 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      // Alphabétique
      return sortConfig.direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }

  function handleSort(key: string) {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ color: "#181c24", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort(col.key)}
                title="Cliquer pour trier"
              >
                {col.label}
                {sortConfig?.key === col.key ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedRiders.map((rider) => (
            <tr key={rider.id}>
              <td>{rider.name}</td>
              <td>{rider.category}</td>
              <td>
                {rider.ageYears}a {rider.ageWeeks}s
              </td>
              <td>{rider.form}</td>
              <td className={getTotalClass(rider.total)}>{rider.total}</td>
              <td className={getStatClass(rider.mountain)}>{rider.mountain}</td>
              <td className={getStatClass(rider.hill)}>{rider.hill}</td>
              <td className={getStatClass(rider.flat)}>{rider.flat}</td>
              <td className={getStatClass(rider.sprint)}>{rider.sprint}</td>
              <td className={getStatClass(rider.timeTrial)}>{rider.timeTrial}</td>
              <td className={getStatClass(rider.cobble)}>{rider.cobble}</td>
              <td className={getStatClass(rider.stageRace)}>{rider.stageRace}</td>
              <td>{formatInteger(rider.salaryWeekly)} €</td>
              <td>{formatCurrency(rider.value)}</td>
              <td>
                <button
                  type="button"
                  className="button button-danger button-small"
                  onClick={() => onDelete(rider.id)}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}