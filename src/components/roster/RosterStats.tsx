import Card from "../common/Card";
import type { Rider } from "../../types/rider";
import { formatCurrency, formatInteger } from "../../lib/utils/numbers";

type RosterStatsProps = {
  riders: Rider[];
};

export default function RosterStats({ riders }: RosterStatsProps) {
  const pros = riders.filter((rider) => rider.category === "Pro").length;
  const u25 = riders.filter((rider) => rider.category === "U25").length;
  const u21 = riders.filter((rider) => rider.category === "U21").length;

  const totalSalary = riders.reduce((sum, rider) => sum + rider.salaryWeekly, 0);
  const totalValue = riders.reduce((sum, rider) => sum + rider.value, 0);

  const averageForm =
    riders.length > 0
      ? Math.round(riders.reduce((sum, rider) => sum + rider.form, 0) / riders.length)
      : 0;

  return (
    <div className="stat-grid">
      <Card title="Effectif total">
        <p className="stat-value">{riders.length}</p>
        <p className="muted">Pros : {pros} · U25 : {u25} · U21 : {u21}</p>
      </Card>

      <Card title="Forme moyenne">
        <p className="stat-value">{averageForm}</p>
      </Card>

      <Card title="Masse salariale">
        <p className="stat-value">{formatInteger(totalSalary)} €</p>
      </Card>

      <Card title="Valeur totale">
        <p className="stat-value">{formatCurrency(totalValue)}</p>
      </Card>
    </div>
  );
}