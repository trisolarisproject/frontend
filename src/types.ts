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
export type ApprovalKey = "strategy" | "deliveryMethod" | "storyboard";
export type ApprovalDecision = "pending" | "approved" | "declined";
export type FinalApprovalDecision = Exclude<ApprovalDecision, "pending">;
export type JourneyPhase =
  | "intake"
  | "consult"
  | "research"
  | "strategy"
  | "generation"
  | "review"
  | "launch_ready"
  | "launched"
  | "evaluating"
  | "complete";

export interface ConsultPayload {
  productDescription: string;
  targetAudience: string;
  goal: Goal;
  tone: Tone;
  keyPoints: string[];
}

export interface ClarifyingQuestion {
  id: string;
  prompt: string;
  placeholder?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
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
  journey?: {
    phase: JourneyPhase;
    flowStep: 1 | 2 | 3 | 4;
    feedbackLoops: number;
    maxFeedbackLoops: number;
    approved: boolean;
    productLink?: string;
    researchSummary: string[];
    strategySummary: string[];
    generatedAssets: {
      videos: number;
      graphics: number;
      captions: number;
    };
    metrics?: {
      impressions: number;
      clicks: number;
      sales: number;
    };
    evaluation?: string;
    lastFeedbackNote?: string;
    consultAnswers?: {
      audienceDetails: string;
      budgetRange: string;
      timeline: string;
      constraints: string;
    };
    clarifyingAnswers?: Record<string, string>;
    activeTask?: "consult" | "research" | "posting" | null;
    taskStartedAt?: string;
    taskProgress?: number;
    taskStatusMessage?: string;
    approvals: {
      strategy: boolean;
      deliveryMethod: boolean;
      storyboard: boolean;
      updatedAt?: string;
    };
    approvalFeedback?: Partial<Record<ApprovalKey, string>>;
    approvalDecisions?: Record<ApprovalKey, ApprovalDecision>;
    approvalHistory?: Partial<
      Record<
        ApprovalKey,
        {
          decision: FinalApprovalDecision;
          feedback?: string;
          submittedAt: string;
        }
      >
    >;
    updatedAt: string;
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

export interface PerformanceSeriesPoint {
  label: string;
  impressions: number;
  clicks: number;
  conversions: number;
}

export type PerformancePeriod = "7d" | "14d" | "1m" | "1y" | "all";

export interface CampaignPerformance {
  campaignId: string;
  period: PerformancePeriod;
  generatedAt: string;
  totals: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    ctr: number;
    conversionRate: number;
    roas: number;
  };
  series: PerformanceSeriesPoint[];
  channels: Array<{
    label: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>;
  emptyStateMessage?: string;
}

export interface AppDatabase {
  campaigns: Campaign[];
  assets: Asset[];
  videos: Video[];
}
