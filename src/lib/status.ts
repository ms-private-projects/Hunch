import type { BadgeVariant } from "@dev-mainsequence/command-center-sdk/controls";
import type { ResourceStatusTone } from "@dev-mainsequence/command-center-sdk/views";

const TAKE: Record<string, ResourceStatusTone> = {
  draft: "neutral",
  built: "primary",
  active_practice: "info",
  funding: "warning",
  active_funded: "success",
  archived: "neutral",
};

const PROPOSAL: Record<string, ResourceStatusTone> = {
  proposed: "warning",
  approved: "primary",
  submitted: "info",
  partially_filled: "info",
  filled: "success",
  rejected: "neutral",
  expired: "neutral",
  failed: "danger",
};

const FUNDING: Record<string, ResourceStatusTone> = {
  planned: "neutral",
  pending_initial: "warning",
  active: "success",
  withdrawing: "warning",
  closed: "neutral",
  failed: "danger",
};

const ACCOUNT: Record<string, ResourceStatusTone> = {
  pending: "warning",
  active: "success",
  revoked: "neutral",
};

const REVIEW: Record<string, ResourceStatusTone> = {
  hold: "neutral",
  flagged: "warning",
  proposed: "primary",
  executed: "success",
};

const NOTIFICATION: Record<string, ResourceStatusTone> = {
  take_built: "primary",
  review_hold: "neutral",
  review_proposed: "primary",
  proposal_awaiting_approval: "warning",
  proposal_executed: "success",
  proposal_failed: "danger",
  funding_active: "success",
  funding_closed: "neutral",
  account_linked: "info",
  take_forked: "info",
};

export const takeStatusTone = (status: string): ResourceStatusTone => TAKE[status] ?? "neutral";
export const proposalStatusTone = (status: string): ResourceStatusTone => PROPOSAL[status] ?? "neutral";
export const fundingStatusTone = (status: string): ResourceStatusTone => FUNDING[status] ?? "neutral";
export const accountStatusTone = (status: string): ResourceStatusTone => ACCOUNT[status] ?? "neutral";
export const reviewOutcomeTone = (outcome: string): ResourceStatusTone => REVIEW[outcome] ?? "neutral";
export const notificationKindTone = (kind: string): ResourceStatusTone =>
  NOTIFICATION[kind] ?? "neutral";

/** The `Badge` control has no `info` tone; map it to `secondary`. */
export function toBadgeVariant(tone: ResourceStatusTone): BadgeVariant {
  return tone === "info" ? "secondary" : tone;
}

export const OPEN_PROPOSAL_STATUSES = ["proposed", "approved", "submitted", "partially_filled"];
