import { useMemo } from "react";

import { Badge } from "@dev-mainsequence/command-center-sdk/controls";

import { api } from "../../../api/hunch";
import type { PerformanceMetrics } from "../../../api/types";
import { useQuery } from "../../../api/useQuery";
import { StatRow, type StatItem } from "../../../components/KeyValueList";
import { EmptyNotice, ErrorNotice, LoadingNotice } from "../../../components/Notices";
import { PerformanceChart, parsePerformance } from "../../../components/PerformanceChart";
import { SectionCard } from "../../../components/Page";
import { formatDate, formatDateTime, formatNumber, formatPercent } from "../../../lib/format";

const METRIC_KEYS: readonly (keyof PerformanceMetrics)[] = [
  "sessions",
  "total_return",
  "annualised_return",
  "annualised_volatility",
  "sharpe_ratio",
  "max_drawdown",
  "best_day",
  "worst_day",
];

function readMetrics(value: unknown): PerformanceMetrics | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const metrics = {} as Record<keyof PerformanceMetrics, number | null>;
  for (const key of METRIC_KEYS) {
    const entry = record[key];
    metrics[key] = typeof entry === "number" && Number.isFinite(entry) ? entry : null;
  }
  return { ...metrics, sessions: metrics.sessions ?? 0 };
}

const AFTER_TWO = "after two sessions";

function metricItems(metrics: PerformanceMetrics): StatItem[] {
  const signedTone = (value: number | null): StatItem["tone"] => (value === null ? "default" : value >= 0 ? "positive" : "negative");
  const pct = (key: string, label: string, value: number | null, signed = true): StatItem => ({
    key,
    label,
    value: value === null ? "—" : formatPercent(value, { signed, digits: 2 }),
    tone: signed ? signedTone(value) : "default",
    meta: value === null ? AFTER_TWO : undefined,
  });
  return [
    { key: "sessions", label: "Sessions", value: String(metrics.sessions) },
    pct("total", "Total return", metrics.total_return),
    pct("annualised", "Annualised return", metrics.annualised_return),
    pct("volatility", "Annualised volatility", metrics.annualised_volatility, false),
    {
      key: "sharpe",
      label: "Sharpe ratio",
      value: metrics.sharpe_ratio === null ? "—" : formatNumber(metrics.sharpe_ratio, 2),
      tone: signedTone(metrics.sharpe_ratio),
      meta: metrics.sharpe_ratio === null ? AFTER_TWO : undefined,
    },
    {
      key: "drawdown",
      label: "Max drawdown",
      value: metrics.max_drawdown === null ? "—" : formatPercent(metrics.max_drawdown, { digits: 2 }),
      tone: metrics.max_drawdown === null || metrics.max_drawdown === 0 ? "default" : "negative",
      meta: metrics.max_drawdown === null ? AFTER_TWO : undefined,
    },
    pct("best", "Best day", metrics.best_day),
    pct("worst", "Worst day", metrics.worst_day),
  ];
}

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
  const metrics = readMetrics(context.metrics);
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
      {metrics ? <StatRow items={metricItems(metrics)} /> : null}
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
