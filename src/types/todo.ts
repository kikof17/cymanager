export type TodoSource = "auto" | "manual";

export type TodoStatus = "todo" | "done";

export type TodoPriority = "haute" | "moyenne" | "basse";

export type TodoCategory =
  | "effectif"
  | "entrainement"
  | "courses"
  | "installations"
  | "general";

export type TodoItem = {
  id: string;
  title: string;
  details?: string;
  source: TodoSource;
  status: TodoStatus;
  priority: TodoPriority;
  category: TodoCategory;
  createdAt: string;
  raceKey?: string; // Ajout pour compatibilité ODC calendrier
};

export type ManualTodoDraft = {
  title: string;
  details: string;
  priority: TodoPriority;
  category: TodoCategory;
};