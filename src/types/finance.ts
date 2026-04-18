export type FinanceEntryCategory =
  | "facility-upgrade"
  | "race-prize"
  | "season-prize"
  | "transfer"
  | "other";

export type FinanceEntrySource = "manual" | "sync";

export type FinanceEntry = {
  id: string;
  label: string;
  amount: number;
  occurredAt: string;
  category: FinanceEntryCategory;
  source: FinanceEntrySource;
  note?: string;
  sourceKey?: string;
};

export type FinanceState = {
  startingBalance: number;
  entries: FinanceEntry[];
  updatedAt: string;
};

export type PrizeReferenceRow = {
  position: string;
  values: Record<string, number | null>;
};

export type PrizeReferenceTable = {
  id: string;
  title: string;
  columnLabels: string[];
  rows: PrizeReferenceRow[];
};