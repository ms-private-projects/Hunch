import { Link, useSearchParams } from "react-router-dom";

import { Badge } from "@dev-mainsequence/command-center-sdk/controls";

import type { ProposalResource } from "../../api/types";
import { EmptyNotice } from "../../components/Notices";
import { formatDateTime, formatMoney, humanize, shortUid } from "../../lib/format";
import { proposalStatusTone, toBadgeVariant } from "../../lib/status";
import { ProposalDetail } from "./ProposalDetail";

/** A list of proposals with the selected one's detail beside it; the selection lives in the URL. */
export function ProposalsBrowser({
  proposals,
  paramName,
  onChanged,
  emptyMessage,
  showTakeLink = true,
}: {
  proposals: ProposalResource[];
  paramName: string;
  onChanged: (proposal: ProposalResource) => void;
  emptyMessage: string;
  showTakeLink?: boolean;
}) {
  const [params] = useSearchParams();
  const selectedUid = params.get(paramName);
  const selected = proposals.find((proposal) => proposal.uid === selectedUid) ?? proposals[0] ?? null;

  if (proposals.length === 0) return <EmptyNotice>{emptyMessage}</EmptyNotice>;

  const linkFor = (uid: string) => {
    const next = new URLSearchParams(params);
    next.set(paramName, uid);
    return `?${next.toString()}`;
  };

  return (
    <div className="hunch-master-detail">
      <ul className="hunch-list" aria-label="Proposals">
        {proposals.map((proposal) => {
          const notional = proposal.legs.reduce((sum, leg) => sum + (leg.estimated_notional ?? 0), 0);
          return (
            <li key={proposal.uid}>
              <Link
                aria-current={selected?.uid === proposal.uid ? "true" : undefined}
                className={`hunch-list-item${selected?.uid === proposal.uid ? " hunch-list-item--active" : ""}`}
                replace
                to={{ search: linkFor(proposal.uid) }}
              >
                <div className="hunch-item-head">
                  <span className="hunch-item-title">{proposal.take_title ?? shortUid(proposal.take_uid)}</span>
                  <Badge variant={toBadgeVariant(proposalStatusTone(proposal.status))}>{humanize(proposal.status)}</Badge>
                </div>
                <span className="hunch-item-meta">
                  {humanize(proposal.trigger)} · {proposal.legs.length} leg(s) · {formatMoney(notional)} ·{" "}
                  {formatDateTime(proposal.created_at)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {selected ? <ProposalDetail onChanged={onChanged} proposal={selected} showTakeLink={showTakeLink} /> : null}
    </div>
  );
}
