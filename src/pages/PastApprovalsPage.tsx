import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLayout from "../components/PageLayout";
import type { ApprovalKey, Campaign } from "../types";

const approvalLabels: Record<ApprovalKey, string> = {
  strategy: "Strategy",
  deliveryMethod: "Delivery Method",
  storyboard: "Storyboard",
};

const approvalKeys: ApprovalKey[] = ["strategy", "deliveryMethod", "storyboard"];
const PastApprovalsPage = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fakeApi
      .listCampaigns()
      .then(setCampaigns)
      .finally(() => setLoading(false));
  }, []);

  const campaignsWithPastApprovals = useMemo(
    () =>
      campaigns
        .map((campaign) => {
          const history = campaign.journey?.approvalHistory ?? {};
          const entries = approvalKeys
            .map((key) => {
              const entry = history[key];
              if (!entry) {
                return null;
              }
              return {
                key,
                label: approvalLabels[key],
                decision: entry.decision,
                feedback: entry.feedback,
                submittedAt: entry.submittedAt,
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

          return {
            campaign,
            entries,
            latestSubmittedAt: entries[0]?.submittedAt,
          };
        })
        .filter((item) => item.entries.length > 0)
        .sort((a, b) => (b.latestSubmittedAt ?? "").localeCompare(a.latestSubmittedAt ?? "")),
    [campaigns]
  );

  return (
    <PageLayout
      title="Past Approvals"
      subtitle="Read-only history of submitted campaign approvals and declines."
    >
      {loading ? (
        <div className="row">
          <LoadingSpinner />
          <span>Loading past approvals...</span>
        </div>
      ) : campaignsWithPastApprovals.length === 0 ? (
        <Card>
          <p>No past approvals yet.</p>
          <p>Submitted approvals and declines will appear here once a campaign is submitted.</p>
        </Card>
      ) : (
        <div className="stack">
          {campaignsWithPastApprovals.map(({ campaign, entries, latestSubmittedAt }) => (
            <Link
              key={campaign.id}
              className="approvals-card-link"
              to={`/campaigns/${campaign.id}/past-approvals`}
              aria-label={`Open past approvals for ${campaign.name}`}
            >
              <Card>
                <div className="stack-sm">
                  <strong>{campaign.name}</strong>
                  <span className="muted">Campaign ID: {campaign.id}</span>
                  {latestSubmittedAt ? (
                    <span className="muted">
                      Last submitted: {new Date(latestSubmittedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                <div className="approvals-status-row">
                  {entries.map((entry) => (
                    <Badge key={entry.key} tone={entry.decision === "approved" ? "success" : "error"}>
                      {entry.label}: {entry.decision === "approved" ? "Approved" : "Declined"}
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

export default PastApprovalsPage;
