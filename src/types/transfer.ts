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