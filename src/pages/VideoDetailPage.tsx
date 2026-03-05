import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign, Video } from "../types";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLayout from "../components/PageLayout";

const VideoDetailPage = () => {
  const { videoId } = useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!videoId) {
      return;
    }

    fakeApi
      .getVideo(videoId)
      .then(async (videoData) => {
        setVideo(videoData);
        if (videoData) {
          const campaignData = await fakeApi.getCampaign(videoData.campaignId);
          setCampaign(campaignData);
        }
      })
      .finally(() => setLoading(false));
  }, [videoId]);

  if (loading) {
    return (
      <div className="row">
        <LoadingSpinner />
        <span>Loading video...</span>
      </div>
    );
  }

  if (!video) {
    return (
      <Card>
        <p>Video not found.</p>
        <Link to="/campaigns">Back to campaigns</Link>
      </Card>
    );
  }

  return (
    <PageLayout title={video.title}>
      <Card>
        <div className="stack">
          <div className="player">
            {video.posterUrl ? <img src={video.posterUrl} alt={video.title} /> : null}
            <Button onClick={() => setPlaying((prev) => !prev)}>
              {playing ? "Pause" : "Play"}
            </Button>
            <span className="muted">{playing ? "Playing..." : "Paused"}</span>
          </div>

          <p>
            <strong>Script preview:</strong> {video.scriptPreview}
          </p>
          <p>
            <strong>Caption:</strong> {video.caption}
          </p>
          <p>
            <strong>Hashtags:</strong> #{video.hashtags.join(" #")}
          </p>

          {campaign ? (
            <Link to={`/campaigns/${campaign.id}/step/4`}>Back to campaign results</Link>
          ) : (
            <Link to="/campaigns">Back to campaigns</Link>
          )}
        </div>
      </Card>
    </PageLayout>
  );
};

export default VideoDetailPage;
