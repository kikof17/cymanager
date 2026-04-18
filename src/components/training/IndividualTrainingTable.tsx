import { useState } from "react";
import type { IndividualTrainingAdvice } from "../../types/training";

type IndividualTrainingTableProps = {
  advices: IndividualTrainingAdvice[];
};

type SortKey =
  | "riderName"
  | "riderCategory"
  | "riderAge"
  | "dominantPrimary"
  | "dominantPrimaryValue"
  | "currentFoncier"
  | "targetFoncier"
  | "foncierGap"
  | "priority"
  | "suggestedTraining"
  | "salaryRisk"
  | "reason";

const columns: { key: SortKey; label: string; isNumeric?: boolean }[] = [
  { key: "riderName", label: "Nom" },
  { key: "riderCategory", label: "Cat." },
  { key: "riderAge", label: "Âge", isNumeric: true },
  { key: "dominantPrimary", label: "Primaire" },
  { key: "currentFoncier", label: "Foncier", isNumeric: true },
  { key: "targetFoncier", label: "Cible", isNumeric: true },
  { key: "foncierGap", label: "Écart", isNumeric: true },
  { key: "priority", label: "Priorité" },
  { key: "suggestedTraining", label: "Entraînement retenu" },
  { key: "salaryRisk", label: "Risque salaire" },
  { key: "reason", label: "Motif" },
];

function getCellValue(advice: IndividualTrainingAdvice, key: SortKey) {
  if (key === "dominantPrimary") return advice.dominantPrimary;
  if (key === "dominantPrimaryValue") return advice.dominantPrimaryValue;
  if (key === "riderName") return advice.riderName;
  if (key === "riderCategory") return advice.riderCategory;
  if (key === "riderAge") return Number(advice.riderAge);
  if (key === "currentFoncier") return advice.currentFoncier;
  if (key === "targetFoncier") return advice.targetFoncier;
  if (key === "foncierGap") return advice.foncierGap;
  if (key === "priority") return advice.priority;
  if (key === "suggestedTraining") return advice.suggestedTraining;
  if (key === "salaryRisk") return advice.salaryRisk;
  if (key === "reason") return advice.reason;
  return "";
}

export default function IndividualTrainingTable({ advices }: IndividualTrainingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("riderName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  if (advices.length === 0) {
    return <p>Aucun conseil individuel disponible.</p>;
  }

  function handleSort(colKey: SortKey) {
    if (sortKey === colKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(colKey);
      setSortOrder("asc");
    }
  }

  const sortedAdvices = [...advices].sort((a, b) => {
    const aValue = getCellValue(a, sortKey);
    const bValue = getCellValue(b, sortKey);
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    }
    // Pour les chaînes, tri alphabétique insensible à la casse
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
      <table className="data-table">
        <thead>
          <tr>
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
          {sortedAdvices.map((advice) => (
            <tr key={advice.riderId}>
              <td>{advice.riderName}</td>
              <td>{advice.riderCategory}</td>
              <td>{advice.riderAge}</td>
              <td>
                {advice.dominantPrimary} {advice.dominantPrimaryValue}
              </td>
              <td>{advice.currentFoncier}</td>
              <td>{advice.targetFoncier}</td>
              <td>{advice.foncierGap}</td>
              <td>{advice.priority}</td>
              <td>
                {advice.suggestedTraining}
                {advice.reassigned ? (
                  <div className="muted">
                    idéal : {advice.idealTraining}
                  </div>
                ) : null}
              </td>
              <td>{advice.salaryRisk}</td>
              <td>{advice.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}