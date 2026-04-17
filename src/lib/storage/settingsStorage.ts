import type { ClubSettings } from "../../types/settings";

const CLUB_SETTINGS_KEY = "cymanager:club-settings";

function nowIsoLocal(): string {
  return new Date().toISOString();
}

export const defaultClubSettings: ClubSettings = {
  facilities: {
    headOffice: {
      level: 1,
      upgradeInProgress: false,
      targetLevel: null,
      upgradeStartedAt: nowIsoLocal(),
      notes: "",
    },
    trainingCenter: {
      level: 1,
      upgradeInProgress: true,
      targetLevel: 2,
      upgradeStartedAt: nowIsoLocal(),
      notes: "Travaux lancés vers le niveau 2.",
    },
    formationCenter: {
      level: 1,
      upgradeInProgress: false,
      targetLevel: null,
      upgradeStartedAt: nowIsoLocal(),
      notes: "Nécessite un centre d'entraînement niveau 4.",
    },
    shop: {
      level: 1,
      upgradeInProgress: false,
      targetLevel: null,
      upgradeStartedAt: nowIsoLocal(),
      notes: "",
    },
  },
  globalNotes: "",
  currentDivision: "D9",
  targetDivision: "D8",
  divisionPro: "D9",
  divisionU25: "D9",
  divisionU21: "D9",
  clubObjective: "mixte",
  salaryTolerance: "normale",
};

export function loadClubSettings(): ClubSettings {
  try {
    const raw = localStorage.getItem(CLUB_SETTINGS_KEY);

    if (!raw) {
      return defaultClubSettings;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return defaultClubSettings;
    }

    return {
      ...defaultClubSettings,
      ...parsed,
      facilities: {
        ...defaultClubSettings.facilities,
        ...(parsed.facilities ?? {}),
        headOffice: {
          ...defaultClubSettings.facilities.headOffice,
          ...(parsed.facilities?.headOffice ?? {}),
        },
        trainingCenter: {
          ...defaultClubSettings.facilities.trainingCenter,
          ...(parsed.facilities?.trainingCenter ?? {}),
        },
        formationCenter: {
          ...defaultClubSettings.facilities.formationCenter,
          ...(parsed.facilities?.formationCenter ?? {}),
        },
        shop: {
          ...defaultClubSettings.facilities.shop,
          ...(parsed.facilities?.shop ?? {}),
        },
      },
      divisionPro: parsed.divisionPro ?? parsed.currentDivision ?? "D9",
      divisionU25: parsed.divisionU25 ?? parsed.currentDivision ?? "D9",
      divisionU21: parsed.divisionU21 ?? parsed.currentDivision ?? "D9",
    };
  } catch (error) {
    console.error("Erreur de lecture localStorage club settings", error);
    return defaultClubSettings;
  }
}

export function saveClubSettings(settings: ClubSettings): void {
  try {
    localStorage.setItem(CLUB_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Erreur d'écriture localStorage club settings", error);
  }
}