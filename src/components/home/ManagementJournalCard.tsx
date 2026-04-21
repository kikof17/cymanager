import Card from "../common/Card";
import { formatCurrency } from "../../lib/utils/numbers";
import type { ManagementHistoryEntry } from "../../types/management";

type ManagementJournalCardProps = {
  entries: ManagementHistoryEntry[];
};

function formatManagementDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAreaLabel(area: ManagementHistoryEntry["area"]): string {
  if (area === "settings") {
    return "Paramètres";
  }

  if (area === "transfers") {
    return "Transferts";
  }

  if (area === "calendar") {
    return "Calendrier";
  }

  if (area === "results") {
    return "Résultats";
  }

  return "Système";
}

export default function ManagementJournalCard({ entries }: ManagementJournalCardProps) {
  return (
    <Card title="Journal de gestion">
      {entries.length === 0 ? (
        <p className="muted">Aucune décision stratégique enregistrée pour le moment.</p>
      ) : (
        <div className="management-history-list">
          {entries.map((entry) => (
            <div key={entry.id} className="management-history-item">
              <div className="management-history-meta">
                <span className="management-history-area">{getAreaLabel(entry.area)}</span>
                <span className="management-history-date">{formatManagementDate(entry.occurredAt)}</span>
              </div>
              <p className="management-history-title">{entry.title}</p>
              <p className="management-history-note">{entry.note}</p>
              {entry.amount !== undefined ? (
                <p className="management-history-amount">Impact financier : {formatCurrency(entry.amount)}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}