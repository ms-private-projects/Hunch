import { useMemo } from "react";

import { Badge } from "@dev-mainsequence/command-center-sdk/controls";

import { api } from "../../../api/hunch";
import { useQuery } from "../../../api/useQuery";
import { EmptyNotice, ErrorNotice, LoadingNotice } from "../../../components/Notices";
import { PerformanceChart, parsePerformance } from "../../../components/PerformanceChart";
import { SectionCard } from "../../../components/Page";
import { formatDate, formatDateTime } from "../../../lib/format";

export function PerformanceSection({ uid, version }: { uid: string; version: number }) {
  const performance = useQuery((signal) => api.takes.performance(uid, signal), [uid, version]);
  const points = useMemo(() => (performance.data ? parsePerformance(performance.data) : []), [performance.data]);
  if (performance.loading) return <LoadingNotice label="Loading the performance record…" />;
  if (performance.error) return <ErrorNotice error={performance.error} onRetry={performance.refetch} />;
  const frame = performance.data;
  if (!frame) return null;
  if (frame.status === "error") {
    return <ErrorNotice error={new Error(frame.error ?? "The performance frame could not be computed.")} onRetry={performance.refetch} />;
  }
  const context = frame.source?.context ?? {};
  const simulated = context.simulated !== false;
  const activatedAt = typeof context.activated_at === "string" ? context.activated_at : null;
  return (
    <SectionCard
      actions={
        <>
          <Badge variant={simulated ? "secondary" : "success"}>{simulated ? "Simulated" : "Funded"}</Badge>
          {activatedAt ? <span className="hunch-item-meta">Activated {formatDateTime(activatedAt)}</span> : null}
        </>
      }
      title="Value since activation"
    >
      {points.length === 0 ? (
        <EmptyNotice>
          {activatedAt
            ? "No valuation yet. Values are written after each session's refresh."
            : "Activate the take (practice or funded) to start its performance record."}
        </EmptyNotice>
      ) : points.length === 1 ? (
        <EmptyNotice>
          One valuation point so far ({formatDate(points[0].time)}: {points[0].value.toFixed(3)}); the chart starts
          after two sessions.
        </EmptyNotice>
      ) : (
        <>
          <PerformanceChart points={points} />
          {simulated ? (
            <p className="hunch-item-meta">
              Simulated: these values come from the model portfolio; no money was invested in this take.
            </p>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
