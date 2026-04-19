import type { ClubSettings } from "../../types/settings";
import { syncFinanceWithSettings } from "./financeStorage";

const CLUB_SETTINGS_KEY = "cymanager:club-settings";

const LEGACY_TRAINING_CENTER_DEFAULT = {
  level: 1,
  upgradeInProgress: true,
  targetLevel: 2,
  notes: "Travaux lancés vers le niveau 2.",
};

const LEGACY_FORMATION_CENTER_DEFAULT = {
  level: 1,
  upgradeInProgress: false,
  targetLevel: null,
  notes: "Nécessite un centre d'entraînement niveau 4.",
};

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
      level: 0,
      upgradeInProgress: true,
      targetLevel: 1,
      upgradeStartedAt: nowIsoLocal(),
      notes: "Travaux lancés vers le niveau 1.",
    },
    formationCenter: {
      level: 0,
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
  targetDivisionPro: "D8",
  targetDivisionU25: "D8",
  targetDivisionU21: "D8",
  clubObjective: "mixte",
  salaryTolerance: "normale",
  manualWeeklySalaryExpense: null,
  financialBalance: 1000000, // Valeur par défaut : 1 000 000 €
};

function isLegacyTrainingCenterSeed(
  facility: ClubSettings["facilities"]["trainingCenter"] | undefined
): boolean {
  return Boolean(
    facility &&
      facility.level === LEGACY_TRAINING_CENTER_DEFAULT.level &&
      facility.upgradeInProgress ===
        LEGACY_TRAINING_CENTER_DEFAULT.upgradeInProgress &&
      facility.targetLevel === LEGACY_TRAINING_CENTER_DEFAULT.targetLevel &&
      (facility.notes ?? "") === LEGACY_TRAINING_CENTER_DEFAULT.notes
  );
}

function isLegacyFormationCenterSeed(
  facility: ClubSettings["facilities"]["formationCenter"] | undefined
): boolean {
  return Boolean(
    facility &&
      facility.level === LEGACY_FORMATION_CENTER_DEFAULT.level &&
      facility.upgradeInProgress ===
        LEGACY_FORMATION_CENTER_DEFAULT.upgradeInProgress &&
      facility.targetLevel === LEGACY_FORMATION_CENTER_DEFAULT.targetLevel &&
      (facility.notes ?? "") === LEGACY_FORMATION_CENTER_DEFAULT.notes
  );
}

function migrateLegacyFacilities(settings: ClubSettings): ClubSettings {
  const nextSettings = {
    ...settings,
    facilities: {
      ...settings.facilities,
    },
  };

  if (isLegacyTrainingCenterSeed(nextSettings.facilities.trainingCenter)) {
    nextSettings.facilities.trainingCenter = {
      ...nextSettings.facilities.trainingCenter,
      level: 0,
      targetLevel: 1,
      notes: "Travaux lancés vers le niveau 1.",
    };
  }

  if (isLegacyFormationCenterSeed(nextSettings.facilities.formationCenter)) {
    nextSettings.facilities.formationCenter = {
      ...nextSettings.facilities.formationCenter,
      level: 0,
    };
  }

  return nextSettings;
}

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

    return migrateLegacyFacilities({
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
      targetDivisionPro:
        parsed.targetDivisionPro ?? parsed.targetDivision ?? "D8",
      targetDivisionU25:
        parsed.targetDivisionU25 ?? parsed.targetDivision ?? "D8",
      targetDivisionU21:
        parsed.targetDivisionU21 ?? parsed.targetDivision ?? "D8",
      manualWeeklySalaryExpense:
        typeof parsed.manualWeeklySalaryExpense === "number" && parsed.manualWeeklySalaryExpense >= 0
          ? parsed.manualWeeklySalaryExpense
          : defaultClubSettings.manualWeeklySalaryExpense,
      financialBalance: defaultClubSettings.financialBalance,
    });
  } catch (error) {
    console.error("Erreur de lecture localStorage club settings", error);
    return defaultClubSettings;
  }
}

export function saveClubSettings(settings: ClubSettings): void {
  try {
    const normalizedSettings: ClubSettings = {
      ...settings,
      financialBalance: defaultClubSettings.financialBalance,
    };

    localStorage.setItem(CLUB_SETTINGS_KEY, JSON.stringify(normalizedSettings));
    syncFinanceWithSettings(
      normalizedSettings,
      normalizedSettings.financialBalance
    );
  } catch (error) {
    console.error("Erreur d'écriture localStorage club settings", error);
  }
}