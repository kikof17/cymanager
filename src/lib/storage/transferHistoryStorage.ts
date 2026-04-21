import type { TransferHistoryEntry, TransferHistoryEntryKind } from "../../types/transfer";

const TRANSFER_HISTORY_STORAGE_KEY = "cymanager:transfer-history";
const MAX_TRANSFER_HISTORY_ENTRIES = 120;

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
    return `transfer-history-${crypto.randomUUID()}`;
  }

  return `transfer-history-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTransferHistoryKind(value: unknown): TransferHistoryEntryKind | null {
  return value === "market-import" ||
    value === "shortlist-add" ||
    value === "shortlist-remove" ||
    value === "candidate-remove" ||
    value === "recruit"
    ? value
    : null;
}

function normalizeTransferHistoryEntry(value: unknown): TransferHistoryEntry | null {
  if (!isObjectRecord(value) || typeof value.note !== "string") {
    return null;
  }

  const kind = normalizeTransferHistoryKind(value.kind);

  if (!kind) {
    return null;
  }

  return {
    id: typeof value.id === "string" && value.id.trim().length > 0 ? value.id : createEntryId(),
    occurredAt: toIsoDate(value.occurredAt),
    kind,
    riderName: typeof value.riderName === "string" && value.riderName.trim().length > 0 ? value.riderName : undefined,
    candidateId: typeof value.candidateId === "string" && value.candidateId.trim().length > 0 ? value.candidateId : undefined,
    note: value.note.trim(),
    amount: typeof value.amount === "number" && Number.isFinite(value.amount) ? value.amount : undefined,
    shortlistSize:
      typeof value.shortlistSize === "number" && Number.isInteger(value.shortlistSize)
        ? Math.max(0, value.shortlistSize)
        : undefined,
  };
}

export function normalizeTransferHistory(value: unknown): TransferHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeTransferHistoryEntry(entry))
    .filter((entry): entry is TransferHistoryEntry => entry !== null)
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, MAX_TRANSFER_HISTORY_ENTRIES);
}

export function loadTransferHistory(): TransferHistoryEntry[] {
  try {
    const raw = localStorage.getItem(TRANSFER_HISTORY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return normalizeTransferHistory(JSON.parse(raw));
  } catch (error) {
    console.error("Erreur de lecture localStorage historique transferts", error);
    return [];
  }
}

export function saveTransferHistory(entries: TransferHistoryEntry[]): void {
  try {
    localStorage.setItem(
      TRANSFER_HISTORY_STORAGE_KEY,
      JSON.stringify(normalizeTransferHistory(entries))
    );
  } catch (error) {
    console.error("Erreur d'écriture localStorage historique transferts", error);
  }
}

export function appendTransferHistoryEntry(
  entry: Omit<TransferHistoryEntry, "id" | "occurredAt"> & { occurredAt?: string }
): TransferHistoryEntry[] {
  const current = loadTransferHistory();
  const next = normalizeTransferHistory([
    {
      ...entry,
      id: createEntryId(),
      occurredAt: toIsoDate(entry.occurredAt),
    },
    ...current,
  ]);

  saveTransferHistory(next);
  return next;
}