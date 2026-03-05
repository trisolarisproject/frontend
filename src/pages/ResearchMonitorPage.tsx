import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign } from "../types";
import { useInterval } from "../hooks/useInterval";
import Banner from "../components/ui/Banner";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ProgressBar from "../components/ui/ProgressBar";
import PageLayout from "../components/PageLayout";

const ResearchMonitorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    fakeApi
      .getCampaign(id)
      .then(async (campaignData) => {
        setCampaign(campaignData);
        if (!campaignData) {
          return;
        }
        const flowStep = campaignData.journey?.flowStep ?? 1;
        if (flowStep === 3 && campaignData.journey?.activeTask !== "research") {
          const next = await fakeApi.startFlowStep3Research(id);
          setCampaign(next);
        }
      })
      .catch(() => setError("Unable to load research monitor."))
      .finally(() => setLoading(false));
  }, [id]);

  useInterval(() => {
    if (!id) {
      return;
    }
    void fakeApi.pollFlowStep(id).then((next) => {
      if (!next) {
        return;
      }
      setCampaign(next);
      if ((next.journey?.flowStep ?? 1) > 3) {
        navigate(`/campaigns/${id}/flow/asset-posting`, { replace: true });
      }
    });
  }, campaign?.journey?.activeTask === "research" ? 700 : null);

  if (loading) {
    return (
      <div className="row">
        <LoadingSpinner />
        <span>Loading research monitor...</span>
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
  if (flowStep < 3) {
    return (
      <Card>
        <p>Complete prior flow stages first.</p>
        <Link to={`/campaigns/${campaign.id}/flow/consult-intake`}>Go to consult intake</Link>
      </Card>
    );
  }

  const progress = campaign.journey?.activeTask === "research" ? campaign.journey?.taskProgress ?? 0 : flowStep > 3 ? 100 : 0;

  return (
    <PageLayout
      title="AI Research"
      subtitle="The AI researches trends, audience behavior, and context. You just watch."
    >
      {error ? <Banner kind="error">{error}</Banner> : null}
      <Card>
        <p className="muted">{campaign.journey?.taskStatusMessage ?? "Starting AI research..."}</p>
        <ProgressBar value={progress} />
        <p className="muted">{progress}%</p>
      </Card>
      {campaign.journey?.researchSummary.length ? (
        <Card>
          <h2>Research Findings</h2>
          <ul className="list">
            {campaign.journey.researchSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </PageLayout>
  );
};

export default ResearchMonitorPage;
