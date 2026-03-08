import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import PageLayout from "../components/PageLayout";
import FlowFooter from "../components/FlowFooter";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import type { ApprovalKey, Campaign } from "../types";

const approvalLabels: Record<ApprovalKey, string> = {
  strategy: "Strategy",
  deliveryMethod: "Delivery Method",
  storyboard: "Storyboard",
};

const approvalDescriptions: Record<ApprovalKey, string> = {
  strategy: "Confirm the targeting direction, goals, and core campaign approach.",
  deliveryMethod: "Confirm channel choices, timing, and posting/distribution plan.",
  storyboard: "Confirm the creative flow, narrative beats, and visual sequence.",
};

const approvalKeys: ApprovalKey[] = ["strategy", "deliveryMethod", "storyboard"];

const CampaignPastApprovalsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<ApprovalKey, boolean>>({
    strategy: true,
    deliveryMethod: true,
    storyboard: true,
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fakeApi
      .getCampaign(id)
      .then(setCampaign)
      .finally(() => setLoading(false));
  }, [id]);

  const entries = useMemo(() => {
    const history = campaign?.journey?.approvalHistory ?? {};
    return approvalKeys
      .map((key) => {
        const entry = history[key];
        if (!entry) {
          return null;
        }
        return {
          key,
          label: approvalLabels[key],
          description: approvalDescriptions[key],
          decision: entry.decision,
          feedback: entry.feedback,
          submittedAt: entry.submittedAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [campaign]);
  const isAllExpanded = useMemo(
    () => entries.every((entry) => expandedItems[entry.key]),
    [entries, expandedItems]
  );

  const onToggleAll = () => {
    const nextOpen = !isAllExpanded;
    setExpandedItems({
      strategy: nextOpen,
      deliveryMethod: nextOpen,
      storyboard: nextOpen,
    });
  };

  const onTogglePane = (key: ApprovalKey, open: boolean) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: open,
    }));
  };

  if (loading) {
    return (
      <PageLayout title="Past Approvals">
        <div className="row">
          <LoadingSpinner />
          <span>Loading past approvals...</span>
        </div>
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout title="Past Approvals">
        <Card>
          <p>Campaign not found.</p>
          <Link to="/past-approvals">Back to past approvals</Link>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`Past Approvals: ${campaign.name}`}
      subtitle="Read-only submitted approval history for this campaign."
      bodyClassName="stack flow-page-body approvals-page-body"
    >
      <div className="approvals-toolbar-wrap">
        <div className="card approvals-toolbar">
          <div className="row row-between row-wrap">
            <div className="stack-sm">
              <strong>{campaign.name}</strong>
              <span className="muted">Campaign ID: {campaign.id}</span>
            </div>
            {entries.length > 0 ? (
              <Button type="button" variant="ghost" onClick={onToggleAll}>
                {isAllExpanded ? "Collapse all" : "Expand all"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {entries.length === 0 ? (
        <Card>
          <p>No past approvals exist for this campaign.</p>
        </Card>
      ) : (
        <div className="approvals-list">
          {entries.map((entry) => (
            <details
              key={entry.key}
              className="approvals-pane"
              open={expandedItems[entry.key]}
              onToggle={(event) =>
                onTogglePane(entry.key, (event.currentTarget as HTMLDetailsElement).open)
              }
            >
              <summary className="approvals-pane-summary">
                <div className="approvals-pane-head">
                  <strong>{entry.label}</strong>
                  <div className="row approvals-pane-meta">
                    <Badge tone={entry.decision === "approved" ? "success" : "error"}>
                      {entry.decision === "approved" ? "Approved" : "Declined"}
                    </Badge>
                    <span className="approvals-pane-caret" aria-hidden="true" />
                  </div>
                </div>
              </summary>
              <div className="approvals-pane-body">
                <p className="muted">{entry.description}</p>
                <div className="stack-sm approvals-feedback-panel">
                  <span className="muted">
                    Submitted: {new Date(entry.submittedAt).toLocaleString()}
                  </span>
                  <p className="muted">
                    {entry.feedback?.trim() ? `Feedback: ${entry.feedback.trim()}` : "Feedback: none"}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
      <FlowFooter>
        <div className="flow-footer-actions">
          <Button type="button" variant="secondary" onClick={() => navigate("/past-approvals")}>
            Back
          </Button>
        </div>
      </FlowFooter>
    </PageLayout>
  );
};

export default CampaignPastApprovalsPage;
