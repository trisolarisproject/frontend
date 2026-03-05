import type { Asset, Campaign, ConsultPayload, Video } from "../types";
import { loadDatabase, saveDatabase, updateDatabase } from "../store/storage";
import { generateId } from "../utils/id";

const randomDelay = (min = 180, max = 420): Promise<void> => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const GENERATION_MS = 3000;
const TICK_MS = 300;

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

import type { AppDatabase } from "../types";

export const fakeApi = {
  async listCampaigns(): Promise<Campaign[]> {
    await randomDelay();
    const db = finalizeGenerationIfReady();
    return db.campaigns.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getCampaign(campaignId: string): Promise<Campaign | null> {
    await randomDelay();
    const db = finalizeGenerationIfReady();
    return db.campaigns.find((campaign) => campaign.id === campaignId) ?? null;
  },

  async createCampaign({ name }: { name: string }): Promise<Campaign> {
    await randomDelay();
    const campaign: Campaign = {
      id: generateId(),
      name,
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
    };

    updateDatabase((db) => ({
      ...db,
      campaigns: [campaign, ...db.campaigns],
    }));

    return campaign;
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
    const db = finalizeGenerationIfReady();
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
    const db = finalizeGenerationIfReady();
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
};