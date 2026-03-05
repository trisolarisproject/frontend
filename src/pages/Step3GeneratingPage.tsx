import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign } from "../types";
import { useInterval } from "../hooks/useInterval";
import Stepper from "../components/Stepper";
import Card from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const Step3GeneratingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    fakeApi
      .getCampaign(id)
      .then(async (campaignData) => {
        if (!campaignData) {
          setCampaign(null);
          return;
        }

        setCampaign(campaignData);

        if (!campaignData.generation.startedAt) {
          const started = await fakeApi.startGeneration(id);
          setCampaign(started);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const poll = useCallback(async () => {
    if (!id) {
      return;
    }

    const latest = await fakeApi.pollCampaign(id);
    if (!latest) {
      return;
    }

    setCampaign(latest);
    if (latest.status === "done") {
      navigate(`/campaigns/${id}/step/4`, { replace: true });
    }
  }, [id, navigate]);

  useInterval(() => {
    void poll();
  }, id ? 700 : null);

  if (loading) {
    return (
      <div className="row">
        <LoadingSpinner />
        <span>Preparing generation...</span>
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
      <Stepper currentStep={3} />
      <Card>
        <h2>Step 3: Generating...</h2>
        <p>Generating... (wait ~3 seconds)</p>
        <ProgressBar value={campaign.generation.progress} />
        <p className="muted">{campaign.generation.progress}% complete</p>
      </Card>
    </div>
  );
};

export default Step3GeneratingPage;