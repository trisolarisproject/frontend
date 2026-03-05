import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign, Video } from "../types";
import { useInterval } from "../hooks/useInterval";
import Stepper from "../components/Stepper";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Banner from "../components/ui/Banner";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const Step4ResultsPage = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    Promise.all([fakeApi.getCampaign(id), fakeApi.listVideos(id)])
      .then(async ([campaignData, videosData]) => {
        setCampaign(campaignData);
        setVideos(videosData);

        if (campaignData && campaignData.sharing.tiktok === "not_started") {
          const next = await fakeApi.startTikTokShare(id);
          setCampaign(next);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const refresh = useCallback(async () => {
    if (!id) {
      return;
    }

    const latestCampaign = await fakeApi.pollCampaign(id);
    setCampaign(latestCampaign);
  }, [id]);

  useInterval(() => {
    if (campaign?.sharing.tiktok === "sharing") {
      void refresh();
    }
  }, campaign?.sharing.tiktok === "sharing" ? 600 : null);

  if (loading) {
    return (
      <div className="row">
        <LoadingSpinner />
        <span>Loading results...</span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <Card>
        <p>Campaign not found.</p>
        <Link to="/campaigns">Back to campaigns</Link>
      </Card>
    );
  }

  return (
    <div className="stack">
      <h1>{campaign.name}</h1>
      <Stepper currentStep={4} />

      {campaign.sharing.tiktok === "sharing" ? (
        <Banner>Sharing to TikTok...</Banner>
      ) : campaign.sharing.tiktok === "shared" ? (
        <Banner kind="success">Shared to TikTok automatically ?</Banner>
      ) : null}

      <h2>Step 4: Results</h2>
      {videos.length === 0 ? (
        <Card>
          <p>No videos generated yet.</p>
        </Card>
      ) : (
        <div className="grid cards-grid">
          {videos.map((video) => (
            <Card key={video.id}>
              <div className="stack-sm">
                <div className="poster">
                  {video.posterUrl ? (
                    <img src={video.posterUrl} alt={video.title} />
                  ) : (
                    <div className="poster-placeholder" />
                  )}
                </div>
                <h3>{video.title}</h3>
                <p>{video.scriptPreview}</p>
                <p className="muted">{video.caption}</p>
                <p className="muted">#{video.hashtags.join(" #")}</p>
                <Link to={`/videos/${video.id}`}>
                  <Button variant="secondary">Preview</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Step4ResultsPage;