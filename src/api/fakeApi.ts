import type {
  CampaignPerformance,
  PerformancePeriod,
  ApprovalDecision,
  ApprovalKey,
  AppDatabase,
  Asset,
  Campaign,
  ClarifyingQuestion,
  ConsultPayload,
  FinalApprovalDecision,
  Video,
} from "../types";
import { loadDatabase, saveDatabase, updateDatabase } from "../store/storage";
import { generateId } from "../utils/id";

const randomDelay = (min = 180, max = 420): Promise<void> => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const GENERATION_MS = 3000;
const TICK_MS = 300;
const FLOW_TASK_MS = {
  consult: 8000,
  research: 9000,
  posting: 7000,
} as const;

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

  const createProgressIncrements = (campaignId: string): number[] => {
  const tickCount = Math.ceil(GENERATION_MS / TICK_MS);
  const seed = hashString(campaignId);
  let remaining = 100;
  const increments: number[] = [];

  for (let i = 0; i < tickCount; i += 1) {
    const ticksLeft = tickCount - i;
    if (ticksLeft === 1) {
      increments.push(remaining);
      break;
    }

    const minimumForRest = (ticksLeft - 1) * 8;
    const maxAllowed = Math.min(15, remaining - minimumForRest);
    const minAllowed = 8;
    const span = Math.max(1, maxAllowed - minAllowed + 1);
    const value = minAllowed + ((seed + i * 17) % span);

    increments.push(value);
    remaining -= value;
  }

  const total = increments.reduce((acc, n) => acc + n, 0);
  const diff = 100 - total;
  increments[increments.length - 1] += diff;
  return increments;
};

const createDummyVideos = (campaign: Campaign): Video[] => {
  const count = (hashString(campaign.id) % 3) + 1;
  const now = new Date().toISOString();
  const goalLabel = campaign.consult?.goal.replace("_", " ") ?? "engagement";

  return Array.from({ length: count }).map((_, index) => {
    const n = index + 1;
    return {
      id: generateId(),
      campaignId: campaign.id,
      title: `${campaign.name} Cut ${n}`,
      createdAt: now,
      posterUrl: `https://via.placeholder.com/640x360.png?text=${encodeURIComponent(
        `${campaign.name} ${n}`
      )}`,
      scriptPreview: `Hook in first 2 seconds, highlight value point ${n}, then CTA tuned for ${goalLabel}.`,
      caption: `${campaign.name}: built for scroll-stopping results.`,
      hashtags: ["marketing", "campaign", "growth", `variant${n}`],
    };
  });
};

const createClarifyingQuestions = (campaign: Campaign): ClarifyingQuestion[] => {
  const targetAudience = campaign.consult?.targetAudience || "your core audience";
  const goal = campaign.consult?.goal.replace("_", " ") || "sales";

  return [
    {
      id: "primary-cta",
      prompt: `What is the single most important action you want ${targetAudience} to take after seeing this campaign?`,
      placeholder: "Example: Click through to the product page and start a trial.",
    },
    {
      id: "launch-priority",
      prompt: `For week one, should we prioritize conversion efficiency or rapid reach to support your ${goal} goal?`,
      placeholder: "Example: Start with rapid reach for data, then optimize for conversions.",
    },
    {
      id: "creative-guardrails",
      prompt: "Are there competitor styles, claims, or phrases we should explicitly avoid in creative?",
      placeholder: "Example: Avoid discount-heavy language and competitor name references.",
    },
  ];
};

const defaultApprovalsState = (): NonNullable<Campaign["journey"]>["approvals"] => ({
  strategy: false,
  deliveryMethod: false,
  storyboard: false,
});

const defaultApprovalDecisionsState = (): Record<ApprovalKey, ApprovalDecision> => ({
  strategy: "pending",
  deliveryMethod: "pending",
  storyboard: "pending",
});

const normalizeApprovalDecisions = (
  decisions?: Partial<Record<ApprovalKey, ApprovalDecision>>
): Record<ApprovalKey, ApprovalDecision> => ({
  ...defaultApprovalDecisionsState(),
  ...(decisions ?? {}),
});

const approvalKeys: ApprovalKey[] = ["strategy", "deliveryMethod", "storyboard"];

const defaultJourneyState = (): NonNullable<Campaign["journey"]> => ({
  phase: "intake",
  flowStep: 1,
  feedbackLoops: 0,
  maxFeedbackLoops: 3,
  approved: false,
  researchSummary: [],
  strategySummary: [],
  generatedAssets: {
    videos: 0,
    graphics: 0,
    captions: 0,
  },
  activeTask: null,
  taskProgress: 0,
  taskStatusMessage: "Waiting for input.",
  approvals: defaultApprovalsState(),
  approvalFeedback: {},
  approvalDecisions: defaultApprovalDecisionsState(),
  updatedAt: new Date().toISOString(),
});

const ensureJourney = (campaign: Campaign): Campaign => {
  const journey = campaign.journey;
  if (!journey) {
    return {
      ...campaign,
      journey: defaultJourneyState(),
    };
  }

  return {
    ...campaign,
  journey: {
      ...journey,
      approvals: {
        ...defaultApprovalsState(),
        ...journey.approvals,
      },
      approvalFeedback: {
        ...(journey.approvalFeedback ?? {}),
      },
      approvalDecisions: {
        ...normalizeApprovalDecisions(journey.approvalDecisions),
      },
      approvalHistory: {
        ...(journey.approvalHistory ?? {}),
      },
    },
  };
};

const updateCampaignInDb = (
  campaignId: string,
  updater: (campaign: Campaign) => Campaign
): Campaign => {
  const nextDb = updateDatabase((db) => ({
    ...db,
    campaigns: db.campaigns.map((campaign) =>
      campaign.id === campaignId ? updater(ensureJourney(campaign)) : campaign
    ),
  }));
  const campaign = nextDb.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    throw new Error("Campaign not found.");
  }
  return ensureJourney(campaign);
};

const finalizeFlowTasksIfReady = (db = loadDatabase()): AppDatabase => {
  let changed = false;

  const campaigns = db.campaigns.map((campaign) => {
    const withJourney = ensureJourney(campaign);
    const journey = withJourney.journey!;
    if (!journey.activeTask || !journey.taskStartedAt) {
      return withJourney;
    }

    const elapsed = Date.now() - new Date(journey.taskStartedAt).getTime();
    const duration = FLOW_TASK_MS[journey.activeTask];
    const progress = Math.max(0, Math.min(100, Math.floor((elapsed / duration) * 100)));

    if (progress < 100) {
      if (progress !== (journey.taskProgress ?? 0)) {
        changed = true;
      }
      return {
        ...withJourney,
        journey: {
          ...journey,
          taskProgress: progress,
          updatedAt: new Date().toISOString(),
        },
      } satisfies Campaign;
    }

    changed = true;

    if (journey.activeTask === "consult") {
      return {
        ...withJourney,
        journey: {
          ...journey,
          phase: "research",
          flowStep: 3,
          activeTask: null,
          taskProgress: 100,
          taskStatusMessage: "Consult complete. Ready for AI research.",
          updatedAt: new Date().toISOString(),
        },
      } satisfies Campaign;
    }

    if (journey.activeTask === "research") {
      return {
        ...withJourney,
        journey: {
          ...journey,
          phase: "generation",
          flowStep: 4,
          activeTask: null,
          taskProgress: 100,
          taskStatusMessage: "Research complete. Ready to post assets.",
          researchSummary: [
            "Audience interest peaks in evening scroll sessions.",
            "Most responsive segment prefers benefit-first hooks.",
            "Short urgency CTA performs best for this product category.",
          ],
          updatedAt: new Date().toISOString(),
        },
      } satisfies Campaign;
    }

    let videoIds = withJourney.videoIds;
    if (videoIds.length === 0) {
      const generatedVideos = createDummyVideos(withJourney);
      db.videos = [...db.videos, ...generatedVideos];
      videoIds = generatedVideos.map((video) => video.id);
    }

    return {
      ...withJourney,
      status: "done",
      currentStep: 4,
      videoIds,
      sharing: {
        tiktok: "shared",
        sharedAt: new Date().toISOString(),
      },
      journey: {
        ...journey,
        phase: "complete",
        flowStep: 4,
        activeTask: null,
        taskProgress: 100,
        taskStatusMessage: "Assets posted successfully.",
        generatedAssets: {
          videos: Math.max(videoIds.length, 1),
          graphics: 4,
          captions: 6,
        },
        updatedAt: new Date().toISOString(),
      },
    } satisfies Campaign;
  });

  if (!changed) {
    return db;
  }

  const next = { ...db, campaigns };
  saveDatabase(next);
  return next;
};

const finalizeGenerationIfReady = (db = loadDatabase()): AppDatabase => {
  let changed = false;

  const nextCampaigns = db.campaigns.map((campaign) => {
    if (campaign.status !== "generating" || !campaign.generation.startedAt) {
      return campaign;
    }

    const startedAt = new Date(campaign.generation.startedAt).getTime();
    const elapsed = Date.now() - startedAt;
    const ticks = Math.floor(elapsed / TICK_MS);
    const increments = createProgressIncrements(campaign.id);
    const progress = Math.min(
      100,
      increments.slice(0, Math.min(increments.length, ticks)).reduce((acc, n) => acc + n, 0)
    );

    let nextCampaign: Campaign = {
      ...campaign,
      generation: {
        ...campaign.generation,
        progress,
      },
    };

    if (elapsed >= GENERATION_MS || progress >= 100) {
      const videos = db.videos.filter((v) => v.campaignId === campaign.id);
      let videoIds = campaign.videoIds;

      if (videos.length === 0) {
        const generatedVideos = createDummyVideos(campaign);
        db.videos = [...db.videos, ...generatedVideos];
        videoIds = generatedVideos.map((video) => video.id);
      } else {
        videoIds = videos.map((video) => video.id);
      }

      nextCampaign = {
        ...nextCampaign,
        status: "done",
        currentStep: 4,
        videoIds,
        generation: {
          ...nextCampaign.generation,
          progress: 100,
          finishedAt: new Date().toISOString(),
        },
      };
    }

    if (
      nextCampaign.generation.progress !== campaign.generation.progress ||
      nextCampaign.status !== campaign.status ||
      nextCampaign.currentStep !== campaign.currentStep ||
      nextCampaign.videoIds.length !== campaign.videoIds.length
    ) {
      changed = true;
    }

    return nextCampaign;
  });

  if (!changed) {
    return db;
  }

  const next = { ...db, campaigns: nextCampaigns };
  saveDatabase(next);
  return next;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const createPeriodLabels = (period: PerformancePeriod): string[] => {
  const now = new Date();
  if (period === "7d") {
    return Array.from({ length: 7 })
      .map((_, index) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - index));
        return d.toLocaleDateString(undefined, { weekday: "short" });
      });
  }
  if (period === "14d") {
    return Array.from({ length: 14 })
      .map((_, index) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (13 - index));
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      });
  }
  if (period === "1m") {
    return Array.from({ length: 30 })
      .map((_, index) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (29 - index));
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      });
  }
  if (period === "1y") {
    return Array.from({ length: 12 })
      .map((_, index) => {
        const d = new Date(now);
        d.setMonth(now.getMonth() - (11 - index));
        return d.toLocaleDateString(undefined, { month: "short" });
      });
  }
  return Array.from({ length: 24 })
    .map((_, index) => {
      const d = new Date(now);
      d.setMonth(now.getMonth() - (23 - index));
      return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    });
};

const hasDataForPeriod = (campaign: Campaign, period: PerformancePeriod): boolean => {
  const ageDays = Math.floor(
    (Date.now() - new Date(campaign.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (period === "7d") {
    return ageDays >= 0;
  }
  if (period === "14d") {
    return ageDays >= 14;
  }
  if (period === "1m") {
    return ageDays >= 30;
  }
  if (period === "1y") {
    return ageDays >= 365;
  }
  return ageDays >= 1;
};

const createCampaignPerformance = (
  campaign: Campaign,
  period: PerformancePeriod
): CampaignPerformance => {
  const seed = hashString(campaign.id);
  const periodScaleByPeriod: Record<PerformancePeriod, number> = {
    "7d": 1,
    "14d": 1.65,
    "1m": 3.4,
    "1y": 12,
    all: 20,
  };

  if (!hasDataForPeriod(campaign, period)) {
    const periodLabelMap: Record<PerformancePeriod, string> = {
      "7d": "last 7 days",
      "14d": "last 2 weeks",
      "1m": "past month",
      "1y": "past year",
      all: "all time",
    };
    return {
      campaignId: campaign.id,
      period,
      generatedAt: new Date().toISOString(),
      totals: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        revenue: 0,
        ctr: 0,
        conversionRate: 0,
        roas: 0,
      },
      series: [],
      channels: [],
      emptyStateMessage: `No performance data is available for the ${periodLabelMap[period]} yet.`,
    };
  }

  const periodScale = periodScaleByPeriod[period];
  const baseImpressions = Math.round((18000 + (seed % 42000)) * periodScale);
  const ctr = 0.018 + ((seed % 35) / 1000);
  const conversionRate = 0.035 + (((seed >> 3) % 55) / 1000);
  const spend = Math.round((1800 + (seed % 5200)) * periodScale);
  const clicks = Math.round(baseImpressions * ctr);
  const conversions = Math.max(1, Math.round(clicks * conversionRate));
  const cpa = 20 + ((seed >> 2) % 55);
  const revenuePerConversion = cpa * (1.4 + ((seed >> 4) % 140) / 100);
  const revenue = Math.round(conversions * revenuePerConversion);
  const roas = spend > 0 ? revenue / spend : 0;

  const labels = createPeriodLabels(period);
  const series = labels.map((label, index) => {
    const wave = 0.75 + (((seed + index * 19) % 55) / 100);
    const impressions = Math.round((baseImpressions / labels.length) * wave);
    const dayCtr = clamp(ctr * (0.9 + ((seed + index * 7) % 18) / 100), 0.01, 0.09);
    const clicks = Math.round(impressions * dayCtr);
    const dayCvRate = clamp(
      conversionRate * (0.86 + ((seed + index * 11) % 24) / 100),
      0.01,
      0.25
    );
    const conversions = Math.max(0, Math.round(clicks * dayCvRate));
    return {
      label,
      impressions,
      clicks,
      conversions,
    };
  });

  const channels = [
    { label: "TikTok", weight: 0.5 },
    { label: "Instagram", weight: 0.3 },
    { label: "YouTube", weight: 0.2 },
  ].map((channel, index) => {
    const channelWeight = channel.weight + (((seed >> (index + 1)) % 6) - 3) / 100;
    const normalizedWeight = clamp(channelWeight, 0.15, 0.7);
    const channelImpressions = Math.round(baseImpressions * normalizedWeight);
    const channelClicks = Math.round(clicks * normalizedWeight);
    const channelConversions = Math.round(conversions * normalizedWeight);
    const channelSpend = Math.round(spend * normalizedWeight);
    return {
      label: channel.label,
      spend: channelSpend,
      impressions: channelImpressions,
      clicks: channelClicks,
      conversions: channelConversions,
    };
  });

  return {
    campaignId: campaign.id,
    period,
    generatedAt: new Date().toISOString(),
    totals: {
      impressions: baseImpressions,
      clicks,
      conversions,
      spend,
      revenue,
      ctr,
      conversionRate,
      roas,
    },
    series,
    channels,
  };
};

export const fakeApi = {
  async listCampaigns(): Promise<Campaign[]> {
    await randomDelay();
    const db = finalizeFlowTasksIfReady(finalizeGenerationIfReady());
    return db.campaigns
      .map((campaign) => ensureJourney(campaign))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getCampaign(campaignId: string): Promise<Campaign | null> {
    await randomDelay();
    const db = finalizeFlowTasksIfReady(finalizeGenerationIfReady());
    const campaign = db.campaigns.find((item) => item.id === campaignId);
    return campaign ? ensureJourney(campaign) : null;
  },

  async createCampaign({
    name,
    description,
  }: {
    name: string;
    description?: string;
  }): Promise<Campaign> {
    await randomDelay();
    const campaign: Campaign = {
      id: generateId(),
      name,
      description: description?.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: "collecting_assets",
      currentStep: 1,
      assetIds: [],
      consult: null,
      generation: {
        progress: 0,
      },
      videoIds: [],
      sharing: {
        tiktok: "not_started",
      },
      journey: defaultJourneyState(),
    };

    updateDatabase((db) => ({
      ...db,
      campaigns: [campaign, ...db.campaigns],
    }));

    return ensureJourney(campaign);
  },

  async addAssets(campaignId: string, files: File[]): Promise<Campaign> {
    await randomDelay();
    const createdAssets: Asset[] = files.map((file) => ({
      id: generateId(),
      fileName: file.name,
      size: file.size,
      createdAt: new Date().toISOString(),
    }));

    const nextDb = updateDatabase((db) => {
      const campaigns = db.campaigns.map((campaign) => {
        if (campaign.id !== campaignId) {
          return campaign;
        }
        return {
          ...campaign,
          status: "consulting",
          currentStep: 2,
          assetIds: [...campaign.assetIds, ...createdAssets.map((asset) => asset.id)],
        } satisfies Campaign;
      });

      return {
        ...db,
        campaigns,
        assets: [...db.assets, ...createdAssets],
      };
    });

    const campaign = nextDb.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    return campaign;
  },

  async saveConsult(campaignId: string, consultPayload: ConsultPayload): Promise<Campaign> {
    await randomDelay();
    const nextDb = updateDatabase((db) => ({
      ...db,
      campaigns: db.campaigns.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              consult: consultPayload,
              status: "generating",
              currentStep: 3,
            }
          : campaign
      ),
    }));

    const campaign = nextDb.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    return campaign;
  },

  async startGeneration(campaignId: string): Promise<Campaign> {
    await randomDelay(80, 180);
    const now = new Date().toISOString();

    const nextDb = updateDatabase((db) => ({
      ...db,
      campaigns: db.campaigns.map((campaign) => {
        if (campaign.id !== campaignId) {
          return campaign;
        }
        if (campaign.generation.startedAt) {
          return campaign;
        }
        return {
          ...campaign,
          status: "generating",
          currentStep: 3,
          generation: {
            progress: 0,
            startedAt: now,
          },
        };
      }),
    }));

    const db = finalizeGenerationIfReady(nextDb);
    const campaign = db.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error("Campaign not found.");
    }
    return campaign;
  },

  async pollCampaign(campaignId: string): Promise<Campaign | null> {
    await randomDelay(70, 150);
    const db = finalizeFlowTasksIfReady(finalizeGenerationIfReady());
    return db.campaigns.find((campaign) => campaign.id === campaignId) ?? null;
  },

  async listAssets(campaignId: string): Promise<Asset[]> {
    await randomDelay();
    const db = loadDatabase();
    const campaign = db.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      return [];
    }
    return db.assets.filter((asset) => campaign.assetIds.includes(asset.id));
  },

  async listVideos(campaignId: string): Promise<Video[]> {
    await randomDelay();
    const db = finalizeFlowTasksIfReady(finalizeGenerationIfReady());
    return db.videos.filter((video) => video.campaignId === campaignId);
  },

  async getVideo(videoId: string): Promise<Video | null> {
    await randomDelay();
    const db = loadDatabase();
    return db.videos.find((video) => video.id === videoId) ?? null;
  },

  async startTikTokShare(campaignId: string): Promise<Campaign> {
    await randomDelay(80, 120);
    const nextDb = updateDatabase((db) => ({
      ...db,
      campaigns: db.campaigns.map((campaign) => {
        if (campaign.id !== campaignId) {
          return campaign;
        }
        if (campaign.sharing.tiktok === "shared") {
          return campaign;
        }
        return {
          ...campaign,
          sharing: {
            tiktok: "sharing",
          },
        };
      }),
    }));

    setTimeout(() => {
      updateDatabase((db) => ({
        ...db,
        campaigns: db.campaigns.map((campaign) =>
          campaign.id === campaignId
            ? {
                ...campaign,
                sharing: {
                  tiktok: "shared",
                  sharedAt: new Date().toISOString(),
                },
              }
            : campaign
        ),
      }));
    }, 1500);

    const campaign = nextDb.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    return campaign;
  },

  async saveFlowStep1Intake(
    campaignId: string,
    payload: { productDescription: string; productLink?: string }
  ): Promise<Campaign> {
    await randomDelay(250, 500);
    return updateCampaignInDb(campaignId, (campaign) => ({
      ...campaign,
      consult: {
        productDescription: payload.productDescription.trim(),
        targetAudience: campaign.consult?.targetAudience ?? "",
        goal: campaign.consult?.goal ?? "sales",
        tone: campaign.consult?.tone ?? "friendly",
        keyPoints: campaign.consult?.keyPoints ?? [],
      },
      status: "consulting",
      currentStep: 2,
      journey: {
        ...ensureJourney(campaign).journey!,
        phase: "consult",
        flowStep: 2,
        productLink: payload.productLink?.trim(),
        taskProgress: 0,
        taskStatusMessage: "Intake saved. Ready for agentic consult.",
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  async startFlowStep2Consult(
    campaignId: string,
    answers: {
      audienceDetails: string;
      budgetRange: string;
      timeline: string;
      constraints: string;
      goal: ConsultPayload["goal"];
      tone: ConsultPayload["tone"];
      keyPoints: string[];
    }
  ): Promise<Campaign> {
    await randomDelay(180, 300);
    return updateCampaignInDb(campaignId, (campaign) => ({
      ...campaign,
      consult: {
        productDescription: campaign.consult?.productDescription ?? "",
        targetAudience: answers.audienceDetails,
        goal: answers.goal,
        tone: answers.tone,
        keyPoints: answers.keyPoints,
      },
      journey: {
        ...ensureJourney(campaign).journey!,
        phase: "consult",
        flowStep: 2,
        consultAnswers: {
          audienceDetails: answers.audienceDetails,
          budgetRange: answers.budgetRange,
          timeline: answers.timeline,
          constraints: answers.constraints,
        },
        activeTask: "consult",
        taskStartedAt: new Date().toISOString(),
        taskProgress: 0,
        taskStatusMessage: "AI agent is analyzing your consult answers...",
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  async saveFlowConsultInputs(
    campaignId: string,
    answers: {
      audienceDetails: string;
      budgetRange: string;
      timeline: string;
      constraints: string;
      goal: ConsultPayload["goal"];
      tone: ConsultPayload["tone"];
      keyPoints: string[];
    }
  ): Promise<Campaign> {
    await randomDelay(160, 280);
    return updateCampaignInDb(campaignId, (campaign) => ({
      ...campaign,
      consult: {
        productDescription: campaign.consult?.productDescription ?? "",
        targetAudience: answers.audienceDetails,
        goal: answers.goal,
        tone: answers.tone,
        keyPoints: answers.keyPoints,
      },
      journey: {
        ...ensureJourney(campaign).journey!,
        phase: "consult",
        flowStep: 2,
        consultAnswers: {
          audienceDetails: answers.audienceDetails,
          budgetRange: answers.budgetRange,
          timeline: answers.timeline,
          constraints: answers.constraints,
        },
        activeTask: null,
        taskStartedAt: undefined,
        taskProgress: 0,
        taskStatusMessage: "Consult inputs captured. Review clarifying questions to finalize details.",
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  async getFlowClarifyingQuestions(campaignId: string): Promise<{
    questions: ClarifyingQuestion[];
    answers: Record<string, string>;
  }> {
    await randomDelay(220, 420);
    const db = finalizeFlowTasksIfReady(finalizeGenerationIfReady());
    const campaign = db.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    const withJourney = ensureJourney(campaign);
    return {
      questions: createClarifyingQuestions(withJourney),
      answers: withJourney.journey?.clarifyingAnswers ?? {},
    };
  },

  async saveFlowClarifyingAnswer(
    campaignId: string,
    payload: { questionId: string; answer: string }
  ): Promise<Campaign> {
    await randomDelay(140, 260);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      return {
        ...campaign,
        journey: {
          ...journey,
          clarifyingAnswers: {
            ...(journey.clarifyingAnswers ?? {}),
            [payload.questionId]: payload.answer.trim(),
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  async startFlowStep3Research(campaignId: string): Promise<Campaign> {
    await randomDelay(150, 260);
    return updateCampaignInDb(campaignId, (campaign) => ({
      ...campaign,
      journey: {
        ...ensureJourney(campaign).journey!,
        phase: "research",
        flowStep: 3,
        activeTask: "research",
        taskStartedAt: new Date().toISOString(),
        taskProgress: 0,
        taskStatusMessage: "AI research in progress. Gathering market and audience insights...",
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  async startFlowStep4Posting(campaignId: string): Promise<Campaign> {
    await randomDelay(150, 260);
    return updateCampaignInDb(campaignId, (campaign) => ({
      ...campaign,
      journey: {
        ...ensureJourney(campaign).journey!,
        phase: "generation",
        flowStep: 4,
        activeTask: "posting",
        taskStartedAt: new Date().toISOString(),
        taskProgress: 0,
        taskStatusMessage: "AI is posting generated assets...",
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  async pollFlowStep(campaignId: string): Promise<Campaign | null> {
    await randomDelay(100, 180);
    const db = finalizeFlowTasksIfReady(finalizeGenerationIfReady());
    const campaign = db.campaigns.find((item) => item.id === campaignId);
    return campaign ? ensureJourney(campaign) : null;
  },

  async saveJourneyInput(
    campaignId: string,
    payload: { productDescription: string; productLink?: string }
  ): Promise<Campaign> {
    await randomDelay(250, 500);
    return updateCampaignInDb(campaignId, (campaign) => ({
      ...campaign,
      journey: {
        ...ensureJourney(campaign).journey!,
        phase: "consult",
        productLink: payload.productLink?.trim(),
        updatedAt: new Date().toISOString(),
      },
      consult: {
        productDescription: payload.productDescription,
        targetAudience: campaign.consult?.targetAudience ?? "",
        goal: campaign.consult?.goal ?? "sales",
        tone: campaign.consult?.tone ?? "friendly",
        keyPoints: campaign.consult?.keyPoints ?? [],
      },
      status: "consulting",
      currentStep: 2,
    }));
  },

  async runAgenticResearch(campaignId: string): Promise<Campaign> {
    await randomDelay(900, 1400);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      const researchSummary = [
        "Audience segment with highest conversion is mobile-first shoppers aged 24-38.",
        "Top-performing delivery windows are weekday evenings and Sunday afternoons.",
        "Seasonal trend suggests urgency messaging before upcoming holiday period.",
      ];
      return {
        ...campaign,
        journey: {
          ...journey,
          phase: "strategy",
          researchSummary,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  async developStrategy(campaignId: string): Promise<Campaign> {
    await randomDelay(800, 1200);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      const strategySummary = [
        "Primary channel mix: TikTok short-form + retargeting creatives.",
        "Creative angle: problem/solution hook in first 2 seconds.",
        "Bid strategy: optimize for qualified clicks in first 72 hours.",
      ];
      return {
        ...campaign,
        journey: {
          ...journey,
          phase: "generation",
          strategySummary,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  async generateJourneyAssets(campaignId: string): Promise<Campaign> {
    await randomDelay(1100, 1700);
    const nextDb = updateDatabase((db) => {
      let generatedVideoIds: string[] = [];
      let generatedVideos: Video[] = [];

      const campaigns = db.campaigns.map((campaign) => {
        if (campaign.id !== campaignId) {
          return campaign;
        }
        const withJourney = ensureJourney(campaign);
        if (withJourney.videoIds.length === 0) {
          generatedVideos = createDummyVideos(withJourney);
          generatedVideoIds = generatedVideos.map((video) => video.id);
        }
        const finalVideoIds =
          withJourney.videoIds.length > 0 ? withJourney.videoIds : generatedVideoIds;

        return {
          ...withJourney,
          status: "done",
          currentStep: 4,
          videoIds: finalVideoIds,
          generation: {
            ...withJourney.generation,
            progress: 100,
            startedAt: withJourney.generation.startedAt ?? new Date().toISOString(),
            finishedAt: new Date().toISOString(),
          },
          journey: {
            ...withJourney.journey!,
            phase: "review",
            generatedAssets: {
              videos: Math.max(finalVideoIds.length, 1),
              graphics: 4,
              captions: 6,
            },
            updatedAt: new Date().toISOString(),
          },
        } satisfies Campaign;
      });

      return {
        ...db,
        campaigns,
        videos: generatedVideos.length > 0 ? [...db.videos, ...generatedVideos] : db.videos,
      };
    });

    const campaign = nextDb.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error("Campaign not found.");
    }
    return ensureJourney(campaign);
  },

  async submitHumanFeedback(
    campaignId: string,
    payload: { approved: boolean; note?: string }
  ): Promise<Campaign> {
    await randomDelay(250, 500);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      const feedbackLoops = payload.approved ? journey.feedbackLoops : journey.feedbackLoops + 1;
      const phase =
        payload.approved || feedbackLoops >= journey.maxFeedbackLoops ? "launch_ready" : "generation";
      return {
        ...campaign,
        journey: {
          ...journey,
          approved: payload.approved || feedbackLoops >= journey.maxFeedbackLoops,
          feedbackLoops,
          lastFeedbackNote: payload.note?.trim(),
          phase,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  async launchJourneyCampaign(campaignId: string): Promise<Campaign> {
    await randomDelay(500, 900);
    const campaign = updateCampaignInDb(campaignId, (current) => ({
      ...current,
      journey: {
        ...ensureJourney(current).journey!,
        phase: "launched",
        updatedAt: new Date().toISOString(),
      },
    }));
    await this.startTikTokShare(campaignId);
    return campaign;
  },

  async refreshJourneyPerformance(campaignId: string): Promise<Campaign> {
    await randomDelay(800, 1200);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      const impressions = 12000 + Math.floor(Math.random() * 9000);
      const clicks = Math.floor(impressions * (0.02 + Math.random() * 0.03));
      const sales = Math.floor(clicks * (0.05 + Math.random() * 0.07));
      return {
        ...campaign,
        journey: {
          ...journey,
          phase: "complete",
          metrics: {
            impressions,
            clicks,
            sales,
          },
          evaluation:
            "Performance is trending above baseline. Continue current strategy and iterate hook/caption variants weekly.",
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  async getCampaignPerformance(campaignId: string): Promise<CampaignPerformance> {
    const period = "7d";
    await randomDelay(280, 520);
    const db = finalizeFlowTasksIfReady(finalizeGenerationIfReady());
    const campaign = db.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error("Campaign not found.");
    }
    return createCampaignPerformance(ensureJourney(campaign), period);
  },

  async getCampaignPerformanceByPeriod(
    campaignId: string,
    period: PerformancePeriod
  ): Promise<CampaignPerformance> {
    await randomDelay(280, 520);
    const db = finalizeFlowTasksIfReady(finalizeGenerationIfReady());
    const campaign = db.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error("Campaign not found.");
    }
    return createCampaignPerformance(ensureJourney(campaign), period);
  },

  async updateJourneyApproval(
    campaignId: string,
    approvalType: ApprovalKey,
    approved: boolean
  ): Promise<Campaign> {
    await randomDelay(140, 260);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      return {
        ...campaign,
        journey: {
          ...journey,
          approvals: {
            ...journey.approvals,
            [approvalType]: approved,
            updatedAt: new Date().toISOString(),
          },
          approvalDecisions: {
            ...normalizeApprovalDecisions(journey.approvalDecisions),
            [approvalType]: approved ? "approved" : "pending",
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  async saveJourneyApprovalFeedback(
    campaignId: string,
    approvalType: ApprovalKey,
    feedback: string
  ): Promise<Campaign> {
    await randomDelay(140, 260);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      return {
        ...campaign,
        journey: {
          ...journey,
          approvalFeedback: {
            ...(journey.approvalFeedback ?? {}),
            [approvalType]: feedback.trim(),
          },
          approvalDecisions: {
            ...normalizeApprovalDecisions(journey.approvalDecisions),
            [approvalType]: "declined",
          },
          approvals: {
            ...journey.approvals,
            [approvalType]: false,
            updatedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  async declineJourneyApproval(campaignId: string, approvalType: ApprovalKey): Promise<Campaign> {
    await randomDelay(140, 260);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      return {
        ...campaign,
        journey: {
          ...journey,
          approvals: {
            ...journey.approvals,
            [approvalType]: false,
            updatedAt: new Date().toISOString(),
          },
          approvalDecisions: {
            ...normalizeApprovalDecisions(journey.approvalDecisions),
            [approvalType]: "declined",
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  async removeJourneyApprovalFeedback(
    campaignId: string,
    approvalType: ApprovalKey
  ): Promise<Campaign> {
    await randomDelay(140, 260);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      const nextFeedback = { ...(journey.approvalFeedback ?? {}) };
      delete nextFeedback[approvalType];

      return {
        ...campaign,
        journey: {
          ...journey,
          approvalFeedback: nextFeedback,
          approvalDecisions: {
            ...normalizeApprovalDecisions(journey.approvalDecisions),
            [approvalType]: "pending",
          },
          approvals: {
            ...journey.approvals,
            [approvalType]: false,
            updatedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  async submitJourneyApprovals(campaignId: string): Promise<Campaign> {
    await randomDelay(260, 520);
    return updateCampaignInDb(campaignId, (campaign) => {
      const journey = ensureJourney(campaign).journey!;
      const decisions = normalizeApprovalDecisions(journey.approvalDecisions);
      const submittedAt = new Date().toISOString();
      const nextHistory = { ...(journey.approvalHistory ?? {}) };

      approvalKeys.forEach((key) => {
        const decision = decisions[key];
        if (decision === "pending") {
          return;
        }
        const savedFeedback = journey.approvalFeedback?.[key]?.trim();
        nextHistory[key] = {
          decision: decision as FinalApprovalDecision,
          feedback: savedFeedback || undefined,
          submittedAt,
        };
      });

      return {
        ...campaign,
        journey: {
          ...journey,
          approvals: {
            ...defaultApprovalsState(),
            updatedAt: submittedAt,
          },
          approvalFeedback: {},
          approvalDecisions: defaultApprovalDecisionsState(),
          approvalHistory: nextHistory,
          updatedAt: submittedAt,
        },
      };
    });
  },
};
