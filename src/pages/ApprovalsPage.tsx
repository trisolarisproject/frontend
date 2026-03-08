import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLayout from "../components/PageLayout";
import type { Campaign } from "../types";

type ApprovalKey = "strategy" | "deliveryMethod" | "storyboard";

const approvalLabels: Record<ApprovalKey, string> = {
  strategy: "Strategy",
  deliveryMethod: "Delivery Method",
  storyboard: "Storyboard",
};

const approvalKeys: ApprovalKey[] = ["strategy", "deliveryMethod", "storyboard"];

const getPendingApprovals = (campaign: Campaign): ApprovalKey[] => {
  const approvals = campaign.journey?.approvals;
  const approvalHistory = campaign.journey?.approvalHistory;
  if (!approvals) {
    return approvalKeys;
  }

  return approvalKeys.filter((key) => !approvals[key] && !approvalHistory?.[key]);
};

const ApprovalsPage = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fakeApi
      .listCampaigns()
      .then(setCampaigns)
      .finally(() => setLoading(false));
  }, []);

  const pendingCampaigns = useMemo(
    () =>
      campaigns
        .map((campaign) => ({ campaign, pending: getPendingApprovals(campaign) }))
        .filter((item) => item.pending.length > 0),
    [campaigns]
  );

  return (
    <PageLayout
      title="Pending Approvals"
      subtitle="Campaigns that still need approval to proceed."
    >
      {loading ? (
        <div className="row">
          <LoadingSpinner />
          <span>Loading approvals...</span>
        </div>
      ) : pendingCampaigns.length === 0 ? (
        <Card>
          <p>Nothing pending right now.</p>
          <p>All campaign strategy, delivery method, and storyboard items are approved.</p>
        </Card>
      ) : (
        <div className="stack">
          {pendingCampaigns.map(({ campaign, pending }) => (
            <Link
              key={campaign.id}
              className="approvals-card-link"
              to={`/campaigns/${campaign.id}/approvals`}
              aria-label={`Open approvals for ${campaign.name}`}
            >
              <Card>
                <div className="stack-sm">
                  <strong>{campaign.name}</strong>
                  <span className="muted">
                    Created: {new Date(campaign.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="approvals-status-row">
                  {pending.map((key) => (
                    <Badge key={key} tone="warning">
                      Pending: {approvalLabels[key]}
                    </Badge>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default ApprovalsPage;
