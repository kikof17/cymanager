import Card from "../common/Card";
import type { TodoItem } from "../../types/todo";

type TodoOverviewCardProps = {
  items: TodoItem[];
};

function priorityWeight(priority: TodoItem["priority"]): number {
  if (priority === "haute") return 3;
  if (priority === "moyenne") return 2;
  return 1;
}

export default function TodoOverviewCard({ items }: TodoOverviewCardProps) {
  const openItems = items
    .filter((item) => item.status === "todo")
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
    .slice(0, 5);

  return (
    <Card title="Tâches urgentes">
      {openItems.length > 0 ? (
        <ul className="clean-list">
          {openItems.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              {item.details ? ` — ${item.details}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p>Aucune tâche urgente.</p>
      )}
    </Card>
  );
}