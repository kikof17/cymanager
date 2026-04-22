import type { StoredResult } from "../scoring/extractPoints";
import type { TodoItem } from "../../types/todo";
import { getStoredResultText } from "../scoring/extractPoints";

export type ParsedStageRow = {
  position: number;
  riderName: string;
  teamName: string;
};

export type GeneralClassificationRow = {
  rank: number;
  riderName: string;
  teamName: string;
  cumulativePosition: number;
  stageCount: number;
};

export type GeneralClassificationResult = {
  rows: GeneralClassificationRow[];
  consideredStageCount: number;
  consideredStages: TodoItem[];
};

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findColumnIndex(headers: string[], matcher: (normalized: string) => boolean): number {
  return headers.findIndex((header) => matcher(normalizeComparable(header)));
}

function parsePosition(value: string): number | null {
  const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseStageResultRows(stored: StoredResult | undefined): ParsedStageRow[] {
  const text = getStoredResultText(stored).trim();

  if (!text) {
    return [];
  }

  const lines = text.split(/\r?\n/);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split("\t");
  const positionIdx = findColumnIndex(headers, (header) =>
    header === "#" ||
    header.includes("place") ||
    header === "cl" ||
    header === "cl." ||
    header.includes("classement") ||
    header.includes("rank") ||
    header.includes("pos")
  );
  const riderIdx = findColumnIndex(headers, (header) =>
    header.includes("nom") || header.includes("rider") || header.includes("coureur")
  );
  const teamIdx = findColumnIndex(headers, (header) =>
    header.includes("equipe") || header.includes("team")
  );

  if (positionIdx === -1 || riderIdx === -1 || teamIdx === -1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => line.split("\t"))
    .map((cells) => {
      const position = parsePosition(cells[positionIdx]?.trim() ?? "");
      const riderName = cells[riderIdx]?.trim() ?? "";
      const teamName = cells[teamIdx]?.trim() ?? "";

      if (position === null || riderName.length === 0 || teamName.length === 0) {
        return null;
      }

      return {
        position,
        riderName,
        teamName,
      };
    })
    .filter((row): row is ParsedStageRow => row !== null);
}

function sortStages(stages: TodoItem[]): TodoItem[] {
  return [...stages].sort((left, right) => {
    const leftStage = left.stageNumber ?? Number.MAX_SAFE_INTEGER;
    const rightStage = right.stageNumber ?? Number.MAX_SAFE_INTEGER;

    if (leftStage !== rightStage) {
      return leftStage - rightStage;
    }

    const leftDate = left.scheduledAt ?? left.createdAt;
    const rightDate = right.scheduledAt ?? right.createdAt;
    const leftTime = new Date(leftDate).getTime();
    const rightTime = new Date(rightDate).getTime();

    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id.localeCompare(right.id, "fr");
  });
}

function resolveStagesUpTo(stages: TodoItem[], upToCourseId?: string): TodoItem[] {
  if (!upToCourseId) {
    return stages;
  }

  const index = stages.findIndex((stage) => stage.id === upToCourseId);

  if (index === -1) {
    return stages;
  }

  return stages.slice(0, index + 1);
}

export function buildGeneralClassification(
  tourStages: TodoItem[],
  resultsByCourseId: Record<string, StoredResult>,
  upToCourseId?: string
): GeneralClassificationResult {
  const orderedStages = sortStages(tourStages);
  const consideredStages = resolveStagesUpTo(orderedStages, upToCourseId);

  if (consideredStages.length === 0) {
    return {
      rows: [],
      consideredStageCount: 0,
      consideredStages: [],
    };
  }

  const aggregates = new Map<string, {
    riderName: string;
    teamName: string;
    cumulativePosition: number;
    stageCount: number;
  }>();

  consideredStages.forEach((stage) => {
    const rows = parseStageResultRows(resultsByCourseId[stage.id]);

    rows.forEach((row) => {
      const riderKey = normalizeComparable(row.riderName);
      const existing = aggregates.get(riderKey);

      if (!existing) {
        aggregates.set(riderKey, {
          riderName: row.riderName,
          teamName: row.teamName,
          cumulativePosition: row.position,
          stageCount: 1,
        });
        return;
      }

      existing.cumulativePosition += row.position;
      existing.stageCount += 1;
      existing.teamName = row.teamName;
    });
  });

  const requiredStageCount = consideredStages.length;
  const classified = [...aggregates.values()]
    .filter((entry) => entry.stageCount === requiredStageCount)
    .sort((left, right) => {
      if (left.cumulativePosition !== right.cumulativePosition) {
        return left.cumulativePosition - right.cumulativePosition;
      }

      return left.riderName.localeCompare(right.riderName, "fr");
    });

  const rows: GeneralClassificationRow[] = classified.map((entry, index) => ({
    rank: index + 1,
    riderName: entry.riderName,
    teamName: entry.teamName,
    cumulativePosition: entry.cumulativePosition,
    stageCount: entry.stageCount,
  }));

  return {
    rows,
    consideredStageCount: requiredStageCount,
    consideredStages,
  };
}

export function getTourGeneralClassificationType(stageCount: number): "GT" | "MT" | null {
  if (stageCount >= 5) {
    return "GT";
  }

  if (stageCount >= 3) {
    return "MT";
  }

  return null;
}
