import type { EntitySummary as EntitySummaryModel } from "@dev-mainsequence/command-center-sdk/resource";
import { EntitySummary } from "@dev-mainsequence/command-center-sdk/views";

import type { TakeResource } from "../../api/types";
import { formatDateTime, formatPercent, humanize, shortUid } from "../../lib/format";
import { takeStatusTone } from "../../lib/status";

export function buildTakeSummary(take: TakeResource): EntitySummaryModel {
  const constraints = take.constraints;
  const simulated = take.status !== "active_funded";
  return {
    entity: { id: take.uid, type: "take", title: take.title },
    badges: [
      { key: "status", label: humanize(take.status), tone: takeStatusTone(take.status) },
      { key: "mode", label: `Mode: ${humanize(take.execution_mode)}`, tone: "default" },
      {
        key: "visibility",
        label: take.visibility === "public" ? "Public" : "Private",
        tone: take.visibility === "public" ? "info" : "default",
      },
      ...(take.activated_at
        ? [{ key: "kind", label: simulated ? "Simulated" : "Funded", tone: simulated ? "secondary" : "success" }]
        : []),
    ],
    inline_fields: [
      { key: "owner", label: "Owner", value: take.owner_handle ? `@${take.owner_handle}` : shortUid(take.owner_user_uid) },
      { key: "activated", label: "Activated", value: take.activated_at ? formatDateTime(take.activated_at) : "Not yet" },
      { key: "created", label: "Created", value: formatDateTime(take.created_at) },
      ...(take.forked_from_take_uid
        ? [
            {
              key: "forked-from",
              label: "Forked from",
              value: shortUid(take.forked_from_take_uid),
              href: `/takes/${encodeURIComponent(take.forked_from_take_uid)}`,
            },
          ]
        : []),
    ],
    highlight_fields: [],
    stats: [
      { key: "horizon", label: "Horizon", display: `${constraints.horizon_months} mo`, value: constraints.horizon_months },
      { key: "cash", label: "Cash buffer", display: formatPercent(constraints.cash_buffer, { digits: 0 }), value: constraints.cash_buffer },
      {
        key: "max-weight",
        label: "Max single name",
        display: formatPercent(constraints.max_single_name_weight, { digits: 0 }),
        value: constraints.max_single_name_weight,
      },
      { key: "positions", label: "Max positions", display: String(constraints.max_positions), value: constraints.max_positions },
      { key: "risk", label: "Risk", display: humanize(constraints.risk_level), value: constraints.risk_level },
    ],
  };
}

export function TakeSummary({ take, onOpenLink }: { take: TakeResource; onOpenLink: (url: string) => void }) {
  return <EntitySummary onLinkSelect={(url) => onOpenLink(url)} summary={buildTakeSummary(take)} />;
}
