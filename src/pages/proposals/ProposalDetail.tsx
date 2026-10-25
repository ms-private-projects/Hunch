import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Badge, Button, Field, Textarea } from "@dev-mainsequence/command-center-sdk/controls";
import type { ResourceColumnDefinition } from "@dev-mainsequence/command-center-sdk/resource";
import { DataTable, ResourceStatusCell } from "@dev-mainsequence/command-center-sdk/views";

import { describeError } from "../../api/client";
import { api } from "../../api/hunch";
import type { ProposalLeg, ProposalResource } from "../../api/types";
import { useAction } from "../../api/useQuery";
import { useNotices } from "../../app/notices/NoticesProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { JsonBlock, KeyValueList, StatRow } from "../../components/KeyValueList";
import { Markdown } from "../../components/Markdown";
import { ErrorNotice } from "../../components/Notices";
import { SectionCard } from "../../components/Page";
import { formatDateTime, formatMoney, formatPercent, formatQuantity, humanize, shortUid } from "../../lib/format";
import { proposalStatusTone, toBadgeVariant } from "../../lib/status";

const legColumns: ResourceColumnDefinition<ProposalLeg, ReactNode>[] = [
  {
    id: "side",
    header: "Side",
    importance: "secondary",
    renderCell: (leg) => (
      <ResourceStatusCell label={leg.side.toUpperCase()} tone={leg.side.toLowerCase() === "buy" ? "success" : "danger"} />
    ),
  },
  { id: "ticker", header: "Instrument", importance: "primary", renderCell: (leg) => leg.ticker ?? leg.figi },
  { id: "quantity", header: "Quantity", importance: "secondary", renderCell: (leg) => formatQuantity(leg.quantity) },
  { id: "price", header: "Est. price", importance: "tertiary", renderCell: (leg) => formatMoney(leg.estimated_price) },
  { id: "notional", header: "Est. notional", importance: "secondary", renderCell: (leg) => formatMoney(leg.estimated_notional) },
  {
    id: "weights",
    header: "Weight",
    importance: "tertiary",
    renderCell: (leg) => `${formatPercent(leg.current_weight, { digits: 1 })} → ${formatPercent(leg.target_weight, { digits: 1 })}`,
  },
  { id: "reason", header: "Reason", importance: "tertiary", renderCell: (leg) => leg.reason ?? "—" },
];

type Row = Record<string, unknown>;
const ORDER_KEYS = ["client_order_id", "status", "side", "symbol", "ticker", "quantity", "filled_quantity", "average_price", "avg_fill_price", "submitted_at", "updated_at"];

function orderColumns(rows: Row[]): ResourceColumnDefinition<Row, ReactNode>[] {
  const present = new Set(rows.flatMap((row) => Object.keys(row)));
  const keys = ORDER_KEYS.filter((key) => present.has(key));
  const extra = [...present].filter((key) => !ORDER_KEYS.includes(key)).slice(0, Math.max(0, 6 - keys.length));
  return [...keys, ...extra].map((key, index) => ({
    id: key,
    header: humanize(key),
    importance: index === 0 ? "primary" : index < 4 ? "secondary" : "tertiary",
    renderCell: (row) => {
      const value = row[key];
      if (value === null || value === undefined) return "—";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    },
  }));
}

function autopilotReasons(check: Record<string, unknown>): string[] {
  const reasons = check.reasons ?? check.blockers ?? check.violations;
  return Array.isArray(reasons) ? reasons.map(String) : [];
}

export function ProposalDetail({
  proposal,
  onChanged,
  showTakeLink = true,
}: {
  proposal: ProposalResource;
  onChanged: (proposal: ProposalResource) => void;
  showTakeLink?: boolean;
}) {
  const { notify } = useNotices();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const dialogAction = useAction();
  const sync = useAction();

  const totalNotional = proposal.legs.reduce((sum, leg) => sum + (leg.estimated_notional ?? 0), 0);
  const canApprove = proposal.status === "proposed";
  const canReject = proposal.status === "proposed" || proposal.status === "approved";
  const canSync = ["approved", "submitted", "partially_filled"].includes(proposal.status);
  const check = proposal.autopilot_check;
  const checkReasons = check ? autopilotReasons(check) : [];
  const checkAllowed = check && typeof check.allowed === "boolean" ? check.allowed : null;

  const close = () => {
    setDialog(null);
    setReason("");
    dialogAction.clearError();
  };

  async function runSync() {
    const updated = await sync.run(() => api.proposals.sync(proposal.uid));
    if (updated) {
      onChanged(updated);
      notify({ title: "Orders synced", description: `Status ${humanize(updated.status)}.`, variant: "success" });
    } else if (sync.error) {
      notify({ title: "Sync failed", description: describeError(sync.error), variant: "error" });
    }
  }

  return (
    <div className="hunch-stack">
      <SectionCard
        actions={
          <>
            {canApprove ? (
              <Button onClick={() => setDialog("approve")} variant="primary">
                Approve
              </Button>
            ) : null}
            {canReject ? (
              <Button onClick={() => setDialog("reject")} variant="outline">
                Reject
              </Button>
            ) : null}
            {canSync ? (
              <Button onClick={() => void runSync()} pending={sync.pending} variant="outline">
                Sync orders
              </Button>
            ) : null}
          </>
        }
        title={
          <span className="hunch-inline-badges">
            Proposal {shortUid(proposal.uid)}
            <Badge variant={toBadgeVariant(proposalStatusTone(proposal.status))}>{humanize(proposal.status)}</Badge>
            <Badge>{humanize(proposal.trigger)}</Badge>
            {proposal.manual_execution ? <Badge variant="warning">Manual execution</Badge> : null}
          </span>
        }
      >
        <div className="hunch-stack">
          {sync.error ? <ErrorNotice error={sync.error} /> : null}
          <StatRow
            items={[
              { key: "legs", label: "Legs", value: String(proposal.legs.length) },
              { key: "notional", label: "Est. notional", value: formatMoney(totalNotional) },
              { key: "turnover", label: "Est. turnover", value: formatPercent(proposal.estimated_turnover, { digits: 1 }) },
              { key: "created", label: "Created", value: formatDateTime(proposal.created_at) },
            ]}
          />
          <KeyValueList
            items={[
              ...(showTakeLink
                ? [
                    {
                      key: "take",
                      label: "Take",
                      value: (
                        <Link className="hunch-link" to={`/takes/${encodeURIComponent(proposal.take_uid)}?tab=proposals`}>
                          {proposal.take_title ?? shortUid(proposal.take_uid)}
                        </Link>
                      ),
                    },
                  ]
                : []),
              { key: "expires", label: "Expires", value: formatDateTime(proposal.expires_at) },
              { key: "decided", label: "Decided", value: formatDateTime(proposal.decided_at) },
              { key: "submitted", label: "Submitted", value: formatDateTime(proposal.submitted_at) },
              { key: "completed", label: "Completed", value: formatDateTime(proposal.completed_at) },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard contentPadding="none" title={`Legs (${proposal.legs.length})`}>
        <DataTable
          columns={legColumns}
          emptyContent="No trades in this proposal."
          getId={(leg) => leg.client_order_id}
          items={proposal.legs}
          presentation="auto"
        />
      </SectionCard>

      {proposal.summary_md.trim() ? (
        <SectionCard title="Summary">
          <Markdown>{proposal.summary_md}</Markdown>
        </SectionCard>
      ) : null}

      {check ? (
        <SectionCard
          actions={
            checkAllowed === null ? null : (
              <Badge variant={checkAllowed ? "success" : "warning"}>{checkAllowed ? "Within policy" : "Needs approval"}</Badge>
            )
          }
          title="Autopilot check"
        >
          {checkReasons.length > 0 ? (
            <ul className="hunch-prose">
              {checkReasons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <JsonBlock value={check} />
          )}
        </SectionCard>
      ) : null}

      {proposal.orders.length > 0 ? (
        <SectionCard contentPadding="none" title={`Orders (${proposal.orders.length})`}>
          <DataTable
            columns={orderColumns(proposal.orders)}
            getId={(row) => String(row.client_order_id ?? row.uid ?? row.id ?? JSON.stringify(row))}
            items={proposal.orders}
            presentation="auto"
          />
        </SectionCard>
      ) : null}

      {proposal.notes.length > 0 ? (
        <SectionCard title="Notes">
          <ul className="hunch-prose">
            {proposal.notes.map((note, index) => (
              <li key={`${index}-${note}`}>{note}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <ConfirmDialog
        actionLabel="Approve the trades"
        confirmButtonLabel="Approve"
        description="The venue connector places these orders in the linked account. Fills are booked into the take's fund."
        error={dialogAction.error}
        onClose={close}
        onConfirm={async () => {
          const updated = await dialogAction.run(() => api.proposals.approve(proposal.uid));
          if (!updated) return;
          close();
          onChanged(updated);
          notify({ title: "Approved", description: `Status ${humanize(updated.status)}.`, variant: "success" });
        }}
        open={dialog === "approve"}
        pending={dialogAction.pending}
        selectionLabel={`${proposal.legs.length} leg(s) · ${formatMoney(totalNotional)} estimated notional`}
        title="Approve this proposal"
        tone="primary"
      />

      <ConfirmDialog
        actionLabel="Reject the trades"
        confirmButtonLabel="Reject"
        description="Nothing is sent to the venue. An initial proposal that is rejected closes the funding."
        error={dialogAction.error}
        onClose={close}
        onConfirm={async () => {
          const updated = await dialogAction.run(() => api.proposals.reject(proposal.uid, reason.trim() || null));
          if (!updated) return;
          close();
          onChanged(updated);
          notify({ title: "Rejected", variant: "success" });
        }}
        open={dialog === "reject"}
        pending={dialogAction.pending}
        title="Reject this proposal"
        tone="warning"
      >
        <Field description="Optional, up to 500 characters; kept with the proposal." label="Reason">
          <Textarea maxLength={500} onChange={(event) => setReason(event.target.value)} rows={3} value={reason} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
