import type { Rider } from "../../types/rider";
import type { RiderHistorySnapshot, RiderHistorySnapshotEntry } from "../../types/riderHistory";

const RIDER_HISTORY_STORAGE_KEY = "cymanager:rider-history";
const MAX_RIDER_HISTORY_SNAPSHOTS = 30;

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

function createSnapshotId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `rider-history-${crypto.randomUUID()}`;
  }

  return `rider-history-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSnapshotEntry(value: unknown): RiderHistorySnapshotEntry | null {
  if (!isObjectRecord(value) || typeof value.riderId !== "string" || typeof value.riderName !== "string") {
    return null;
  }

  return {
    riderId: value.riderId,
    riderName: value.riderName,
    category: value.category === "U25" || value.category === "U21" ? value.category : "Pro",
    form: typeof value.form === "number" && Number.isFinite(value.form) ? value.form : 0,
    ageYears: typeof value.ageYears === "number" && Number.isFinite(value.ageYears) ? value.ageYears : 0,
    ageWeeks: typeof value.ageWeeks === "number" && Number.isFinite(value.ageWeeks) ? value.ageWeeks : 0,
    value: typeof value.value === "number" && Number.isFinite(value.value) ? value.value : 0,
    salaryWeekly:
      typeof value.salaryWeekly === "number" && Number.isFinite(value.salaryWeekly)
        ? value.salaryWeekly
        : 0,
    total: typeof value.total === "number" && Number.isFinite(value.total) ? value.total : 0,
  };
}

function normalizeSnapshot(value: unknown): RiderHistorySnapshot | null {
  if (!isObjectRecord(value) || !Array.isArray(value.riders) || typeof value.signature !== "string") {
    return null;
  }

  const riders = value.riders
    .map((entry) => normalizeSnapshotEntry(entry))
    .filter((entry): entry is RiderHistorySnapshotEntry => entry !== null)
    .sort((left, right) => left.riderName.localeCompare(right.riderName, "fr-FR"));

  if (riders.length === 0) {
    return null;
  }

  return {
    id: typeof value.id === "string" && value.id.trim().length > 0 ? value.id : createSnapshotId(),
    capturedAt: toIsoDate(value.capturedAt),
    signature: value.signature,
    riders,
  };
}

export function normalizeRiderHistorySnapshots(value: unknown): RiderHistorySnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeSnapshot(entry))
    .filter((entry): entry is RiderHistorySnapshot => entry !== null)
    .sort((left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime())
    .slice(0, MAX_RIDER_HISTORY_SNAPSHOTS);
}

function buildSnapshotEntries(riders: Rider[]): RiderHistorySnapshotEntry[] {
  return riders
    .map((rider) => ({
      riderId: rider.id,
      riderName: rider.name,
      category: rider.category,
      form: rider.form,
      ageYears: rider.ageYears,
      ageWeeks: rider.ageWeeks,
      value: rider.value,
      salaryWeekly: rider.salaryWeekly,
      total: rider.total,
    }))
    .sort((left, right) => left.riderName.localeCompare(right.riderName, "fr-FR"));
}

function buildSnapshotSignature(entries: RiderHistorySnapshotEntry[]): string {
  return entries
    .map(
      (entry) =>
        `${entry.riderId}:${entry.form}:${entry.ageYears}:${entry.ageWeeks}:${entry.value}:${entry.salaryWeekly}:${entry.total}:${entry.category}`
    )
    .join("|");
}

export function loadRiderHistorySnapshots(): RiderHistorySnapshot[] {
  try {
    const raw = localStorage.getItem(RIDER_HISTORY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return normalizeRiderHistorySnapshots(JSON.parse(raw));
  } catch (error) {
    console.error("Erreur de lecture localStorage historique coureurs", error);
    return [];
  }
}

export function saveRiderHistorySnapshots(snapshots: RiderHistorySnapshot[]): void {
  try {
    localStorage.setItem(
      RIDER_HISTORY_STORAGE_KEY,
      JSON.stringify(normalizeRiderHistorySnapshots(snapshots))
    );
  } catch (error) {
    console.error("Erreur d'écriture localStorage historique coureurs", error);
  }
}

export function appendRiderHistorySnapshot(riders: Rider[], capturedAt?: string): RiderHistorySnapshot[] {
  if (riders.length === 0) {
    return loadRiderHistorySnapshots();
  }

  const entries = buildSnapshotEntries(riders);
  const signature = buildSnapshotSignature(entries);
  const current = loadRiderHistorySnapshots();

  if (current[0]?.signature === signature) {
    return current;
  }

  const next = normalizeRiderHistorySnapshots([
    {
      id: createSnapshotId(),
      capturedAt: toIsoDate(capturedAt),
      signature,
      riders: entries,
    },
    ...current,
  ]);

  saveRiderHistorySnapshots(next);
  return next;
}