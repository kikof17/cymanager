import Card from "../common/Card";
import type { ClubSettings, FacilityKey } from "../../types/settings";

type FacilityPanelProps = {
  settings: ClubSettings;
};

const FACILITY_LABELS: Record<FacilityKey, string> = {
  headOffice: "Siège social",
  trainingCenter: "Centre d'entraînement",
  formationCenter: "Centre de formation",
  shop: "Boutique",
};

function formatDateLabel(value: string): string {
  if (!value) {
    return "Non renseignée";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDaysSince(value: string): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export default function FacilityPanel({ settings }: FacilityPanelProps) {
  return (
    <Card title="Résumé installations">
      <div className="facility-summary">
        {(Object.keys(FACILITY_LABELS) as FacilityKey[]).map((facilityKey) => {
          const facility = settings.facilities[facilityKey];
          const daysSince = getDaysSince(facility.upgradeStartedAt);

          return (
            <div key={facilityKey} className="facility-card">
              <h3 className="card-title">{FACILITY_LABELS[facilityKey]}</h3>

              <p>
                <strong>Niveau :</strong> {facility.level}
              </p>
              <p>
                <strong>Travaux en cours :</strong>{" "}
                {facility.upgradeInProgress ? "Oui" : "Non"}
              </p>
              <p>
                <strong>Travaux planifiés :</strong>{" "}
                {facility.plannedUpgrade ? "Oui" : "Non"}
              </p>
              <p>
                <strong>Niveau cible :</strong>{" "}
                {facility.targetLevel ?? "Non défini"}
              </p>
              <p>
                <strong>Lancement :</strong>{" "}
                {formatDateLabel(facility.upgradeStartedAt)}
              </p>
              <p>
                <strong>Ancienneté :</strong>{" "}
                {daysSince === null ? "Inconnue" : `${daysSince} jour(s)`}
              </p>
              <p>
                <strong>Notes :</strong>{" "}
                {facility.notes.trim() ? facility.notes : "Aucune note"}
              </p>
            </div>
          );
        })}

        <div className="facility-card">
          <h3 className="card-title">Notes globales</h3>
          <p>{settings.globalNotes.trim() || "Aucune note globale"}</p>
        </div>
      </div>
    </Card>
  );
}