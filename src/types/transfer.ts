import type { Rider } from "./rider";

export type TransferAuctionSnapshot = {
  deadlineAt: string;
  deadlineLabel: string;
  currentBid: number;
  highestBidder: string;
  seller: string;
  displayName: string;
};

export type TransferMarketCandidate = {
  id: string;
  rider: Rider;
  auction: TransferAuctionSnapshot;
};

export type TransferHistoryEntryKind =
  | "market-import"
  | "shortlist-add"
  | "shortlist-remove"
  | "candidate-remove"
  | "recruit";

export type TransferHistoryEntry = {
  id: string;
  occurredAt: string;
  kind: TransferHistoryEntryKind;
  riderName?: string;
  candidateId?: string;
  note: string;
  amount?: number;
  shortlistSize?: number;
};