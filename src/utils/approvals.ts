import type { ApprovalDecision, ApprovalKey, Campaign } from "../types";

export const approvalKeys: ApprovalKey[] = ["strategy", "deliveryMethod", "storyboard"];

export const approvalLabels: Record<ApprovalKey, string> = {
  strategy: "Strategy",
  deliveryMethod: "Delivery Method",
  storyboard: "Storyboard",
};

export const getApprovalDecision = (campaign: Campaign, key: ApprovalKey): ApprovalDecision => {
  const isApproved = campaign.journey?.approvals?.[key] ?? false;
  const savedFeedback = campaign.journey?.approvalFeedback?.[key];
  return (
    campaign.journey?.approvalDecisions?.[key] ??
    (isApproved ? "approved" : savedFeedback ? "declined" : "pending")
  );
};

export const getActiveApprovalKeys = (campaign: Campaign): ApprovalKey[] =>
  approvalKeys.filter((key) => !campaign.journey?.approvalHistory?.[key]);

export const getPendingApprovalKeys = (campaign: Campaign): ApprovalKey[] =>
  getActiveApprovalKeys(campaign).filter((key) => getApprovalDecision(campaign, key) === "pending");

export const needsApprovalSubmission = (campaign: Campaign): boolean => {
  const activeKeys = getActiveApprovalKeys(campaign);
  if (activeKeys.length === 0) {
    return false;
  }
  return getPendingApprovalKeys(campaign).length === 0;
};

export const getPendingApprovalsCount = (campaign: Campaign): number => {
  const pendingCount = getPendingApprovalKeys(campaign).length;
  if (pendingCount > 0) {
    return pendingCount;
  }
  return needsApprovalSubmission(campaign) ? 1 : 0;
};
