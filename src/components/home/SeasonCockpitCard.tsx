import { Link } from "react-router-dom";

type CockpitTodo = {
  label: string;
  count: number;
  href: string;
};

type CockpitRisk = {
  label: string;
  count: number;
  level: "danger" | "warning";
  href: string;
};

type CockpitImpact = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning";
};

type SeasonCockpitCardProps = {
  todos: CockpitTodo[];
  risks: CockpitRisk[];
  impacts: CockpitImpact[];
};

function getTodoLabel(count: number): string {
  return count > 1 ? "actions" : "action";
}

function getRiskClass(level: CockpitRisk["level"], count: number): string {
  if (count <= 0) {
    return "cockpit-item-neutral";
  }

  return level === "danger" ? "cockpit-item-danger" : "cockpit-item-warning";
}

function getImpactClass(tone: CockpitImpact["tone"]): string {
  if (tone === "positive") {
    return "cockpit-impact-positive";
  }

  if (tone === "warning") {
    return "cockpit-impact-warning";
  }

  return "cockpit-impact-neutral";
}

export default function SeasonCockpitCard({
  todos,
  risks,
  impacts,
}: SeasonCockpitCardProps) {
  return (
    <section className="season-cockpit" aria-label="Cockpit saisonnier">
      <div className="season-cockpit-column">
        <h2 className="season-cockpit-title">A faire maintenant</h2>
        <div className="season-cockpit-list">
          {todos.map((todo) => (
            <Link key={todo.label} to={todo.href} className="season-cockpit-item cockpit-item-neutral">
              <span>{todo.label}</span>
              <strong>
                {todo.count} {getTodoLabel(todo.count)}
              </strong>
            </Link>
          ))}
        </div>
      </div>

      <div className="season-cockpit-column">
        <h2 className="season-cockpit-title">Risques</h2>
        <div className="season-cockpit-list">
          {risks.map((risk) => (
            <Link
              key={risk.label}
              to={risk.href}
              className={`season-cockpit-item ${getRiskClass(risk.level, risk.count)}`}
            >
              <span>{risk.label}</span>
              <strong>{risk.count}</strong>
            </Link>
          ))}
        </div>
      </div>

      <div className="season-cockpit-column">
        <h2 className="season-cockpit-title">Impact semaine</h2>
        <div className="season-cockpit-impact-grid">
          {impacts.map((impact) => (
            <article key={impact.label} className="season-cockpit-impact-card">
              <p className="season-cockpit-impact-label">{impact.label}</p>
              <p className={`season-cockpit-impact-value ${getImpactClass(impact.tone)}`}>
                {impact.value}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
