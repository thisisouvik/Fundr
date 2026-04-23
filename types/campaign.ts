export type CampaignStatus = "active" | "successful" | "failed" | "withdrawn";

export type CampaignCategory =
  | "technology"
  | "art"
  | "education"
  | "environment"
  | "health"
  | "community";

export interface Campaign {
  id: string;
  contractAddress: string;
  creatorId: string;
  creatorWallet: string;
  title: string;
  description: string;
  imageUrl: string;
  category: CampaignCategory;
  goalXlm: number;
  raisedXlm: number;
  backersCount: number;
  deadline: Date;
  status: CampaignStatus;
  createdAt: Date;
}

export interface CampaignUpdate {
  id: string;
  campaignId: string;
  content: string;
  createdAt: Date;
}

export interface Backer {
  address: string;
  amountXlm: number;
  fundedAt: Date;
}
