import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign } from "../types";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const statusToneMap: Record<Campaign["status"], "neutral" | "success" | "warning"> = {
  draft: "neutral",
  collecting_assets: "warning",
  consulting: "warning",
  generating: "warning",
  done: "success",
  failed: "warning",
};

const flowPathByStep: Record<1 | 2 | 3 | 4, string> = {
  1: "asset-intake",
  2: "consult-intake",
  3: "research",
  4: "asset-posting",
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
    <div className="stack">
      <div className="stack-sm">
        <h1>Campaigns</h1>
        <p className="muted">Manage your campaigns and resume any step in the flow.</p>
      </div>

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
                    to={`/campaigns/${campaign.id}/flow/${
                      flowPathByStep[campaign.journey?.flowStep ?? 1]
                    }`}
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
    </div>
  );
};

export default CampaignListPage;
