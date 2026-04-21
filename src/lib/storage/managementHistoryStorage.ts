import type {
  ManagementHistoryArea,
  ManagementHistoryEntry,
  ManagementHistoryEntryKind,
} from "../../types/management";

const MANAGEMENT_HISTORY_STORAGE_KEY = "cymanager:management-history";
const MAX_MANAGEMENT_HISTORY_ENTRIES = 180;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toIsoDate(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function createEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `management-history-${crypto.randomUUID()}`;
  }

  return `management-history-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeArea(value: unknown): ManagementHistoryArea | null {
  return value === "settings" || value === "transfers" || value === "calendar" || value === "results" || value === "system"
    ? value
    : null;
}

function normalizeKind(value: unknown): ManagementHistoryEntryKind | null {
  return value === "settings-update" ||
    value === "settings-reset" ||
    value === "backup-export" ||
    value === "backup-import" ||
    value === "data-cleanup" ||
    value === "market-review" ||
    value === "calendar-status" ||
    value === "calendar-delete" ||
    value === "result-save" ||
    value === "recruitment"
    ? value
    : null;
}

function normalizeManagementHistoryEntry(value: unknown): ManagementHistoryEntry | null {
  if (
    !isObjectRecord(value) ||
    typeof value.title !== "string" ||
    typeof value.note !== "string"
  ) {
    return null;
  }

  const area = normalizeArea(value.area);
  const kind = normalizeKind(value.kind);

  if (!area || !kind) {
    return null;
  }

  return {
    id: typeof value.id === "string" && value.id.trim().length > 0 ? value.id : createEntryId(),
    occurredAt: toIsoDate(value.occurredAt),
    area,
    kind,
    title: value.title.trim(),
    note: value.note.trim(),
    amount: typeof value.amount === "number" && Number.isFinite(value.amount) ? value.amount : undefined,
  };
}

export function normalizeManagementHistory(value: unknown): ManagementHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeManagementHistoryEntry(entry))
    .filter((entry): entry is ManagementHistoryEntry => entry !== null)
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, MAX_MANAGEMENT_HISTORY_ENTRIES);
}

export function loadManagementHistory(): ManagementHistoryEntry[] {
  try {
    const raw = localStorage.getItem(MANAGEMENT_HISTORY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return normalizeManagementHistory(JSON.parse(raw));
  } catch (error) {
    console.error("Erreur de lecture localStorage journal de gestion", error);
    return [];
  }
}

export function saveManagementHistory(entries: ManagementHistoryEntry[]): void {
  try {
    localStorage.setItem(
      MANAGEMENT_HISTORY_STORAGE_KEY,
      JSON.stringify(normalizeManagementHistory(entries))
    );
  } catch (error) {
    console.error("Erreur d'écriture localStorage journal de gestion", error);
  }
}

export function appendManagementHistoryEntry(
  entry: Omit<ManagementHistoryEntry, "id" | "occurredAt"> & { occurredAt?: string }
): ManagementHistoryEntry[] {
  const current = loadManagementHistory();
  const next = normalizeManagementHistory([
    {
      ...entry,
      id: createEntryId(),
      occurredAt: toIsoDate(entry.occurredAt),
    },
    ...current,
  ]);

  saveManagementHistory(next);
  return next;
}