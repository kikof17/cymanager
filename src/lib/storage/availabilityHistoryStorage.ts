import type { Rider } from "../../types/rider";
import type { AvailabilityWeeklySnapshot } from "../../types/availabilityHistory";
import { buildRiderAvailabilitySummary } from "../scoring/riderAvailability";

const AVAILABILITY_HISTORY_STORAGE_KEY = "cymanager:availability-history";
const MAX_AVAILABILITY_HISTORY_SNAPSHOTS = 24;

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
    return `availability-history-${crypto.randomUUID()}`;
  }

  return `availability-history-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toDateOnlyIso(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStartIso(reference: Date): string {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);

  // Lundi = début de semaine
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);

  return toDateOnlyIso(date);
}

function normalizeSnapshot(value: unknown): AvailabilityWeeklySnapshot | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const weekKey = typeof value.weekKey === "string" && value.weekKey.trim().length > 0
    ? value.weekKey
    : getWeekStartIso(new Date());

  return {
    id: typeof value.id === "string" && value.id.trim().length > 0 ? value.id : createSnapshotId(),
    capturedAt: toIsoDate(value.capturedAt),
    weekKey,
    totalRiders: typeof value.totalRiders === "number" && Number.isFinite(value.totalRiders) ? value.totalRiders : 0,
    availableCount: typeof value.availableCount === "number" && Number.isFinite(value.availableCount) ? value.availableCount : 0,
    unavailableCount:
      typeof value.unavailableCount === "number" && Number.isFinite(value.unavailableCount)
        ? value.unavailableCount
        : 0,
    lowFormWarningCount:
      typeof value.lowFormWarningCount === "number" && Number.isFinite(value.lowFormWarningCount)
        ? value.lowFormWarningCount
        : 0,
    injuryUnavailableCount:
      typeof value.injuryUnavailableCount === "number" && Number.isFinite(value.injuryUnavailableCount)
        ? value.injuryUnavailableCount
        : 0,
    criticalFormUnavailableCount:
      typeof value.criticalFormUnavailableCount === "number" && Number.isFinite(value.criticalFormUnavailableCount)
        ? value.criticalFormUnavailableCount
        : 0,
    signature: typeof value.signature === "string" ? value.signature : "",
  };
}

export function normalizeAvailabilityWeeklySnapshots(value: unknown): AvailabilityWeeklySnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeSnapshot(entry))
    .filter((entry): entry is AvailabilityWeeklySnapshot => entry !== null)
    .sort((left, right) => {
      if (left.weekKey !== right.weekKey) {
        return right.weekKey.localeCompare(left.weekKey);
      }

      return new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime();
    })
    .slice(0, MAX_AVAILABILITY_HISTORY_SNAPSHOTS);
}

export function loadAvailabilityWeeklySnapshots(): AvailabilityWeeklySnapshot[] {
  try {
    const raw = localStorage.getItem(AVAILABILITY_HISTORY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return normalizeAvailabilityWeeklySnapshots(JSON.parse(raw));
  } catch (error) {
    console.error("Erreur de lecture localStorage historique indisponibilité", error);
    return [];
  }
}

export function saveAvailabilityWeeklySnapshots(snapshots: AvailabilityWeeklySnapshot[]): void {
  try {
    localStorage.setItem(
      AVAILABILITY_HISTORY_STORAGE_KEY,
      JSON.stringify(normalizeAvailabilityWeeklySnapshots(snapshots))
    );
  } catch (error) {
    console.error("Erreur d'écriture localStorage historique indisponibilité", error);
  }
}

function buildSnapshotSignature(riders: Rider[]): string {
  const availability = buildRiderAvailabilitySummary(riders);
  const unavailableIds = availability.unavailableRiders
    .map((row) => `${row.riderId}:${row.reason}`)
    .sort((left, right) => left.localeCompare(right, "fr-FR"));

  return [
    `u=${availability.unavailableRiders.length}`,
    `w=${availability.lowFormWarningCount}`,
    unavailableIds.join("|"),
  ].join(";");
}

export function appendAvailabilityWeeklySnapshot(
  riders: Rider[],
  capturedAt?: string
): AvailabilityWeeklySnapshot[] {
  const current = loadAvailabilityWeeklySnapshots();

  const date = capturedAt ? new Date(capturedAt) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const weekKey = getWeekStartIso(safeDate);

  const availability = buildRiderAvailabilitySummary(riders);
  const injuryUnavailableCount = availability.unavailableRiders.filter((row) => row.reason === "injury").length;
  const criticalFormUnavailableCount =
    availability.unavailableRiders.filter((row) => row.reason === "critical-form").length;

  const nextSnapshot: AvailabilityWeeklySnapshot = {
    id: createSnapshotId(),
    capturedAt: toIsoDate(capturedAt ?? safeDate.toISOString()),
    weekKey,
    totalRiders: riders.length,
    availableCount: availability.availableRiders.length,
    unavailableCount: availability.unavailableRiders.length,
    lowFormWarningCount: availability.lowFormWarningCount,
    injuryUnavailableCount,
    criticalFormUnavailableCount,
    signature: buildSnapshotSignature(riders),
  };

  const existingIndex = current.findIndex((entry) => entry.weekKey === weekKey);

  if (existingIndex >= 0) {
    if (current[existingIndex].signature === nextSnapshot.signature) {
      return current;
    }

    const next = [...current];
    next[existingIndex] = {
      ...nextSnapshot,
      id: current[existingIndex].id,
    };

    const normalized = normalizeAvailabilityWeeklySnapshots(next);
    saveAvailabilityWeeklySnapshots(normalized);
    return normalized;
  }

  const normalized = normalizeAvailabilityWeeklySnapshots([nextSnapshot, ...current]);
  saveAvailabilityWeeklySnapshots(normalized);
  return normalized;
}
