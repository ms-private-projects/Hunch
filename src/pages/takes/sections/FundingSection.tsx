import type { ReactNode } from "react";

import { Badge } from "@dev-mainsequence/command-center-sdk/controls";
import type { ResourceColumnDefinition } from "@dev-mainsequence/command-center-sdk/resource";
import { DataTable } from "@dev-mainsequence/command-center-sdk/views";

import { isApiError } from "../../../api/client";
import { api } from "../../../api/hunch";
import type { FundPosition } from "../../../api/types";
import { useQuery } from "../../../api/useQuery";
import { KeyValueList, StatRow } from "../../../components/KeyValueList";
import { EmptyNotice, ErrorNotice, LoadingNotice } from "../../../components/Notices";
import { SectionCard } from "../../../components/Page";
import { formatDateTime, formatMoney, formatPercent, formatQuantity, humanize, shortUid } from "../../../lib/format";
import { fundingStatusTone, toBadgeVariant } from "../../../lib/status";

const positionColumns = (currency: string): ResourceColumnDefinition<FundPosition, ReactNode>[] => [
  { id: "ticker", header: "Instrument", importance: "primary", renderCell: (position) => position.ticker ?? position.figi },
  { id: "quantity", header: "Quantity", importance: "secondary", renderCell: (position) => formatQuantity(position.quantity) },
  { id: "price", header: "Price", importance: "tertiary", renderCell: (position) => formatMoney(position.price, currency) },
  { id: "value", header: "Value", importance: "secondary", renderCell: (position) => formatMoney(position.value, currency) },
  { id: "weight", header: "Weight", importance: "tertiary", renderCell: (position) => formatPercent(position.weight, { digits: 1 }) },
];

export function FundingSection({ uid, version }: { uid: string; version: number }) {
  const funding = useQuery((signal) => api.takes.funding(uid, signal), [uid, version]);
  if (funding.loading) return <LoadingNotice label="Loading the funding…" />;
  if (funding.error) {
    if (isApiError(funding.error) && funding.error.status === 404) {
      return <EmptyNotice>This take is not funded. Fund it from a linked account to trade its basket with real notional.</EmptyNotice>;
    }
    return <ErrorNotice error={funding.error} onRetry={funding.refetch} />;
  }
  const data = funding.data;
  if (!data) return null;
  const ret = data.return_on_notional;
  return (
    <div className="hunch-stack">
      <StatRow
        items={[
          { key: "nav", label: "NAV", value: formatMoney(data.nav, data.currency) },
          { key: "invested", label: "Invested", value: formatMoney(data.invested, data.currency) },
          { key: "cash", label: "Cash", value: formatMoney(data.cash, data.currency) },
          {
            key: "return",
            label: "Return on notional",
            value: formatPercent(ret, { signed: true }),
            tone: ret === null ? "default" : ret >= 0 ? "positive" : "negative",
          },
          { key: "target", label: "Target notional", value: formatMoney(data.target_notional, data.currency) },
        ]}
      />
      <SectionCard
        actions={
          <>
            <Badge variant={toBadgeVariant(fundingStatusTone(data.status))}>{humanize(data.status)}</Badge>
            {data.execution_mode ? <Badge>{humanize(data.execution_mode)}</Badge> : null}
          </>
        }
        title="Fund"
      >
        <KeyValueList
          items={[
            { key: "venue", label: "Venue", value: humanize(data.venue) },
            { key: "account", label: "Linked account", value: shortUid(data.profile_account_uid) },
            { key: "capability", label: "Execution capability", value: data.execution_capability ? humanize(data.execution_capability) : "—" },
            { key: "activated", label: "Activated", value: formatDateTime(data.activated_at) },
            { key: "asof", label: "As of", value: formatDateTime(data.as_of) },
            ...(data.closed_at ? [{ key: "closed", label: "Closed", value: formatDateTime(data.closed_at) }] : []),
          ]}
        />
      </SectionCard>
      {data.autopilot_policy ? (
        <SectionCard title="Autopilot policy">
          <KeyValueList
            items={[
              { key: "turnover", label: "Max turnover per day", value: formatPercent(data.autopilot_policy.max_turnover_per_day, { digits: 0 }) },
              { key: "notional", label: "Max notional per order", value: formatMoney(data.autopilot_policy.max_notional_per_order, data.currency) },
              { key: "weight", label: "Max single-name weight", value: formatPercent(data.autopilot_policy.max_single_name_weight, { digits: 0 }) },
              { key: "new", label: "New instruments", value: data.autopilot_policy.allow_new_instruments ? "Allowed" : "Not allowed" },
              { key: "window", label: "Trading window", value: data.autopilot_policy.trading_window === "session" ? "Regular session" : "Any time" },
            ]}
          />
        </SectionCard>
      ) : null}
      <SectionCard contentPadding="none" title={`Positions (${data.positions.length})`}>
        <DataTable
          columns={positionColumns(data.currency)}
          emptyContent="No positions yet."
          getId={(position) => position.figi}
          items={data.positions}
          presentation="auto"
        />
      </SectionCard>
    </div>
  );
}
