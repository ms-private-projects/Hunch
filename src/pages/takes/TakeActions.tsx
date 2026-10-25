import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@dev-mainsequence/command-center-sdk/controls";
import { ResourcePicker } from "@dev-mainsequence/command-center-sdk/views";

import { describeError } from "../../api/client";
import { api } from "../../api/hunch";
import type { FundResponse, TakeResource } from "../../api/types";
import { useAction } from "../../api/useQuery";
import { useNotices } from "../../app/notices/NoticesProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { humanize } from "../../lib/format";
import { FundTakeDialog } from "./FundTakeDialog";

type ActionId =
  | "build"
  | "activate"
  | "publish"
  | "unpublish"
  | "fork"
  | "fund"
  | "withdraw"
  | "review"
  | "refresh"
  | "archive";

interface ActionSpec {
  id: ActionId;
  label: string;
  tone?: "default" | "primary" | "warning" | "danger";
}

const LABELS: Record<ActionId, string> = {
  build: "Build",
  activate: "Activate practice",
  publish: "Publish",
  unpublish: "Unpublish",
  fork: "Fork",
  fund: "Fund",
  withdraw: "Withdraw",
  review: "Review now",
  refresh: "Refresh prices",
  archive: "Archive",
};

/** Which actions a take offers, owner first then everyone, by status. */
export function availableActions(take: TakeResource, isOwner: boolean): { primary: ActionSpec | null; secondary: ActionSpec[]; more: ActionSpec[] } {
  const publishToggle: ActionSpec = take.visibility === "public" ? { id: "unpublish", label: LABELS.unpublish } : { id: "publish", label: LABELS.publish };
  const fork: ActionSpec = { id: "fork", label: LABELS.fork };
  const archive: ActionSpec = { id: "archive", label: LABELS.archive, tone: "danger" };
  const review: ActionSpec = { id: "review", label: LABELS.review };
  const refresh: ActionSpec = { id: "refresh", label: LABELS.refresh };
  if (!isOwner) {
    return { primary: take.status === "archived" ? null : fork, secondary: [], more: [] };
  }
  switch (take.status) {
    case "draft":
      return { primary: { id: "build", label: LABELS.build, tone: "primary" }, secondary: [], more: [archive] };
    case "built":
      return {
        primary: { id: "activate", label: LABELS.activate, tone: "primary" },
        secondary: [{ id: "fund", label: LABELS.fund }, publishToggle],
        more: [{ id: "build", label: "Rebuild" }, review, refresh, fork, archive],
      };
    case "active_practice":
      return {
        primary: { id: "fund", label: LABELS.fund, tone: "primary" },
        secondary: [publishToggle, review],
        more: [{ id: "build", label: "Rebuild" }, refresh, fork, archive],
      };
    case "funding":
    case "active_funded":
      return {
        primary: review,
        secondary: [{ id: "withdraw", label: LABELS.withdraw, tone: "warning" }, publishToggle],
        more: [refresh, fork, archive],
      };
    case "archived":
      return { primary: fork, secondary: [], more: [] };
    default:
      return { primary: null, secondary: [fork], more: [archive] };
  }
}

export interface TakeActionsProps {
  take: TakeResource;
  isOwner: boolean;
  /** The take as an action returned it. */
  onTake: (take: TakeResource) => void;
  /** Sections that depend on the take's portfolio, funding or reviews should reload. */
  onSectionsChanged: () => void;
}

/** The header actions of a take, with their dialogs. */
export function TakeActions({ take, isOwner, onTake, onSectionsChanged }: TakeActionsProps) {
  const navigate = useNavigate();
  const { notify } = useNotices();
  const [pendingId, setPendingId] = useState<ActionId | null>(null);
  const [dialog, setDialog] = useState<"fund" | "withdraw" | "archive" | null>(null);
  const dialogAction = useAction();

  const perform = useCallback(
    async <R,>(id: ActionId, work: () => Promise<R>, onDone: (result: R) => void) => {
      setPendingId(id);
      try {
        onDone(await work());
      } catch (error) {
        notify({ title: `${LABELS[id]} failed`, description: describeError(error), variant: "error" });
      } finally {
        setPendingId(null);
      }
    },
    [notify],
  );

  const run = useCallback(
    (id: ActionId) => {
      switch (id) {
        case "build":
          return perform(id, () => api.takes.build(take.uid), (response) => {
            onTake(response.take);
            onSectionsChanged();
            if (response.revision) {
              notify({
                title: `Built revision ${response.revision.revision}`,
                description: `${response.revision.weights.length} positions${response.revision.guardrail_notes.length ? `, ${response.revision.guardrail_notes.length} guardrail note(s)` : ""}.`,
                variant: "success",
              });
            } else if (response.job_run_uid) {
              notify({ title: "Build started", description: `Job run ${response.job_run_uid}. Reload the take when it finishes.` });
            }
          });
        case "refresh":
          return perform(id, () => api.takes.refresh(take.uid), (response) => {
            onTake(response.take);
            onSectionsChanged();
            notify({
              title: response.execution === "job" ? "Refresh started" : "Prices refreshed",
              description: response.job_run_uid ? `Job run ${response.job_run_uid}.` : undefined,
              variant: "success",
            });
          });
        case "activate":
          return perform(id, () => api.takes.activatePractice(take.uid), (updated) => {
            onTake(updated);
            onSectionsChanged();
            notify({ title: "Practice started", description: "The performance record begins today.", variant: "success" });
          });
        case "publish":
          return perform(id, () => api.takes.publish(take.uid), (updated) => {
            onTake(updated);
            notify({ title: "Published", description: "The take is on the leaderboard and can be forked.", variant: "success" });
          });
        case "unpublish":
          return perform(id, () => api.takes.unpublish(take.uid), (updated) => {
            onTake(updated);
            notify({ title: "Unpublished", variant: "success" });
          });
        case "fork":
          return perform(id, () => api.takes.fork(take.uid), (forked) => {
            notify({ title: "Forked", description: "Your copy is a private draft with lineage.", variant: "success" });
            navigate(`/takes/${encodeURIComponent(forked.uid)}`);
          });
        case "review":
          return perform(id, () => api.takes.review(take.uid), (review) => {
            onSectionsChanged();
            notify({
              title: `Review: ${humanize(review.outcome)}`,
              description: review.verdict ?? undefined,
              variant: review.outcome === "flagged" ? "info" : "success",
            });
          });
        case "fund":
        case "withdraw":
        case "archive":
          setDialog(id);
          return Promise.resolve();
        default:
          return Promise.resolve();
      }
    },
    [navigate, notify, onSectionsChanged, onTake, perform, take.uid],
  );

  const closeDialog = () => {
    setDialog(null);
    dialogAction.clearError();
  };

  const actions = availableActions(take, isOwner);
  const button = (spec: ActionSpec, variant: "primary" | "outline" | "danger" = "outline") => (
    <Button
      key={spec.id}
      onClick={() => void run(spec.id)}
      pending={pendingId === spec.id}
      variant={spec.tone === "danger" ? "danger" : variant}
    >
      {spec.label}
    </Button>
  );

  return (
    <>
      {actions.primary ? button(actions.primary, actions.primary.tone === "primary" ? "primary" : "outline") : null}
      {actions.secondary.map((spec) => button(spec))}
      {actions.more.length > 0 ? (
        <ResourcePicker
          mode="action"
          onAction={(value) => void run(value as ActionId)}
          options={actions.more.map((spec) => ({
            value: spec.id,
            label: spec.label,
            tone: spec.tone === "danger" ? "danger" : spec.tone === "warning" ? "warning" : "default",
          }))}
          placement="bottom"
          presentation="auto"
          triggerLabel="More"
        />
      ) : null}

      <FundTakeDialog
        onClose={closeDialog}
        onFunded={(response: FundResponse) => {
          closeDialog();
          onSectionsChanged();
          void api.takes.get(take.uid).then(onTake).catch(() => {});
          notify({
            title: response.proposal.status === "proposed" ? "Funded: trades await your approval" : "Funded",
            description: `${response.proposal.legs.length} leg(s) in proposal ${response.proposal.uid.slice(0, 8)}…`,
            variant: "success",
          });
          navigate(`/takes/${encodeURIComponent(take.uid)}?tab=proposals`);
        }}
        open={dialog === "fund"}
        take={take}
      />

      <ConfirmDialog
        actionLabel="Withdraw the funding"
        confirmButtonLabel="Withdraw"
        description="Hunch proposes selling every funded position back to cash. The take continues in practice mode once the sales fill."
        error={dialogAction.error}
        onClose={closeDialog}
        onConfirm={async () => {
          const proposal = await dialogAction.run(() => api.takes.withdraw(take.uid));
          if (!proposal) return;
          closeDialog();
          onSectionsChanged();
          void api.takes.get(take.uid).then(onTake).catch(() => {});
          notify({ title: "Withdrawal proposed", description: `${proposal.legs.length} leg(s), status ${humanize(proposal.status)}.`, variant: "success" });
        }}
        open={dialog === "withdraw"}
        pending={dialogAction.pending}
        title="Withdraw"
        tone="warning"
      />

      <ConfirmDialog
        actionLabel="Archive the take"
        confirmButtonLabel="Archive"
        confirmationWord={`DELETE ${take.uid}`}
        description="An archived take leaves your list and the leaderboard. Its history stays readable."
        error={dialogAction.error}
        onClose={closeDialog}
        onConfirm={async () => {
          const archived = await dialogAction.run(() => api.takes.archive(take.uid, `DELETE ${take.uid}`));
          if (!archived) return;
          closeDialog();
          notify({ title: "Archived", variant: "success" });
          navigate("/takes");
        }}
        open={dialog === "archive"}
        pending={dialogAction.pending}
        title="Archive this take"
        tone="danger"
        warning="Funded takes must be withdrawn first."
      />
    </>
  );
}
