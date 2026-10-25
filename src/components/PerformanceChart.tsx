import { useId } from "react";

import type { TabularFrame } from "../api/types";
import { formatDate, formatPercent } from "../lib/format";

export interface PerformancePoint {
  time: Date;
  value: number;
}

/** Points from the API's tabular frame; rows are records, positional rows are tolerated. */
export function parsePerformance(frame: TabularFrame): PerformancePoint[] {
  const timeIndex = frame.columns.indexOf("time_index");
  const closeIndex = frame.columns.indexOf("close");
  const points: PerformancePoint[] = [];
  for (const row of frame.rows) {
    let time: unknown;
    let close: unknown;
    if (Array.isArray(row)) {
      time = row[timeIndex];
      close = row[closeIndex];
    } else {
      time = row.time_index;
      close = row.close;
    }
    const date = new Date(String(time));
    const value = typeof close === "number" ? close : Number(close);
    if (Number.isFinite(date.getTime()) && Number.isFinite(value)) points.push({ time: date, value });
  }
  return points.sort((a, b) => a.time.getTime() - b.time.getTime());
}

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 18, right: 64, bottom: 30, left: 56 };

/** An inline SVG line of the take's value, rebased to 1 at activation. Colours are theme tokens. */
export function PerformanceChart({ points }: { points: readonly PerformancePoint[] }) {
  const gradientId = useId();
  if (points.length < 2) {
    return <p className="hunch-muted">Not enough valuation points yet; the chart starts after two sessions.</p>;
  }
  const values = points.map((point) => point.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  let low = Math.min(dataMin, 1);
  let high = Math.max(dataMax, 1);
  if (high - low < 1e-9) {
    low -= 0.01;
    high += 0.01;
  } else {
    const margin = (high - low) * 0.08;
    low -= margin;
    high += margin;
  }
  const t0 = points[0].time.getTime();
  const t1 = points[points.length - 1].time.getTime();
  const span = Math.max(1, t1 - t0);
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (time: number) => PAD.left + ((time - t0) / span) * innerWidth;
  const y = (value: number) => PAD.top + (1 - (value - low) / (high - low)) * innerHeight;

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(point.time.getTime()).toFixed(2)},${y(point.value).toFixed(2)}`)
    .join(" ");
  const area = `${line} L${x(t1).toFixed(2)},${y(low).toFixed(2)} L${x(t0).toFixed(2)},${y(low).toFixed(2)} Z`;
  const last = points[points.length - 1];
  const minPoint = points.find((point) => point.value === dataMin) ?? points[0];
  const maxPoint = points.find((point) => point.value === dataMax) ?? last;
  const negative = last.value < 1;
  const gridValues = [low, (low + high) / 2, high];
  const describe = (value: number) => `${value.toFixed(3)} (${formatPercent(value - 1, { signed: true })})`;

  return (
    <figure className="hunch-chart-figure">
      <svg
        aria-label={`Value since activation, now ${describe(last.value)}`}
        className="hunch-chart"
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop className="hunch-chart__stop-top" offset="0%" />
            <stop className="hunch-chart__stop-bottom" offset="100%" />
          </linearGradient>
        </defs>
        {gridValues.map((value) => (
          <g key={value}>
            <line className="hunch-chart__grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} />
            <text className="hunch-chart__label" textAnchor="end" x={PAD.left - 8} y={y(value) + 4}>
              {value.toFixed(3)}
            </text>
          </g>
        ))}
        {low <= 1 && high >= 1 ? (
          <line className="hunch-chart__baseline" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(1)} y2={y(1)} />
        ) : null}
        <path
          className={`hunch-chart__area${negative ? " hunch-chart__area--negative" : ""}`}
          d={area}
          fill={`url(#${gradientId})`}
        />
        <path className={`hunch-chart__line${negative ? " hunch-chart__line--negative" : ""}`} d={line} />
        <circle className="hunch-chart__marker" cx={x(minPoint.time.getTime())} cy={y(minPoint.value)} r={3.5} />
        <text
          className="hunch-chart__label"
          textAnchor="middle"
          x={x(minPoint.time.getTime())}
          y={Math.min(HEIGHT - PAD.bottom + 12, y(minPoint.value) + 16)}
        >
          min {minPoint.value.toFixed(3)}
        </text>
        <circle className="hunch-chart__marker" cx={x(maxPoint.time.getTime())} cy={y(maxPoint.value)} r={3.5} />
        <text
          className="hunch-chart__label"
          textAnchor="middle"
          x={x(maxPoint.time.getTime())}
          y={Math.max(PAD.top - 4, y(maxPoint.value) - 8)}
        >
          max {maxPoint.value.toFixed(3)}
        </text>
        <circle className="hunch-chart__marker hunch-chart__marker--last" cx={x(t1)} cy={y(last.value)} r={4} />
        <text className="hunch-chart__label hunch-chart__last" x={x(t1) + 8} y={y(last.value) + 4}>
          {last.value.toFixed(3)}
        </text>
        <text className="hunch-chart__label" textAnchor="start" x={PAD.left} y={HEIGHT - 8}>
          {formatDate(points[0].time)}
        </text>
        <text className="hunch-chart__label" textAnchor="end" x={WIDTH - PAD.right} y={HEIGHT - 8}>
          {formatDate(last.time)}
        </text>
      </svg>
      <figcaption className="hunch-item-meta">
        Rebased to 1.000 at activation · {points.length} points · last {describe(last.value)}
      </figcaption>
    </figure>
  );
}
