export type CampaignStatus =
  | "draft"
  | "collecting_assets"
  | "consulting"
  | "generating"
  | "done"
  | "failed";

export type Goal = "sales" | "leads" | "app_installs" | "brand_awareness";

export type Tone = "bold" | "friendly" | "luxury" | "playful" | "minimal";

export type TikTokShareStatus = "not_started" | "sharing" | "shared" | "failed";

export interface ConsultPayload {
  productDescription: string;
  targetAudience: string;
  goal: Goal;
  tone: Tone;
  keyPoints: string[];
}

export interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  status: CampaignStatus;
  currentStep: 1 | 2 | 3 | 4;
  assetIds: string[];
  consult: ConsultPayload | null;
  generation: {
    progress: number;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
  };
  videoIds: string[];
  sharing: {
    tiktok: TikTokShareStatus;
    sharedAt?: string;
  };
}

export interface Asset {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
}

export interface Video {
  id: string;
  campaignId: string;
  title: string;
  createdAt: string;
  posterUrl?: string;
  scriptPreview: string;
  caption: string;
  hashtags: string[];
}

export interface AppDatabase {
  campaigns: Campaign[];
  assets: Asset[];
  videos: Video[];
}