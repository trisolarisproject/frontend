import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign, Video } from "../types";
import { useInterval } from "../hooks/useInterval";
import Banner from "../components/ui/Banner";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ProgressBar from "../components/ui/ProgressBar";

const AssetPostingPage = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    Promise.all([fakeApi.getCampaign(id), fakeApi.listVideos(id)])
      .then(async ([campaignData, videosData]) => {
        setCampaign(campaignData);
        setVideos(videosData);
        const flowStep = campaignData?.journey?.flowStep ?? 1;
        const isComplete = campaignData?.journey?.phase === "complete";
        if (flowStep === 4 && !isComplete && campaignData?.journey?.activeTask !== "posting") {
          const next = await fakeApi.startFlowStep4Posting(id);
          setCampaign(next);
        }
      })
      .catch(() => setError("Unable to load asset posting."))
      .finally(() => setLoading(false));
  }, [id]);

  useInterval(() => {
    if (!id) {
      return;
    }
    void fakeApi.pollFlowStep(id).then(async (next) => {
      if (!next) {
        return;
      }
      setCampaign(next);
      if (next.journey?.phase === "complete") {
        const nextVideos = await fakeApi.listVideos(id);
        setVideos(nextVideos);
      }
    });
  }, campaign?.journey?.activeTask === "posting" ? 700 : null);

  if (loading) {
    return (
      <div className="row">
        <LoadingSpinner />
        <span>Loading asset posting...</span>
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

  const flowStep = campaign.journey?.flowStep ?? 1;
  if (flowStep < 4) {
    return (
      <Card>
        <p>Complete prior flow stages first.</p>
        <Link to={`/campaigns/${campaign.id}/flow/research`}>Go to AI research</Link>
      </Card>
    );
  }

  const isComplete = campaign.journey?.phase === "complete";
  const progress = campaign.journey?.activeTask === "posting" ? campaign.journey?.taskProgress ?? 0 : isComplete ? 100 : 0;

  return (
    <div className="stack">
      <h1>AI Asset Posting</h1>
      <p className="muted">AI is posting generated assets to destination channels.</p>
      {error ? <Banner kind="error">{error}</Banner> : null}
      <Card>
        <p className="muted">{campaign.journey?.taskStatusMessage ?? "Starting asset posting..."}</p>
        <ProgressBar value={progress} />
        <p className="muted">{progress}%</p>
      </Card>

      {isComplete ? (
        <Banner kind="success">Posting complete. Assets are live and shared.</Banner>
      ) : (
        <Banner>Posting in progress...</Banner>
      )}

      <Card>
        <h2>Generated Videos</h2>
        {videos.length === 0 ? (
          <p className="muted">No videos available yet.</p>
        ) : (
          <div className="grid cards-grid">
            {videos.map((video) => (
              <Card key={video.id}>
                <h3>{video.title}</h3>
                <p>{video.caption}</p>
                <Link to={`/videos/${video.id}`}>
                  <Button variant="secondary">Preview</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AssetPostingPage;
