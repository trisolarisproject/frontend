import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Asset, Campaign, Video } from "../types";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLayout from "../components/PageLayout";

interface CampaignAssetBucket {
  campaign: Campaign;
  uploadedAssets: Asset[];
  generatedAssets: Video[];
}

type SortOrder = "recent" | "oldest";
type TimeRange = "all" | "3m" | "1m" | "2w" | "1w";

const toTimestamp = (value: string | undefined) => {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getRangeThreshold = (range: TimeRange) => {
  if (range === "all") {
    return null;
  }
  const now = new Date();
  if (range === "3m") {
    now.setMonth(now.getMonth() - 3);
    return now.getTime();
  }
  if (range === "1m") {
    now.setMonth(now.getMonth() - 1);
    return now.getTime();
  }
  if (range === "2w") {
    return now.getTime() - 14 * 24 * 60 * 60 * 1000;
  }
  return now.getTime() - 7 * 24 * 60 * 60 * 1000;
};

const CampaignAssetsPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const highlightedCampaignId = searchParams.get("campaignId");
  const [buckets, setBuckets] = useState<CampaignAssetBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (id) {
          const campaign = await fakeApi.getCampaign(id);
          if (!campaign) {
            setBuckets([]);
            return;
          }
          const [uploadedAssets, generatedAssets] = await Promise.all([
            fakeApi.listAssets(campaign.id),
            fakeApi.listVideos(campaign.id),
          ]);
          setBuckets([{ campaign, uploadedAssets, generatedAssets }]);
          return;
        }

        const campaigns = await fakeApi.listCampaigns();
        const nextBuckets = await Promise.all(
          campaigns.map(async (campaign) => {
            const [uploadedAssets, generatedAssets] = await Promise.all([
              fakeApi.listAssets(campaign.id),
              fakeApi.listVideos(campaign.id),
            ]);
            return { campaign, uploadedAssets, generatedAssets };
          })
        );
        setBuckets(nextBuckets);
      } catch {
        setError("Unable to load campaign assets.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const visibleBuckets = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const threshold = getRangeThreshold(timeRange);

    const withMetadata = buckets.map((bucket) => {
      const latestTimestamp = Math.max(
        toTimestamp(bucket.campaign.createdAt),
        ...bucket.uploadedAssets.map((asset) => toTimestamp(asset.createdAt)),
        ...bucket.generatedAssets.map((video) => toTimestamp(video.createdAt))
      );
      return { ...bucket, latestTimestamp };
    });

    const filtered = withMetadata.filter((bucket) => {
      if (threshold !== null && bucket.latestTimestamp < threshold) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [
        bucket.campaign.name,
        bucket.campaign.id,
        ...bucket.uploadedAssets.map((asset) => asset.fileName),
        ...bucket.generatedAssets.map((video) => video.title),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    filtered.sort((a, b) =>
      sortOrder === "recent"
        ? b.latestTimestamp - a.latestTimestamp
        : a.latestTimestamp - b.latestTimestamp
    );

    if (highlightedCampaignId) {
      filtered.sort((a, b) => {
        if (a.campaign.id === highlightedCampaignId) {
          return -1;
        }
        if (b.campaign.id === highlightedCampaignId) {
          return 1;
        }
        return 0;
      });
    }

    return filtered;
  }, [buckets, highlightedCampaignId, searchTerm, sortOrder, timeRange]);

  if (loading) {
    return (
      <div className="row">
        <LoadingSpinner />
        <span>Loading campaign assets...</span>
      </div>
    );
  }

  return (
    <PageLayout
      title="Campaign Assets"
      subtitle="Uploaded and AI-generated assets, grouped by campaign."
    >
      {error ? <Card>{error}</Card> : null}

      <Card>
        <div className="row row-wrap">
          <div className="field" style={{ flex: "1 1 280px", minWidth: "240px" }}>
            <label className="field-label" htmlFor="campaign-assets-search">
              Search
            </label>
            <input
              id="campaign-assets-search"
              className="input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Campaign name, ID, or asset name"
            />
          </div>

          <div className="field" style={{ flex: "0 1 220px", minWidth: "180px" }}>
            <label className="field-label" htmlFor="campaign-assets-sort">
              Sort
            </label>
            <select
              id="campaign-assets-sort"
              className="input"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            >
              <option value="recent">Most recent</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <div className="field" style={{ flex: "0 1 220px", minWidth: "180px" }}>
            <label className="field-label" htmlFor="campaign-assets-range">
              Time range
            </label>
            <select
              id="campaign-assets-range"
              className="input"
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value as TimeRange)}
            >
              <option value="all">All time</option>
              <option value="3m">Last 3 months</option>
              <option value="1m">Last month</option>
              <option value="2w">Last 2 weeks</option>
              <option value="1w">Last week</option>
            </select>
          </div>
        </div>
      </Card>

      {visibleBuckets.length === 0 ? (
        <Card>
          <p>No results found.</p>
          <p className="muted">Try a broader search or a wider time range.</p>
        </Card>
      ) : (
        <div className="stack">
          {visibleBuckets.map(({ campaign, uploadedAssets, generatedAssets }) => (
            <Card key={campaign.id}>
              <div className="stack">
                <div className="row row-between row-wrap">
                  <div className="stack-sm">
                    <strong>{campaign.name}</strong>
                    <span className="muted">Campaign ID: {campaign.id}</span>
                  </div>
                  <Link to={`/campaigns/${campaign.id}/flow/consult-status`}>Open build page</Link>
                </div>

                <div className="stack-sm">
                  <h3>Uploaded assets</h3>
                  {uploadedAssets.length > 0 ? (
                    <ul className="list">
                      {uploadedAssets.map((asset) => (
                        <li key={asset.id}>
                          {asset.fileName} ({Math.round(asset.size / 1024)} KB)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">None</p>
                  )}
                </div>

                <div className="stack-sm">
                  <h3>Generated assets</h3>
                  {generatedAssets.length > 0 ? (
                    <ul className="list">
                      {generatedAssets.map((video) => (
                        <li key={video.id}>
                          <Link to={`/videos/${video.id}`}>{video.title}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">None</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default CampaignAssetsPage;
