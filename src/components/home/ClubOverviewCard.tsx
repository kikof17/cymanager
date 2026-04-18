import Card from "../common/Card";
import type { Rider } from "../../types/rider";
import { formatCurrency, formatInteger } from "../../lib/utils/numbers";

import type { ClubSettings } from "../../types/settings";

type ClubOverviewCardProps = {
  riders: Rider[];
  clubSettings: ClubSettings;
};

export default function ClubOverviewCard({ riders, clubSettings }: ClubOverviewCardProps) {
  const pros = riders.filter((rider) => rider.category === "Pro").length;
  const u25 = riders.filter((rider) => rider.category === "U25").length;
  const u21 = riders.filter((rider) => rider.category === "U21").length;

  const totalSalary = riders.reduce((sum, rider) => sum + rider.salaryWeekly, 0);
  const totalValue = riders.reduce((sum, rider) => sum + rider.value, 0);
  const financialBalance = clubSettings.financialBalance;

  return (
    <Card title="Résumé club">
      <div className="dashboard-lines">
        <p>
          <strong>Effectif :</strong> {riders.length} coureur(s)
        </p>
        <p>
          <strong>Répartition :</strong> Pros {pros} · U25 {u25} · U21 {u21}
        </p>
        <p>
          <strong>Masse salariale :</strong> {formatInteger(totalSalary)} €
        </p>
        <p>
          <strong>Valeur totale :</strong> {formatCurrency(totalValue)}
        </p>
        <p>
          <strong>Solde financier :</strong> {formatCurrency(financialBalance)}
        </p>
      </div>
    </Card>
  );
}