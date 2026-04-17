import type { TodoItem as TodoItemType } from "../../types/todo";

type TodoItemProps = {
  item: TodoItemType;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
};

export default function TodoItem({ item, onToggle, onDelete }: TodoItemProps) {
  return (
    <div className={`todo-item todo-${item.status}`}>
      <div className="todo-main">
        <label className="todo-checkbox-line">
          <input
            type="checkbox"
            checked={item.status === "done"}
            onChange={() => onToggle(item.id)}
          />
          <span className="todo-title">{item.title}</span>
        </label>

        {item.details ? <p className="todo-details">{item.details}</p> : null}

        <div className="todo-meta">
          <span className={`todo-badge priority-${item.priority}`}>{item.priority}</span>
          <span className="todo-badge">{item.category}</span>
          <span className="todo-badge">{item.source}</span>
        </div>
      </div>

      {item.source === "manual" && onDelete ? (
        <button
          type="button"
          className="button button-danger button-small"
          onClick={() => onDelete(item.id)}
        >
          Supprimer
        </button>
      ) : null}
    </div>
  );
}