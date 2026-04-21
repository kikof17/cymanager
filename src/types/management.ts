export type ManagementHistoryArea = "settings" | "transfers" | "calendar" | "results" | "system";

export type ManagementHistoryEntryKind =
  | "settings-update"
  | "settings-reset"
  | "backup-export"
  | "backup-import"
  | "data-cleanup"
  | "market-review"
  | "calendar-status"
  | "calendar-delete"
  | "result-save"
  | "result-repair"
  | "recruitment";

export type ManagementHistoryEntry = {
  id: string;
  occurredAt: string;
  area: ManagementHistoryArea;
  kind: ManagementHistoryEntryKind;
  title: string;
  note: string;
  amount?: number;
};