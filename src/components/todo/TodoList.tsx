import TodoItem from "./TodoItem";
import type { TodoItem as TodoItemType } from "../../types/todo";

type TodoListProps = {
  items: TodoItemType[];
  onToggle: (id: string) => void;
  onDeleteManual: (id: string) => void;
};

export default function TodoList({
  items,
  onToggle,
  onDeleteManual,
}: TodoListProps) {
  if (items.length === 0) {
    return <p className="muted">Aucune tâche à afficher.</p>;
  }

  return (
    <div className="todo-list">
      {items.map((item) => (
        <TodoItem
          key={item.id}
          item={item}
          onToggle={onToggle}
          onDelete={onDeleteManual}
        />
      ))}
    </div>
  );
}