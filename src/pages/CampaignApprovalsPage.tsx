import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { ApprovalDecision, ApprovalKey, Campaign } from "../types";
import PageLayout from "../components/PageLayout";
import FlowFooter from "../components/FlowFooter";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";

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
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ApprovalKey | null>(null);
  const [savingFeedbackKey, setSavingFeedbackKey] = useState<ApprovalKey | null>(null);
  const [openFeedback, setOpenFeedback] = useState<Record<ApprovalKey, boolean>>({
    strategy: false,
    deliveryMethod: false,
    storyboard: false,
  });
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<ApprovalKey, string>>({
    strategy: "",
    deliveryMethod: "",
    storyboard: "",
  });
  const [expandedItems, setExpandedItems] = useState<Record<ApprovalKey, boolean>>({
    strategy: false,
    deliveryMethod: false,
    storyboard: false,
  });
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (!campaign?.journey?.approvalFeedback) {
      return;
    }

    setFeedbackDrafts((prev) => ({
      strategy: campaign.journey?.approvalFeedback?.strategy ?? prev.strategy,
      deliveryMethod: campaign.journey?.approvalFeedback?.deliveryMethod ?? prev.deliveryMethod,
      storyboard: campaign.journey?.approvalFeedback?.storyboard ?? prev.storyboard,
    }));
  }, [campaign]);

  const activeApprovalItems = useMemo(
    () =>
      approvalItems.filter((item) => {
        const historyEntry = campaign?.journey?.approvalHistory?.[item.key];
        return !historyEntry;
      }),
    [campaign]
  );
  const isAllExpanded = useMemo(
    () => activeApprovalItems.every((item) => expandedItems[item.key]),
    [activeApprovalItems, expandedItems]
  );
  const pendingItemsCount = useMemo(() => {
    if (!campaign) {
      return activeApprovalItems.length;
    }

    return activeApprovalItems.filter((item) => {
      const isApproved = campaign.journey?.approvals?.[item.key] ?? false;
      const savedFeedback = campaign.journey?.approvalFeedback?.[item.key];
      const decision: ApprovalDecision =
        campaign.journey?.approvalDecisions?.[item.key] ??
        (isApproved ? "approved" : savedFeedback ? "declined" : "pending");
      return decision === "pending";
    }).length;
  }, [activeApprovalItems, campaign]);

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

  const onDecline = (key: ApprovalKey) => {
    const savedValue = campaign?.journey?.approvalFeedback?.[key] ?? "";
    setFeedbackDrafts((prev) => ({
      ...prev,
      [key]: savedValue,
    }));
    setOpenFeedback((prev) => ({
      ...prev,
      [key]: true,
    }));
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

  const onChangeFeedback = (key: ApprovalKey, value: string) => {
    setFeedbackDrafts((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const onSaveFeedback = async (key: ApprovalKey) => {
    if (!id) {
      return;
    }

    const nextFeedback = feedbackDrafts[key].trim();
    if (!nextFeedback) {
      return;
    }

    setSavingFeedbackKey(key);
    try {
      const updated = await fakeApi.saveJourneyApprovalFeedback(id, key, nextFeedback);
      setCampaign(updated);
      setOpenFeedback((prev) => ({
        ...prev,
        [key]: false,
      }));
    } finally {
      setSavingFeedbackKey(null);
    }
  };

  const onRemoveFeedback = async (key: ApprovalKey) => {
    if (!id) {
      return;
    }

    setSavingFeedbackKey(key);
    try {
      const updated = await fakeApi.removeJourneyApprovalFeedback(id, key);
      setCampaign(updated);
      setFeedbackDrafts((prev) => ({
        ...prev,
        [key]: "",
      }));
      setOpenFeedback((prev) => ({
        ...prev,
        [key]: false,
      }));
    } finally {
      setSavingFeedbackKey(null);
    }
  };

  const onCancelFeedbackChanges = (key: ApprovalKey) => {
    const savedValue = campaign?.journey?.approvalFeedback?.[key] ?? "";
    setFeedbackDrafts((prev) => ({
      ...prev,
      [key]: savedValue,
    }));
    setOpenFeedback((prev) => ({
      ...prev,
      [key]: false,
    }));
  };

  const onEditFeedback = (key: ApprovalKey) => {
    const savedValue = campaign?.journey?.approvalFeedback?.[key] ?? "";
    setFeedbackDrafts((prev) => ({
      ...prev,
      [key]: savedValue,
    }));
    setOpenFeedback((prev) => ({
      ...prev,
      [key]: true,
    }));
  };

  const onSubmit = () => {
    setIsSubmitDialogOpen(true);
  };

  const onCancelSubmit = () => {
    setIsSubmitDialogOpen(false);
  };

  const onConfirmSubmit = async () => {
    if (!id) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await fakeApi.submitJourneyApprovals(id);
      setCampaign(updated);
      setIsSubmitDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
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
      title="Campaign Approvals"
      subtitle="The AI needs your approval before proceeding. If you choose to decline, please provide feedback for the AI to address."
      bodyClassName="stack flow-page-body approvals-page-body"
    >
      <div className="approvals-toolbar-wrap">
        <div className="card approvals-toolbar">
          <div className="row row-between row-wrap">
            <div className="stack-sm">
              <strong>{campaign.name}</strong>
              <span className="muted">Campaign ID: {campaign.id}</span>
            </div>
            <Button variant="ghost" onClick={onToggleAll}>
              {isAllExpanded ? "Collapse all" : "Expand all"}
            </Button>
          </div>
        </div>
      </div>

      {activeApprovalItems.length === 0 ? (
        <Card>
          <p>There are no active approvals to review.</p>
        </Card>
      ) : (
        <div className="approvals-list">
          {activeApprovalItems.map((item) => {
                const isApproved = campaign.journey?.approvals?.[item.key] ?? false;
                const isSaving = savingKey === item.key;
                const isSavingFeedback = savingFeedbackKey === item.key;
                const isDeclineInProgress = openFeedback[item.key];
                const savedFeedback = campaign.journey?.approvalFeedback?.[item.key];
                const savedFeedbackNormalized = (savedFeedback ?? "").trim();
                const draftFeedbackNormalized = feedbackDrafts[item.key].trim();
                const isFeedbackChanged = draftFeedbackNormalized !== savedFeedbackNormalized;
                const itemDecision: ApprovalDecision =
                  campaign.journey?.approvalDecisions?.[item.key] ??
                  (isApproved ? "approved" : savedFeedback ? "declined" : "pending");
                const isDeclined = itemDecision === "declined";

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
                          <Badge
                            tone={
                              itemDecision === "declined"
                                ? "error"
                                : isApproved
                                  ? "success"
                                  : "warning"
                            }
                          >
                            {itemDecision === "approved"
                              ? "Approved"
                              : itemDecision === "declined"
                                ? "Declined"
                                : "Pending"}
                          </Badge>
                          <span className="approvals-pane-caret" aria-hidden="true" />
                        </div>
                      </div>
                    </summary>
                    <div className="approvals-pane-body">
                      <p className="muted">{item.description}</p>
                      <div className="approvals-actions">
                        {itemDecision === "approved" ? (
                          <Button
                            variant="secondary"
                            onClick={() => onSetApproval(item.key, false)}
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Remove approval"}
                          </Button>
                        ) : isDeclined ? (
                          <Button
                            variant="secondary"
                            className="approvals-decline-btn"
                            onClick={() => onRemoveFeedback(item.key)}
                            disabled={isSavingFeedback}
                          >
                            {isSavingFeedback ? "Undoing..." : "Undo Decline"}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="primary"
                              onClick={() => onSetApproval(item.key, true)}
                              disabled={isSaving || isDeclineInProgress}
                            >
                              {isSaving ? "Saving..." : `Approve ${item.title}`}
                            </Button>
                            <Button
                              variant="secondary"
                              className="approvals-decline-btn"
                              onClick={() => onDecline(item.key)}
                              disabled={isSaving}
                            >
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                      {openFeedback[item.key] ? (
                        <div className="stack-sm approvals-feedback-panel">
                          <label className="field-label" htmlFor={`approval-feedback-${item.key}`}>
                            Please provide feedback for the AI to improve on
                          </label>
                          <textarea
                            id={`approval-feedback-${item.key}`}
                            className="textarea"
                            rows={3}
                            value={feedbackDrafts[item.key]}
                            onChange={(event) => onChangeFeedback(item.key, event.target.value)}
                            placeholder={`Share feedback for ${item.title.toLowerCase()}...`}
                          />
                          <div className="row">
                            <Button
                              variant="primary"
                              onClick={() => onSaveFeedback(item.key)}
                              disabled={
                                isSavingFeedback || !draftFeedbackNormalized || !isFeedbackChanged
                              }
                            >
                              {isSavingFeedback ? "Saving..." : "Confirm Decline"}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => onCancelFeedbackChanges(item.key)}
                            >
                              {isDeclined ? "Done" : "Cancel"}
                            </Button>
                          </div>
                        </div>
                      ) : isDeclined ? (
                        <div className="stack-sm approvals-feedback-panel">
                          {savedFeedbackNormalized ? (
                            <p className="muted">{savedFeedbackNormalized}</p>
                          ) : null}
                          <div className="row">
                            <Button variant="ghost" onClick={() => onEditFeedback(item.key)}>
                              Edit
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </details>
                );
          })}
        </div>
      )}
      {isSubmitDialogOpen ? (
        <div className="modal-overlay" role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-approvals-title"
          >
            <h3 id="submit-approvals-title">Submit Campaign Approvals?</h3>
            <p className="muted">
              Once submitted, you can no longer edit your responses.
            </p>
            <div className="row modal-actions">
              <Button type="button" variant="ghost" onClick={onCancelSubmit}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={onConfirmSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <FlowFooter>
        <div className="flow-footer-actions">
          <Button type="button" variant="secondary" onClick={() => navigate("/approvals")}>
            Back
          </Button>
          <div className="flow-footer-primary">
            <span className="muted">
              {pendingItemsCount === 0
                ? "All items reviewed."
                : `${pendingItemsCount} item${pendingItemsCount > 1 ? "s" : ""} pending`}
            </span>
            <Button
              type="button"
              variant="primary"
              onClick={onSubmit}
              disabled={pendingItemsCount > 0 || activeApprovalItems.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </FlowFooter>
    </PageLayout>
  );
};

export default CampaignApprovalsPage;
