export type UserRole = "user" | "creator" | "admin";

export interface ProfileRow {
  id: string;
  wallet_address: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website_url: string | null;
  role: UserRole;
  is_verified: boolean;
  total_raised_xlm: number;
  total_backed_xlm: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignRow {
  id: string;
  creator_id: string;
  title: string;
  factory_tx_hash?: string | null;
  slug: string | null;
  image_url: string | null;
  short_description: string;
  description: string;
  gallery_urls: string[] | null;
  official_link: string | null;
  proof_document_url: string | null;
  category: string;
  goal_xlm: number;
  contract_address: string;
  deadline: string;
  status: "draft" | "active" | "successful" | "failed" | "withdrawn";
  is_featured: boolean;
  is_flagged: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContributionRow {
  id: string;
  campaign_id: string;
  backer_id: string | null;
  wallet_address: string;
  amount_xlm: number;
  tx_hash: string;
  status: "pending" | "confirmed" | "refunded";
  is_anonymous: boolean;
  donor_name: string | null;
  donor_message: string | null;
  created_at: string;
}

export interface FundraiserKycRow {
  id: string;
  user_id: string;
  legal_name: string;
  country: string;
  id_number: string;
  document_url: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: {
          id?: string;
          wallet_address?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          website_url?: string | null;
          role?: UserRole;
          is_verified?: boolean;
          total_raised_xlm?: number;
          total_backed_xlm?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: CampaignRow;
        Insert: Partial<CampaignRow>;
        Update: {
          id?: string;
          creator_id?: string;
          title?: string;
          slug?: string | null;
          image_url?: string | null;
          short_description?: string;
          description?: string;
          gallery_urls?: string[] | null;
          official_link?: string | null;
          proof_document_url?: string | null;
          category?: string;
          goal_xlm?: number;
          contract_address?: string;
          deadline?: string;
          status?: "draft" | "active" | "successful" | "failed" | "withdrawn";
          is_featured?: boolean;
          is_flagged?: boolean;
          flag_reason?: string | null;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      contributions: {
        Row: ContributionRow;
        Insert: Partial<ContributionRow>;
        Update: Partial<ContributionRow>;
      };
      fundraiser_kyc: {
        Row: FundraiserKycRow;
        Insert: Partial<FundraiserKycRow> & { user_id: string };
        Update: {
          id?: string;
          user_id?: string;
          legal_name?: string;
          country?: string;
          id_number?: string;
          document_url?: string;
          status?: "pending" | "approved" | "rejected";
          submitted_at?: string;
        };
      };
    };
  };
}
