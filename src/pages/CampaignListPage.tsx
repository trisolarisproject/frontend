import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign } from "../types";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLayout from "../components/PageLayout";

const statusToneMap: Record<Campaign["status"], "neutral" | "success" | "warning"> = {
  draft: "neutral",
  collecting_assets: "warning",
  consulting: "warning",
  generating: "warning",
  done: "success",
  failed: "warning",
};

const flowPathByStep: Record<1 | 2 | 3 | 4, string> = {
  1: "upload-assets",
  2: "consult-intake",
  3: "research",
  4: "asset-posting",
};

const getResumeFlowPath = (campaign: Campaign): string => {
  const journey = campaign.journey;
  const flowStep = journey?.flowStep ?? 1;

  if (flowStep === 2) {
    if (journey?.activeTask === "consult") {
      return "consult-status";
    }
    if (journey?.consultAnswers) {
      return "consult-chat";
    }
  }

  return flowPathByStep[flowStep];
};

const CampaignListPage = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fakeApi
      .listCampaigns()
      .then(setCampaigns)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout title="Campaigns" subtitle="Manage your campaigns and resume any step in the flow.">
      {loading ? (
        <div className="row">
          <LoadingSpinner />
          <span>Loading campaigns...</span>
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <p>No campaigns yet.</p>
          <p>Create your first one from the sidebar to begin the 4-step flow.</p>
        </Card>
      ) : (
        <div className="stack">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <div className="row row-between row-wrap">
                <div className="stack-sm">
                  <Link
                    to={`/campaigns/${campaign.id}/flow/${getResumeFlowPath(campaign)}`}
                  >
                    <strong>{campaign.name}</strong>
                  </Link>
                  <span className="muted">
                    Created: {new Date(campaign.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="row">
                  <Badge tone={statusToneMap[campaign.status]}>{campaign.status}</Badge>
                  <Badge>Step {campaign.journey?.flowStep ?? 1}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default CampaignListPage;
