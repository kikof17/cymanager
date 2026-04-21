import {
	CYMANAGER_BACKUP_APP,
	CYMANAGER_BACKUP_FORMAT_VERSION,
	CYMANAGER_BACKUP_SCHEMA_VERSION,
	CYMANAGER_BACKUP_SECTION_VERSIONS,
	CYMANAGER_BACKUP_SLOTS,
	CYMANAGER_BACKUP_SUPPORTED_SCHEMA_VERSIONS,
	type BackupSlotKind,
	type CymanagerBackup,
	type CymanagerBackupData,
} from "./exportData";
import { normalizeCalendarRaceProfileStore } from "./calendarRaceProfile";
import { loadFinanceState } from "./financeStorage";
import { normalizeLastRaceSnapshot } from "./lastRaceStorage";
import { loadRidersFromStorage } from "./localStorage";
import { normalizeRaceSetupStore } from "./raceStorage";
import { normalizeRiderHistorySnapshots } from "./riderHistoryStorage";
import { loadClubSettings } from "./settingsStorage";
import { normalizeTeamStrategy } from "./teamStrategyStorage";
import { normalizeManagementHistory } from "./managementHistoryStorage";
import { normalizeManualTodos, normalizeTodoStatuses } from "./todoStorage";
import { normalizeTransferHistory } from "./transferHistoryStorage";
import { normalizeStoredResults } from "../scoring/extractPoints";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isValidBackupSlotValue(value: unknown, kind: BackupSlotKind): boolean {
	if (kind === "array") {
		return Array.isArray(value);
	}

	return isObjectRecord(value);
}

function isCymanagerBackup(value: unknown): value is CymanagerBackup {
	if (!isObjectRecord(value) || !isObjectRecord(value.data)) {
		return false;
	}

	return (
		value.app === CYMANAGER_BACKUP_APP &&
		typeof value.schemaVersion === "number" &&
		CYMANAGER_BACKUP_SUPPORTED_SCHEMA_VERSIONS.includes(value.schemaVersion as 1 | 2) &&
		typeof value.exportedAt === "string"
	);
}

type ImportPreviewAction = "restore" | "clear" | "skip";

export type ImportPreviewSection = {
	storageKey: string;
	label: string;
	action: ImportPreviewAction;
	originalCount: number;
	sanitizedCount: number;
	sanitized: boolean;
	sectionVersion: number;
};

export type ImportBackupPreview = {
	app: string;
	schemaVersion: number;
	formatVersion: string;
	exportedAt: string;
	sections: ImportPreviewSection[];
	sanitizedKeys: string[];
	clearedKeys: string[];
	canImport: boolean;
};

export type ImportBackupResult = {
	restoredKeys: string[];
	clearedKeys: string[];
	sanitizedKeys: string[];
};

const BACKUP_SLOT_LABELS: Record<string, string> = {
	"cymanager:club-settings": "Paramètres club",
	"cymanager:riders": "Effectif",
	"cymanager:rider-history": "Historique coureurs",
	"cymanager:finance": "Finance",
	"cymanager:team-strategy": "Stratégie d'équipe",
	"cymanager:manual-todos": "Todos manuels",
	"cymanager:todo-status": "Statuts todo",
	"cymanager:race-setup": "Réglages de course",
	"cymanager:calendar-race-profiles": "Profils calendrier",
	"cymanager:results": "Résultats",
	"cymanager:last-race": "Dernière course",
	"cymanager:transfers-page-state": "État Transferts",
	"cymanager:management-history": "Journal de gestion",
	"cymanager:transfer-history": "Historique Transferts",
};

function countEntries(value: unknown): number {
	if (Array.isArray(value)) {
		return value.length;
	}

	if (isObjectRecord(value)) {
		return Object.keys(value).length;
	}

	return value === undefined ? 0 : 1;
}

function getSectionVersion(backup: CymanagerBackup, exportKey: keyof CymanagerBackupData): number {
	if (
		backup.schemaVersion >= 2 &&
		isObjectRecord(backup.metadata) &&
		isObjectRecord(backup.metadata.sectionVersions) &&
		typeof backup.metadata.sectionVersions[exportKey] === "number"
	) {
		return backup.metadata.sectionVersions[exportKey] as number;
	}

	return CYMANAGER_BACKUP_SECTION_VERSIONS[exportKey];
}

function buildImportPreview(backup: CymanagerBackup, sanitizedData: CymanagerBackupData): ImportBackupPreview {
	const sanitizedKeys: string[] = [];
	const clearedKeys: string[] = [];

	const sections = CYMANAGER_BACKUP_SLOTS.map(({ exportKey, storageKey }) => {
		const originalValue = backup.data[exportKey];
		const value = sanitizedData[exportKey];
		const sanitized = originalValue !== undefined && JSON.stringify(originalValue) !== JSON.stringify(value);
		const action: ImportPreviewAction = value === undefined ? "clear" : originalValue === undefined ? "skip" : "restore";

		if (sanitized) {
			sanitizedKeys.push(storageKey);
		}

		if (value === undefined) {
			clearedKeys.push(storageKey);
		}

		return {
			storageKey,
			label: BACKUP_SLOT_LABELS[storageKey] ?? storageKey,
			action,
			originalCount: countEntries(originalValue),
			sanitizedCount: countEntries(value),
			sanitized,
			sectionVersion: getSectionVersion(backup, exportKey),
		};
	});

	return {
		app: backup.app,
		schemaVersion: backup.schemaVersion,
		formatVersion:
			backup.schemaVersion >= CYMANAGER_BACKUP_SCHEMA_VERSION &&
			isObjectRecord(backup.metadata) &&
			typeof backup.metadata.formatVersion === "string"
				? backup.metadata.formatVersion
				: CYMANAGER_BACKUP_FORMAT_VERSION,
		exportedAt: backup.exportedAt,
		sections,
		sanitizedKeys,
		clearedKeys,
		canImport: true,
	};
}

function parseImportBackup(rawContent: string): { backup: CymanagerBackup; sanitizedData: CymanagerBackupData } {
	let parsed: unknown;

	try {
		parsed = JSON.parse(rawContent);
	} catch {
		throw new Error("Le fichier de sauvegarde n'est pas un JSON valide.");
	}

	if (!isCymanagerBackup(parsed)) {
		throw new Error("Le fichier ne correspond pas à un backup Cymanager valide.");
	}

	const backup = parsed as CymanagerBackup;
	return {
		backup,
		sanitizedData: sanitizeBackupData(backup.data as CymanagerBackupData),
	};
}

function sanitizeBackupData(data: CymanagerBackupData): CymanagerBackupData {
	const sanitized: CymanagerBackupData = {};

	sanitized.clubSettings = data.clubSettings === undefined ? undefined : {
		...loadClubSettings(),
		...(typeof data.clubSettings === "object" && data.clubSettings !== null ? data.clubSettings : {}),
	};
	sanitized.riders = data.riders === undefined ? undefined : (() => {
		try {
			const current = localStorage.getItem("cymanager:riders");
			localStorage.setItem("cymanager:riders", JSON.stringify(data.riders));
			const normalized = loadRidersFromStorage();

			if (current === null) {
				localStorage.removeItem("cymanager:riders");
			} else {
				localStorage.setItem("cymanager:riders", current);
			}

			return normalized;
		} catch {
			return [];
		}
	})();
	sanitized.riderHistory = data.riderHistory === undefined ? undefined : normalizeRiderHistorySnapshots(data.riderHistory);
	sanitized.finance = data.finance === undefined ? undefined : (() => {
		try {
			const current = localStorage.getItem("cymanager:finance");
			localStorage.setItem("cymanager:finance", JSON.stringify(data.finance));
			const normalized = loadFinanceState();

			if (current === null) {
				localStorage.removeItem("cymanager:finance");
			} else {
				localStorage.setItem("cymanager:finance", current);
			}

			return normalized;
		} catch {
			return loadFinanceState();
		}
	})();
	sanitized.teamStrategy = data.teamStrategy === undefined ? undefined : normalizeTeamStrategy(data.teamStrategy);
	sanitized.manualTodos = data.manualTodos === undefined ? undefined : normalizeManualTodos(data.manualTodos);
	sanitized.todoStatuses = data.todoStatuses === undefined ? undefined : normalizeTodoStatuses(data.todoStatuses);
	sanitized.raceSetup = data.raceSetup === undefined ? undefined : normalizeRaceSetupStore(data.raceSetup);
	sanitized.calendarRaceProfiles =
		data.calendarRaceProfiles === undefined ? undefined : normalizeCalendarRaceProfileStore(data.calendarRaceProfiles);
	sanitized.results = data.results === undefined ? undefined : normalizeStoredResults(data.results);
	sanitized.lastRace = data.lastRace === undefined ? undefined : normalizeLastRaceSnapshot(data.lastRace) ?? undefined;
	sanitized.transfersPageState = data.transfersPageState === undefined
		? undefined
		: typeof data.transfersPageState === "object" && data.transfersPageState !== null && !Array.isArray(data.transfersPageState)
			? data.transfersPageState
			: undefined;
	sanitized.managementHistory = data.managementHistory === undefined ? undefined : normalizeManagementHistory(data.managementHistory);
	sanitized.transferHistory = data.transferHistory === undefined ? undefined : normalizeTransferHistory(data.transferHistory);

	return sanitized;
}

export function importCymanagerBackup(rawContent: string): ImportBackupResult {
	const { backup, sanitizedData } = parseImportBackup(rawContent);
	const backupData = backup.data as CymanagerBackupData;
	const invalidKeys = CYMANAGER_BACKUP_SLOTS.filter(({ exportKey, kind }) => {
		const value = backupData[exportKey];
		return value !== undefined && !isValidBackupSlotValue(value, kind);
	}).map(({ exportKey }) => exportKey);

	if (invalidKeys.length > 0) {
		throw new Error(`Le backup contient des sections invalides : ${invalidKeys.join(", ")}.`);
	}
	const restoredKeys: string[] = [];
	const clearedKeys: string[] = [];
	const sanitizedKeys: string[] = [];

	CYMANAGER_BACKUP_SLOTS.forEach(({ exportKey, storageKey }) => {
		const originalValue = backupData[exportKey];
		const value = sanitizedData[exportKey];

		if (originalValue !== undefined && JSON.stringify(originalValue) !== JSON.stringify(value)) {
			sanitizedKeys.push(storageKey);
		}

		if (value === undefined) {
			localStorage.removeItem(storageKey);
			clearedKeys.push(storageKey);
			return;
		}

		localStorage.setItem(storageKey, JSON.stringify(value));
		restoredKeys.push(storageKey);
	});

	return { restoredKeys, clearedKeys, sanitizedKeys };
}

export function previewCymanagerBackupImport(rawContent: string): ImportBackupPreview {
	const { backup, sanitizedData } = parseImportBackup(rawContent);
	return buildImportPreview(backup, sanitizedData);
}
