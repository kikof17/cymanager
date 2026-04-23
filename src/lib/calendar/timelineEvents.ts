export type SeasonWeekEvent = {
  week: number;
  label: string;
  tone: "neutral" | "warning" | "danger" | "success";
};

export const STATIC_SEASON_EVENTS: SeasonWeekEvent[] = [
  { week: 1, label: "Démarrage de saison", tone: "success" },
  { week: 2, label: "Stabiliser l'entraînement", tone: "neutral" },
  { week: 3, label: "Préparer bloc courses", tone: "neutral" },
  { week: 4, label: "Début période tours", tone: "warning" },
  { week: 5, label: "Pic de charge", tone: "warning" },
  { week: 6, label: "Fin période tours", tone: "warning" },
  { week: 7, label: "Arbitrages transferts", tone: "neutral" },
  { week: 8, label: "Consolidation", tone: "neutral" },
  { week: 9, label: "Préparer intersaison", tone: "danger" },
  { week: 10, label: "Intersaison", tone: "danger" },
];

export const WEEKLY_DEADLINES = [
  "Lundi 00:00 - MAJ économique",
  "Jeudi 03:00 - Entraînement",
  "Avant course - Valider ODC",
];
