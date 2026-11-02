import type { ReactNode } from "react";

import { DataTable, ResourceIconLabelCell } from "@dev-mainsequence/command-center-sdk/views";
import type { ResourceColumnDefinition } from "@dev-mainsequence/command-center-sdk/resource";

import { isApiError } from "../../../api/client";
import { api } from "../../../api/hunch";
import type { WeightItem } from "../../../api/types";
import { useQuery } from "../../../api/useQuery";
import { StatRow } from "../../../components/KeyValueList";
import { EmptyNotice, ErrorNotice, LoadingNotice } from "../../../components/Notices";
import { SectionCard } from "../../../components/Page";
import { formatDateTime, formatMoney, formatPercent } from "../../../lib/format";

const columns: ResourceColumnDefinition<WeightItem, ReactNode>[] = [
  {
    id: "ticker",
    header: "Instrument",
    importance: "primary",
    renderCell: (item) => <ResourceIconLabelCell label={item.ticker ?? item.figi} meta={item.name ?? item.figi} />,
  },
  { id: "weight", header: "Weight", importance: "secondary", renderCell: (item) => formatPercent(item.weight, { digits: 2 }) },
  { id: "price", header: "Price", importance: "secondary", renderCell: (item) => formatMoney(item.price) },
];

export function BasketSection({ uid, version }: { uid: string; version: number }) {
  const weights = useQuery((signal) => api.takes.weights(uid, signal), [uid, version]);
  if (weights.loading) return <LoadingNotice label="Loading the basket…" />;
  if (weights.error) {
    if (isApiError(weights.error) && (weights.error.status === 404 || weights.error.status === 409)) {
      return <EmptyNotice>No basket yet. Research the thesis, then build the take to publish its weights.</EmptyNotice>;
    }
    return <ErrorNotice error={weights.error} onRetry={weights.refetch} />;
  }
  const data = weights.data;
  if (!data || data.items.length === 0) {
    return <EmptyNotice>No basket yet. Research the thesis, then build the take to publish its weights.</EmptyNotice>;
  }
  return (
    <div className="hunch-stack">
      <StatRow
        items={[
          { key: "invested", label: "Invested", value: formatPercent(data.invested, { digits: 1 }) },
          { key: "cash", label: "Cash", value: formatPercent(data.cash, { digits: 1 }) },
          { key: "positions", label: "Positions", value: String(data.items.length) },
          { key: "asof", label: "As of", value: formatDateTime(data.as_of) },
        ]}
      />
      <SectionCard contentPadding="none" title="Weights">
        <DataTable columns={columns} getId={(item) => item.figi} items={data.items} presentation="auto" />
      </SectionCard>
    </div>
  );
}
