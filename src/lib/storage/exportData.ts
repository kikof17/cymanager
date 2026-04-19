import { getAllResultsFromStorage } from "../scoring/extractPoints";
import { loadCalendarRaceProfileStore } from "./calendarRaceProfile";
import { loadFinanceState } from "./financeStorage";
import { loadLastRaceSnapshot } from "./lastRaceStorage";
import { loadRidersFromStorage } from "./localStorage";
import { loadRaceSetupStore } from "./raceStorage";
import { loadClubSettings } from "./settingsStorage";
import { loadTeamStrategy } from "./teamStrategyStorage";
import { loadManualTodos, loadTodoStatuses } from "./todoStorage";

export const CYMANAGER_BACKUP_APP = "cymanager";
export const CYMANAGER_BACKUP_SCHEMA_VERSION = 2;
export const CYMANAGER_BACKUP_SUPPORTED_SCHEMA_VERSIONS = [1, 2] as const;
export const CYMANAGER_BACKUP_FORMAT_VERSION = "1.4";

export type BackupSlotKind = "object" | "array";

export type BackupSlot = {
	exportKey: keyof CymanagerBackupData;
	storageKey: string;
	kind: BackupSlotKind;
};

export type CymanagerBackupData = {
	clubSettings?: unknown;
	riders?: unknown;
	finance?: unknown;
	teamStrategy?: unknown;
	manualTodos?: unknown;
	todoStatuses?: unknown;
	raceSetup?: unknown;
	calendarRaceProfiles?: unknown;
	results?: unknown;
	lastRace?: unknown;
	transfersPageState?: unknown;
};

export type CymanagerBackupMetadata = {
	formatVersion: typeof CYMANAGER_BACKUP_FORMAT_VERSION;
	sectionVersions: Record<keyof CymanagerBackupData, number>;
};

export type CymanagerBackup = {
	app: typeof CYMANAGER_BACKUP_APP;
	schemaVersion: typeof CYMANAGER_BACKUP_SCHEMA_VERSION;
	exportedAt: string;
	metadata: CymanagerBackupMetadata;
	data: CymanagerBackupData;
};

export const CYMANAGER_BACKUP_SECTION_VERSIONS: CymanagerBackupMetadata["sectionVersions"] = {
	clubSettings: 1,
	riders: 1,
	finance: 1,
	teamStrategy: 1,
	manualTodos: 1,
	todoStatuses: 1,
	raceSetup: 1,
	calendarRaceProfiles: 1,
	results: 1,
	lastRace: 1,
	transfersPageState: 1,
};

export const CYMANAGER_BACKUP_SLOTS: BackupSlot[] = [
	{ exportKey: "clubSettings", storageKey: "cymanager:club-settings", kind: "object" },
	{ exportKey: "riders", storageKey: "cymanager:riders", kind: "array" },
	{ exportKey: "finance", storageKey: "cymanager:finance", kind: "object" },
	{ exportKey: "teamStrategy", storageKey: "cymanager:team-strategy", kind: "object" },
	{ exportKey: "manualTodos", storageKey: "cymanager:manual-todos", kind: "array" },
	{ exportKey: "todoStatuses", storageKey: "cymanager:todo-status", kind: "object" },
	{ exportKey: "raceSetup", storageKey: "cymanager:race-setup", kind: "object" },
	{ exportKey: "calendarRaceProfiles", storageKey: "cymanager:calendar-race-profiles", kind: "object" },
	{ exportKey: "results", storageKey: "cymanager:results", kind: "object" },
	{ exportKey: "lastRace", storageKey: "cymanager:last-race", kind: "object" },
	{ exportKey: "transfersPageState", storageKey: "cymanager:transfers-page-state", kind: "object" },
];

function readRawJson(storageKey: string): unknown | undefined {
	try {
		const raw = localStorage.getItem(storageKey);

		if (!raw) {
			return undefined;
		}

		return JSON.parse(raw);
	} catch (error) {
		console.error(`Erreur de lecture backup pour ${storageKey}`, error);
		return undefined;
	}
}

function formatTimestampPart(value: number): string {
	return String(value).padStart(2, "0");
}

export function buildBackupFilename(date = new Date()): string {
	const year = date.getFullYear();
	const month = formatTimestampPart(date.getMonth() + 1);
	const day = formatTimestampPart(date.getDate());
	const hours = formatTimestampPart(date.getHours());
	const minutes = formatTimestampPart(date.getMinutes());

	return `cymanager-backup-v${CYMANAGER_BACKUP_SCHEMA_VERSION}-${year}${month}${day}-${hours}${minutes}.json`;
}

export function buildCymanagerBackup(): CymanagerBackup {
	return {
		app: CYMANAGER_BACKUP_APP,
		schemaVersion: CYMANAGER_BACKUP_SCHEMA_VERSION,
		exportedAt: new Date().toISOString(),
		metadata: {
			formatVersion: CYMANAGER_BACKUP_FORMAT_VERSION,
			sectionVersions: CYMANAGER_BACKUP_SECTION_VERSIONS,
		},
		data: {
			clubSettings: loadClubSettings(),
			riders: loadRidersFromStorage(),
			finance: loadFinanceState(),
			teamStrategy: loadTeamStrategy(),
			manualTodos: loadManualTodos(),
			todoStatuses: loadTodoStatuses(),
			raceSetup: loadRaceSetupStore(),
			calendarRaceProfiles: loadCalendarRaceProfileStore(),
			results: getAllResultsFromStorage(),
			lastRace: loadLastRaceSnapshot() ?? {},
			transfersPageState: readRawJson("cymanager:transfers-page-state") ?? {},
		},
	};
}

export function serializeCymanagerBackup(): string {
	return JSON.stringify(buildCymanagerBackup(), null, 2);
}
