import Card from "../common/Card";
import type { ClubSettings, FacilityKey } from "../../types/settings";

type FacilitiesOverviewCardProps = {
  settings: ClubSettings;
};

const FACILITY_LABELS: Record<FacilityKey, string> = {
  headOffice: "Siège social",
  trainingCenter: "Centre d'entraînement",
  formationCenter: "Centre de formation",
  shop: "Boutique",
};

export default function FacilitiesOverviewCard({
  settings,
}: FacilitiesOverviewCardProps) {
  return (
    <Card title="Installations">
      <div className="dashboard-lines">
        {(Object.keys(FACILITY_LABELS) as FacilityKey[]).map((facilityKey) => {
          const facility = settings.facilities[facilityKey];

          return (
            <p key={facilityKey}>
              <strong>{FACILITY_LABELS[facilityKey]} :</strong> niv. {facility.level}
              {facility.upgradeInProgress
                ? ` → travaux vers ${facility.targetLevel ?? "?"}`
                : " · pas de travaux"}
            </p>
          );
        })}
      </div>
    </Card>
  );
}