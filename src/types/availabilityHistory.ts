export type AvailabilityWeeklySnapshot = {
  id: string;
  capturedAt: string;
  weekKey: string;
  totalRiders: number;
  availableCount: number;
  unavailableCount: number;
  lowFormWarningCount: number;
  injuryUnavailableCount: number;
  criticalFormUnavailableCount: number;
  signature: string;
};
