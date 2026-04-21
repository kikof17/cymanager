import type { ParsedRace } from "../../types/race";
import type { Rider } from "../../types/rider";
import type { ClubSettings, FacilityKey } from "../../types/settings";
import type { TodoItem } from "../../types/todo";

type BuildTodoListArgs = {
  riders: Rider[];
  trainingExists: boolean;
  race: ParsedRace | null;
  raceSetupCount: number;
  clubSettings: ClubSettings;
  unavailableCount: number;
  brokenResultReferenceCount: number;
};

const FACILITY_LABELS: Record<FacilityKey, string> = {
  headOffice: "Siège social",
  trainingCenter: "Centre d'entraînement",
  formationCenter: "Centre de formation",
  shop: "Boutique",
};

function createAutoTodo(
  id: string,
  title: string,
  details: string,
  priority: TodoItem["priority"],
  category: TodoItem["category"],
  entityLink?: TodoItem["entityLink"]
): TodoItem {
  return {
    id,
    title,
    details,
    source: "auto",
    status: "todo",
    priority,
    category,
    createdAt: new Date().toISOString(),
    entityLink,
  };
}

function daysSince(dateIso: string): number | null {
  if (!dateIso) {
    return null;
  }

  const time = new Date(dateIso).getTime();

  if (Number.isNaN(time)) {
    return null;
  }

  const diffMs = Date.now() - time;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function buildTodoList({
  riders,
  trainingExists,
  race,
  raceSetupCount,
  clubSettings,
  unavailableCount,
  brokenResultReferenceCount,
}: BuildTodoListArgs): TodoItem[] {
  const todos: TodoItem[] = [];
  const hasCriticalUnavailability = unavailableCount >= 4;
  const hasBrokenResultReferences = brokenResultReferenceCount > 0;
  const hasCrossCriticalAlert = hasCriticalUnavailability && hasBrokenResultReferences;

  if (hasCrossCriticalAlert) {
    todos.push(
      createAutoTodo(
        "auto-cross-critical-availability-results",
        "Alerte transverse effectif + références",
        `${unavailableCount} indisponibilité(s) et ${brokenResultReferenceCount} référence(s) résultat cassée(s) détectées. Prioriser la consolidation d'effectif et la réparation des références avant engagement agressif.`,
        "haute",
        "general"
      )
    );
  }

  if (hasBrokenResultReferences) {
    todos.push(
      createAutoTodo(
        "auto-results-reference-repair",
        "Réparer les références résultats",
        `${brokenResultReferenceCount} référence(s) résultat non validée(s) restent à corriger pour fiabiliser les décisions sport/finance.`,
        hasCriticalUnavailability ? "haute" : "moyenne",
        "courses",
        { label: "Voir les résultats", href: "/resultats" }
      )
    );
  }

  if (riders.length === 0) {
    todos.push(
      createAutoTodo(
        "auto-roster-empty",
        "Importer l'effectif",
        "Aucun coureur n'est disponible dans l'application.",
        "haute",
        "effectif",
        { label: "Aller à l'effectif", href: "/effectif" }
      )
    );
  } else {
    const youngCount = riders.filter(
      (rider) => rider.category === "U21" || rider.category === "U25"
    ).length;

    todos.push(
      createAutoTodo(
        "auto-roster-check",
        "Vérifier l'effectif",
        `${riders.length} coureur(s) chargés, dont ${youngCount} jeune(s). Pense à mettre à jour la forme et les mouvements.`,
        "moyenne",
        "effectif",
        { label: "Aller à l'effectif", href: "/effectif" }
      )
    );
  }

  if (!trainingExists) {
    todos.push(
      createAutoTodo(
        "auto-training-missing",
        "Définir l'entraînement de la semaine",
        "Aucun plan d'entraînement n'a encore été calculé ou confirmé.",
        "haute",
        "entrainement",
        { label: "Aller à l'entraînement", href: "/entrainement" }
      )
    );
  } else {
    todos.push(
      createAutoTodo(
        "auto-training-review",
        "Valider le plan d'entraînement",
        hasCrossCriticalAlert
          ? "Contexte critique (effectif indisponible + références cassées) : sécuriser la récupération et limiter l'exposition avant validation du trio hebdo."
          : "Vérifie que le trio d'entraînement reste cohérent avec l'objectif de la semaine.",
        hasCrossCriticalAlert ? "haute" : "moyenne",
        "entrainement",
        { label: "Aller à l'entraînement", href: "/entrainement" }
      )
    );
  }

  if (!race) {
    todos.push(
      createAutoTodo(
        "auto-race-missing",
        "Analyser la prochaine course",
        "Aucune course n'a encore été collée et analysée.",
        "haute",
        "courses",
        { label: "Aller aux courses", href: "/courses" }
      )
    );
  } else {
    todos.push(
      createAutoTodo(
        "auto-race-reviewed",
        "Contrôler la sélection de course",
        hasCrossCriticalAlert
          ? `La course "${race.name}" a été analysée, mais le contexte est critique (indisponibilité + références cassées). Revalider avant engagement.`
          : `La course "${race.name}" a été analysée. Vérifie la sélection proposée.`,
        hasCrossCriticalAlert ? "haute" : "moyenne",
        "courses",
        { label: "Aller aux courses", href: "/courses" }
      )
    );

    if (raceSetupCount < 7) {
      todos.push(
        createAutoTodo(
          "auto-race-setup-missing",
          "Finaliser les réglages de course",
          `Seulement ${raceSetupCount} réglage(s) de course enregistré(s) pour les 7 coureurs.`,
          "haute",
          "courses",
          { label: "Aller aux courses", href: "/courses" }
        )
      );
    } else {
      todos.push(
        createAutoTodo(
          "auto-race-setup-done",
          "Relire rôles et pourcentages",
          "Les 7 coureurs ont un réglage enregistré. Vérifie une dernière fois rôles, pourcentages et échappée mat.",
          "moyenne",
          "courses",
          { label: "Aller aux courses", href: "/courses" }
        )
      );
    }
  }

  (Object.keys(clubSettings.facilities) as FacilityKey[]).forEach((facilityKey) => {
    const facility = clubSettings.facilities[facilityKey];
    const label = FACILITY_LABELS[facilityKey];

    if (facility.upgradeInProgress) {
      const days = daysSince(facility.upgradeStartedAt);
      const dayLabel =
        days === null ? "date inconnue" : `lancé il y a ${days} jour(s)`;

      todos.push(
        createAutoTodo(
          `auto-facility-upgrade-${facilityKey}`,
          `Surveiller les travaux : ${label}`,
          `${label} en travaux vers le niveau ${facility.targetLevel ?? "?"} (${dayLabel}).`,
          "haute",
          "installations",
          { label: "Voir les installations", href: "/parametres" }
        )
      );
    } else {
      todos.push(
        createAutoTodo(
          `auto-facility-next-step-${facilityKey}`,
          `Planifier ${label}`,
          `${label} actuellement niveau ${facility.level}.`,
          facilityKey === "trainingCenter" || facilityKey === "formationCenter"
            ? "moyenne"
            : "basse",
          "installations",
          { label: "Voir les installations", href: "/parametres" }
        )
      );
    }

    if (facility.notes.trim()) {
      todos.push(
        createAutoTodo(
          `auto-facility-notes-${facilityKey}`,
          `Relire les notes : ${label}`,
          `Des notes sont enregistrées pour ${label}.`,
          "basse",
          "installations"
        )
      );
    }
  });

  if (clubSettings.globalNotes.trim()) {
    todos.push(
      createAutoTodo(
        "auto-settings-global-notes",
        "Relire les notes globales du club",
        "Des notes globales sont enregistrées dans les paramètres.",
        "basse",
        "general"
      )
    );
  }

  return todos;
}