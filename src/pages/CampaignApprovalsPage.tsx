import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign } from "../types";
import PageLayout from "../components/PageLayout";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";

type ApprovalKey = "strategy" | "deliveryMethod" | "storyboard";

const approvalItems: Array<{ key: ApprovalKey; title: string; description: string }> = [
  {
    key: "strategy",
    title: "Strategy",
    description: "Confirm the targeting direction, goals, and core campaign approach.",
  },
  {
    key: "deliveryMethod",
    title: "Delivery Method",
    description: "Confirm channel choices, timing, and posting/distribution plan.",
  },
  {
    key: "storyboard",
    title: "Storyboard",
    description: "Confirm the creative flow, narrative beats, and visual sequence.",
  },
];

const CampaignApprovalsPage = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ApprovalKey | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<ApprovalKey, boolean>>({
    strategy: false,
    deliveryMethod: false,
    storyboard: false,
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

  const pendingCount = useMemo(() => {
    if (!campaign?.journey?.approvals) {
      return approvalItems.length;
    }
    return approvalItems.filter((item) => !campaign.journey?.approvals[item.key]).length;
  }, [campaign]);
  const isAllExpanded = useMemo(
    () => approvalItems.every((item) => expandedItems[item.key]),
    [expandedItems]
  );

  const onSetApproval = async (key: ApprovalKey, approved: boolean) => {
    if (!id) {
      return;
    }

    setSavingKey(key);
    try {
      const updated = await fakeApi.updateJourneyApproval(id, key, approved);
      setCampaign(updated);
    } finally {
      setSavingKey(null);
    }
  };

  const onToggleAll = () => {
    setExpandedItems({
      strategy: !isAllExpanded,
      deliveryMethod: !isAllExpanded,
      storyboard: !isAllExpanded,
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
      <PageLayout title="Campaign Approval">
        <div className="row">
          <LoadingSpinner />
          <span>Loading approval details...</span>
        </div>
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout title="Campaign Approval">
        <Card>
          <p>Campaign not found.</p>
          <Link to="/approvals">Back to approvals</Link>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`${campaign.name} Approvals`}
      subtitle={`${pendingCount} item${pendingCount === 1 ? "" : "s"} pending`}
    >
      <Card>
        <div className="row row-between row-wrap">
          <div className="stack-sm">
            <strong>{campaign.name}</strong>
            <span className="muted">Campaign ID: {campaign.id}</span>
          </div>
          <Button variant="ghost" onClick={onToggleAll}>
            {isAllExpanded ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      </Card>

      <div className="approvals-list">
        {approvalItems.map((item) => {
          const isApproved = campaign.journey?.approvals?.[item.key] ?? false;
          const isSaving = savingKey === item.key;

          return (
            <details
              key={item.key}
              className="approvals-pane"
              open={expandedItems[item.key]}
              onToggle={(event) =>
                onTogglePane(item.key, (event.currentTarget as HTMLDetailsElement).open)
              }
            >
              <summary className="approvals-pane-summary">
                <div className="approvals-pane-head">
                  <strong>{item.title}</strong>
                  <div className="row approvals-pane-meta">
                    <Badge tone={isApproved ? "success" : "warning"}>
                      {isApproved ? "Approved" : "Pending"}
                    </Badge>
                    <span className="approvals-pane-caret" aria-hidden="true" />
                  </div>
                </div>
              </summary>
              <div className="approvals-pane-body">
                <p className="muted">{item.description}</p>
                <div className="approvals-actions">
                  <Button
                    variant={isApproved ? "secondary" : "primary"}
                    onClick={() => onSetApproval(item.key, !isApproved)}
                    disabled={isSaving}
                  >
                    {isSaving
                      ? "Saving..."
                      : isApproved
                        ? "Mark Pending"
                        : `Approve ${item.title}`}
                  </Button>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </PageLayout>
  );
};

export default CampaignApprovalsPage;
