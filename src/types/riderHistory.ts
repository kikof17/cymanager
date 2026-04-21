export type RiderHistorySnapshotEntry = {
  riderId: string;
  riderName: string;
  category: "Pro" | "U25" | "U21";
  form: number;
  ageYears: number;
  ageWeeks: number;
  value: number;
  salaryWeekly: number;
  total: number;
};

export type RiderHistorySnapshot = {
  id: string;
  capturedAt: string;
  signature: string;
  riders: RiderHistorySnapshotEntry[];
};